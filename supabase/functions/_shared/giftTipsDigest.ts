// One weekly "gift ideas" email per user, listing every upcoming occasion that still has
// no gift scheduled. Pure functions (no I/O) so they are easy to test.

export type DigestItem = {
  recipientName: string;
  occasion: string; // "birthday" | "anniversary"
  /** YYYY-MM-DD of the next occurrence's month/day source date. */
  occasionDate: string;
  daysAway: number;
  /** Only set when the catalog genuinely matched the recipient's interests. */
  pick?: { title: string; image?: string | null; price?: number | null } | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "2026-12-28" -> "Dec 28" (parsed by hand so timezones can't shift the day). */
export const formatOccasionDate = (iso: string): string => {
  const [, m, d] = iso.split("-").map(Number);
  return MONTHS[m - 1] && d ? `${MONTHS[m - 1]} ${d}` : iso;
};

export const daysLabel = (days: number): string =>
  days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

const joinNames = (names: string[]): string =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export const digestSubject = (items: DigestItem[]): string => {
  if (items.length === 1) {
    const i = items[0];
    return `🎂 ${i.recipientName}'s ${i.occasion} is ${daysLabel(i.daysAway)} (${formatOccasionDate(i.occasionDate)})`;
  }
  const shown = items.slice(0, 3).map((i) => i.recipientName);
  const rest = items.length - shown.length;
  const names = rest > 0 ? `${shown.join(", ")} and ${rest} more` : joinNames(shown);
  return `🎂 ${items.length} gifts to plan: ${names}`;
};

export const digestInnerHtml = (greeting: string, items: DigestItem[], appUrl: string): string => {
  const cards = items
    .map((i) => {
      const name = escapeHtml(i.recipientName);
      const when = `${escapeHtml(i.occasion)} · ${formatOccasionDate(i.occasionDate)} (${daysLabel(i.daysAway)})`;
      const idea = i.pick
        ? `
            ${i.pick.image ? `<img src="${escapeHtml(i.pick.image)}" alt="${escapeHtml(i.pick.title)}" style="width:100%;max-width:240px;border-radius:12px;display:block;margin:10px 0;" />` : ""}
            <p style="margin:6px 0;"><strong>Idea: ${escapeHtml(i.pick.title)}</strong>${typeof i.pick.price === "number" ? ` <span style="color:#9A8E7C;">$${i.pick.price.toFixed(2)}</span>` : ""}</p>`
        : `
            <p style="margin:6px 0;color:#6B6258;">No gift scheduled yet. Tell Thea what ${name} likes and she'll suggest ideas.</p>`;
      return `
          <div class="info-box" style="margin-bottom:14px;">
            <p style="margin:0;"><strong>${name}</strong></p>
            <p style="margin:2px 0 0;color:#6B6258;">${when}</p>${idea}
            <p style="margin:10px 0 0;"><a href="${appUrl}" class="button primary">Plan ${name}'s gift</a></p>
          </div>`;
    })
    .join("");

  return `
        <div class="header">
          <h2>🎂 ${items.length === 1 ? "A gift to plan" : `${items.length} gifts to plan`}</h2>
          <p>${greeting}</p>
        </div>
        <div class="content">
          <p>${items.length === 1 ? "Someone" : "These people"} on your list ${items.length === 1 ? "has" : "have"} an occasion coming up and no gift scheduled yet:</p>
          ${cards}
        </div>
      `;
};
