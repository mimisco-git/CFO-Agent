/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum RuleType {
  SINGLE_TRANSFER = "SINGLE_TRANSFER",
  PAYROLL = "PAYROLL",
  SWEEP = "SWEEP",
  YIELD_REBALANCE = "YIELD_REBALANCE"
}

export enum RuleStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  EXECUTED = "EXECUTED"
}

export interface PaymentRule {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  status: RuleStatus;
  recipient: string;
  token: string; // e.g., "ETH", "USDC", "USDT", "ARB"
  amount: number; // Transfer amount or Sweep threshold
  frequency: string; // "Hourly", "Daily", "Weekly", "Once"
  frequencySeconds: number; // dynamic simulations trigger
  lastExecuted?: number; // Epoch timestamp
  nextExecution?: number; // Epoch timestamp
  createdTime: number;
  destinationName?: string;
}

export interface TreasuryToken {
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  usdPrice: number;
  logo: string;
  contractAddress: string;
}

export interface SpendCap {
  token: string;
  cap: number;
  spent: number;
  enabled: boolean;
}

export interface TxLog {
  id: string;
  timestamp: number;
  type: "DEPOSIT" | "WITHDRAW" | "EXECUTE_RULE" | "EMERGENCY_WITHDRAW" | "UPDATE_CAP" | "TOGGLE_RULE" | "CREATE_RULE";
  token: string;
  amount: number;
  recipient?: string;
  ruleName?: string;
  txHash: string;
  status: "SUCCESS" | "FAILED";
}

export interface KeeperLog {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "success" | "warn" | "error";
}
