import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  giftId: string;
  recipientName: string;
  occasionDate: string;
  giftType: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      giftId, 
      recipientName, 
      occasionDate, 
      giftType, 
      userEmail, 
      userName 
    }: SupportEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Unwrapt Support <support@unwrapt.com>",
      to: ["team@unwrapt.io"],
      subject: `Support Request - Gift Order ${giftId}`,
      html: `
        <h2>Support Request from ${userName}</h2>
        <p><strong>User Email:</strong> ${userEmail}</p>
        
        <h3>Gift Details</h3>
        <ul>
          <li><strong>Gift ID:</strong> ${giftId}</li>
          <li><strong>Recipient:</strong> ${recipientName}</li>
          <li><strong>Gift Type:</strong> ${giftType}</li>
          <li><strong>Occasion Date:</strong> ${occasionDate}</li>
        </ul>
        
        <p>The user has a question or issue regarding this order. Please follow up with them directly.</p>
        
        <hr>
        <p><em>This email was automatically generated from the Unwrapt app.</em></p>
      `,
    });

    console.log("Support email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
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