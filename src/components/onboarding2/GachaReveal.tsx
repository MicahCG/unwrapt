import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { getGiftRecommendations, type GiftAskUserOffer, type GiftCatalogItem } from '@/lib/giftCatalog';
import { MobileShell, Display } from '@/components/unwrapt2/MobileShell';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';

interface GachaRevealProps {
  recipientFirstName: string;
  interests: string[];
  occasionLabel?: string | null;
  onDone: (
    picks: GiftCatalogItem[],
    unmatchedInterests?: string[],
    askUser?: GiftAskUserOffer[],
  ) => void;
}

const SOCIAL_PROMPTS = [
  'People on Unwrapt never miss a birthday again.',
  'Gifting on autopilot, so special days stay special.',
  'Most approvals take under a minute.',
  'Thea remembers the date. You just say yes.',
  'Thoughtful gifts, without the last-minute scramble.',
  'Thousands of moments covered, zero forgotten occasions.',
  'Set it once. Show up every time.',
  'Time back in your week. Warmth in theirs.',
];

/** Soft gift silhouettes used as shadow outlines while catalog loads / spins. */
const SILHOUETTES = [
  { label: 'box', path: 'M18 22h44v36H18z M18 30h44 M40 22v44 M28 18c0-6 24-6 24 0' },
  { label: 'bottle', path: 'M36 14h8v10h-8z M30 24h20v48c0 4-4 6-10 6s-10-2-10-6V24z' },
  { label: 'mug', path: 'M22 26h32v30c0 6-6 10-16 10s-16-4-16-10V26z M54 32h8c6 0 10 4 10 10s-4 10-10 10h-8' },
  { label: 'plant', path: 'M40 58c-10 0-16 8-16 16h32c0-8-6-16-16-16z M40 58c-8-18 4-34 4-34s12 16 4 34 M40 58c8-14-2-30-2-30s-14 12-6 30' },
  { label: 'book', path: 'M20 18h36v48H20z M28 18v48 M34 30h16 M34 40h14' },
  { label: 'candle', path: 'M34 12c2 4 2 8 0 10 M30 22h20v42c0 4-4 6-10 6s-10-2-10-6V22z' },
];

const GachaReveal: React.FC<GachaRevealProps> = ({
  recipientFirstName,
  interests,
  occasionLabel,
  onDone,
}) => {
  const [spinIndex, setSpinIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [silhouetteIndex, setSilhouetteIndex] = useState(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['onboarding-gacha-reveal', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests, 6),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const pool = useMemo(() => data?.products || [], [data]);
  const picks = useMemo(() => pool.slice(0, 2), [pool]);
  const unmatched = useMemo(() => data?.unmatchedInterests || [], [data]);
  const askUser = useMemo(() => data?.askUser || [], [data]);

  // Keep gift cards cycling while we hunt.
  useEffect(() => {
    const spin = window.setInterval(() => {
      setSpinIndex((i) => i + 1);
    }, 480);
    return () => window.clearInterval(spin);
  }, []);

  useEffect(() => {
    const sil = window.setInterval(() => {
      setSilhouetteIndex((i) => (i + 1) % SILHOUETTES.length);
    }, 900);
    return () => window.clearInterval(sil);
  }, []);

  useEffect(() => {
    const prompts = window.setInterval(() => {
      setPromptIndex((i) => (i + 1) % SOCIAL_PROMPTS.length);
    }, 2200);
    return () => window.clearInterval(prompts);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // Give prompts and the carousel a beat to land before advancing.
    const delay = isError || (!picks.length && !askUser.length) ? 1400 : 4200;
    const t = window.setTimeout(() => onDone(picks, unmatched, askUser), delay);
    return () => window.clearTimeout(t);
  }, [isLoading, isError, picks, unmatched, askUser, onDone]);

  const visibleSlots = [0, 1, 2].map((offset) => {
    if (!pool.length) return null;
    return pool[(spinIndex + offset) % pool.length];
  });

  const occasionBit = occasionLabel ? ` ${occasionLabel}` : '';
  const huntingLine = unmatched.length
    ? `Looking hard for ${unmatched.map((i) => i.toLowerCase()).join(' / ')} alongside ${interests.filter((i) => !unmatched.includes(i)).map((i) => i.toLowerCase()).join(', ') || 'the rest'}…`
    : `Pulling together ${interests.map((i) => i.toLowerCase()).join(', ') || 'what you shared'}.`;

  return (
    <MobileShell glow animate={false} contentClassName="px-6 flex flex-col items-center justify-center text-center">
      <TheaCharacter size="large" gesture="Listen" activity="clipboard" />
      <Display className="mt-6 text-[26px] leading-snug">
        Finding gifts for {recipientFirstName}
        {occasionBit}…
      </Display>
      <p className="mt-2 max-w-[280px] text-[14px] leading-5" style={{ color: U.subtle }}>
        {huntingLine}
      </p>

      {/* Animated gift carousel + shadow outlines */}
      <div className="relative mt-8 w-full max-w-[320px]" aria-hidden="true">
        {/* Soft shadow outlines behind the cards */}
        <div className="pointer-events-none absolute inset-x-0 top-2 flex items-end justify-center gap-4 opacity-40">
          {[0, 1, 2].map((slot) => {
            const sil = SILHOUETTES[(silhouetteIndex + slot) % SILHOUETTES.length];
            const size = slot === 1 ? 100 : 76;
            return (
              <motion.div
                key={`sil-${slot}-${sil.label}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: slot === 1 ? 0.55 : 0.28, y: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                  width: size,
                  height: size,
                  borderRadius: 18,
                  border: `1.5px dashed ${U.border}`,
                  background: 'transparent',
                  boxShadow: `0 10px 28px rgba(42, 37, 32, 0.08)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 80 80" fill="none">
                  <path
                    d={sil.path}
                    stroke={U.muted}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="rgba(42,37,32,0.04)"
                  />
                </svg>
              </motion.div>
            );
          })}
        </div>

        <div className="relative z-10 flex items-end justify-center gap-3 pt-1">
          {visibleSlots.map((product, i) => {
            const scale = i === 1 ? 1.06 : 0.9;
            const opacity = i === 1 ? 0.92 : 0.45;
            const size = i === 1 ? 112 : 84;
            const sil = SILHOUETTES[(silhouetteIndex + i + 2) % SILHOUETTES.length];
            return (
              <motion.div
                key={product ? `${product.id}-${i}-${spinIndex}` : `ph-${i}-${silhouetteIndex}`}
                layout
                initial={{ opacity: 0, y: 12, scale: scale * 0.94 }}
                animate={{ opacity, y: 0, scale }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden"
                style={{
                  width: size,
                  height: size,
                  borderRadius: 16,
                  border: `1px solid ${U.border}`,
                  background: U.surface,
                  boxShadow: i === 1
                    ? '0 14px 32px rgba(42, 37, 32, 0.14)'
                    : '0 8px 18px rgba(42, 37, 32, 0.08)',
                }}
              >
                {product?.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: i === 1 ? 'none' : 'grayscale(0.35)' }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5" style={{ background: U.chip }}>
                    <svg width={36} height={36} viewBox="0 0 80 80" fill="none">
                      <path
                        d={sil.path}
                        stroke={U.muted}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(42,37,32,0.05)"
                      />
                    </svg>
                    <Gift size={14} color={U.muted} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Rotating social / value prompts */}
      <div className="relative mt-8 h-[52px] w-full max-w-[300px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={promptIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-x-0 text-[13.5px] leading-5"
            style={{ color: U.textSecondary }}
          >
            {SOCIAL_PROMPTS[promptIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </MobileShell>
  );
};

export default GachaReveal;
