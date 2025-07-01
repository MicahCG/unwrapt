
// Comprehensive error handling utilities
export interface AppError {
  code: string;
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  userId?: string;
}

export class ErrorHandler {
  private static errors: AppError[] = [];

  static logError(error: AppError): void {
    // Add timestamp if not provided
    if (!error.timestamp) {
      error.timestamp = new Date().toISOString();
    }

    // Store error (in production, send to logging service)
    this.errors.push(error);
    
    // Console logging with appropriate level
    switch (error.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', error);
        break;
      case 'high':
        console.error('❌ HIGH SEVERITY ERROR:', error);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', error);
        break;
      case 'low':
        console.info('ℹ️ LOW SEVERITY ERROR:', error);
        break;
    }
  }

  static handleAuthError(error: any, userId?: string): string {
    const authError: AppError = {
      code: 'AUTH_ERROR',
      message: error.message || 'Authentication failed',
      details: error,
      severity: 'high',
      timestamp: new Date().toISOString(),
      userId
    };

    this.logError(authError);

    // Return user-friendly message
    if (error.message?.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.message?.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account.';
    }
    if (error.message?.includes('Too many requests')) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }
    
    return 'Login failed. Please try again.';
  }

  static handlePaymentError(error: any, userId?: string): string {
    const paymentError: AppError = {
      code: 'PAYMENT_ERROR',
      message: error.message || 'Payment processing failed',
      details: error,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      userId
    };

    this.logError(paymentError);

    // Return user-friendly message
    if (error.message?.includes('card_declined')) {
      return 'Your card was declined. Please try a different payment method.';
    }
    if (error.message?.includes('insufficient_funds')) {
      return 'Insufficient funds. Please try a different payment method.';
    }
    if (error.message?.includes('expired_card')) {
      return 'Your card has expired. Please update your payment method.';
    }
    
    return 'Payment failed. Please try again or use a different payment method.';
  }

  static handleApiError(error: any, endpoint: string, userId?: string): string {
    const apiError: AppError = {
      code: 'API_ERROR',
      message: `API call failed: ${endpoint}`,
      details: error,
      severity: 'medium',
      timestamp: new Date().toISOString(),
      userId
    };

    this.logError(apiError);

    // Return user-friendly message
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    return 'Something went wrong. Please try again.';
  }

  static handleValidationError(field: string, value: any): string {
    const validationError: AppError = {
      code: 'VALIDATION_ERROR',
      message: `Validation failed for field: ${field}`,
      details: { field, value },
      severity: 'low',
      timestamp: new Date().toISOString()
    };

    this.logError(validationError);

    // Return user-friendly message
    switch (field) {
      case 'email':
        return 'Please enter a valid email address.';
      case 'password':
        return 'Password must be at least 8 characters long.';
      case 'name':
        return 'Please enter a valid name.';
      case 'phone':
        return 'Please enter a valid phone number.';
      default:
        return `Please check the ${field} field.`;
    }
  }

  static getRecentErrors(severity?: AppError['severity']): AppError[] {
    const recent = this.errors.filter(
      error => Date.now() - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000
    );
    
    return severity ? recent.filter(error => error.severity === severity) : recent;
  }
}
