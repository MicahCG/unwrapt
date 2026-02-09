import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeletionRequest {
  userId: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userEmail, userName }: DeletionRequest = await req.json();

    if (!userId || !userEmail) {
      throw new Error("Missing required fields: userId, userEmail");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unwrapt <onboarding@resend.dev>",
        to: ["team@unwrapt.io"],
        subject: `Account Deletion Request - ${userEmail}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2D2D2D;">Account Deletion Request</h2>
            <p>A user has requested their account be deleted.</p>
            
            <div style="background: #f9f6f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>User ID:</strong> ${userId}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 4px 0;"><strong>Name:</strong> ${userName || 'Not provided'}</p>
              <p style="margin: 4px 0;"><strong>Requested at:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p>Please process this deletion within 24 hours as communicated to the user.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;"><em>This email was automatically generated from the Unwrapt app.</em></p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Account deletion request email sent:", emailData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-account-deletion-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
