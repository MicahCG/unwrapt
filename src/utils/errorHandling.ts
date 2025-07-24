// Enhanced error handling utilities for security

export const sanitizeErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Remove sensitive information from error messages
  const sensitivePatterns = [
    /stripe[_\s]secret[_\s]key/gi,
    /sk_[a-z0-9_]+/gi,
    /pk_[a-z0-9_]+/gi,
    /password/gi,
    /token/gi,
    /bearer/gi,
    /authorization/gi,
    /supabase.*key/gi,
    /database.*connection/gi,
    /internal.*error/gi
  ];
  
  let sanitized = errorMessage;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Return generic message for sensitive errors
  if (sanitized.includes('[REDACTED]') || sanitized.toLowerCase().includes('internal')) {
    return 'A system error occurred. Please try again later.';
  }
  
  return sanitized;
};

export const logSecurityEvent = (event: string, details: Record<string, any> = {}) => {
  // Log security events for monitoring
  console.warn(`🔒 SECURITY EVENT: ${event}`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  });
};

export const handleSecurityError = (error: unknown, context: string) => {
  const sanitizedMessage = sanitizeErrorMessage(error);
  logSecurityEvent(`Error in ${context}`, { 
    error: sanitizedMessage,
    originalError: error instanceof Error ? error.name : 'Unknown'
  });
  return sanitizedMessage;
};