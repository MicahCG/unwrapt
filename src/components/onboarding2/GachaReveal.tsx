import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { getGiftRecommendations, type GiftCatalogItem } from '@/lib/giftCatalog';
import { MobileShell, Display } from '@/components/unwrapt2/MobileShell';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';

interface GachaRevealProps {
  recipientFirstName: string;
  interests: string[];
  occasionLabel?: string | null;
  onDone: (picks: GiftCatalogItem[]) => void;
}

const GachaReveal: React.FC<GachaRevealProps> = ({
  recipientFirstName,
  interests,
  occasionLabel,
  onDone,
}) => {
  const [spinIndex, setSpinIndex] = useState(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['onboarding-gacha-reveal', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests, 6),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const pool = useMemo(() => data?.products || [], [data]);
  const picks = useMemo(() => pool.slice(0, 2), [pool]);

  useEffect(() => {
    if (!pool.length) return;
    const spin = window.setInterval(() => {
      setSpinIndex((i) => (i + 1) % pool.length);
    }, 220);
    return () => window.clearInterval(spin);
  }, [pool.length]);

  useEffect(() => {
    if (isLoading) return;
    const delay = isError || !picks.length ? 900 : 2800;
    const t = window.setTimeout(() => onDone(picks), delay);
    return () => window.clearTimeout(t);
  }, [isLoading, isError, picks, onDone]);

  const visible = pool.length
    ? [0, 1, 2].map((offset) => pool[(spinIndex + offset) % pool.length])
    : [];

  const occasionBit = occasionLabel ? ` ${occasionLabel}` : '';

  return (
    <MobileShell glow animate={false} contentClassName="px-6 flex flex-col items-center justify-center text-center">
      <TheaCharacter size="large" gesture="Listen" activity="clipboard" />
      <Display className="mt-6 text-[26px] leading-snug">
        Finding gifts for {recipientFirstName}
        {occasionBit}…
      </Display>
      <p className="mt-2 max-w-[280px] text-[14px] leading-5" style={{ color: U.subtle }}>
        Pulling together {interests.map((i) => i.toLowerCase()).join(', ') || 'what you shared'}.
      </p>

      <div className="mt-8 flex items-end justify-center gap-3" aria-hidden="true">
        {(visible.length ? visible : [null, null, null]).map((product, i) => {
          const scale = i === 1 ? 1.08 : 0.88;
          const opacity = i === 1 ? 0.55 : 0.28;
          return (
            <div
              key={product ? `${product.id}-${i}-${spinIndex}` : `ph-${i}`}
              className="overflow-hidden rounded-[16px] border"
              style={{
                width: i === 1 ? 112 : 84,
                height: i === 1 ? 112 : 84,
                borderColor: U.border,
                background: U.chip,
                transform: `scale(${scale})`,
                filter: 'grayscale(1)',
                opacity,
                transition: 'transform 180ms ease, opacity 180ms ease',
              }}
            >
              {product?.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gift size={22} color={U.muted} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MobileShell>
  );
};

export default GachaReveal;
