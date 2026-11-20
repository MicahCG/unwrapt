// Shared look for every Unwrapt email: a complete HTML document (Gmail drops <style> blocks from loose
// fragments, which is why earlier emails arrived as plain black text), the current logo, and Thea.
// Pure functions, no I/O.

export const ASSET_BASE = "https://www.unwrapt.io/brand";
export const LOGO_URL = `${ASSET_BASE}/email-logo.png`;
export const THEA_URL = `${ASSET_BASE}/thea-avatar.png`;

const INK = "#2A2520";
const CREAM = "#FAF6EE";
const ACCENT = "#B65B3C";

/** Recipients imported from an event title can arrive as "Eric's Birthday"; show just the person. */
export const cleanPersonName = (name: unknown): string =>
  String(name ?? "")
    .replace(/\s*(?:['’]s)?\s*(?:birthday|bday|anniversary)\s*$/i, "")
    .trim() || String(name ?? "").trim();

/** A short line from Thea for the kinds of email where she is the one reaching out. */
export const theaNote = (type: string, data: { recipientName?: string; occasion?: string } = {}): string | null => {
  const who = data.recipientName ? cleanPersonName(data.recipientName) : "";
  const occasion = (data.occasion || "birthday").toLowerCase();
  switch (type) {
    case "occasion_reminder":
    case "gift_idea_reminder":
      return who
        ? `I noticed ${who}'s ${occasion} is coming up. Tell me what they like and I'll find something they'll love.`
        : "An occasion is coming up. Tell me what they like and I'll find something they'll love.";
    case "gift_tip":
      return who ? `I found something I think ${who} would love. Take a look.` : "I found a gift idea I think you'll like.";
    case "gift_tips_digest":
      return "I've been keeping an eye on your list. Here's who could use a gift soon.";
    case "recipient_added":
      return who ? `${who} is on your list. I'll remind you before their big days.` : "They're on your list. I'll remind you before their big days.";
    case "gift_scheduled":
    case "gift_confirmed_with_address":
    case "funds_reserved":
      return "All set on my end. I'll handle the timing and keep you posted.";
    case "order_placed":
      return "It's ordered. I'll keep an eye on it and let you know when it ships.";
    case "gift_sent":
      return "It's on its way. I'll let you know when it arrives.";
    default:
      return null;
  }
};

export const emailStyles = (): string => `
    <style>
      body { font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #EDE6D8; }
      .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; }
      .header, .header-success, .header-warning, .header-urgent { padding: 28px 28px 24px; }
      .header { background: ${CREAM}; }
      .header-success { background: #EEF0E4; }
      .header-warning { background: #FBEFE5; }
      .header-urgent { background: #9A3B2B; }
      .header h2, .header-success h2, .header-warning h2 { margin: 0 0 8px 0; font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 600; color: ${INK}; }
      .header-urgent h2 { margin: 0 0 8px 0; font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 600; color: #F4ECDD; }
      .header p, .header-success p, .header-warning p { margin: 0; color: #6B6256; font-size: 14px; }
      .header-urgent p { margin: 0; color: rgba(244,236,221,0.85); font-size: 14px; }
      .content { padding: 28px 28px 32px; color: ${INK}; }
      .content p { margin: 0 0 16px 0; line-height: 1.6; font-size: 15px; }
      .info-box { background: ${CREAM}; border: 1px solid rgba(42,37,32,0.08); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
      .info-box.success { background: #EEF0E4; border-color: rgba(110,123,91,0.25); }
      .info-box h3 { margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: ${INK}; text-transform: uppercase; letter-spacing: 0.04em; }
      .info-box p { margin: 0 0 8px 0; font-size: 14.5px; }
      .info-box p:last-child { margin-bottom: 0; }
      .info-box ul { margin: 0; padding-left: 18px; }
      .info-box li { margin: 6px 0; font-size: 14.5px; }
      .alert { background: #FBEFE5; border: 1px solid rgba(182,91,60,0.25); border-radius: 14px; padding: 16px 20px; margin: 20px 0; color: #8A4028; font-size: 14.5px; }
      .alert-urgent { background: #F5E3DE; border: 1px solid rgba(154,59,43,0.35); border-radius: 14px; padding: 16px 20px; margin: 20px 0; color: #7A2E20; font-size: 14.5px; }
      .gift-preview { text-align: center; margin: 20px 0; }
      .gift-preview img { border: 1px solid rgba(42,37,32,0.08); }
      .cta { text-align: center; margin: 28px 0 8px 0; }
      .button { display: inline-block; padding: 13px 26px; margin: 0 6px 10px 6px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14.5px; background: ${INK}; color: #F4ECDD; }
      .button.secondary { background: transparent; color: ${INK}; border: 1.5px solid rgba(42,37,32,0.3); }
      .footer a { color: ${ACCENT}; text-decoration: none; }
    </style>`;

const BUTTON_STYLE = `display:inline-block;padding:13px 26px;margin:0 6px 10px 6px;text-decoration:none;border-radius:999px;font-weight:600;font-size:14.5px;background:${INK};color:#F4ECDD;`;
const BUTTON_SECONDARY_STYLE = `display:inline-block;padding:13px 26px;margin:0 6px 10px 6px;text-decoration:none;border-radius:999px;font-weight:600;font-size:14.5px;background:transparent;color:${INK};border:1.5px solid rgba(42,37,32,0.3);`;
const H2_STYLE = `margin:0 0 8px 0;font-family:'Newsreader',Georgia,serif;font-size:22px;font-weight:600;color:${INK};`;

/** Mail clients that ignore <style> still get the parts that matter: buttons and headings. */
export const inlineCriticalStyles = (html: string): string =>
  html
    .replace(/<a ([^>]*?)class="button secondary"([^>]*)>/g, `<a $1class="button secondary" style="${BUTTON_SECONDARY_STYLE}"$2>`)
    .replace(/<a ([^>]*?)class="button(?: primary)?"([^>]*)>/g, `<a $1class="button" style="${BUTTON_STYLE}"$2>`)
    .replace(/<h2>/g, `<h2 style="${H2_STYLE}">`)
    .replace(/(<div class="header-urgent">\s*)<h2 style="[^"]*">/g, `$1<h2 style="${H2_STYLE.replace(INK, "#F4ECDD")}">`);

const brandBar = (): string => `
      <div style="padding:22px 28px;background:#FFFFFF;border-bottom:1px solid rgba(42,37,32,0.08);">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="34" height="39" alt="Unwrapt" style="display:block;" /></td>
          <td style="vertical-align:middle;padding-left:10px;font-family:'Newsreader',Georgia,serif;font-size:20px;font-weight:600;color:${INK};letter-spacing:0.01em;">Unwrapt</td>
        </tr></table>
      </div>`;

const theaStrip = (note: string): string => `
      <div style="padding:18px 28px;background:${CREAM};border-bottom:1px solid rgba(42,37,32,0.06);">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top;"><img src="${THEA_URL}" width="52" height="52" alt="Thea" style="display:block;border-radius:50%;border:2px solid #FFFFFF;" /></td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">Thea, your gifting agent</div>
            <div style="margin-top:3px;font-size:14.5px;line-height:1.5;color:${INK};">${note}</div>
          </td>
        </tr></table>
      </div>`;

const footer = (): string => `
      <div class="footer" style="text-align:center;padding:26px 24px;color:#9A8E7C;font-size:13px;background:${CREAM};border-top:1px solid rgba(42,37,32,0.06);">
        <img src="${THEA_URL}" width="36" height="36" alt="" style="display:inline-block;border-radius:50%;vertical-align:middle;" />
        <p style="margin:8px 0 2px;">Thea and the Unwrapt team</p>
        <p style="margin:2px 0;">Making gift-giving effortless 🎁</p>
        <p style="font-size:12px;margin:14px 0 0;"><a href="https://app.unwrapt.io/settings" style="color:${ACCENT};text-decoration:none;">Manage notification preferences</a></p>
      </div>`;

/** Escape text going into the Thea note (names come from user data). */
const esc = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The full document: brand bar, optional Thea note, the email's own content, footer. */
export const wrapEmail = (opts: { inner: string; theaNote?: string | null; preheader?: string; title?: string }): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${esc(opts.title || "Unwrapt")}</title>${emailStyles()}
  </head>
  <body style="margin:0;padding:24px 12px;background:#EDE6D8;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>` : ""}
    <div class="container" style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      ${brandBar()}
      ${opts.theaNote ? theaStrip(esc(opts.theaNote)) : ""}
      ${inlineCriticalStyles(opts.inner)}
      ${footer()}
    </div>
  </body>
</html>`;
