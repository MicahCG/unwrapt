// How a recipient's saved name goes to Goody. Goody requires only first_name (last_name is optional in
// recipients[] and in mailing_address), so a one-word name like "Kora" is sent as just "Kora" rather than
// padded with a placeholder that could end up on the package ("Kora Recipient").

export type GoodyName = { first_name: string; last_name?: string };

export const goodyRecipientName = (fullName: string | null | undefined): GoodyName => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "Gift";
  const last = parts.slice(1).join(" ");
  return last ? { first_name: first, last_name: last } : { first_name: first };
};
