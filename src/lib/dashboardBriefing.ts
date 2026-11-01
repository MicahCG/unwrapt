import { cleanName } from '@/lib/utils';
import { getDaysUntil, getNextOccurrence, formatOccasionDate } from '@/lib/dateUtils';
import {
  getGiftStatus,
  getRecipientStatus,
  giftStage,
  isWalletGift,
  hasRecipientAddress,
  type GiftRecord,
  type RecipientRecord,
} from '@/lib/giftStatus';
import { findResumableGift } from '@/lib/giftPayment';

export type BriefingItem = {
  recipientId: string;
  recipientName: string;
  label: string;
  detail: string;
  kind: 'upcoming' | 'needs_info' | 'in_motion' | 'recent';
  action?: 'address' | 'interests' | 'payment' | 'review' | 'open';
  /** For 'payment': the gift waiting on funds. */
  giftId?: string;
};

export type DashboardBriefing = {
  upcoming: BriefingItem[];
  needsInfo: BriefingItem[];
  inMotion: BriefingItem[];
  recentlyDelivered: BriefingItem[];
};

const firstName = (name: string) => cleanName(name).split(/\s+/)[0] || 'them';

/** profiles.autopilot_level -> the $ amount Thea can confirm without asking first. */
export const AUTOPILOT_THRESHOLDS: Record<string, number> = {
  always: 0,
  ask100: 100,
  ask250: 250,
};

/**
 * A reserved gift needs the user's review unless its cost falls at or under
 * their autopilot threshold - above that (or when cost isn't known yet),
 * Thea surfaces it instead of confirming silently.
 */
const giftNeedsReview = (g: GiftRecord, autopilotThreshold: number) => {
  // 'approved': the user already approved this exact gift in Thea's chat.
  if (!g?.wallet_reserved || g?.fulfilled_at || g?.status === 'ordered' || g?.status === 'delivered' || g?.status === 'approved') {
    return false;
  }
  const cost = g?.estimated_cost;
  if (cost == null) return true;
  return cost > autopilotThreshold;
};

/** Derive Thea briefing buckets from live recipient + gift rows. */
export function buildDashboardBriefing(
  recipients: RecipientRecord[],
  autopilotThreshold: number = AUTOPILOT_THRESHOLDS.ask100,
): DashboardBriefing {
  const upcoming: BriefingItem[] = [];
  const needsInfo: BriefingItem[] = [];
  // Gifts that can't go out until they're paid for lead the briefing.
  const needsFunds: BriefingItem[] = [];
  const inMotion: BriefingItem[] = [];
  const recentlyDelivered: BriefingItem[] = [];

  for (const recipient of recipients) {
    const name = firstName(recipient.name);
    const occasionDate = recipient.birthday || recipient.anniversary;
    const occasionLabel = recipient.birthday ? 'birthday' : recipient.anniversary ? 'anniversary' : 'occasion';
    const status = getRecipientStatus(recipient);

    if (occasionDate) {
      const days = getDaysUntil(occasionDate);
      if (days != null && days <= 60) {
        upcoming.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: `${name}'s ${occasionLabel}`,
          detail: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days · ${formatOccasionDate(occasionDate)}`,
          kind: 'upcoming',
          action: 'open',
        });
      }
    }

    if (!hasRecipientAddress(recipient) && occasionDate) {
      const days = getDaysUntil(occasionDate);
      if (days != null && days <= 90) {
        needsInfo.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: `Need ${name}'s address`,
          detail: `So I can plan their ${occasionLabel}`,
          kind: 'needs_info',
          action: 'address',
        });
      }
    }

    if (!(recipient.interests || []).length) {
      needsInfo.push({
        recipientId: recipient.id,
        recipientName: cleanName(recipient.name),
        label: `Tell me about ${name}`,
        detail: 'Gift preferences help me pick well',
        kind: 'needs_info',
        action: 'interests',
      });
    }

    const resumable = findResumableGift(recipient);
    if (resumable) {
      needsFunds.push({
        recipientId: recipient.id,
        recipientName: cleanName(recipient.name),
        label: `Finish ${name}'s payment`,
        detail: 'Checkout was started but not completed',
        kind: 'needs_info',
        action: 'payment',
        giftId: resumable.id,
      });
    }

    for (const gift of recipient.scheduled_gifts || []) {
      const closed = ['cancelled', 'canceled', 'expired', 'archived'].includes((gift.status || '').toLowerCase());
      if (!closed && isWalletGift(gift) && giftStage(gift) === 'scheduled') {
        needsFunds.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: `Add funds for ${name}'s gift`,
          detail: gift.gift_type || gift.gift_description || 'Approved, waiting on wallet funds',
          kind: 'needs_info',
          action: 'payment',
          giftId: gift.id,
        });
      }

      if (giftNeedsReview(gift, autopilotThreshold)) {
        needsInfo.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: `Review ${name}'s gift`,
          detail: gift.gift_description || gift.gift_type || 'Ready for your approval',
          kind: 'needs_info',
          action: 'review',
        });
      }

      const giftStatus = getGiftStatus(gift, recipient);
      if (giftStatus.key === 'ordered' || giftStatus.key === 'shipped') {
        inMotion.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: giftStatus.key === 'shipped' ? `${name}'s gift shipped` : `${name}'s gift ordered`,
          detail: gift.gift_description || gift.gift_type || giftStatus.detail,
          kind: 'in_motion',
          action: 'open',
        });
      }
      if (giftStatus.key === 'delivered') {
        recentlyDelivered.push({
          recipientId: recipient.id,
          recipientName: cleanName(recipient.name),
          label: `Delivered for ${name}`,
          detail: gift.gift_description || gift.gift_type || 'Arrived',
          kind: 'recent',
          action: 'open',
        });
      }
    }

    // Surface status-level needs when no gifts yet but person is incomplete.
    if (status.key === 'needs_details' && !needsInfo.some((n) => n.recipientId === recipient.id)) {
      needsInfo.push({
        recipientId: recipient.id,
        recipientName: cleanName(recipient.name),
        label: `${name} needs a few details`,
        detail: status.detail,
        kind: 'needs_info',
        action: 'open',
      });
    }
  }

  upcoming.sort((a, b) => {
    const ra = recipients.find((r) => r.id === a.recipientId);
    const rb = recipients.find((r) => r.id === b.recipientId);
    const da = ra?.birthday || ra?.anniversary;
    const db = rb?.birthday || rb?.anniversary;
    if (!da || !db) return 0;
    return getNextOccurrence(da).getTime() - getNextOccurrence(db).getTime();
  });

  const dedupe = (items: BriefingItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.kind}:${item.recipientId}:${item.action}:${item.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    upcoming: dedupe(upcoming).slice(0, 5),
    needsInfo: dedupe([...needsFunds, ...needsInfo]).slice(0, 6),
    inMotion: dedupe(inMotion).slice(0, 4),
    recentlyDelivered: dedupe(recentlyDelivered).slice(0, 4),
  };
}

export function buildBriefingMessage(displayName: string, briefing: DashboardBriefing): string {
  const lines: string[] = [];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  lines.push(`${hello}, ${displayName}. Here's where things stand.`);

  if (briefing.needsInfo.length) {
    lines.push('');
    lines.push('Needs you:');
    for (const item of briefing.needsInfo.slice(0, 3)) {
      lines.push(`· ${item.label} (${item.detail})`);
    }
  }

  if (briefing.upcoming.length) {
    lines.push('');
    lines.push('Coming up:');
    for (const item of briefing.upcoming.slice(0, 3)) {
      lines.push(`· ${item.label} · ${item.detail}`);
    }
  }

  if (briefing.inMotion.length) {
    lines.push('');
    lines.push('In motion:');
    for (const item of briefing.inMotion.slice(0, 2)) {
      lines.push(`· ${item.label}`);
    }
  }

  if (briefing.recentlyDelivered.length) {
    lines.push('');
    lines.push('Just delivered:');
    for (const item of briefing.recentlyDelivered.slice(0, 2)) {
      lines.push(`· ${item.label}`);
    }
  }

  if (
    !briefing.needsInfo.length &&
    !briefing.upcoming.length &&
    !briefing.inMotion.length &&
    !briefing.recentlyDelivered.length
  ) {
    lines.push('');
    lines.push("You're all clear for now. Add someone or tell me who to watch next.");
  } else {
    lines.push('');
    lines.push('Ask me anything, or tap a prompt below.');
  }

  return lines.join('\n');
}

export function briefingQuickChips(briefing: DashboardBriefing): BriefingItem[] {
  return [...briefing.needsInfo, ...briefing.upcoming].slice(0, 4);
}
