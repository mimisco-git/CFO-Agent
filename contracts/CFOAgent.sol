// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./RuleRegistry.sol";

/**
 * @title CFOAgent
 * @notice A programmable treasury agent that holds funds and autonomously
 *         executes payment rules. Think of it as a CFO that runs 24/7
 *         without needing you to touch anything.
 *
 *         Rules are stored in RuleRegistry. A keeper bot reads active rules
 *         and calls executeRule() when conditions are met. The owner retains
 *         full control: kill switch, pause rules, withdraw funds, spend caps.
 *
 * Week 1: Scheduled + conditional rules, safety controls, audit events.
 * Week 2: Payroll splits, yield sweep via oracle (see TODO comments).
 */
contract CFOAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------
    // State
    // -------------------------

    RuleRegistry public immutable registry;

    bool public active = true;

    address public keeper;

    // token => day bucket => amount spent
    mapping(address => mapping(uint256 => uint256)) private _dailySpent;

    // token => daily cap (0 = no cap)
    mapping(address => uint256) public dailySpendCap;

    uint256 public totalExecutions;

    // -------------------------
    // Events
    // -------------------------

    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event RuleExecuted(
        uint256 indexed ruleId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event AgentDeactivated();
    event AgentActivated();
    event DailyCapSet(address indexed token, uint256 cap);

    // -------------------------
    // Errors
    // -------------------------

    error AgentNotActive();
    error NotKeeper();
    error RuleNotReady();
    error InsufficientBalance();
    error DailyCapExceeded();
    error SpendLimitExceeded();
    error ConditionNotMet();
    error ZeroAddress();
    error TransferFailed();

    // -------------------------
    // Constructor
    // -------------------------

    constructor(address _registry, address _keeper) Ownable(msg.sender) {
        if (_registry == address(0) || _keeper == address(0)) revert ZeroAddress();
        registry = RuleRegistry(_registry);
        keeper = _keeper;
    }

    // -------------------------
    // Modifiers
    // -------------------------

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    modifier whenActive() {
        if (!active) revert AgentNotActive();
        _;
    }

    // -------------------------
    // Deposit
    // -------------------------

    receive() external payable {
        emit Deposited(address(0), msg.value);
    }

    function depositERC20(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, amount);
    }

    // -------------------------
    // Execution
    // -------------------------

    /**
     * @notice Execute a single rule by ID. Called by the keeper bot.
     */
    function executeRule(uint256 ruleId)
        external
        nonReentrant
        onlyKeeper
        whenActive
    {
        RuleRegistry.Rule memory rule = registry.getRule(address(this), ruleId);

        if (!registry.isRuleReady(address(this), ruleId)) revert RuleNotReady();

        if (rule.ruleType == RuleRegistry.RuleType.CONDITIONAL) {
            _checkCondition(rule);
        }

        if (rule.amount > rule.spendLimit) revert SpendLimitExceeded();
        _checkAndUpdateDailyCap(rule.token, rule.amount);

        if (rule.token == address(0)) {
            if (address(this).balance < rule.amount) revert InsufficientBalance();
        } else {
            if (IERC20(rule.token).balanceOf(address(this)) < rule.amount) revert InsufficientBalance();
        }

        _transfer(rule.token, rule.recipient, rule.amount);
        registry.recordExecution(address(this), ruleId);
        totalExecutions++;

        emit RuleExecuted(ruleId, rule.token, rule.recipient, rule.amount);
    }

    /**
     * @notice Execute multiple rules in one transaction.
     *         Failed rules are skipped so one bad rule doesn't block others.
     */
    function executeRules(uint256[] calldata ruleIds)
        external
        nonReentrant
        onlyKeeper
        whenActive
    {
        for (uint256 i = 0; i < ruleIds.length; i++) {
            _tryExecuteRule(ruleIds[i]);
        }
    }

    // -------------------------
    // TODO Week 2: Payroll split
    // function executePayrollSplit(
    //     uint256 ruleId,
    //     address[] calldata recipients,
    //     uint256[] calldata amounts
    // ) external onlyKeeper whenActive nonReentrant { ... }
    // -------------------------

    // -------------------------
    // TODO Week 2: Yield sweep
    // function sweepYield(address protocol, uint256 minAPY) external onlyKeeper whenActive nonReentrant { ... }
    // -------------------------

    // -------------------------
    // Owner controls
    // -------------------------

    function deactivate() external onlyOwner {
        active = false;
        emit AgentDeactivated();
    }

    function activate() external onlyOwner {
        active = true;
        emit AgentActivated();
    }

    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }

    function setDailySpendCap(address token, uint256 cap) external onlyOwner {
        dailySpendCap[token] = cap;
        emit DailyCapSet(token, cap);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        _transfer(token, owner(), amount);
        emit Withdrawn(token, amount, owner());
    }

    function withdraw(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        _transfer(token, to, amount);
        emit Withdrawn(token, amount, to);
    }

    // -------------------------
    // Views
    // -------------------------

    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getDailySpent(address token) external view returns (uint256) {
        return _dailySpent[token][_today()];
    }

    // -------------------------
    // Internal
    // -------------------------

    function _transfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok,) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _checkCondition(RuleRegistry.Rule memory rule) internal view {
        RuleRegistry.ConditionType ct = rule.conditionType;

        if (ct == RuleRegistry.ConditionType.BALANCE_ABOVE) {
            uint256 bal = rule.token == address(0)
                ? address(this).balance
                : IERC20(rule.token).balanceOf(address(this));
            if (bal <= rule.conditionValue) revert ConditionNotMet();
        } else if (ct == RuleRegistry.ConditionType.BALANCE_BELOW) {
            uint256 bal = rule.token == address(0)
                ? address(this).balance
                : IERC20(rule.token).balanceOf(address(this));
            if (bal >= rule.conditionValue) revert ConditionNotMet();
        }
        // EXTERNAL_TRIGGER: handled in Week 2 with oracle integration
    }

    function _checkAndUpdateDailyCap(address token, uint256 amount) internal {
        uint256 cap = dailySpendCap[token];
        if (cap == 0) return;
        uint256 today = _today();
        uint256 spent = _dailySpent[token][today];
        if (spent + amount > cap) revert DailyCapExceeded();
        _dailySpent[token][today] = spent + amount;
    }

    function _today() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function _tryExecuteRule(uint256 ruleId) internal {
        try this._executeRuleInternal(ruleId) {} catch {}
    }

    function _executeRuleInternal(uint256 ruleId) external {
        require(msg.sender == address(this), "internal only");

        RuleRegistry.Rule memory rule = registry.getRule(address(this), ruleId);
        if (!registry.isRuleReady(address(this), ruleId)) revert RuleNotReady();
        if (rule.ruleType == RuleRegistry.RuleType.CONDITIONAL) _checkCondition(rule);
        if (rule.amount > rule.spendLimit) revert SpendLimitExceeded();
        _checkAndUpdateDailyCap(rule.token, rule.amount);

        if (rule.token == address(0)) {
            if (address(this).balance < rule.amount) revert InsufficientBalance();
        } else {
            if (IERC20(rule.token).balanceOf(address(this)) < rule.amount) revert InsufficientBalance();
        }

        _transfer(rule.token, rule.recipient, rule.amount);
        registry.recordExecution(address(this), ruleId);
        totalExecutions++;

        emit RuleExecuted(ruleId, rule.token, rule.recipient, rule.amount);
    }
}
