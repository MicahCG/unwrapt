
// Input sanitization utilities
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potential XSS vectors but preserve normal characters including spaces
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script tags (don't trim to preserve spaces)
};

// Address-specific sanitization that preserves spaces and common address characters
export const sanitizeAddress = (address: string): string => {
  if (!address || typeof address !== 'string') return '';
  
  // Allow spaces, letters, numbers, and common address punctuation
  return address
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script tags
};

export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  // Remove potential XSS vectors but allow normal email typing
  return email
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .trim();
};

export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-numeric characters except +, -, (, ), and spaces
  return phone.replace(/[^\d+\-() ]/g, '').trim();
};

export const sanitizeTextArea = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // More permissive for text areas but still safe
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};
