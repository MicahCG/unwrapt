import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// Daily cron job (see migration 20261016_schedule_notification_emails.sql).
// Emails users REMINDER_LEAD_DAYS before a recipient's birthday/anniversary,
// gated on profiles.email_reminders. Dedups through notification_queue so a
// given occurrence is only ever emailed once.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_LEAD_DAYS = 7;

/** Roll a recurring MM-DD date (stored as YYYY-MM-DD) forward to its next occurrence. */
function nextOccurrenceISO(dateString: string, today: Date): string {
  const [, month, day] = dateString.split("-").map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  thisYear.setHours(0, 0, 0, 0);
  const next = thisYear.getTime() < today.getTime()
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear;
  return next.toISOString().split("T")[0];
}

function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: recipients, error } = await supabaseClient
      .from("recipients")
      .select("id, name, birthday, anniversary, profiles!inner(email, full_name, email_reminders)")
      .eq("profiles.email_reminders", true);

    if (error) throw error;

    let sent = 0;
    let skipped = 0;

    for (const recipient of recipients || []) {
      const profile = (recipient as any).profiles;
      if (!profile?.email) continue;

      const occasions: Array<["birthday" | "anniversary", string | null]> = [
        ["birthday", recipient.birthday],
        ["anniversary", recipient.anniversary],
      ];

      for (const [occasionType, dateValue] of occasions) {
        if (!dateValue) continue;

        const nextDate = nextOccurrenceISO(dateValue, today);
        if (daysUntil(nextDate, today) !== REMINDER_LEAD_DAYS) continue;

        const { data: existing } = await supabaseClient
          .from("notification_queue")
          .select("id")
          .eq("notification_type", "occasion_reminder")
          .eq("user_email", profile.email)
          .eq("recipient_name", recipient.name)
          .eq("occasion_date", nextDate)
          .eq("status", "sent")
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        try {
          const { error: sendError } = await supabaseClient.functions.invoke("send-notification-email", {
            body: {
              type: "occasion_reminder",
              recipientEmail: profile.email,
              userName: profile.full_name,
              data: {
                recipientName: recipient.name,
                occasion: occasionType,
                occasionDate: nextDate,
                daysRemaining: REMINDER_LEAD_DAYS,
                modifyLink: "https://app.unwrapt.io/",
              },
            },
          });
          if (sendError) throw sendError;

          await supabaseClient.from("notification_queue").insert({
            notification_type: "occasion_reminder",
            user_email: profile.email,
            user_name: profile.full_name,
            recipient_name: recipient.name,
            occasion_type: occasionType,
            occasion_date: nextDate,
            status: "sent",
            processed_at: new Date().toISOString(),
          });
          sent++;
        } catch (sendError) {
          console.error(`Failed to send occasion reminder for ${recipient.name}:`, sendError);
          await supabaseClient.from("notification_queue").insert({
            notification_type: "occasion_reminder",
            user_email: profile.email,
            user_name: profile.full_name,
            recipient_name: recipient.name,
            occasion_type: occasionType,
            occasion_date: nextDate,
            status: "failed",
            error_message: sendError instanceof Error ? sendError.message : String(sendError),
            processed_at: new Date().toISOString(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error sending occasion reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
