
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'recipient_added' | 'gift_scheduled';
  userEmail: string;
  userName?: string;
  recipientName: string;
  giftDetails?: {
    occasion: string;
    occasionDate: string;
    giftType: string;
    priceRange: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    const { type, userEmail, userName, recipientName, giftDetails }: EmailRequest = await req.json();

    let subject: string;
    let htmlContent: string;

    if (type === 'recipient_added') {
      subject = `✅ ${recipientName} has been added to your gift list`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin: 0 0 16px 0;">🎁 New Recipient Added!</h2>
            <p style="color: #555; margin: 0;">Hi ${userName || 'there'},</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <p style="color: #555; margin: 0 0 16px 0;">Great news! You've successfully added <strong>${recipientName}</strong> to your gift recipients list.</p>
            
            <p style="color: #555; margin: 0 0 16px 0;">Now you can:</p>
            <ul style="color: #555; margin: 0 0 16px 0; padding-left: 20px;">
              <li>Schedule gifts for upcoming occasions</li>
              <li>Set up automatic gift reminders</li>
              <li>Let Unwrapt handle all the gift selection and delivery</li>
            </ul>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://preview--unwrapt.lovable.app/" 
                 style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Schedule a Gift for ${recipientName}
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
            <p>Thanks for using Unwrapt!</p>
            <p>Making gift-giving effortless, one recipient at a time.</p>
          </div>
        </div>
      `;
    } else if (type === 'gift_scheduled') {
      subject = `🎁 Gift scheduled for ${recipientName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin: 0 0 16px 0;">🎉 Gift Successfully Scheduled!</h2>
            <p style="color: #555; margin: 0;">Hi ${userName || 'there'},</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <p style="color: #555; margin: 0 0 16px 0;">Your gift for <strong>${recipientName}</strong> has been successfully scheduled and paid for!</p>
            
            <div style="background: #f1f8ff; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 12px 0;">Gift Details:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li><strong>Recipient:</strong> ${recipientName}</li>
                <li><strong>Occasion:</strong> ${giftDetails?.occasion || 'Not specified'}</li>
                <li><strong>Date:</strong> ${giftDetails?.occasionDate ? new Date(giftDetails.occasionDate).toLocaleDateString() : 'Not specified'}</li>
                <li><strong>Gift Type:</strong> ${giftDetails?.giftType || 'Curated selection'}</li>
                <li><strong>Budget:</strong> ${giftDetails?.priceRange || 'Not specified'}</li>
              </ul>
            </div>
            
            <p style="color: #555; margin: 16px 0;">What happens next:</p>
            <ol style="color: #555; margin: 0 0 16px 0; padding-left: 20px;">
              <li>Our team will curate the perfect gift based on their interests</li>
              <li>We'll purchase and wrap the gift with care</li>
              <li>The gift will be delivered on time for the occasion</li>
              <li>You'll receive tracking updates along the way</li>
            </ol>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://preview--unwrapt.lovable.app/" 
                 style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Your Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
            <p>Thanks for choosing Unwrapt!</p>
            <p>Sit back and relax - we've got this covered! 🎁</p>
          </div>
        </div>
      `;
    } else {
      throw new Error("Invalid email type");
    }

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unwrapt <notifications@unwrapt.com>",
        to: [userEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log(`Email sent successfully for ${type}:`, emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
      emailId: emailResult.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error sending notification email:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
