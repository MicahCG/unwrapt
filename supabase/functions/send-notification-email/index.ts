import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { digestInnerHtml, digestSubject, type DigestItem } from "../_shared/giftTipsDigest.ts";

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
  | 'order_cancelled'
  | 'occasion_reminder'
  | 'gift_tip'
  | 'gift_idea_reminder'
  | 'gift_tips_digest';

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
    items?: DigestItem[];
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
    // Never send the old vague "You have a new notification" fallback: an unknown type is a bug
    // in the caller, so fail loudly instead of emailing a user something with no details.
    if (subject === null) {
      console.error(`Unknown email type "${type}" - not sending`);
      return new Response(JSON.stringify({ success: false, error: `Unknown email type: ${type}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const htmlContent = getEmailContent(type, userName, data, appUrl);

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Unwrapt <notifications@unwrapt.io>",
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

function getEmailSubject(type: EmailType, data: any): string | null {
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
    case 'occasion_reminder':
      return `🎂 ${data?.recipientName}'s ${data?.occasion} is in ${data?.daysRemaining} days`;
    case 'gift_tip':
      return `✨ A gift idea for ${data?.recipientName}`;
    case 'gift_idea_reminder':
      return `🎂 ${data?.recipientName}'s ${data?.occasion || 'birthday'} is coming up`;
    case 'gift_tips_digest':
      return Array.isArray(data?.items) && data.items.length > 0 ? digestSubject(data.items) : null;
    default:
      return null;
  }
}

function getEmailContent(type: EmailType, userName: string | undefined, data: any, appUrl: string): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,';
  const inner = getEmailInner(type, greeting, data, appUrl);

  return `
    ${getBaseEmailStyles()}
    <div class="container">
      ${getBrandBar()}
      ${inner}
      ${getFooter()}
    </div>
  `;
}

function getEmailInner(type: EmailType, greeting: string, data: any, appUrl: string): string {
  switch (type) {
    case 'automation_enabled':
      return `
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
      `;

    case 'funds_reserved':
      return `
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
      `;

    case 'gift_confirmed_with_address':
      return `
        <div class="header">
          <h2>🎁 Gift Confirmed & Processing!</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>Excellent news! We've confirmed your gift for <strong>${data?.recipientName}</strong> and it's being processed now.</p>
          ${data?.giftImage ? `
          <div class="gift-preview">
            <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 14px; margin: 16px 0;">
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
      `;

    case 'gift_confirmed_need_address':
      return `
        <div class="header">
          <h2>📍 Action Needed: Confirm Address</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>Your gift for <strong>${data?.recipientName}</strong> is ready, but we need you to confirm the shipping address!</p>
          ${data?.giftImage ? `
          <div class="gift-preview">
            <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 14px; margin: 16px 0;">
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
      `;

    case 'address_confirmation_request':
      return `
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
      `;

    case 'address_confirmation_reminder':
      return `
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
      `;

    case 'address_escalation':
      return `
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
      `;

    case 'gift_ready_to_ship':
      return `
        <div class="header">
          <h2>📦 Gift Ready to Ship!</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>Great news! The gift for <strong>${data?.recipientName}</strong> is packaged and ready to ship!</p>
          ${data?.giftImage ? `
          <div class="gift-preview">
            <img src="${data.giftImage}" alt="${data?.giftDescription}" style="max-width: 100%; border-radius: 14px; margin: 16px 0;">
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
      `;

    case 'gift_sent':
      return `
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
      `;

    case 'gift_expired':
      return `
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
      `;

    case 'low_wallet_balance':
      return `
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
      `;

    case 'auto_reload_success':
      return `
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
      `;

    case 'auto_reload_failed':
      return `
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
      `;

    case 'automation_failed':
      return `
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
          <p>Don't worry — the money for this gift is still in your wallet, and nothing extra was charged. We'll try again, and you can also ask Thea to place it now.</p>
          <div class="cta">
            <a href="${appUrl}" class="button">View Dashboard</a>
          </div>
        </div>
      `;

    case 'automation_paused':
      return `
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
      `;

    case 'trial_ending':
      return `
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
      `;

    case 'trial_ended':
      return `
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
      `;

    case 'subscription_cancelled':
      return `
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
      `;

    case 'order_cancelled':
      return `
        <div class="header-warning">
          <h2>❌ Gift Order Cancelled</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>We're sorry to let you know that the gift order for <strong>${data?.recipientName}</strong> has been cancelled by the supplier.</p>
          <div class="info-box">
            <h3>What Happened</h3>
            <p>The order placed for <strong>${data?.recipientName}'s ${data?.occasion || 'gift'}</strong> was cancelled during fulfillment. This can happen due to stock issues or supplier availability.</p>
            <p><strong>${data?.recipientName} will not be receiving a gift for this occasion.</strong></p>
          </div>
          <div class="info-box success">
            <h3>What You Can Do</h3>
            <p>You can schedule a new gift for ${data?.recipientName} right from your dashboard. We'll help you find the perfect alternative!</p>
          </div>
          <div class="cta">
            <a href="${appUrl}" class="button primary">Schedule a New Gift</a>
          </div>
        </div>
      `;

    case 'recipient_added':
      return getRecipientAddedInner(greeting, data, appUrl);

    case 'gift_scheduled':
      return getGiftScheduledInner(greeting, data, appUrl);

    case 'occasion_reminder':
      return `
        <div class="header">
          <h2>🎂 ${data?.recipientName}'s ${data?.occasion} is coming up</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p><strong>${data?.recipientName}'s</strong> ${data?.occasion} is in <strong>${data?.daysRemaining} days</strong> (${formatDate(data?.occasionDate)}).</p>
          <div class="info-box">
            <p>Schedule a gift now so it has time to arrive  -  or let Thea handle it for you.</p>
          </div>
          <div class="cta">
            <a href="${data?.modifyLink || appUrl}" class="button primary">Plan ${data?.recipientName}'s gift</a>
          </div>
        </div>
      `;

    case 'gift_tip':
      return `
        <div class="header">
          <h2>✨ A gift idea for ${data?.recipientName}</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>${data?.recipientName} doesn't have a gift scheduled yet${data?.occasion ? ` for their ${data?.occasion}` : ''}. Thea found something that fits your usual budget:</p>
          <div class="info-box">
            ${data?.giftImage ? `<img src="${data.giftImage}" alt="${data?.giftDescription || 'Gift idea'}" style="width:100%;max-width:280px;border-radius:14px;display:block;margin:0 auto 12px;" />` : ''}
            <p style="text-align:center;"><strong>${data?.giftDescription || 'A curated pick'}</strong></p>
            ${data?.priceRange ? `<p style="text-align:center;color:#9A8E7C;">${data.priceRange}</p>` : ''}
          </div>
          <div class="cta">
            <a href="${data?.modifyLink || appUrl}" class="button primary">See this idea</a>
          </div>
        </div>
      `;

    case 'gift_tips_digest':
      return digestInnerHtml(greeting, data?.items ?? [], appUrl);

    case 'gift_idea_reminder':
      return `
        <div class="header">
          <h2>🎂 ${data?.recipientName}'s ${data?.occasion || 'birthday'} is coming up</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p><strong>${data?.recipientName}'s</strong> ${data?.occasion || 'birthday'} is coming up and there's no gift scheduled yet.</p>
          <div class="cta">
            <a href="${data?.modifyLink || appUrl}" class="button primary">Plan ${data?.recipientName}'s gift</a>
          </div>
        </div>
      `;

    default:
      return `
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
      `;
  }
}

const LOGO_URL = "https://www.unwrapt.io/lovable-uploads/unwrapt-lux.png";

function getBrandBar(): string {
  return `
    <div class="brand-bar">
      <img src="${LOGO_URL}" width="36" height="36" alt="Unwrapt" />
      <span class="brand-name">Unwrapt</span>
    </div>
  `;
}

function getBaseEmailStyles(): string {
  return `
    <style>
      body { font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #EDE6D8; }
      .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; }
      .brand-bar { text-align: center; padding: 24px 24px 20px; background: #FFFFFF; border-bottom: 1px solid rgba(42,37,32,0.08); }
      .brand-bar img { vertical-align: middle; border-radius: 50%; }
      .brand-bar .brand-name { display: inline-block; vertical-align: middle; margin-left: 10px; font-family: 'Newsreader', Georgia, serif; font-size: 18px; font-weight: 600; color: #2A2520; letter-spacing: 0.01em; }
      .header, .header-success, .header-warning, .header-urgent { padding: 28px 28px 24px; }
      .header { background: #FAF6EE; }
      .header-success { background: #EEF0E4; }
      .header-warning { background: #FBEFE5; }
      .header-urgent { background: #9A3B2B; }
      .header h2, .header-success h2, .header-warning h2 { margin: 0 0 8px 0; font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 600; color: #2A2520; }
      .header-urgent h2 { margin: 0 0 8px 0; font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 600; color: #F4ECDD; }
      .header p, .header-success p, .header-warning p { margin: 0; color: #6B6256; font-size: 14px; }
      .header-urgent p { margin: 0; color: rgba(244,236,221,0.85); font-size: 14px; }
      .content { padding: 28px 28px 32px; color: #2A2520; }
      .content p { margin: 0 0 16px 0; line-height: 1.6; font-size: 15px; }
      .info-box { background: #FAF6EE; border: 1px solid rgba(42,37,32,0.08); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
      .info-box.success { background: #EEF0E4; border-color: rgba(110,123,91,0.25); }
      .info-box h3 { margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #2A2520; text-transform: uppercase; letter-spacing: 0.04em; }
      .info-box p { margin: 0 0 8px 0; font-size: 14.5px; }
      .info-box p:last-child { margin-bottom: 0; }
      .info-box ul { margin: 0; padding-left: 18px; }
      .info-box li { margin: 6px 0; font-size: 14.5px; }
      .alert { background: #FBEFE5; border: 1px solid rgba(182,91,60,0.25); border-radius: 14px; padding: 16px 20px; margin: 20px 0; color: #8A4028; font-size: 14.5px; }
      .alert-urgent { background: #F5E3DE; border: 1px solid rgba(154,59,43,0.35); border-radius: 14px; padding: 16px 20px; margin: 20px 0; color: #7A2E20; font-size: 14.5px; }
      .gift-preview { text-align: center; margin: 20px 0; }
      .gift-preview img { border: 1px solid rgba(42,37,32,0.08); }
      .cta { text-align: center; margin: 28px 0 8px 0; }
      .button { display: inline-block; padding: 13px 26px; margin: 0 6px 10px 6px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14.5px; background: #2A2520; color: #F4ECDD; }
      .button.secondary { background: transparent; color: #2A2520; border: 1.5px solid rgba(42,37,32,0.3); }
      .footer { text-align: center; padding: 28px 24px; color: #9A8E7C; font-size: 13px; background: #FAF6EE; border-top: 1px solid rgba(42,37,32,0.06); }
      .footer p { margin: 6px 0; }
      .footer a { color: #B65B3C; text-decoration: none; }
    </style>
  `;
}

function getFooter(): string {
  return `
    <div class="footer">
      <p>Thanks for using Unwrapt!</p>
      <p>Making gift-giving effortless 🎁</p>
      <p style="font-size: 12px; margin-top: 16px;">
        <a href="https://app.unwrapt.io/settings">Manage notification preferences</a>
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

function getRecipientAddedInner(greeting: string, data: any, appUrl: string): string {
  return `
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
  `;
}

function getGiftScheduledInner(greeting: string, data: any, appUrl: string): string {
  return `
    <div class="header">
      <h2>🎉 Gift Successfully Scheduled!</h2>
      <p>${greeting}</p>
    </div>
    <div class="content">
      <p>Your gift for <strong>${data?.recipientName}</strong> has been successfully scheduled!</p>
      ${data?.giftImage ? `
      <div class="gift-preview">
        <img src="${data.giftImage}" alt="${data?.giftType || 'Gift'}" style="max-width: 100%; border-radius: 14px; margin: 16px 0;">
      </div>
      ` : ''}
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
  `;
}
