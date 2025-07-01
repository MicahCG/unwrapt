
export const securityConfig = {
  // Content Security Policy configuration
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "'unsafe-eval'", 
      "https://cdn.gpteng.co",
      "https://js.stripe.com"
    ],
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "https://fonts.googleapis.com"
    ],
    fontSrc: [
      "'self'", 
      "https://fonts.gstatic.com"
    ],
    imgSrc: [
      "'self'", 
      "data:", 
      "https:"
    ],
    connectSrc: [
      "'self'", 
      "https://*.supabase.co", 
      "https://api.stripe.com",
      "wss://*.supabase.co"
    ],
    frameSrc: [
      "'self'", 
      "https://js.stripe.com"
    ]
  },

  // Cookie security settings
  cookieDefaults: {
    secure: true,
    sameSite: 'strict' as const,
    httpOnly: true
  }
};

export const setCookieSecurely = (name: string, value: string, options: Partial<{
  expires: Date;
  maxAge: number;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}> = {}) => {
  const finalOptions = {
    ...securityConfig.cookieDefaults,
    ...options,
    path: options.path || '/'
  };

  let cookieString = `${name}=${value}`;
  
  if (finalOptions.expires) {
    cookieString += `; expires=${finalOptions.expires.toUTCString()}`;
  }
  
  if (finalOptions.maxAge) {
    cookieString += `; max-age=${finalOptions.maxAge}`;
  }
  
  if (finalOptions.domain) {
    cookieString += `; domain=${finalOptions.domain}`;
  }
  
  cookieString += `; path=${finalOptions.path}`;
  
  if (finalOptions.secure) {
    cookieString += `; secure`;
  }
  
  if (finalOptions.httpOnly) {
    cookieString += `; httponly`;
  }
  
  if (finalOptions.sameSite) {
    cookieString += `; samesite=${finalOptions.sameSite}`;
  }
  
  document.cookie = cookieString;
};
