// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RuleRegistry
 * @notice Stores and manages automation rules for CFO agents.
 *         Each agent (wallet) owns its own set of rules.
 *         Rules define WHAT to pay, WHO to pay, WHEN to pay,
 *         and HOW MUCH is the maximum allowed per execution.
 */
contract RuleRegistry {

    // -------------------------
    // Types
    // -------------------------

    enum RuleType {
        SCHEDULED,    // Execute every X seconds (payroll, recurring payments)
        CONDITIONAL   // Execute when a condition is met (balance threshold, APY trigger)
    }

    enum ConditionType {
        NONE,              // Used by SCHEDULED rules
        BALANCE_ABOVE,     // Fire when agent balance exceeds this value
        BALANCE_BELOW,     // Fire when agent balance drops below this value
        EXTERNAL_TRIGGER   // Reserved for Week 2: oracle-fed APY / price conditions
    }

    struct Rule {
        uint256 id;
        RuleType ruleType;
        ConditionType conditionType;

        address token;        // ERC20 token address. address(0) means native ETH.
        address recipient;    // Where funds are sent when rule fires

        uint256 amount;       // Amount to transfer per execution (in token decimals)
        uint256 spendLimit;   // Max this rule can spend per execution (safety cap)

        uint256 interval;     // SCHEDULED: seconds between executions. 0 if CONDITIONAL.
        uint256 lastExecuted; // Timestamp of last successful execution

        uint256 conditionValue; // CONDITIONAL: the threshold value to compare against
        bool active;            // Owner can pause/resume individual rules
    }

    // -------------------------
    // Storage
    // -------------------------

    // agent address => rule id => Rule
    mapping(address => mapping(uint256 => Rule)) private _rules;

    // agent address => list of rule ids (for iteration)
    mapping(address => uint256[]) private _ruleIds;

    // agent address => next rule id counter
    mapping(address => uint256) private _nextRuleId;

    // -------------------------
    // Events
    // -------------------------

    event RuleAdded(address indexed agent, uint256 indexed ruleId, RuleType ruleType);
    event RuleUpdated(address indexed agent, uint256 indexed ruleId);
    event RuleDeactivated(address indexed agent, uint256 indexed ruleId);
    event RuleActivated(address indexed agent, uint256 indexed ruleId);
    event RuleDeleted(address indexed agent, uint256 indexed ruleId);

    // -------------------------
    // Errors
    // -------------------------

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidInterval();
    error SpendLimitTooLow();
    error RuleNotFound();
    error NotRuleOwner();
    error TooManyRules();

    // -------------------------
    // Constants
    // -------------------------

    uint256 public constant MAX_RULES_PER_AGENT = 50;

    // -------------------------
    // Write functions
    // -------------------------

    /**
     * @notice Add a new rule to the calling agent's registry.
     */
    function addRule(
        RuleType ruleType,
        ConditionType conditionType,
        address token,
        address recipient,
        uint256 amount,
        uint256 spendLimit,
        uint256 interval,
        uint256 conditionValue
    ) external returns (uint256 ruleId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (spendLimit < amount) revert SpendLimitTooLow();
        if (ruleType == RuleType.SCHEDULED && interval == 0) revert InvalidInterval();
        if (_ruleIds[msg.sender].length >= MAX_RULES_PER_AGENT) revert TooManyRules();

        ruleId = _nextRuleId[msg.sender]++;

        _rules[msg.sender][ruleId] = Rule({
            id: ruleId,
            ruleType: ruleType,
            conditionType: conditionType,
            token: token,
            recipient: recipient,
            amount: amount,
            spendLimit: spendLimit,
            interval: interval,
            lastExecuted: 0,
            conditionValue: conditionValue,
            active: true
        });

        _ruleIds[msg.sender].push(ruleId);
        emit RuleAdded(msg.sender, ruleId, ruleType);
    }

    /**
     * @notice Update an existing rule's parameters.
     */
    function updateRule(
        uint256 ruleId,
        address token,
        address recipient,
        uint256 amount,
        uint256 spendLimit,
        uint256 interval,
        uint256 conditionValue
    ) external {
        Rule storage rule = _getOwnedRule(msg.sender, ruleId);
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (spendLimit < amount) revert SpendLimitTooLow();

        rule.token = token;
        rule.recipient = recipient;
        rule.amount = amount;
        rule.spendLimit = spendLimit;
        rule.interval = interval;
        rule.conditionValue = conditionValue;

        emit RuleUpdated(msg.sender, ruleId);
    }

    /**
     * @notice Pause a rule without deleting it.
     */
    function deactivateRule(uint256 ruleId) external {
        Rule storage rule = _getOwnedRule(msg.sender, ruleId);
        rule.active = false;
        emit RuleDeactivated(msg.sender, ruleId);
    }

    /**
     * @notice Resume a previously paused rule.
     */
    function activateRule(uint256 ruleId) external {
        Rule storage rule = _getOwnedRule(msg.sender, ruleId);
        rule.active = true;
        emit RuleActivated(msg.sender, ruleId);
    }

    /**
     * @notice Called by CFOAgent after successful execution to record timestamp.
     *         Only the agent itself can update its own lastExecuted.
     */
    function recordExecution(address agent, uint256 ruleId) external {
        if (msg.sender != agent) revert NotRuleOwner();
        Rule storage rule = _rules[agent][ruleId];
        if (rule.recipient == address(0)) revert RuleNotFound();
        rule.lastExecuted = block.timestamp;
    }

    // -------------------------
    // Read functions
    // -------------------------

    function getRule(address agent, uint256 ruleId) external view returns (Rule memory) {
        Rule memory rule = _rules[agent][ruleId];
        if (rule.recipient == address(0)) revert RuleNotFound();
        return rule;
    }

    function getRuleIds(address agent) external view returns (uint256[] memory) {
        return _ruleIds[agent];
    }

    function getRuleCount(address agent) external view returns (uint256) {
        return _ruleIds[agent].length;
    }

    /**
     * @notice Returns all active rules for an agent in one call.
     *         Used by the keeper bot to check what needs executing.
     */
    function getActiveRules(address agent) external view returns (Rule[] memory) {
        uint256[] memory ids = _ruleIds[agent];
        uint256 count = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            if (_rules[agent][ids[i]].active) count++;
        }

        Rule[] memory active = new Rule[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (_rules[agent][ids[i]].active) {
                active[idx++] = _rules[agent][ids[i]];
            }
        }
        return active;
    }

    /**
     * @notice Check whether a specific rule is ready to execute right now.
     */
    function isRuleReady(address agent, uint256 ruleId) external view returns (bool) {
        Rule memory rule = _rules[agent][ruleId];
        if (!rule.active) return false;
        if (rule.recipient == address(0)) return false;

        if (rule.ruleType == RuleType.SCHEDULED) {
            return block.timestamp >= rule.lastExecuted + rule.interval;
        }
        return true;
    }

    // -------------------------
    // Internal helpers
    // -------------------------

    function _getOwnedRule(address agent, uint256 ruleId) internal view returns (Rule storage) {
        Rule storage rule = _rules[agent][ruleId];
        if (rule.recipient == address(0)) revert RuleNotFound();
        return rule;
    }
}
