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
  | 'auto_reload_success'
  | 'auto_reload_failed'
  | 'automation_failed'
  | 'automation_paused'
  | 'trial_ending'
  | 'trial_ended'
  | 'subscription_cancelled'
  | 'order_cancelled';

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
    daysRemaining?: number;
    reloadAmount?: number;
    newBalance?: number;
    pauseReason?: string;
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

    console.log(`📧 Sending ${type} email to ${recipientEmail}`);

    const appUrl = "https://app.unwrapt.io";
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
    console.log(`✅ Email sent successfully for ${type}:`, emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      emailId: emailResult.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: errorMessage,
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
      return `🚨 URGENT: Address required TODAY for ${data?.recipientName}'s gift`;
    case 'gift_ready_to_ship':
      return `📦 ${data?.recipientName}'s gift is ready to ship!`;
    case 'gift_sent':
      return `✅ Gift shipped to ${data?.recipientName}!`;
    case 'gift_expired':
      return `⚠️ Gift for ${data?.recipientName} has expired`;
    case 'low_wallet_balance':
      return `💳 Low wallet balance - Add funds for upcoming gifts`;
    case 'auto_reload_success':
      return `✅ Wallet auto-reloaded with $${data?.reloadAmount?.toFixed(2)}`;
    case 'auto_reload_failed':
      return `⚠️ Auto-reload failed - Action required`;
    case 'automation_failed':
      return `⚠️ Automation issue for ${data?.recipientName}'s gift`;
    case 'automation_paused':
      return `⏸️ Automation paused for ${data?.recipientName}`;
    case 'trial_ending':
      return `⏳ Your VIP trial ends in ${data?.daysRemaining} days`;
    case 'trial_ended':
      return `Your VIP trial has ended - Upgrade to continue`;
    case 'subscription_cancelled':
      return `Your VIP subscription has been cancelled`;
    case 'order_cancelled':
      return `❌ Gift order for ${data?.recipientName} has been cancelled`;
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

    case 'address_escalation':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-urgent">
            <h2>🚨 URGENT: Address Required TODAY</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <div class="alert-urgent">
              <p><strong>This is your final notice!</strong></p>
              <p>The gift for <strong>${data?.recipientName}</strong> needs to ship TODAY to arrive on time for their ${data?.occasion}.</p>
            </div>
            <div class="info-box">
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              <p><strong>Occasion Date:</strong> ${formatDate(data?.occasionDate)}</p>
            </div>
            <p>If we don't receive the address within 24 hours, the gift will be cancelled and your wallet funds will be released.</p>
            <div class="cta">
              <a href="${data?.confirmationLink || appUrl}" class="button primary">Confirm Address NOW</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'gift_ready_to_ship':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>📦 Gift Ready to Ship!</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Great news! The gift for <strong>${data?.recipientName}</strong> is packaged and ready to ship!</p>
            ${data?.giftImage ? `
            <div class="gift-preview">
              <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;">
            </div>
            ` : ''}
            <div class="info-box">
              <h3>Shipment Details</h3>
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              <p><strong>Expected Delivery:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>
            <p>You'll receive tracking information as soon as the carrier picks up the package.</p>
            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'gift_sent':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-success">
            <h2>✅ Gift Shipped!</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Great news! The gift for <strong>${data?.recipientName}</strong> has been shipped and is on its way!</p>
            <div class="info-box">
              <h3>Tracking Information</h3>
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              ${data?.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
              <p><strong>Expected Delivery:</strong> ${formatDate(data?.deliveryDate)}</p>
            </div>
            <p>The gift should arrive right on time. Sit back and enjoy knowing you made someone's day special!</p>
            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'gift_expired':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>⚠️ Gift Expired</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Unfortunately, the automated gift for <strong>${data?.recipientName}'s ${data?.occasion}</strong> has expired because we didn't receive a shipping address in time.</p>
            <div class="info-box">
              <h3>What Happened</h3>
              <p>We reserved funds and sent multiple reminders requesting the shipping address, but didn't receive a response before the deadline.</p>
              <p><strong>Good news:</strong> Your reserved funds ($${data?.amount?.toFixed(2)}) have been released back to your wallet.</p>
            </div>
            <p>You can still send a belated gift manually from your dashboard.</p>
            <div class="cta">
              <a href="${appUrl}" class="button">Send a Belated Gift</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'low_wallet_balance':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>💳 Low Wallet Balance</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Your wallet balance is running low and may not cover upcoming automated gifts.</p>
            <div class="info-box">
              <p><strong>Current Balance:</strong> $${data?.currentBalance?.toFixed(2)}</p>
              ${data?.recipientName ? `<p><strong>Next Gift (${data.recipientName}):</strong> $${data?.requiredAmount?.toFixed(2)}</p>` : ''}
              <p><strong>Shortfall:</strong> $${((data?.requiredAmount || 0) - (data?.currentBalance || 0)).toFixed(2)}</p>
            </div>
            <p>Add funds now to ensure your automated gifts proceed smoothly, or enable auto-reload to never worry about low balance again.</p>
            <div class="cta">
              <a href="${appUrl}" class="button primary">Add Funds</a>
              <a href="${appUrl}/settings" class="button secondary">Enable Auto-Reload</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'auto_reload_success':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-success">
            <h2>✅ Wallet Auto-Reloaded</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Your wallet was running low, so we automatically reloaded it to keep your gift automations running smoothly.</p>
            <div class="info-box">
              <h3>Transaction Details</h3>
              <p><strong>Amount Charged:</strong> $${data?.reloadAmount?.toFixed(2)}</p>
              <p><strong>New Balance:</strong> $${data?.newBalance?.toFixed(2)}</p>
            </div>
            <p>Your upcoming automated gifts are all set! You can adjust your auto-reload settings anytime in your dashboard.</p>
            <div class="cta">
              <a href="${appUrl}/settings" class="button">Manage Auto-Reload</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'auto_reload_failed':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>⚠️ Auto-Reload Failed</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>We tried to automatically reload your wallet, but the payment didn't go through.</p>
            <div class="info-box">
              <h3>What This Means</h3>
              <p>Your payment method was declined or there was a processing error. Your upcoming automated gifts may be affected.</p>
              ${data?.error ? `<p><strong>Error:</strong> ${data.error}</p>` : ''}
            </div>
            <div class="alert">
              <p><strong>Action Required:</strong> Please update your payment method or manually add funds to ensure your gifts are sent on time.</p>
            </div>
            <div class="cta">
              <a href="${appUrl}/settings" class="button primary">Update Payment Method</a>
              <a href="${appUrl}" class="button secondary">Add Funds Manually</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'automation_failed':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>⚠️ Automation Issue</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>There was an issue processing the automated gift for <strong>${data?.recipientName}</strong>.</p>
            <div class="info-box">
              <h3>Details</h3>
              <p><strong>Recipient:</strong> ${data?.recipientName}</p>
              <p><strong>Occasion:</strong> ${data?.occasion}</p>
              ${data?.error ? `<p><strong>Issue:</strong> ${data.error}</p>` : ''}
            </div>
            <p>Don't worry - if funds were reserved, they've been released back to your wallet. You can try again or send the gift manually.</p>
            <div class="cta">
              <a href="${appUrl}" class="button">View Dashboard</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'automation_paused':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>⏸️ Automation Paused</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>The automation for <strong>${data?.recipientName}'s</strong> gift has been paused.</p>
            <div class="info-box">
              <h3>Why Was It Paused?</h3>
              <p>${data?.pauseReason || 'The automation was paused due to an issue that needs your attention.'}</p>
            </div>
            <p>You can resume automation once the issue is resolved, or choose to send the gift manually.</p>
            <div class="cta">
              <a href="${appUrl}" class="button">Resolve Issue</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'trial_ending':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>⏳ Your VIP Trial Ends Soon</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Your VIP trial ends in <strong>${data?.daysRemaining} days</strong>. After that, you'll be moved to our Free tier.</p>
            <div class="info-box">
              <h3>What You'll Lose</h3>
              <ul>
                <li>Unlimited recipient management (limited to 3)</li>
                <li>Gift automation features</li>
                <li>Wallet & auto-reload functionality</li>
                <li>Priority gift curation</li>
              </ul>
            </div>
            <div class="info-box success">
              <h3>Stay VIP for $24.99/month</h3>
              <p>Keep all your automation running and never miss an important gift!</p>
            </div>
            <div class="cta">
              <a href="${appUrl}/settings" class="button primary">Upgrade to VIP</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'trial_ended':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>Your VIP Trial Has Ended</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>Your VIP trial has ended and your account has been moved to our Free tier.</p>
            <div class="info-box">
              <h3>What's Changed</h3>
              <ul>
                <li>Only your first 3 recipients are accessible</li>
                <li>Automated gifts have been paused</li>
                <li>Wallet funds remain available for manual gifts</li>
              </ul>
            </div>
            <p>Don't let your gift automations lapse! Upgrade now to restore full access.</p>
            <div class="cta">
              <a href="${appUrl}/settings" class="button primary">Upgrade to VIP - $24.99/mo</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'subscription_cancelled':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Your VIP Subscription Has Been Cancelled</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>We're sorry to see you go! Your VIP subscription has been cancelled.</p>
            <div class="info-box">
              <h3>What Happens Now</h3>
              <ul>
                <li>Your VIP access continues until the end of your billing period</li>
                <li>After that, you'll move to the Free tier (3 recipients)</li>
                <li>Any scheduled automations will be paused</li>
                <li>Your wallet balance will remain available for manual gifts</li>
              </ul>
            </div>
            <p>Changed your mind? You can resubscribe anytime to restore your VIP access.</p>
            <div class="cta">
              <a href="${appUrl}/settings" class="button">Manage Subscription</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

    case 'order_cancelled':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header-warning">
            <h2>❌ Gift Order Cancelled</h2>
            <p>${greeting}</p>
          </div>
          <div class="content">
            <p>We're sorry to let you know that the gift order for <strong>${data?.recipientName}</strong> has been cancelled by the supplier.</p>
            <div class="info-box">
              <h3>What Happened</h3>
              <p>The order placed for <strong>${data?.recipientName}'s ${data?.occasion || 'gift'}</strong> was cancelled during fulfillment. This can happen due to stock issues or supplier availability.</p>
              <p><strong>Your payment of $${data?.amount?.toFixed(2) || '0.00'} has been refunded to your wallet.</strong></p>
            </div>
            <div class="info-box success">
              <h3>What You Can Do</h3>
              <p>You can schedule a new gift for ${data?.recipientName} right from your dashboard. We'll help you find the perfect alternative!</p>
            </div>
            <div class="cta">
              <a href="${appUrl}" class="button primary">Schedule a New Gift</a>
            </div>
          </div>
          ${getFooter()}
        </div>
      `;

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
      .header-success { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 24px; color: white; }
      .header-warning { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 32px 24px; color: white; }
      .header-urgent { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 32px 24px; color: white; }
      .header h2, .header-success h2, .header-warning h2, .header-urgent h2 { margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }
      .header p, .header-success p, .header-warning p, .header-urgent p { margin: 0; opacity: 0.95; }
      .content { padding: 32px 24px; color: #1A1A1A; }
      .content p { margin: 0 0 16px 0; line-height: 1.6; }
      .info-box { background: #FAF8F3; border-left: 4px solid #D2B887; padding: 16px; margin: 20px 0; border-radius: 4px; }
      .info-box.success { border-left-color: #10B981; background: #ECFDF5; }
      .info-box h3 { margin: 0 0 12px 0; font-size: 16px; color: #1A1A1A; }
      .info-box p { margin: 0 0 8px 0; }
      .info-box ul { margin: 0; padding-left: 20px; }
      .info-box li { margin: 8px 0; }
      .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px; color: #92400E; }
      .alert-urgent { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0; border-radius: 4px; color: #991B1B; }
      .gift-preview { text-align: center; margin: 20px 0; }
      .cta { text-align: center; margin: 32px 0 24px 0; }
      .button { display: inline-block; padding: 14px 28px; margin: 0 8px 8px 8px; text-decoration: none; border-radius: 8px; font-weight: 500; }
      .button.primary { background: #D2B887; color: #1A1A1A; }
      .button.secondary { background: white; color: #D2B887; border: 2px solid #D2B887; }
      .button:not(.primary):not(.secondary) { background: #D2B887; color: #1A1A1A; }
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
      <p style="font-size: 12px; margin-top: 16px;">
        <a href="https://app.unwrapt.io/settings" style="color: #999;">Manage notification preferences</a>
      </p>
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
  const baseStyles = getBaseEmailStyles();
  return `
    ${baseStyles}
    <div class="container">
      <div class="header">
        <h2>🎁 New Recipient Added!</h2>
        <p>${greeting}</p>
      </div>
      <div class="content">
        <p>Great news! You've successfully added <strong>${data?.recipientName}</strong> to your gift recipients list.</p>
        <div class="info-box">
          <h3>What You Can Do Now</h3>
          <ul>
            <li>Schedule gifts for upcoming occasions</li>
            <li>Set up automatic gift reminders</li>
            <li>Let Unwrapt handle all the gift selection and delivery</li>
          </ul>
        </div>
        <div class="cta">
          <a href="${appUrl}" class="button">Schedule a Gift for ${data?.recipientName}</a>
        </div>
      </div>
      ${getFooter()}
    </div>
  `;
}

function getGiftScheduledEmail(greeting: string, userName: string | undefined, data: any, appUrl: string): string {
  const baseStyles = getBaseEmailStyles();
  return `
    ${baseStyles}
    <div class="container">
      <div class="header">
        <h2>🎉 Gift Successfully Scheduled!</h2>
        <p>${greeting}</p>
      </div>
      <div class="content">
        <p>Your gift for <strong>${data?.recipientName}</strong> has been successfully scheduled!</p>
        <div class="info-box">
          <h3>Gift Details</h3>
          <p><strong>Recipient:</strong> ${data?.recipientName}</p>
          <p><strong>Occasion:</strong> ${data?.occasion || 'Not specified'}</p>
          <p><strong>Date:</strong> ${formatDate(data?.occasionDate)}</p>
          <p><strong>Gift Type:</strong> ${data?.giftType || 'Curated selection'}</p>
          ${data?.priceRange ? `<p><strong>Budget:</strong> ${data.priceRange}</p>` : ''}
        </div>
        <div class="info-box">
          <h3>What Happens Next</h3>
          <ul>
            <li>Our team will curate the perfect gift based on their interests</li>
            <li>We'll purchase and wrap the gift with care</li>
            <li>The gift will be delivered on time for the occasion</li>
            <li>You'll receive tracking updates along the way</li>
          </ul>
        </div>
        <div class="cta">
          <a href="${appUrl}" class="button">View Your Dashboard</a>
        </div>
      </div>
      ${getFooter()}
    </div>
  `;
}
