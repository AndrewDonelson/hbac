// file: src/policy/engine.ts
// description: Core policy evaluation engine that makes access control decisions

import { PolicyRule, PolicyEffect, PolicyEvaluationType } from '../types';
import { RoleManager } from '../role/manager';
import { AttributeManager } from '../attribute/manager';
import { AttributeValues } from '../types/attribute';

/**
 * Policy Engine responsible for evaluating complex access control rules
 * 
 * This engine combines role-based and attribute-based access control strategies
 * to provide fine-grained access control decisions.
 */
export class PolicyEngine {
  /**
   * Creates a new PolicyEngine instance
   * 
   * @param policyRules - Collection of policy rules to evaluate
   * @param defaultEffect - Default access decision when no rules match
   * @param evaluationType - Strategy for evaluating multiple applicable rules
   * @param roleManager - Manager for handling role-based permissions
   * @param attributeManager - Manager for handling attribute-based conditions
   */
  constructor(
    private policyRules: PolicyRule[],
    private defaultEffect: PolicyEffect,
    private evaluationType: PolicyEvaluationType,
    private roleManager: RoleManager,
    private attributeManager: AttributeManager
  ) {}

  /**
   * Evaluates whether a user has permission to perform an action on a resource
   * 
   * @param userRoleIds - Roles assigned to the user
   * @param userAttributes - Attributes associated with the user
   * @param resource - Resource being accessed
   * @param action - Action being performed
   * @param context - Additional context for more granular evaluation
   * @returns Boolean indicating whether access is allowed
   */
  public evaluate(
    userRoleIds: string[],
    userAttributes: AttributeValues,
    resource: string,
    action: string,
    context: Record<string, any> = {}
  ): boolean {
    // First, check role-based permissions
    const hasRolePermission = this.roleManager.hasPermission(userRoleIds, resource, action);
    
    // If the user has no role-based permission, deny access
    if (!hasRolePermission) {
      return false;
    }
    
    // Filter relevant policy rules
    const relevantRules = this.policyRules.filter(rule => 
      (rule.resource === resource || rule.resource === '*') &&
      (rule.action === action || rule.action === '*')
    );
    
    // If no relevant rules, use role-based decision
    if (relevantRules.length === 0) {
      return true;  // Role-based permission already granted
    }
    
    return this.evaluatePolicyRules(relevantRules, userAttributes, context);
  }

  /**
   * Selects and executes the appropriate policy evaluation strategy
   * 
   * @param rules - Applicable policy rules
   * @param userAttributes - User's attributes
   * @param context - Additional evaluation context
   * @returns Boolean indicating whether access is allowed
   */
  private evaluatePolicyRules(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    switch (this.evaluationType) {
      case 'firstApplicable':
        return this.evaluateFirstApplicable(rules, userAttributes, context);
      case 'allApplicable':
        return this.evaluateAllApplicable(rules, userAttributes, context);
      case 'denyOverrides':
        return this.evaluateDenyOverrides(rules, userAttributes, context);
      default:
        return this.defaultEffect === 'allow';
    }
  }

  /**
   * Evaluates policy rules using the first applicable rule strategy
   * 
   * @param rules - Policy rules to evaluate
   * @param userAttributes - User's attributes
   * @param context - Evaluation context
   * @returns Boolean indicating access permission
   */
  private evaluateFirstApplicable(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        return rule.effect === 'allow';
      }
    }
    
    // No rule matched, use default effect
    return this.defaultEffect === 'allow';
  }

  /**
   * Evaluates policy rules using the all applicable rules strategy
   * 
   * @param rules - Policy rules to evaluate
   * @param userAttributes - User's attributes
   * @param context - Evaluation context
   * @returns Boolean indicating access permission
   */
  private evaluateAllApplicable(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    let anyMatched = false;
    let anyDenied = false;
    let anyAllowed = false;
    
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        anyMatched = true;
        
        if (rule.effect === 'allow') {
          anyAllowed = true;
        } else {
          anyDenied = true;
        }
      }
    }
    
    // If any rule matched
    if (anyMatched) {
      // Both allow and deny rules matched
      if (anyAllowed && anyDenied) {
        // This is a conflict, deny by default
        return false;
      }
      
      // Only allow rules matched
      if (anyAllowed) {
        return true;
      }
      
      // Only deny rules matched
      return false;
    }
    
    // No rule matched, use default effect
    return this.defaultEffect === 'allow';
  }

  /**
   * Evaluates policy rules with deny overriding allow strategy
   * 
   * @param rules - Policy rules to evaluate
   * @param userAttributes - User's attributes
   * @param context - Evaluation context
   * @returns Boolean indicating access permission
   */
  private evaluateDenyOverrides(
    rules: PolicyRule[],
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): boolean {
    let anyMatched = false;
    let anyAllowed = false;
    
    for (const rule of rules) {
      // Check if rule condition matches
      if (this.attributeManager.evaluateCondition(rule.condition, userAttributes, context)) {
        anyMatched = true;
        
        // Deny rule takes precedence
        if (rule.effect === 'deny') {
          return false;
        }
        
        if (rule.effect === 'allow') {
          anyAllowed = true;
        }
      }
    }
    
    // If any rule matched and none denied
    if (anyMatched && anyAllowed) {
      return true;
    }
    
    // No rule matched or none allowed, use default effect
    return this.defaultEffect === 'allow';
  }
}