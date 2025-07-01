
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://preview--unwrapt.lovable.app, https://unwrapt-auto-gifting-flow.lovable.app, https://*.lovable.dev, https://*.lovable.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

export const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }
};
