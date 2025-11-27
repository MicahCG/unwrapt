import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType =
  | 'recipient_added'
  | 'gift_scheduled'
  | 'automation_enabled'
  | 'funds_reserved'
  | 'gift_confirmed_with_address'
  | 'gift_confirmed_need_address'
  | 'address_confirmation_request'
  | 'address_confirmation_reminder'
  | 'address_escalation'
  | 'gift_ready_to_ship'
  | 'gift_sent'
  | 'gift_expired'
  | 'low_wallet_balance'
  | 'auto_reload_failed'
  | 'automation_failed';

interface EmailRequest {
  type: EmailType;
  recipientEmail: string;
  userName?: string;
  data?: {
    recipientName?: string;
    occasion?: string;
    occasionDate?: string;
    deliveryDate?: string;
    giftType?: string;
    giftDescription?: string;
    giftImage?: string;
    priceRange?: string;
    amount?: number;
    currentBalance?: number;
    requiredAmount?: number;
    confirmationLink?: string;
    trackingNumber?: string;
    error?: string;
    modifyLink?: string;
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

    const { type, recipientEmail, userName, data }: EmailRequest = await req.json();

    const appUrl = "https://unwrapt.com"; // Update this to your actual domain
    const subject = getEmailSubject(type, data);
    const htmlContent = getEmailContent(type, userName, data, appUrl);

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unwrapt <notifications@unwrapt.com>",
        to: [recipientEmail],
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

function getEmailSubject(type: EmailType, data: any): string {
  switch (type) {
    case 'recipient_added':
      return `✅ ${data?.recipientName} has been added to your gift list`;
    case 'gift_scheduled':
      return `🎁 Gift scheduled for ${data?.recipientName}`;
    case 'automation_enabled':
      return `✨ Automation enabled for ${data?.recipientName}'s ${data?.occasion}`;
    case 'funds_reserved':
      return `💰 Funds reserved for ${data?.recipientName}'s upcoming gift`;
    case 'gift_confirmed_with_address':
      return `🎁 Gift confirmed for ${data?.recipientName} - Processing now!`;
    case 'gift_confirmed_need_address':
      return `📍 Action needed: Confirm address for ${data?.recipientName}'s gift`;
    case 'address_confirmation_request':
      return `📬 Please confirm address for ${data?.recipientName}'s ${data?.occasion}`;
    case 'address_confirmation_reminder':
      return `⏰ Reminder: Address needed for ${data?.recipientName}'s gift`;
    case 'address_escalation':
      return `🚨 Urgent: Address required for ${data?.recipientName}'s gift`;
    case 'gift_ready_to_ship':
      return `📦 ${data?.recipientName}'s gift is ready to ship!`;
    case 'gift_sent':
      return `✅ Gift sent to ${data?.recipientName}!`;
    case 'gift_expired':
      return `Gift for ${data?.recipientName} expired`;
    case 'low_wallet_balance':
      return `💳 Low wallet balance - Add funds for upcoming gifts`;
    case 'auto_reload_failed':
      return `⚠️ Auto-reload failed - Action required`;
    case 'automation_failed':
      return `⚠️ Automation issue for ${data?.recipientName}`;
    default:
      return 'Notification from Unwrapt';
  }
}

function getEmailContent(type: EmailType, userName: string | undefined, data: any, appUrl: string): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,';
  const baseStyles = getBaseEmailStyles();

  switch (type) {
    case 'automation_enabled':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>✨ Automation Enabled!</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Great news! Automation has been enabled for <strong>${data?.recipientName}'s ${data?.occasion}</strong>.</p>

            <div class="info-box">
              <h3>📅 What Happens Next</h3>
              <ul>
                <li><strong>14 days before:</strong> We'll reserve $${data?.amount?.toFixed(2)} from your wallet</li>
                <li><strong>10 days before:</strong> You'll confirm the shipping address</li>
                <li><strong>3 days before:</strong> Gift ships and arrives on time</li>
              </ul>
            </div>

            <p>Sit back and relax - we've got this covered!</p>

            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'funds_reserved':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>💰 Funds Reserved</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>We've reserved <strong>$${data?.amount?.toFixed(2)}</strong> from your wallet for ${data?.recipientName}'s upcoming ${data?.occasion}.</p>

            <div class="info-box">
              <p><strong>Occasion Date:</strong> ${formatDate(data?.occasionDate)}</p>
              <p><strong>Delivery Date:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>

            <p>These funds are reserved but not charged yet. They'll be charged when we purchase and ship the gift.</p>

            <div class="cta">
              <a href="${appUrl}" class="button">View Details</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'gift_confirmed_with_address':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>🎁 Gift Confirmed & Processing!</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Excellent news! We've confirmed your gift for <strong>${data?.recipientName}</strong> and it's being processed now.</p>

            ${data?.giftImage ? `
            <div class="gift-preview">
              <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;">
            </div>
            ` : ''}

            <div class="info-box">
              <h3>Gift Details</h3>
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              <p><strong>Gift:</strong> ${data?.giftDescription || 'Curated selection'}</p>
              <p><strong>Delivery Date:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>

            <p>Your wallet has been charged and the gift is ready to ship. You'll receive tracking information soon!</p>

            <div class="cta">
              <a href="${data?.modifyLink || appUrl}" class="button secondary">Modify Gift</a>
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'gift_confirmed_need_address':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>📍 Action Needed: Confirm Address</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Your gift for <strong>${data?.recipientName}</strong> is ready, but we need you to confirm the shipping address!</p>

            ${data?.giftImage ? `
            <div class="gift-preview">
              <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;">
            </div>
            ` : ''}

            <div class="info-box">
              <h3>Gift Details</h3>
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              <p><strong>Gift:</strong> ${data?.giftDescription || 'Curated selection'}</p>
              <p><strong>Needs to arrive by:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>

            <div class="alert">
              ⚠️ <strong>Time-sensitive:</strong> Please confirm the address within 3 days to ensure on-time delivery!
            </div>

            <div class="cta">
              <a href="${data?.confirmationLink || appUrl}" class="button primary">Confirm Address Now</a>
              <a href="${data?.modifyLink || appUrl}" class="button secondary">Modify Gift</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'address_confirmation_request':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>📬 Please Confirm Shipping Address</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>We're getting ready to send a gift to <strong>${data?.recipientName}</strong> for their ${data?.occasion}!</p>

            <div class="info-box">
              <p><strong>Occasion Date:</strong> ${formatDate(data?.occasionDate)}</p>
              <p><strong>Planned Delivery:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>

            <p>To ensure on-time delivery, please confirm the shipping address.</p>

            <div class="cta">
              <a href="${data?.confirmationLink || appUrl}" class="button">Confirm Address</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'address_confirmation_reminder':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>⏰ Reminder: Address Confirmation Needed</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Just a friendly reminder that we still need the shipping address for ${data?.recipientName}'s ${data?.occasion} gift.</p>

            <div class="alert">
              <p>⏳ <strong>Time is running out!</strong> Gift needs to ship by ${formatDate(data?.deliveryDate)}.</p>
            </div>

            <div class="cta">
              <a href="${data?.confirmationLink || appUrl}" class="button">Confirm Address Now</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'gift_sent':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>✅ Gift Sent!</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Great news! The gift for <strong>${data?.recipientName}</strong> has been shipped and is on its way!</p>

            <div class="info-box">
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              ${data?.trackingNumber ? `<p><strong>Tracking:</strong> ${data.trackingNumber}</p>` : ''}
            </div>

            <p>The gift should arrive right on time. Sit back and enjoy knowing you made someone's day special!</p>

            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    case 'low_wallet_balance':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>💳 Low Wallet Balance</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>Your wallet balance is running low and may not cover upcoming automated gifts.</p>

            <div class="info-box">
              <p><strong>Current Balance:</strong> $${data?.currentBalance?.toFixed(2)}</p>
              <p><strong>Required for ${data?.recipientName}:</strong> $${data?.requiredAmount?.toFixed(2)}</p>
              <p><strong>Shortfall:</strong> $${((data?.requiredAmount || 0) - (data?.currentBalance || 0)).toFixed(2)}</p>
            </div>

            <p>Add funds now to ensure your automated gifts proceed smoothly.</p>

            <div class="cta">
              <a href="${appUrl}" class="button">Add Funds</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;

    // Previous email types (recipient_added, gift_scheduled) kept for backward compatibility
    case 'recipient_added':
      return getRecipientAddedEmail(greeting, userName, data, appUrl);

    case 'gift_scheduled':
      return getGiftScheduledEmail(greeting, userName, data, appUrl);

    default:
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Notification from Unwrapt</h2>
            <p>${greeting}</p>
          </div>

          <div class="content">
            <p>You have a new notification from Unwrapt.</p>

            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>

          ${getFooter()}
        </div>
      `;
  }
}

function getBaseEmailStyles(): string {
  return `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; background: white; }
      .header { background: linear-gradient(135deg, #D2B887 0%, #B8986C 100%); padding: 32px 24px; color: white; }
      .header h2 { margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }
      .header p { margin: 0; opacity: 0.95; }
      .content { padding: 32px 24px; color: #1A1A1A; }
      .content p { margin: 0 0 16px 0; line-height: 1.6; }
      .info-box { background: #FAF8F3; border-left: 4px solid #D2B887; padding: 16px; margin: 20px 0; border-radius: 4px; }
      .info-box h3 { margin: 0 0 12px 0; font-size: 16px; color: #1A1A1A; }
      .info-box p { margin: 0 0 8px 0; }
      .info-box ul { margin: 0; padding-left: 20px; }
      .info-box li { margin: 8px 0; }
      .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px; color: #92400E; }
      .gift-preview { text-align: center; margin: 20px 0; }
      .cta { text-align: center; margin: 32px 0 24px 0; }
      .button { display: inline-block; padding: 14px 28px; margin: 0 8px 8px 8px; text-decoration: none; border-radius: 8px; font-weight: 500; }
      .button.primary { background: #D2B887; color: #1A1A1A; }
      .button.secondary { background: white; color: #D2B887; border: 2px solid #D2B887; }
      .button:not(.secondary) { background: #D2B887; color: #1A1A1A; }
      .footer { text-align: center; padding: 24px; color: #999; font-size: 14px; background: #FAF8F3; }
      .footer p { margin: 8px 0; }
    </style>
  `;
}

function getFooter(): string {
  return `
    <div class="footer">
      <p>Thanks for using Unwrapt!</p>
      <p>Making gift-giving effortless 🎁</p>
    </div>
  `;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function getRecipientAddedEmail(greeting: string, userName: string | undefined, data: any, appUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin: 0 0 16px 0;">🎁 New Recipient Added!</h2>
        <p style="color: #555; margin: 0;">${greeting}</p>
      </div>

      <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <p style="color: #555; margin: 0 0 16px 0;">Great news! You've successfully added <strong>${data?.recipientName}</strong> to your gift recipients list.</p>

        <p style="color: #555; margin: 0 0 16px 0;">Now you can:</p>
        <ul style="color: #555; margin: 0 0 16px 0; padding-left: 20px;">
          <li>Schedule gifts for upcoming occasions</li>
          <li>Set up automatic gift reminders</li>
          <li>Let Unwrapt handle all the gift selection and delivery</li>
        </ul>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}"
             style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Schedule a Gift for ${data?.recipientName}
          </a>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
        <p>Thanks for using Unwrapt!</p>
        <p>Making gift-giving effortless, one recipient at a time.</p>
      </div>
    </div>
  `;
}

function getGiftScheduledEmail(greeting: string, userName: string | undefined, data: any, appUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin: 0 0 16px 0;">🎉 Gift Successfully Scheduled!</h2>
        <p style="color: #555; margin: 0;">${greeting}</p>
      </div>

      <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
        <p style="color: #555; margin: 0 0 16px 0;">Your gift for <strong>${data?.recipientName}</strong> has been successfully scheduled and paid for!</p>

        <div style="background: #f1f8ff; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="color: #2c3e50; margin: 0 0 12px 0;">Gift Details:</h3>
          <ul style="color: #555; margin: 0; padding-left: 20px;">
            <li><strong>Recipient:</strong> ${data?.recipientName}</li>
            <li><strong>Occasion:</strong> ${data?.occasion || 'Not specified'}</li>
            <li><strong>Date:</strong> ${formatDate(data?.occasionDate)}</li>
            <li><strong>Gift Type:</strong> ${data?.giftType || 'Curated selection'}</li>
            <li><strong>Budget:</strong> ${data?.priceRange || 'Not specified'}</li>
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
          <a href="${appUrl}"
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
}
