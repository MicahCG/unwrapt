
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    console.log('🔐 Auth header present:', !!authHeader)
    
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

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
      
      // Always use the main callback for onboarding
      const redirectUri = `${origin}/auth/callback`
      
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
      const redirectUri = `${origin}/auth/callback`

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

      // Store the integration
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
      // Fetch calendar events
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

      // Filter for birthdays and anniversaries
      const importantDates = calendarData.items?.filter((event: any) => {
        const summary = event.summary?.toLowerCase() || ''
        return summary.includes('birthday') || summary.includes('anniversary') || 
               summary.includes('born') || summary.includes('wedding')
      }).map((event: any) => ({
        summary: event.summary,
        date: event.start?.date || event.start?.dateTime,
        type: event.summary?.toLowerCase().includes('anniversary') ? 'anniversary' : 'birthday'
      })) || []

      return new Response(JSON.stringify({ events: importantDates }), {
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
