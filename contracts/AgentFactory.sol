// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CFOAgent.sol";
import "./RuleRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentFactory
 * @notice Deploys a CFOAgent for every new user wallet.
 *         One wallet = one agent. Tracks all deployed agents.
 *         Works with ZeroDev smart accounts for gasless UX.
 */
contract AgentFactory is Ownable {

    RuleRegistry public immutable registry;
    address public keeper;

    // wallet => their CFOAgent
    mapping(address => address) public agentOf;
    address[] public allAgents;

    event AgentDeployed(address indexed owner, address indexed agent, uint256 timestamp);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);

    error AlreadyHasAgent(address agent);
    error ZeroAddress();

    constructor(address _registry, address _keeper) Ownable(msg.sender) {
        if (_registry == address(0) || _keeper == address(0)) revert ZeroAddress();
        registry = RuleRegistry(_registry);
        keeper = _keeper;
    }

    /**
     * @notice Deploy a CFOAgent for the calling wallet.
     *         Reverts if wallet already has an agent.
     *         Compatible with ZeroDev smart account wallets.
     */
    function deployAgent() external returns (address agentAddress) {
        if (agentOf[msg.sender] != address(0)) {
            revert AlreadyHasAgent(agentOf[msg.sender]);
        }

        CFOAgent agent = new CFOAgent(address(registry), keeper);

        // Transfer ownership to the user's wallet
        agent.transferOwnership(msg.sender);

        agentAddress = address(agent);
        agentOf[msg.sender] = agentAddress;
        allAgents.push(agentAddress);

        emit AgentDeployed(msg.sender, agentAddress, block.timestamp);
    }

    /**
     * @notice Check if a wallet has an agent without reverting.
     */
    function hasAgent(address wallet) external view returns (bool) {
        return agentOf[wallet] != address(0);
    }

    function totalAgents() external view returns (uint256) {
        return allAgents.length;
    }

    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }
}
