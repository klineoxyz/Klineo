/**
 * KLINEO Form Validation System
 * 
 * Comprehensive validation rules for exchange API keys, risk parameters,
 * and all user inputs across the platform.
 */

// Validation result type
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// API Key validation
export const validateAPIKey = (key: string): ValidationResult => {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: "API key is required" };
  }
  
  if (key.length < 16) {
    return { valid: false, error: "API key is too short (minimum 16 characters)" };
  }
  
  if (key.length > 128) {
    return { valid: false, error: "API key is too long (maximum 128 characters)" };
  }
  
  // Check for valid characters (alphanumeric and common special chars)
  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(key)) {
    return { valid: false, error: "API key contains invalid characters" };
  }
  
  return { valid: true };
};

export const validateAPISecret = (secret: string): ValidationResult => {
  if (!secret || secret.trim().length === 0) {
    return { valid: false, error: "API secret is required" };
  }
  
  if (secret.length < 16) {
    return { valid: false, error: "API secret is too short (minimum 16 characters)" };
  }
  
  if (secret.length > 256) {
    return { valid: false, error: "API secret is too long (maximum 256 characters)" };
  }
  
  return { valid: true };
};

// Risk parameter validation
export const validatePercentage = (
  value: string | number,
  min: number = 0,
  max: number = 100,
  fieldName: string = "Value"
): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}%` };
  }
  
  if (num > max) {
    return { valid: false, error: `${fieldName} cannot exceed ${max}%` };
  }
  
  return { valid: true };
};

export const validateLeverage = (value: string | number): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: "Leverage must be a number" };
  }
  
  if (num < 1) {
    return { valid: false, error: "Leverage must be at least 1x" };
  }
  
  if (num > 125) {
    return { valid: false, error: "Leverage cannot exceed 125x" };
  }
  
  // Warn for high leverage (but allow it)
  if (num > 20) {
    return { 
      valid: true, 
      error: "⚠️ High leverage increases liquidation risk" 
    };
  }
  
  return { valid: true };
};

export const validatePositionSize = (
  value: string | number,
  min: number = 0,
  max: number = 100
): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: "Position size must be a number" };
  }
  
  if (num <= min) {
    return { valid: false, error: `Position size must be greater than ${min}%` };
  }
  
  if (num > max) {
    return { valid: false, error: `Position size cannot exceed ${max}%` };
  }
  
  return { valid: true };
};

export const validateMaxDrawdown = (value: string | number): ValidationResult => {
  return validatePercentage(value, 1, 100, "Max drawdown");
};

export const validateDailyLossLimit = (value: string | number): ValidationResult => {
  return validatePercentage(value, 1, 100, "Daily loss limit");
};

export const validateMinROI = (value: string | number): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: "ROI must be a number" };
  }
  
  if (num < -100) {
    return { valid: false, error: "ROI cannot be less than -100%" };
  }
  
  if (num > 10000) {
    return { valid: false, error: "ROI cannot exceed 10,000%" };
  }
  
  return { valid: true };
};

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required" };
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  return { valid: true };
};

// Referral code validation
export const validateReferralCode = (code: string): ValidationResult => {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Referral code is required" };
  }
  
  if (code.length < 4) {
    return { valid: false, error: "Referral code is too short" };
  }
  
  if (code.length > 20) {
    return { valid: false, error: "Referral code is too long" };
  }
  
  // Alphanumeric only
  const pattern = /^[a-zA-Z0-9]+$/;
  if (!pattern.test(code)) {
    return { valid: false, error: "Referral code can only contain letters and numbers" };
  }
  
  return { valid: true };
};

// Coupon code validation
export const validateCouponCode = (code: string): ValidationResult => {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Coupon code is required" };
  }
  
  if (code.length < 4) {
    return { valid: false, error: "Coupon code is too short" };
  }
  
  if (code.length > 50) {
    return { valid: false, error: "Coupon code is too long" };
  }
  
  return { valid: true };
};

// Crypto wallet address validation (basic)
export const validateWalletAddress = (address: string): ValidationResult => {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: "Wallet address is required" };
  }
  
  // Basic length check (Bitcoin/Ethereum addresses are typically 26-42 chars)
  if (address.length < 26 || address.length > 64) {
    return { valid: false, error: "Invalid wallet address length" };
  }
  
  return { valid: true };
};

// Amount validation (for payments, withdrawals, etc.)
export const validateAmount = (
  value: string | number,
  min: number = 0,
  max?: number,
  currency: string = "USD"
): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: "Amount must be a number" };
  }
  
  if (num <= min) {
    return { valid: false, error: `Amount must be greater than ${min} ${currency}` };
  }
  
  if (max && num > max) {
    return { valid: false, error: `Amount cannot exceed ${max} ${currency}` };
  }
  
  return { valid: true };
};

// Password strength validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { valid: false, error: "Password is required" };
  }
  
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  
  if (password.length > 128) {
    return { valid: false, error: "Password is too long (max 128 characters)" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter" };
  }
  
  return { valid: true };
};

// Confirm password validation
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  
  return { valid: true };
};

// Generic required field validation
export const validateRequired = (value: any, fieldName: string = "Field"): ValidationResult => {
  if (value === undefined || value === null || value === "") {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  return { valid: true };
};

// Number range validation
export const validateNumberRange = (
  value: string | number,
  min: number,
  max: number,
  fieldName: string = "Value"
): ValidationResult => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { valid: true };
};

// Validate multiple fields at once
export const validateFields = (
  fields: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.keys(validators).forEach((fieldName) => {
    const value = fields[fieldName];
    const validator = validators[fieldName];
    const result = validator(value);
    
    if (!result.valid && result.error) {
      errors[fieldName] = result.error;
    }
  });
  
  return errors;
};

// Format helpers for display
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatLeverage = (value: number): string => {
  return `${value}x`;
};

export const formatCurrency = (value: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(value);
};
