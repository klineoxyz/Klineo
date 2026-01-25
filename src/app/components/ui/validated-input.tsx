/**
 * KLINEO Validated Input Components
 * 
 * Form inputs with built-in validation, error states, and success feedback.
 */

import { useState, useEffect } from "react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import type { ValidationResult } from "@/app/lib/form-validation";

interface ValidatedInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  validator?: (value: string) => ValidationResult;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showSuccessState?: boolean;
  className?: string;
}

export function ValidatedInput({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onValidation,
  validator,
  required = false,
  disabled = false,
  helpText,
  validateOnChange = true,
  validateOnBlur = true,
  showSuccessState = true,
  className,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true });

  const validate = (val: string) => {
    if (!validator) {
      setValidationResult({ valid: true });
      return;
    }

    const result = validator(val);
    setValidationResult(result);
    
    if (onValidation) {
      onValidation(result);
    }
  };

  useEffect(() => {
    if (validateOnChange && touched) {
      validate(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  };

  const showError = touched && !validationResult.valid && validationResult.error;
  const showSuccess = touched && validationResult.valid && showSuccessState && value.length > 0;
  const showWarning = touched && validationResult.valid && validationResult.error; // Warning is valid:true but has error message

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "pr-10",
            showError && "border-[#EF4444] focus-visible:ring-[#EF4444]",
            showSuccess && "border-[#10B981] focus-visible:ring-[#10B981]",
            showWarning && "border-[#FFB000] focus-visible:ring-[#FFB000]"
          )}
        />
        
        {/* Validation icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {showSuccess && (
            <CheckCircle2 className="size-4 text-[#10B981]" />
          )}
          {showError && (
            <AlertCircle className="size-4 text-[#EF4444]" />
          )}
          {showWarning && (
            <Info className="size-4 text-[#FFB000]" />
          )}
        </div>
      </div>

      {/* Help text or validation message */}
      {showError && (
        <p className="text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle className="size-3" />
          {validationResult.error}
        </p>
      )}
      
      {showWarning && (
        <p className="text-xs text-[#FFB000] flex items-center gap-1">
          <Info className="size-3" />
          {validationResult.error}
        </p>
      )}
      
      {!showError && !showWarning && helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// Validated Textarea component
interface ValidatedTextareaProps extends Omit<ValidatedInputProps, 'type'> {
  rows?: number;
}

export function ValidatedTextarea({
  label,
  name,
  placeholder,
  value,
  onChange,
  onValidation,
  validator,
  required = false,
  disabled = false,
  helpText,
  validateOnChange = true,
  validateOnBlur = true,
  showSuccessState = false,
  rows = 4,
  className,
}: ValidatedTextareaProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true });

  const validate = (val: string) => {
    if (!validator) {
      setValidationResult({ valid: true });
      return;
    }

    const result = validator(val);
    setValidationResult(result);
    
    if (onValidation) {
      onValidation(result);
    }
  };

  useEffect(() => {
    if (validateOnChange && touched) {
      validate(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  };

  const showError = touched && !validationResult.valid && validationResult.error;
  const showSuccess = touched && validationResult.valid && showSuccessState && value.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </Label>
      
      <Textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        rows={rows}
        className={cn(
          showError && "border-[#EF4444] focus-visible:ring-[#EF4444]",
          showSuccess && "border-[#10B981] focus-visible:ring-[#10B981]"
        )}
      />

      {showError && (
        <p className="text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle className="size-3" />
          {validationResult.error}
        </p>
      )}
      
      {!showError && helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// Number input with validation
interface ValidatedNumberInputProps extends Omit<ValidatedInputProps, 'type'> {
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // e.g., "%", "x", "USD"
}

export function ValidatedNumberInput({
  label,
  name,
  placeholder,
  value,
  onChange,
  onValidation,
  validator,
  required = false,
  disabled = false,
  helpText,
  validateOnChange = true,
  validateOnBlur = true,
  showSuccessState = true,
  min,
  max,
  step = 1,
  unit,
  className,
}: ValidatedNumberInputProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true });

  const validate = (val: string) => {
    if (!validator) {
      setValidationResult({ valid: true });
      return;
    }

    const result = validator(val);
    setValidationResult(result);
    
    if (onValidation) {
      onValidation(result);
    }
  };

  useEffect(() => {
    if (validateOnChange && touched) {
      validate(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  };

  const showError = touched && !validationResult.valid && validationResult.error;
  const showSuccess = touched && validationResult.valid && showSuccessState && value.length > 0;
  const showWarning = touched && validationResult.valid && validationResult.error;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={cn(
            unit ? "pr-16" : "pr-10",
            showError && "border-[#EF4444] focus-visible:ring-[#EF4444]",
            showSuccess && "border-[#10B981] focus-visible:ring-[#10B981]",
            showWarning && "border-[#FFB000] focus-visible:ring-[#FFB000]"
          )}
        />
        
        {/* Unit display */}
        {unit && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </div>
        )}
        
        {/* Validation icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {showSuccess && (
            <CheckCircle2 className="size-4 text-[#10B981]" />
          )}
          {showError && (
            <AlertCircle className="size-4 text-[#EF4444]" />
          )}
          {showWarning && (
            <Info className="size-4 text-[#FFB000]" />
          )}
        </div>
      </div>

      {showError && (
        <p className="text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle className="size-3" />
          {validationResult.error}
        </p>
      )}
      
      {showWarning && (
        <p className="text-xs text-[#FFB000] flex items-center gap-1">
          <Info className="size-3" />
          {validationResult.error}
        </p>
      )}
      
      {!showError && !showWarning && helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// Password input with strength indicator
export function ValidatedPasswordInput({
  label,
  name,
  placeholder,
  value,
  onChange,
  onValidation,
  validator,
  required = false,
  disabled = false,
  showStrengthIndicator = true,
  className,
}: Omit<ValidatedInputProps, 'type'> & { showStrengthIndicator?: boolean }) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true });
  const [showPassword, setShowPassword] = useState(false);

  const validate = (val: string) => {
    if (!validator) {
      setValidationResult({ valid: true });
      return;
    }

    const result = validator(val);
    setValidationResult(result);
    
    if (onValidation) {
      onValidation(result);
    }
  };

  useEffect(() => {
    if (touched) {
      validate(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    validate(value);
  };

  // Calculate password strength
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: "Weak", color: "#EF4444" };
    if (strength <= 4) return { strength: 2, label: "Medium", color: "#FFB000" };
    return { strength: 3, label: "Strong", color: "#10B981" };
  };

  const passwordStrength = getPasswordStrength(value);
  const showError = touched && !validationResult.valid && validationResult.error;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "pr-10",
            showError && "border-[#EF4444] focus-visible:ring-[#EF4444]"
          )}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      {showStrengthIndicator && value.length > 0 && !showError && (
        <div className="space-y-1">
          <div className="flex gap-1">
            <div className={cn("h-1 flex-1 rounded-full bg-secondary", passwordStrength.strength >= 1 && "bg-current")} style={{ color: passwordStrength.color }} />
            <div className={cn("h-1 flex-1 rounded-full bg-secondary", passwordStrength.strength >= 2 && "bg-current")} style={{ color: passwordStrength.color }} />
            <div className={cn("h-1 flex-1 rounded-full bg-secondary", passwordStrength.strength >= 3 && "bg-current")} style={{ color: passwordStrength.color }} />
          </div>
          <p className="text-xs" style={{ color: passwordStrength.color }}>
            Password strength: {passwordStrength.label}
          </p>
        </div>
      )}

      {showError && (
        <p className="text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle className="size-3" />
          {validationResult.error}
        </p>
      )}
    </div>
  );
}
