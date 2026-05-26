// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ExecutionSequencer
 * @notice On-chain FIFO queue that sequences CFOAgent rule executions.
 *         Prevents double-execution, enforces ordering, and provides
 *         retry logic with configurable max attempts.
 *
 *         Ties into Arbitrum Timeboost: high-priority jobs can be
 *         submitted with boosted priority for faster inclusion.
 *
 * Job lifecycle:
 *   QUEUED -> EXECUTING -> COMPLETED
 *                       -> FAILED (retried up to maxRetries)
 *                       -> CANCELLED (owner only)
 */
contract ExecutionSequencer is Ownable, ReentrancyGuard {

    // -------------------------
    // Types
    // -------------------------

    enum JobStatus {
        QUEUED,
        EXECUTING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    enum Priority {
        NORMAL,   // Standard FIFO ordering
        HIGH,     // Jumps ahead of NORMAL jobs
        CRITICAL  // Executes before all others (emergency payments)
    }

    struct Job {
        uint256 id;
        address agent;        // CFOAgent contract to call
        uint256 ruleId;       // Rule to execute on the agent
        Priority priority;
        JobStatus status;
        uint256 attempts;     // How many times execution was tried
        uint256 maxRetries;   // Max attempts before marking FAILED
        uint256 createdAt;
        uint256 executedAt;
        uint256 scheduledFor; // Earliest timestamp this job can execute (0 = now)
        string failReason;    // Last failure message for debugging
    }

    // -------------------------
    // Storage
    // -------------------------

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;
    uint256 public totalCompleted;
    uint256 public totalFailed;

    // agent => ruleId => jobId (prevents duplicate queuing)
    mapping(address => mapping(uint256 => uint256)) public activeJobFor;
    mapping(address => mapping(uint256 => bool)) public hasActiveJob;

    // Keeper that is allowed to dequeue and mark jobs
    address public keeper;

    uint256 public constant DEFAULT_MAX_RETRIES = 3;
    uint256 public constant MAX_JOBS_PER_AGENT  = 100;

    // -------------------------
    // Events
    // -------------------------

    event JobQueued(uint256 indexed jobId, address indexed agent, uint256 ruleId, Priority priority);
    event JobStarted(uint256 indexed jobId);
    event JobCompleted(uint256 indexed jobId, address indexed agent, uint256 ruleId);
    event JobFailed(uint256 indexed jobId, string reason, uint256 attempts);
    event JobCancelled(uint256 indexed jobId);
    event JobRetried(uint256 indexed jobId, uint256 attempt);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);

    // -------------------------
    // Errors
    // -------------------------

    error NotKeeper();
    error JobNotFound();
    error JobNotQueued();
    error JobNotExecuting();
    error DuplicateJob();
    error ZeroAddress();
    error TooEarly();

    // -------------------------
    // Constructor
    // -------------------------

    constructor(address _keeper) Ownable(msg.sender) {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
    }

    // -------------------------
    // Modifiers
    // -------------------------

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    // -------------------------
    // Queue management
    // -------------------------

    /**
     * @notice Add a rule execution job to the queue.
     * @param agent       CFOAgent contract address
     * @param ruleId      Rule ID on the agent
     * @param priority    NORMAL, HIGH, or CRITICAL
     * @param scheduledFor Earliest execution timestamp (0 = immediate)
     * @param maxRetries  How many failures before giving up
     */
    function enqueue(
        address agent,
        uint256 ruleId,
        Priority priority,
        uint256 scheduledFor,
        uint256 maxRetries
    ) external returns (uint256 jobId) {
        if (agent == address(0)) revert ZeroAddress();
        if (hasActiveJob[agent][ruleId]) revert DuplicateJob();

        jobId = nextJobId++;

        jobs[jobId] = Job({
            id: jobId,
            agent: agent,
            ruleId: ruleId,
            priority: priority,
            status: JobStatus.QUEUED,
            attempts: 0,
            maxRetries: maxRetries == 0 ? DEFAULT_MAX_RETRIES : maxRetries,
            createdAt: block.timestamp,
            executedAt: 0,
            scheduledFor: scheduledFor,
            failReason: ""
        });

        hasActiveJob[agent][ruleId] = true;
        activeJobFor[agent][ruleId] = jobId;

        emit JobQueued(jobId, agent, ruleId, priority);
    }

    /**
     * @notice Mark a job as executing. Called by keeper before executing on CFOAgent.
     */
    function startJob(uint256 jobId) external onlyKeeper {
        Job storage job = _getJob(jobId);
        if (job.status != JobStatus.QUEUED) revert JobNotQueued();
        if (job.scheduledFor > 0 && block.timestamp < job.scheduledFor) revert TooEarly();

        job.status = JobStatus.EXECUTING;
        job.attempts++;

        emit JobStarted(jobId);
    }

    /**
     * @notice Mark a job as successfully completed.
     */
    function completeJob(uint256 jobId) external onlyKeeper {
        Job storage job = _getJob(jobId);
        if (job.status != JobStatus.EXECUTING) revert JobNotExecuting();

        job.status = JobStatus.COMPLETED;
        job.executedAt = block.timestamp;

        hasActiveJob[job.agent][job.ruleId] = false;
        totalCompleted++;

        emit JobCompleted(jobId, job.agent, job.ruleId);
    }

    /**
     * @notice Mark a job as failed. If retries remain, reset to QUEUED.
     */
    function failJob(uint256 jobId, string calldata reason) external onlyKeeper {
        Job storage job = _getJob(jobId);
        if (job.status != JobStatus.EXECUTING) revert JobNotExecuting();

        job.failReason = reason;

        if (job.attempts < job.maxRetries) {
            job.status = JobStatus.QUEUED;
            emit JobRetried(jobId, job.attempts);
        } else {
            job.status = JobStatus.FAILED;
            hasActiveJob[job.agent][job.ruleId] = false;
            totalFailed++;
            emit JobFailed(jobId, reason, job.attempts);
        }
    }

    /**
     * @notice Cancel a queued job. Owner or keeper only.
     */
    function cancelJob(uint256 jobId) external {
        if (msg.sender != owner() && msg.sender != keeper) revert NotKeeper();
        Job storage job = _getJob(jobId);
        if (job.status != JobStatus.QUEUED) revert JobNotQueued();

        job.status = JobStatus.CANCELLED;
        hasActiveJob[job.agent][job.ruleId] = false;
        emit JobCancelled(jobId);
    }

    // -------------------------
    // Read functions
    // -------------------------

    /**
     * @notice Get the next job the keeper should execute.
     *         Returns CRITICAL first, then HIGH, then NORMAL.
     *         Within same priority, FIFO ordering.
     */
    function getNextJob() external view returns (Job memory, bool found) {
        uint256 total = nextJobId;
        uint256 bestId;
        Priority bestPriority = Priority.NORMAL;
        bool bestFound = false;

        for (uint256 i = 0; i < total; i++) {
            Job storage job = jobs[i];
            if (job.status != JobStatus.QUEUED) continue;
            if (job.scheduledFor > 0 && block.timestamp < job.scheduledFor) continue;

            if (!bestFound || uint8(job.priority) > uint8(bestPriority)) {
                bestFound = true;
                bestId = i;
                bestPriority = job.priority;
            } else if (job.priority == bestPriority && i < bestId) {
                bestId = i;
            }
        }

        if (!bestFound) return (jobs[0], false);
        return (jobs[bestId], true);
    }

    /**
     * @notice Get all queued jobs for a specific agent.
     */
    function getQueuedJobsForAgent(address agent) external view returns (Job[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextJobId; i++) {
            if (jobs[i].agent == agent && jobs[i].status == JobStatus.QUEUED) count++;
        }

        Job[] memory result = new Job[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < nextJobId; i++) {
            if (jobs[i].agent == agent && jobs[i].status == JobStatus.QUEUED) {
                result[idx++] = jobs[i];
            }
        }
        return result;
    }

    /**
     * @notice Get recent jobs (last N) for display in dashboard.
     */
    function getRecentJobs(uint256 count) external view returns (Job[] memory) {
        uint256 total = nextJobId;
        uint256 n = count > total ? total : count;
        Job[] memory result = new Job[](n);

        for (uint256 i = 0; i < n; i++) {
            result[i] = jobs[total - 1 - i];
        }
        return result;
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _getJob(jobId);
    }

    function queueDepth() external view returns (uint256 count) {
        for (uint256 i = 0; i < nextJobId; i++) {
            if (jobs[i].status == JobStatus.QUEUED) count++;
        }
    }

    // -------------------------
    // Admin
    // -------------------------

    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }

    // -------------------------
    // Internal
    // -------------------------

    function _getJob(uint256 jobId) internal view returns (Job storage) {
        if (jobId >= nextJobId) revert JobNotFound();
        return jobs[jobId];
    }
}
