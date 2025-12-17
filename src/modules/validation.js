/**
 * Frontend form validation utilities
 * Matches patterns used in api/lib/validation.js for consistency
 */

/**
 * Validation rules - each returns true if valid, or error message if invalid
 */
export const rules = {
    /**
     * Field is required (non-empty after trim)
     */
    required: (value) => {
        if (value == null || String(value).trim() === '') {
            return 'This field is required';
        }
        return true;
    },
    
    /**
     * Minimum length requirement
     * @param {number} min - Minimum length
     */
    minLength: (min) => (value) => {
        if (value == null || String(value).length < min) {
            return `Must be at least ${min} characters`;
        }
        return true;
    },
    
    /**
     * Maximum length requirement
     * @param {number} max - Maximum length
     */
    maxLength: (max) => (value) => {
        if (value != null && String(value).length > max) {
            return `Must be no more than ${max} characters`;
        }
        return true;
    },
    
    /**
     * Pattern matching with custom message
     * @param {RegExp} regex - Pattern to match
     * @param {string} message - Error message if pattern doesn't match
     */
    pattern: (regex, message) => (value) => {
        if (value != null && !regex.test(String(value))) {
            return message;
        }
        return true;
    },
    
    /**
     * Username validation (alphanumeric + underscore, 2-20 chars)
     */
    username: (value) => {
        const str = String(value || '');
        if (str.length < 2) return 'Username must be at least 2 characters';
        if (str.length > 20) return 'Username must be no more than 20 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(str)) return 'Username can only contain letters, numbers, and underscores';
        return true;
    },
    
    /**
     * Email validation
     */
    email: (value) => {
        if (value == null || String(value).trim() === '') return true; // Use with required if needed
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
            return 'Please enter a valid email address';
        }
        return true;
    },
    
    /**
     * Numeric value
     */
    numeric: (value) => {
        if (value == null || String(value).trim() === '') return true;
        if (isNaN(Number(value))) {
            return 'Must be a number';
        }
        return true;
    },
    
    /**
     * Value must be in a list of options
     * @param {Array} options - Valid options
     */
    oneOf: (options) => (value) => {
        if (!options.includes(value)) {
            return `Must be one of: ${options.join(', ')}`;
        }
        return true;
    },
    
    /**
     * Custom validation function
     * @param {Function} fn - Function that returns true or error message
     */
    custom: (fn) => fn,
};

/**
 * Validate a single value against multiple rules
 * @param {*} value - Value to validate
 * @param {...Function} ruleFns - Validation rule functions
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validate(value, ...ruleFns) {
    for (const rule of ruleFns) {
        const result = rule(value);
        if (result !== true) {
            return { valid: false, error: result };
        }
    }
    return { valid: true };
}

/**
 * Validate an entire form against a schema
 * @param {Object} formData - Object with field values
 * @param {Object} schema - Object mapping field names to arrays of rules
 * @returns {{ valid: boolean, errors: Object }} Validation result
 * @example
 * validateForm(
 *   { username: 'jo', email: 'invalid' },
 *   { 
 *     username: [rules.required, rules.username],
 *     email: [rules.email]
 *   }
 * )
 */
export function validateForm(formData, schema) {
    const errors = {};
    let valid = true;
    
    for (const [field, fieldRules] of Object.entries(schema)) {
        const value = formData[field];
        const result = validate(value, ...fieldRules);
        
        if (!result.valid) {
            valid = false;
            errors[field] = result.error;
        }
    }
    
    return { valid, errors };
}

/**
 * Validate and return first error found (for simple single-field validation)
 * @param {*} value - Value to validate
 * @param {...Function} ruleFns - Validation rule functions
 * @returns {string|null} Error message or null if valid
 */
export function getError(value, ...ruleFns) {
    const result = validate(value, ...ruleFns);
    return result.valid ? null : result.error;
}

/**
 * Check if form data is valid without getting detailed errors
 * @param {Object} formData - Object with field values
 * @param {Object} schema - Validation schema
 * @returns {boolean} Whether form is valid
 */
export function isFormValid(formData, schema) {
    return validateForm(formData, schema).valid;
}
