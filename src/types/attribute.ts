// file: src/types/attribute.ts
// description: Attribute-related type definitions for the HBAC package

import { AttributeType } from './config';

/**
 * Attribute identifier type
 */
export type AttributeId = string;

/**
 * Attribute definition interface
 */
export interface Attribute {
  /**
   * Unique identifier for the attribute
   */
  id: AttributeId;
  
  /**
   * Data type of the attribute
   */
  type: AttributeType;
  
  /**
   * Optional description of the attribute
   */
  description?: string;
}

/**
 * Map of attribute keys to attribute definitions
 */
export type AttributeMap = Record<string, Attribute>;

/**
 * Type representing all possible attribute values
 */
export type AttributeValue = string | number | boolean | object | any[];

/**
 * Map of attribute IDs to their values for a user
 */
export type AttributeValues = Record<AttributeId, AttributeValue>;
