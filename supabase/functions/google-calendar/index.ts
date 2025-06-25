import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  
  return personName;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create supabase client with the user's auth token to respect RLS
    const authHeader = req.headers.get('Authorization')
    console.log('🔐 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No Authorization header found')
      return new Response(JSON.stringify({ error: 'No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ No user found in auth header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ User authenticated:', user.id)

    const { action, code, access_token } = await req.json()
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

      // Store the integration using the user-authenticated supabase client (respects RLS)
      console.log('💾 Storing calendar integration for user:', user.id)
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .upsert({
          user_id: user.id,
          provider: 'google',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        }, {
          onConflict: 'user_id,provider'
        })

      if (insertError) {
        console.error('❌ Error storing integration:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to store integration', details: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('✅ Calendar integration stored successfully')
      return new Response(JSON.stringify({ success: true, access_token: tokenData.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'fetch_events') {
      // Original onboarding flow - fetch limited events for single person selection
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() + '&maxResults=100&singleEvents=true&orderBy=startTime',
        {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }
      )

      const calendarData = await calendarResponse.json()

      if (calendarData.error) {
        return new Response(JSON.stringify({ error: calendarData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Filter for birthdays and anniversaries only (onboarding focus)
      const importantDates = calendarData.items?.filter((event: any) => {
        const summary = event.summary?.toLowerCase() || ''
        return summary.includes('birthday') || summary.includes('bday') || summary.includes('anniversary') || 
               summary.includes('born') || summary.includes('wedding')
      }).map((event: any) => ({
        summary: event.summary,
        date: event.start?.date || event.start?.dateTime,
        type: event.summary?.toLowerCase().includes('anniversary') ? 'anniversary' : 'birthday',
        personName: extractPersonFromEvent(event.summary)
      })) || []

      return new Response(JSON.stringify({ events: importantDates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'fetch_dashboard_events') {
      // NEW: Dashboard flow - fetch comprehensive events for multiple people
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() + 
        '&timeMax=' + 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() + // Next 12 months
        '&maxResults=250&singleEvents=true&orderBy=startTime',
        {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }
      )

      const calendarData = await calendarResponse.json()

      if (calendarData.error) {
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
