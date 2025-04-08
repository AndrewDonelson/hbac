// file: src/attribute/manager.ts
// description: Manages attributes and evaluates attribute-based conditions for access control

import { AttributeMap, AttributeId, AttributeValue, AttributeValues } from '../types';

/**
 * Manages attributes and evaluates attribute conditions
 * 
 * Provides methods for attribute validation, retrieval, and complex condition evaluation
 */
export class AttributeManager {
  /**
   * Creates a new AttributeManager instance
   * 
   * @param attributes Attribute map from configuration
   */
  constructor(private attributes: AttributeMap) { }

  /**
   * Retrieves all defined attributes
   * 
   * @returns Complete map of attributes
   */
  public getAttributes(): AttributeMap {
    return this.attributes;
  }

  /**
   * Finds a specific attribute by its unique identifier
   * 
   * @param attributeId Unique identifier of the attribute
   * @returns The attribute definition or undefined if not found
   */
  public getAttribute(attributeId: AttributeId): AttributeMap[string] | undefined {
    return Object.values(this.attributes).find(attr => attr.id === attributeId);
  }

  /**
   * Validates an attribute value against its defined type
   * 
   * @param attributeId Identifier of the attribute to validate
   * @param value Value to be validated
   * @returns Boolean indicating if the value matches the attribute's type
   */
  public validateAttributeValue(attributeId: AttributeId, value: AttributeValue): boolean {
    const attribute = this.getAttribute(attributeId);
    if (!attribute) {
      return false;
    }

    switch (attribute.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Evaluates a complex condition against user attributes and context
   * 
   * @param condition Condition to evaluate
   * @param userAttributes User's current attributes
   * @param context Additional context for condition evaluation
   * @returns Boolean indicating if the condition is satisfied
   */
  public evaluateCondition(
    condition: Record<string, any>,
    userAttributes: AttributeValues,
    context: Record<string, any> = {}
  ): boolean {
    // Evaluate each condition clause
    return Object.entries(condition).every(([path, predicate]) => {
      const value = this.resolvePath(path, userAttributes, context);

      // If value not found and not using a negation operator, condition fails
      if (value === undefined && typeof predicate !== 'object') {
        return false;
      }

      // Evaluate the predicate
      return this.evaluatePredicate(value, predicate);
    });
  }

  /**
   * Resolves a path to a value from user attributes or context
   * 
   * @param path Path to resolve
   * @param userAttributes User's attributes
   * @param context Additional context
   * @returns Resolved value or undefined
   */
  private resolvePath(
    path: string,
    userAttributes: AttributeValues,
    context: Record<string, any>
  ): any {
    // Handle special variable syntax
    if (path.startsWith('$user.attributes.')) {
      const attributeName = path.substring('$user.attributes.'.length);
      return userAttributes[attributeName];
    }

    // Handle context reference
    if (path.startsWith('context.')) {
      const contextPath = path.substring('context.'.length);
      return this.getNestedValue(context, contextPath);
    }

    // Handle attributes reference
    if (path.startsWith('attributes.')) {
      const attributeName = path.substring('attributes.'.length);
      return userAttributes[attributeName];
    }

    // Direct attribute reference
    return userAttributes[path];
  }

  /**
   * Retrieves a nested value from an object
   * 
   * @param obj Object to traverse
   * @param path Dot-separated path to the value
   * @returns Nested value or undefined
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, part) =>
      current && current[part] !== undefined ? current[part] : undefined,
      obj
    );
  }

  /**
   * Evaluates a predicate against a value using comparison operators
   * 
   * @param value Value to evaluate
   * @param predicate Predicate or comparison object
   * @returns Boolean indicating if the predicate is satisfied
   */
  /**
   * Evaluates a predicate against a value using comparison operators
   * 
   * @param value Value to evaluate
   * @param predicate Predicate or comparison object
   * @returns Boolean indicating if the predicate is satisfied
   */
  private evaluatePredicate(value: any, predicate: any): boolean {
    // Direct equality check for non-object predicates
    if (typeof predicate !== 'object' || predicate === null) {
      return value === predicate;
    }

    // Operator-based predicates
    return Object.entries(predicate).every(([operator, operand]: [string, unknown]) => {
      switch (operator) {
        case '$eq': return value === operand;
        case '$ne': return value !== operand;
        case '$gt':
          return typeof value === 'number' &&
            typeof operand === 'number' &&
            value > operand;
        case '$gte':
          return typeof value === 'number' &&
            typeof operand === 'number' &&
            value >= operand;
        case '$lt':
          return typeof value === 'number' &&
            typeof operand === 'number' &&
            value < operand;
        case '$lte':
          return typeof value === 'number' &&
            typeof operand === 'number' &&
            value <= operand;
        case '$in':
          return Array.isArray(operand) && operand.includes(value);
        case '$nin':
          return Array.isArray(operand) && !operand.includes(value);
        case '$exists':
          return operand ? value !== undefined : value === undefined;
        default: return false;
      }
    });
  }
}