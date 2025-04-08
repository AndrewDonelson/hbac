// file: src/types/policy.ts
// description: Policy-related type definitions for the HBAC package

import { PolicyEffect } from './config';

/**
 * Policy identifier type
 */
export type PolicyId = string;

/**
 * Condition for policy rules
 * Can contain nested operators and values
 */
export type PolicyCondition = Record<string, any>;

/**
 * Policy rule definition interface
 */
export interface PolicyRule {
  /**
   * Unique identifier for the policy rule
   */
  id: PolicyId;
  
  /**
   * Optional name of the policy rule
   */
  name?: string;
  
  /**
   * Optional description of the policy rule
   */
  description?: string;
  
  /**
   * Resource the policy applies to
   */
  resource: string;
  
  /**
   * Action the policy applies to
   */
  action: string;
  
  /**
   * Condition that must be satisfied for the policy to apply
   */
  condition: PolicyCondition;
  
  /**
   * Effect of the policy (allow or deny)
   */
  effect: PolicyEffect;
}