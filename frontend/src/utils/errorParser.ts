/**
 * Utility to help parse registration errors
 */

export interface ErrorResponse {
  error?: string;
  field?: string;
  detail?: string;
  message?: string;
}

/**
 * Determines if an error is related to a duplicate email with improved accuracy
 */
export function isEmailDuplicateError(errorResponse: ErrorResponse): boolean {
  // Convert all string values to lowercase to make comparison case-insensitive
  const errorMsg = (errorResponse.error || '').toLowerCase();
  const field = (errorResponse.field || '').toLowerCase();
  const detail = (errorResponse.detail || '').toLowerCase();
  const message = (errorResponse.message || '').toLowerCase();
  
  // Check for explicit email field errors first
  if (field === 'email') {
    return true;
  }
  
  // Check for email-related keywords in error messages
  const emailKeywords = [
    'email already registered',
    'email already exists',
    'email is already in use',
    'email address already exists',
    'users_email_key'
  ];
  
  // Search for any email keywords in different error message parts
  return emailKeywords.some(keyword => 
    errorMsg.includes(keyword) || 
    detail.includes(keyword) || 
    message.includes(keyword)
  );
}

/**
 * Determines if an error is related to a duplicate username with improved accuracy
 */
export function isUsernameDuplicateError(errorResponse: ErrorResponse): boolean {
  // Convert all string values to lowercase to make comparison case-insensitive
  const errorMsg = (errorResponse.error || '').toLowerCase();
  const field = (errorResponse.field || '').toLowerCase();
  const detail = (errorResponse.detail || '').toLowerCase();
  const message = (errorResponse.message || '').toLowerCase();
  
  // Check for explicit username field errors first
  if (field === 'username') {
    return true;
  }
  
  // Check for username-related keywords in error messages
  const usernameKeywords = [
    'username already taken',
    'username already exists',
    'username is already in use',
    'users_username_key'
  ];
  
  // Search for any username keywords in different error message parts
  return usernameKeywords.some(keyword => 
    errorMsg.includes(keyword) || 
    detail.includes(keyword) || 
    message.includes(keyword)
  );
}

/**
 * Determines if an error is related to a database duplicate key with specific column detection
 */
export function isDuplicateKeyError(errorResponse: ErrorResponse): [boolean, string | null] {
  const errorMsg = (errorResponse.error || '').toLowerCase();
  const detail = (errorResponse.detail || '').toLowerCase();
  
  // Common PostgreSQL duplicate key error pattern
  if (errorMsg.includes('duplicate key') || detail.includes('duplicate key')) {
    // Try to extract the column name
    const emailMatch = /email|users_email/i.exec(errorMsg + ' ' + detail);
    if (emailMatch) {
      return [true, 'email'];
    }
    
    const usernameMatch = /username|users_username/i.exec(errorMsg + ' ' + detail);
    if (usernameMatch) {
      return [true, 'username'];
    }
    
    // It's a duplicate key error but we couldn't determine the exact field
    return [true, null];
  }
  
  return [false, null];
}