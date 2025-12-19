
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to extract person names
function extractPersonFromEvent(eventSummary: string) {
  const summary = eventSummary.toLowerCase();
  let personName = '';
  
  if (summary.includes("'s birthday") || summary.includes("'s bday")) {
    const splitChar = summary.includes("'s birthday") ? "'s birthday" : "'s bday";
    personName = eventSummary.split(splitChar)[0].trim();
  } else if (summary.includes("'s anniversary")) {
    personName = eventSummary.split("'s")[0].trim();
  } else if (summary.includes(" birthday") || summary.includes(" bday")) {
    personName = eventSummary.replace(/birthday|bday/i, '').trim();
  } else if (summary.includes(" anniversary")) {
    personName = eventSummary.replace(/anniversary/i, '').trim();
  } else if (summary.includes("birthday -") || summary.includes("bday -")) {
    const splitStr = summary.includes("birthday -") ? "birthday -" : "bday -";
    personName = eventSummary.split(splitStr)[1].trim();
  } else if (summary.includes("anniversary -")) {
    personName = eventSummary.split("anniversary -")[1].trim();
  } else {
    // Fallback: try to extract any name-like pattern
    const words = eventSummary.split(' ');
    personName = words.find(word => 
      word.length > 2 && 
      word[0] === word[0].toUpperCase() &&
      !['Birthday', 'Bday', 'Anniversary', 'The', 'And', 'Or'].includes(word)
    ) || '';
  }
  
  // Remove any remaining "'s" suffix from the extracted name
  if (personName.endsWith("'s")) {
    personName = personName.slice(0, -2);
  }
  
  return personName;
}

// Encryption helper functions using Web Crypto API
async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  // Derive a key from the base64 encryption key
  const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the token
  const encodedToken = new TextEncoder().encode(token);
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedToken
  );

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  try {
    // Derive a key from the base64 encryption key
    const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode the base64 encrypted data
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create user-authenticated supabase client for RLS-protected operations
    const authHeader = req.headers.get('Authorization')
    console.log('🔐 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No Authorization header found')
      return new Response(JSON.stringify({ error: 'No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // User client for auth and RLS-protected tables
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )
    
    // Service role client for accessing calendar_integrations (tokens are sensitive)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (!user) {
      console.error('❌ No user found in auth header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ User authenticated:', user.id)

    const { action, code } = await req.json()
    console.log('📝 Action received:', action)

    if (action === 'get_auth_url') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/')
      
      // Use the calendar OAuth callback for onboarding flow
      const redirectUri = `${origin}/auth/calendar/callback`
      
      console.log('🔗 Generated redirect URI:', redirectUri)
      
      const scope = 'https://www.googleapis.com/auth/calendar.readonly'
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`

      console.log('🚀 Generated auth URL for onboarding flow')
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'exchange_code') {
      const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/')
      const redirectUri = `${origin}/auth/calendar/callback`

      console.log('🔄 Exchange code - redirect URI:', redirectUri)
      console.log('🔄 Exchange code - user ID:', user.id)

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      })

      const tokenData = await tokenResponse.json()
      console.log('💰 Token exchange result:', { 
        success: !tokenData.error,
        hasAccessToken: !!tokenData.access_token,
        error: tokenData.error 
      })

      if (tokenData.error) {
        console.error('❌ Token exchange error:', tokenData.error)
        return new Response(JSON.stringify({ error: tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Encrypt tokens before storing
      console.log('🔒 Encrypting tokens...')
      const encryptedAccessToken = await encryptToken(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? await encryptToken(tokenData.refresh_token) : null;

      // Store the encrypted integration using service role (user can't directly read tokens)
      console.log('💾 Storing encrypted calendar integration for user:', user.id)
      const { error: insertError } = await supabaseAdmin
        .from('calendar_integrations')
        .upsert({
          user_id: user.id,
          provider: 'google',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        }, {
          onConflict: 'user_id,provider'
        })

      if (insertError) {
        console.error('❌ Error storing integration:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to store integration' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('✅ Calendar integration stored successfully (encrypted)')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'fetch_events') {
      // Fetch integration using service role (tokens are not exposed to client)
      const { data: currentIntegration } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (!currentIntegration) {
        return new Response(JSON.stringify({ error: 'No calendar integration found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let validAccessToken: string;

      // Check if token is expired or will expire in the next 5 minutes
      if (currentIntegration?.expires_at) {
        const expiresAt = new Date(currentIntegration.expires_at);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow && currentIntegration.refresh_token) {
          console.log('🔄 Token expired (onboarding), refreshing...');
          
          // Decrypt the refresh token first
          const decryptedRefreshToken = await decryptToken(currentIntegration.refresh_token);

          // Refresh the token
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
              refresh_token: decryptedRefreshToken,
              grant_type: 'refresh_token'
            })
          });

          const refreshData = await refreshResponse.json();

          if (refreshData.error) {
            console.error('❌ Token refresh failed (onboarding):', refreshData.error);
            return new Response(JSON.stringify({ 
              error: 'Calendar access expired. Please reconnect your Google Calendar.' 
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Encrypt and update the stored tokens using service role
          const encryptedNewAccessToken = await encryptToken(refreshData.access_token);
          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await supabaseAdmin
            .from('calendar_integrations')
            .update({
              access_token: encryptedNewAccessToken,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentIntegration.id);

          validAccessToken = refreshData.access_token;
          console.log('✅ Token refreshed successfully (onboarding)');
        } else if (currentIntegration.access_token) {
          // Decrypt the existing token
          validAccessToken = await decryptToken(currentIntegration.access_token);
        }
      }

      // Onboarding flow - fetch events for the next 12 months so we don't miss recurring dates
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() +
        '&timeMax=' +
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() + // Next 12 months
        '&maxResults=250&singleEvents=true&orderBy=startTime',
        {
          headers: { 'Authorization': `Bearer ${validAccessToken}` }
        }
      )

      const calendarData = await calendarResponse.json()

      if (calendarData.error) {
        console.error('❌ Calendar API error (onboarding):', calendarData.error);
        
        // If it's an auth error, suggest reconnection
        if (calendarData.error.code === 401 || calendarData.error.status === 'UNAUTHENTICATED') {
          return new Response(JSON.stringify({ 
            error: 'Calendar access expired. Please reconnect your Google Calendar.' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ error: calendarData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Filter for birthdays and anniversaries only (onboarding focus),
      // but look in both summary and description and support more variations
      const importantDates = calendarData.items?.filter((event: any) => {
        const summary = event.summary?.toLowerCase() || ''
        const description = event.description?.toLowerCase() || ''
        const text = summary + ' ' + description

        return text.includes('birthday') ||
               text.includes('bday') ||
               text.includes('anniversary') ||
               text.includes('born') ||
               text.includes('wedding')
      }).map((event: any) => ({
        summary: event.summary,
        date: event.start?.date || event.start?.dateTime,
        type: (event.summary?.toLowerCase().includes('anniversary') || event.summary?.toLowerCase().includes('wedding'))
          ? 'anniversary'
          : 'birthday',
        personName: extractPersonFromEvent(event.summary)
      })) || []

      return new Response(JSON.stringify({ events: importantDates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'fetch_dashboard_events') {
      // Fetch integration using service role (tokens are not exposed to client)
      const { data: currentIntegration } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (!currentIntegration) {
        return new Response(JSON.stringify({ error: 'No calendar integration found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let validAccessToken: string;

      // Check if token is expired or will expire in the next 5 minutes
      if (currentIntegration?.expires_at) {
        const expiresAt = new Date(currentIntegration.expires_at);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow && currentIntegration.refresh_token) {
          console.log('🔄 Token expired, refreshing...');
          
          // Decrypt the refresh token first
          const decryptedRefreshToken = await decryptToken(currentIntegration.refresh_token);

          // Refresh the token
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
              refresh_token: decryptedRefreshToken,
              grant_type: 'refresh_token'
            })
          });

          const refreshData = await refreshResponse.json();

          if (refreshData.error) {
            console.error('❌ Token refresh failed:', refreshData.error);
            return new Response(JSON.stringify({ 
              error: 'Calendar access expired. Please reconnect your Google Calendar.' 
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Encrypt and update the stored tokens using service role
          const encryptedNewAccessToken = await encryptToken(refreshData.access_token);
          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await supabaseAdmin
            .from('calendar_integrations')
            .update({
              access_token: encryptedNewAccessToken,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentIntegration.id);

          validAccessToken = refreshData.access_token;
          console.log('✅ Token refreshed successfully');
        } else if (currentIntegration.access_token) {
          // Decrypt the existing token
          validAccessToken = await decryptToken(currentIntegration.access_token);
        }
      }

      // NEW: Dashboard flow - fetch comprehensive events for multiple people
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() + 
        '&timeMax=' + 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() + // Next 12 months
        '&maxResults=250&singleEvents=true&orderBy=startTime',
        {
          headers: { 'Authorization': `Bearer ${validAccessToken}` }
        }
      )

      const calendarData = await calendarResponse.json()

      if (calendarData.error) {
        console.error('❌ Calendar API error:', calendarData.error);
        
        // If it's an auth error, suggest reconnection
        if (calendarData.error.code === 401 || calendarData.error.status === 'UNAUTHENTICATED') {
          return new Response(JSON.stringify({ 
            error: 'Calendar access expired. Please reconnect your Google Calendar.' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ error: calendarData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Expanded filtering for dashboard - include more gift-worthy occasions
      const giftWorthyEvents = calendarData.items?.filter((event: any) => {
        const summary = event.summary?.toLowerCase() || ''
        const description = event.description?.toLowerCase() || ''
        
        // Original important dates (now includes bday)
        const isImportantDate = summary.includes('birthday') || 
                               summary.includes('bday') ||
                               summary.includes('anniversary') || 
                               summary.includes('born') || 
                               summary.includes('wedding')
        
        // Holiday occasions
        const isHoliday = summary.includes('christmas') ||
                         summary.includes('valentine') ||
                         summary.includes('mother\'s day') ||
                         summary.includes('father\'s day') ||
                         summary.includes('thanksgiving') ||
                         summary.includes('easter') ||
                         summary.includes('halloween') ||
                         summary.includes('new year')
        
        // Achievement/milestone events
        const isMilestone = summary.includes('graduation') ||
                           summary.includes('promotion') ||
                           summary.includes('retirement') ||
                           summary.includes('new job') ||
                           summary.includes('achievement')
        
        // Personal events
        const isPersonalEvent = summary.includes('housewarming') ||
                               summary.includes('baby shower') ||
                               summary.includes('engagement') ||
                               summary.includes('farewell') ||
                               summary.includes('going away')
        
        // Just because occasions (user-created gift reminders)
        const isGiftReminder = summary.includes('gift') ||
                              summary.includes('present') ||
                              summary.includes('surprise') ||
                              description.includes('gift') ||
                              description.includes('present')
        
        return isImportantDate || isHoliday || isMilestone || isPersonalEvent || isGiftReminder
      }).map((event: any) => {
        const summary = event.summary?.toLowerCase() || ''
        
        // Determine event category
        let category = 'other'
        let type = 'special event'
        
        if (summary.includes('birthday') || summary.includes('bday') || summary.includes('born')) {
          category = 'birthday'
          type = 'birthday'
        } else if (summary.includes('anniversary') || summary.includes('wedding')) {
          category = 'anniversary'
          type = 'anniversary'
        } else if (summary.includes('christmas') || summary.includes('valentine') || 
                   summary.includes('mother\'s day') || summary.includes('father\'s day') ||
                   summary.includes('thanksgiving') || summary.includes('easter') ||
                   summary.includes('halloween') || summary.includes('new year')) {
          category = 'holiday'
          type = 'holiday'
        } else if (summary.includes('graduation') || summary.includes('promotion') ||
                   summary.includes('retirement') || summary.includes('achievement')) {
          category = 'milestone'
          type = 'milestone'
        } else if (summary.includes('gift') || summary.includes('present')) {
          category = 'gift-reminder'
          type = 'gift reminder'
        }
        
        return {
          summary: event.summary,
          date: event.start?.date || event.start?.dateTime,
          type: type,
          category: category,
          description: event.description || null,
          // Extract person name for birthday/anniversary events (now includes bday)
          personName: (category === 'birthday' || category === 'anniversary') ? 
                      extractPersonFromEvent(event.summary) : null
        }
      }) || []

      return new Response(JSON.stringify({ events: giftWorthyEvents }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
