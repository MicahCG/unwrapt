import React, { useEffect, useRef, useState } from 'react';
import type { TheaGesture } from './theaScene';
import theaCharacter from '@/assets/thea-greeting.webp';
import theaCompact from '@/assets/thea-greeting-compact.webp';

interface TheaCharacterProps {
  size?: 'compact' | 'medium' | 'large';
  speaking?: boolean;
  animated?: boolean;
  className?: string;
  gesture?: TheaGesture;
}

/** The same expressive character accompanies every onboarding step. */
export const TheaCharacter: React.FC<TheaCharacterProps> = ({
  size = 'medium', speaking = true, animated = true, className = '', gesture = 'Wave',
}) => {
  const controller = useRef<ReturnType<typeof import('./theaScene').mountThea>>();
  const currentGesture = useRef(gesture);
  currentGesture.current = gesture;
  useEffect(() => { controller.current?.setGesture(gesture); }, [gesture]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!animated || failed || !canvas.current) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let cancelled = false;
    const stop = () => { cancelled = true; controller.current?.dispose(); controller.current = undefined; setReady(false); };
    const change = () => { if (motion.matches) stop(); };
    if (motion.matches || connection?.saveData) return;
    motion.addEventListener('change', change);
    // Keep the approved poster visible throughout loading and on any GPU/network failure.
    import('./theaScene').then(({ mountThea }) => {
      if (cancelled || !canvas.current) return;
      controller.current = mountThea(canvas.current, () => { if (!cancelled) setReady(true); }, () => {
        if (!cancelled) { setReady(false); setFailed(true); }
      });
      controller.current.setGesture(currentGesture.current);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { stop(); motion.removeEventListener('change', change); };
  }, [animated, failed]);
  return (
    <div className={`u-thea-character u-thea-character--${size} ${speaking ? 'u-thea-character--speaking' : ''} ${className}`} data-thea-renderer={ready ? 'webgl' : 'poster'}>
      <div className="u-thea-character__glow" aria-hidden="true" />
      <img src={size === 'compact' ? theaCompact : theaCharacter} alt="Thea, your gifting concierge" className="u-thea-character__image" style={{ opacity: ready ? 0 : 1 }} draggable={false} width={size === 'compact' ? 320 : 480} height={size === 'compact' ? 236 : 640} />
      {animated && !failed && <canvas ref={canvas} className="u-thea-character__canvas" style={{ opacity: ready ? 1 : 0 }} aria-hidden="true" />}
      {speaking && <div className="u-thea-character__voice" aria-hidden="true"><span /><span /><span /></div>}
    </div>
  );
};
export default TheaCharacter;
