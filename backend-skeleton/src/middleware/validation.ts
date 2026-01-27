import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware - runs validators and returns errors if any
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array() 
      });
    }
    next();
  };
};

/**
 * Common validators
 */
export const uuidParam = (field: string = 'id') => param(field).isUUID().withMessage(`${field} must be a valid UUID`);

export const statusBody = (field: string = 'status', allowed: string[] = ['active', 'suspended', 'banned']) => 
  body(field).isIn(allowed).withMessage(`${field} must be one of: ${allowed.join(', ')}`);

/** Optional string; accepts undefined or null as "not provided", and validates when a string is present. */
export const optionalString = (field: string, maxLength: number = 500) =>
  body(field)
    .optional({ values: 'null' })
    .isString()
    .withMessage(`${field} must be a string`)
    .bail()
    .isLength({ max: maxLength })
    .withMessage(`${field} must be at most ${maxLength} characters`);

export const pageQuery = query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer');
export const limitQuery = query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100');
export const searchQuery = query('search').optional().isString().isLength({ max: 100 }).withMessage('search must be a string with max 100 characters');
