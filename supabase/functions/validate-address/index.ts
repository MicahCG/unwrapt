import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { street, city, state, zipCode, country } = await req.json();

    // Basic format validation
    const errors: string[] = [];

    if (!street || street.trim().length < 3) {
      errors.push('Street address is too short');
    }
    if (!city || city.trim().length < 2) {
      errors.push('City name is too short');
    }
    if (!state || state.trim().length < 2) {
      errors.push('State is required');
    }
    if (!zipCode) {
      errors.push('ZIP code is required');
    }

    // Country-specific ZIP validation
    if (country === 'United States' && zipCode) {
      if (!/^\d{5}(-\d{4})?$/.test(zipCode.trim())) {
        errors.push('US ZIP code must be 5 digits (e.g. 78702) or ZIP+4 (e.g. 78702-1234)');
      }
    } else if (country === 'Canada' && zipCode) {
      if (!/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(zipCode.trim())) {
        errors.push('Canadian postal code format is invalid (e.g. K1A 0B1)');
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ valid: false, errors }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For US addresses, verify ZIP matches city/state using free API
    if (country === 'United States' && zipCode) {
      try {
        const zipClean = zipCode.trim().substring(0, 5);
        const res = await fetch(`https://api.zippopotam.us/us/${zipClean}`);
        
        if (!res.ok) {
          errors.push(`ZIP code ${zipClean} was not found. Please verify it's correct.`);
        } else {
          const data = await res.json();
          const places = data.places || [];
          
          if (places.length > 0) {
            const expectedState = places[0]['state abbreviation'];
            const expectedCity = places[0]['place name'];
            
            // Check state match (case insensitive, allow full name or abbreviation)
            const stateInput = state.trim().toLowerCase();
            const stateMatches = stateInput === expectedState.toLowerCase() || 
              stateInput === places[0]['state'].toLowerCase();
            
            if (!stateMatches) {
              errors.push(`ZIP code ${zipClean} belongs to ${places[0]['state']} (${expectedState}), not "${state}"`);
            }
          }
        }
      } catch (e) {
        // If external API fails, don't block the user — just skip verification
        console.warn('ZIP verification API unavailable:', e);
      }
    }

    return new Response(JSON.stringify({ 
      valid: errors.length === 0, 
      errors,
      verified: errors.length === 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Address validation error:', error);
    return new Response(JSON.stringify({ valid: false, errors: ['Validation service error'] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
