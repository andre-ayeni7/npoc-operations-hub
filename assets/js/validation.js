/**
 * NPOC Form Validation System
 * Schema-based validation with clear error messages
 * 
 * @author NPOC Engineering
 * @version 2.0
 */

const FORM_SCHEMAS = {
  TASK: {
    taskName: {
      required: true,
      minLength: 3,
      maxLength: 100,
      type: 'string',
      message: 'Task name must be 3-100 characters'
    },
    assignedAdmin: {
      required: true,
      type: 'string',
      message: 'Must assign to an admin'
    },
    category: {
      required: true,
      enum: [
        'ClassModeration', 'StudentRegistration', 'QRAttendance',
        'FirstTimerReception', 'FacultyConfirmation', 'OnlineSupervision',
        'AttendanceReport', 'CallListUpdate'
      ],
      message: 'Invalid task category'
    },
    priority: {
      required: true,
      enum: ['High', 'Medium', 'Low'],
      message: 'Priority must be High, Medium, or Low'
    },
    dueDate: {
      required: true,
      type: 'date',
      message: 'Due date must be valid'
    }
  },

  CALL: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      type: 'string',
      message: 'Name must be 2-50 characters'
    },
    phone: {
      required: true,
      pattern: /^234\d{10}$/,
      message: 'Phone must be valid Nigerian number (234...)'
    },
    email: {
      required: false,
      type: 'email',
      message: 'Email must be valid'
    }
  },

  ATTENDANCE: {
    phone: {
      required: true,
      pattern: /^234\d{10}$/,
      message: 'Phone must be valid'
    },
    studentName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      type: 'string',
      message: 'Name must be 2-50 characters'
    },
    module: {
      required: true,
      enum: [1, 2],
      type: 'number',
      message: 'Module must be 1 or 2'
    },
    mode: {
      required: true,
      enum: ['Physical', 'Online'],
      message: 'Mode must be Physical or Online'
    },
    date: {
      required: true,
      type: 'date',
      message: 'Date must be valid'
    }
  },

  ADMIN: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'Name must be 2-50 characters'
    },
    email: {
      required: true,
      type: 'email',
      message: 'Email must be valid'
    },
    role: {
      required: true,
      enum: ['Super Admin', 'Lead Admin', 'Assistant Lead Admin', 'Class Admin', 'Ordinary Admin'],
      message: 'Invalid role'
    }
  },

  FACULTY: {
    facultyName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'Faculty name must be 2-50 characters'
    },
    module: {
      required: true,
      enum: [1, 2],
      message: 'Module must be 1 or 2'
    },
    classDate: {
      required: true,
      type: 'date',
      message: 'Class date must be valid'
    }
  }
};

class FormValidator {
  /**
   * Validate entire form against schema
   */
  static validate(schemaName, data) {
    const schema = FORM_SCHEMAS[schemaName];
    if (!schema) throw new Error(`Unknown schema: ${schemaName}`);

    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const error = this.validateField(field, value, rules);
      if (error) errors[field] = error;
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      errorCount: Object.keys(errors).length
    };
  }

  /**
   * Validate single field
   */
  static validateField(field, value, rules) {
    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${field} is required`;
    }

    // Empty is ok if not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type validation
    if (rules.type === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return rules.message || `${field} must be a valid date`;
      }
    }

    if (rules.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return rules.message || `${field} must be a valid email`;
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      return rules.message || `${field} is not valid`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(String(value))) {
      return rules.message || `${field} format is invalid`;
    }

    // Length validation
    const strValue = String(value);
    if (rules.minLength && strValue.length < rules.minLength) {
      return rules.message || `${field} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && strValue.length > rules.maxLength) {
      return rules.message || `${field} must be at most ${rules.maxLength} characters`;
    }

    return null;
  }

  /**
   * Highlight invalid form fields
   */
  static highlightErrors(errors) {
    Object.keys(errors).forEach(field => {
      const input = document.getElementById(field) ||
        document.querySelector(`[name="${field}"]`) ||
        document.querySelector(`[data-field="${field}"]`);

      if (input) {
        input.style.borderColor = '#ef4444';
        input.style.backgroundColor = '#fee2e2';
        input.setAttribute('aria-invalid', 'true');
      }
    });
  }

  /**
   * Clear highlights
   */
  static clearHighlights() {
    document.querySelectorAll('[aria-invalid="true"]').forEach(input => {
      input.style.borderColor = '';
      input.style.backgroundColor = '';
      input.setAttribute('aria-invalid', 'false');
    });
  }
}
