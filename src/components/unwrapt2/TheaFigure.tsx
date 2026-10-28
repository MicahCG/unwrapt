import React, { useId } from 'react';

/**
 * Named states: basic (idle), welcome, listening (user is typing), thinking (working),
 * curious (asking a clarifying question), gift (success), surprised, oops (error/recovery).
 */
export type TheaPose = 'basic' | 'welcome' | 'listening' | 'thinking' | 'curious' | 'gift' | 'surprised' | 'oops';
/** Short reactions to something the user just said: four positive, a laugh for jokes, one upset. */
export type TheaReaction = 'thumbsup' | 'sparkle' | 'clap' | 'cheer' | 'laugh' | 'upset';
type FigurePose = TheaPose | TheaReaction;

interface TheaFigureProps {
  /** `full` shows her waist-up; `portrait` crops to head and shoulders for avatars. */
  framing?: 'full' | 'portrait';
  pose?: FigurePose;
  /** Play the current pose's way out (e.g. lowering a raised arm) before the next pose. */
  exiting?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const VIEW_BOX = { full: '18 44 346 432', portrait: '66 58 250 250' };
const FACE = 'M99 150 Q99 112 148 110 L234 110 Q283 112 283 150 L283 238 Q283 277 242 278 L140 278 Q99 277 99 238 Z';
const HAIRLINE = 'M101 192 Q103 180 109 168 Q124 139 160 137 Q189 136 191 112 Q193 136 222 137 Q258 139 273 168 Q279 180 281 192';
const LENS_L = 'M111 78 Q111 73 119 73 L171 76 Q179 77 178 85 Q177 100 170 108 Q162 118 148 118 Q129 118 122 110 Q115 102 111 78 Z';
const LENS_R = 'M271 78 Q271 73 263 73 L211 76 Q203 77 204 85 Q205 100 212 108 Q220 118 234 118 Q253 118 260 110 Q267 102 271 78 Z';
const CHAIN: [number, number, number][] = [
  [158, 321, 45], [163, 329, 40], [169, 337, 30], [177, 344, 18], [186, 348, 6],
  [196, 348, -6], [205, 344, -18], [213, 337, -30], [219, 329, -40], [224, 321, -45],
];

// Per-pose offsets for the brow groups and the irises, as SVG transforms.
const BROW_L: Record<FigurePose, string> = {
  basic: '', welcome: 'translate(0 -4)', thinking: 'translate(0 1)', gift: 'translate(0 -3)', surprised: 'translate(0 -10) rotate(-4 150 152)',
  listening: 'translate(0 -3)', curious: 'translate(0 2)', oops: 'translate(2 -4) rotate(-12 150 152)',
  thumbsup: 'translate(0 -4)', sparkle: 'translate(0 -6)', clap: 'translate(0 -5)', cheer: 'translate(0 -6)', laugh: 'translate(0 -8) rotate(-6 150 152)', upset: 'translate(3 6) rotate(13 150 152)',
};
const BROW_R: Record<FigurePose, string> = {
  basic: '', welcome: 'translate(0 -4)', thinking: 'translate(0 -8) rotate(-4 232 152)', gift: 'translate(0 -3)', surprised: 'translate(0 -10) rotate(4 232 152)',
  listening: 'translate(0 -3)', curious: 'translate(0 -11) rotate(-6 232 152)', oops: 'translate(-2 -4) rotate(12 232 152)',
  thumbsup: 'translate(0 -4)', sparkle: 'translate(0 -6)', clap: 'translate(0 -5)', cheer: 'translate(0 -6)', laugh: 'translate(0 -8) rotate(6 232 152)', upset: 'translate(-3 6) rotate(-13 232 152)',
};
// Thinking glances up and away, listening looks down at what you're typing, curious looks
// back at you sideways; surprised shrinks the irises so more white shows.
const IRIS_SHIFT: Partial<Record<FigurePose, string>> = {
  thinking: 'translate(5 -5)', listening: 'translate(-2 5)', curious: 'translate(4 -1)', oops: 'translate(-3 2)',
};
const iris = (pose: FigurePose, cx: number) =>
  pose === 'surprised' ? `translate(${cx} 192) scale(.85) translate(${-cx} -192)` : IRIS_SHIFT[pose];
const EYE_SCALE: Record<FigurePose, number> = {
  basic: 1.04, welcome: 1.04, thinking: 1.04, gift: 1.04, surprised: 1.12, listening: 1.06, curious: 1.04, oops: 1.08,
  thumbsup: 1.04, sparkle: 1.08, clap: 1.04, cheer: 1.04, laugh: 1.04, upset: 1.0,
};
const OPEN_SMILE: FigurePose[] = ['welcome', 'sparkle', 'clap', 'cheer'];
const NO_CHEEK_LIFT: FigurePose[] = ['surprised', 'clap', 'laugh', 'upset', 'oops'];

/** Four-point twinkle star centered on (cx, cy). */
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;

/**
 * A forearm in the sweater's own color with no outline, so it joins the upper arm in one
 * continuous shape; `crease` is the fold line that shows it against her body.
 */
const Sleeve: React.FC<{ d: string; width: number; fill: string; crease?: string }> = ({ d, width, fill, crease }) => (
  <>
    <path d={d} stroke={fill} strokeWidth={width} strokeLinecap="round" fill="none" />
    {crease && <path d={crease} stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
  </>
);

// Poses that lift her right arm (cheer lifts both). A raised arm is painted in the sweater's own
// gradient with no outline, so the shoulder flows into it like part of the body; only a crease
// marks the underarm and elbow. Joints: shoulder (272, 326), elbow (338, 352).
const RAISES_ARM: FigurePose[] = ['welcome', 'thumbsup', 'cheer'];
const MIRROR = 'translate(382 0) scale(-1 1)';

// One body for every pose: a torso with a waist. Arms are drawn separately, so poses only move
// arms. Upper arms hang at her sides in the sweater's own color (a crease marks the inner edge);
// forearms that cross her body get a soft outline. Elbows sit at (92, 422) and (290, 422).
const TORSO = 'M130 300 L252 300 Q274 302 282 320 Q285 338 277 354 Q268 382 270 422 Q272 456 286 472 L96 472 Q110 456 112 422 Q114 382 105 354 Q97 338 100 320 Q108 302 130 300 Z';
const HANGING_ARM = { right: 'M274 336 Q296 378 292 420', left: 'M108 336 Q86 378 90 420' };
const ARM_CREASE = { right: 'M265 352 Q280 386 275 408', left: 'M117 352 Q102 386 107 408' };

const RaisedSleeve: React.FC<{ d: string; width: number; fill: string }> = ({ d, width, fill }) => (
  <path d={d} stroke={fill} strokeWidth={width} strokeLinecap="round" fill="none" />
);

/** Shoulder to elbow, merging into the top of the sweater. */
const UpperArm: React.FC<{ fill: string }> = ({ fill }) => (
  <g className="u-thea__shoulder">
    <RaisedSleeve d="M262 330 Q306 336 338 352" width={40} fill={fill} />
    <path d="M300 358 Q318 364 330 372" stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none" />
  </g>
);

/** Elbow to an open waving hand. */
const WavingForearm: React.FC<{ className?: string; fill: string }> = ({ className, fill }) => (
  <g className="u-thea__shoulder">
    <g className={className}>
      <RaisedSleeve d="M338 356 Q342 322 336 292" width={36} fill={fill} />
      <path d="M322 352 Q328 344 330 336" stroke="#ead2b2" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="335" cy="272" r="22" fill="#eaa27a" />
      <path d="M320 257 Q317 245 325 240 M332 251 Q332 239 340 237 M344 255 Q348 245 355 247" stroke="#eaa27a" strokeWidth="9.5" strokeLinecap="round" fill="none" />
    </g>
  </g>
);

/**
 * Thea, drawn as layered SVG (approved benchmark v1 in Design/Thea Concepts).
 * Eyes, brows, cheeks, mouth, head and body are separate groups so CSS can animate them,
 * and each pose swaps the arms, mouth and brows around the same face.
 */
export const TheaFigure: React.FC<TheaFigureProps> = ({ framing = 'full', pose = 'basic', exiting = false, animated = true, className = '', style }) => {
  // Every instance needs its own ids, or a hidden copy breaks the gradients of a visible one.
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const restingLeft = ['basic', 'welcome', 'listening', 'curious', 'oops', 'surprised', 'thumbsup', 'sparkle', 'laugh'].includes(pose);
  const restingRight = ['basic', 'listening', 'curious', 'oops', 'thinking', 'surprised', 'sparkle', 'laugh'].includes(pose);
  const eyesClosed = pose === 'clap' || pose === 'laugh';

  return (
    <svg
      viewBox={VIEW_BOX[framing]}
      className={`u-thea u-thea--${pose} ${exiting ? 'u-thea--exiting' : ''} ${animated ? '' : 'u-thea--still'} ${className}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id('hair')} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="330">
          <stop offset="0" stopColor="#83492d" /><stop offset="1" stopColor="#6c3820" />
        </linearGradient>
        <linearGradient id={id('sweater')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbeedb" /><stop offset="1" stopColor="#f6e2c6" />
        </linearGradient>
        {/* Same colors as the sweater in page space, so raised sleeves match the body exactly. */}
        <linearGradient id={id('sleeve')} gradientUnits="userSpaceOnUse" x1="0" y1="300" x2="0" y2="472">
          <stop offset="0" stopColor="#fbeedb" /><stop offset="1" stopColor="#f6e2c6" />
        </linearGradient>
        <linearGradient id={id('lens')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a98677" /><stop offset="1" stopColor="#8a6252" />
        </linearGradient>
        <radialGradient id={id('faceGlow')} cx="50%" cy="35%" r="60%">
          <stop offset="0" stopColor="#f0ad85" stopOpacity=".9" /><stop offset="1" stopColor="#f0ad85" stopOpacity="0" />
        </radialGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1" /></filter>
        <pattern id={id('tort')} width="34" height="30" patternUnits="userSpaceOnUse">
          <rect width="34" height="30" fill="#5a2c16" />
          <ellipse cx="8" cy="7" rx="6.5" ry="4.2" fill="#c48a46" opacity=".9" filter={url('soft')} />
          <ellipse cx="25" cy="21" rx="5.5" ry="3.8" fill="#a8692f" opacity=".85" filter={url('soft')} />
        </pattern>
        <clipPath id={id('faceShape')}><path transform="translate(191 194) scale(1.03) translate(-191 -194)" d={FACE} /></clipPath>
        <clipPath id={id('lensL')}><path d={LENS_L} /></clipPath>
        <clipPath id={id('lensR')}><path d={LENS_R} /></clipPath>
        <clipPath id={id('eyeL')}><ellipse cx="152" cy="190" rx="29" ry="25" /></clipPath>
        <clipPath id={id('eyeR')}><ellipse cx="230" cy="190" rx="29" ry="25" /></clipPath>
        <clipPath id={id('eyeLw')}><ellipse cx="148" cy="191" rx="30.2" ry="26" /></clipPath>
        <clipPath id={id('eyeRw')}><ellipse cx="234" cy="191" rx="30.2" ry="26" /></clipPath>
      </defs>

      <g className="u-thea__breath">
        {/* Hair, back mass */}
        <g fill={url('hair')}>
          <circle cx="74" cy="196" r="44" /><circle cx="62" cy="244" r="40" /><circle cx="86" cy="148" r="40" />
          <circle cx="308" cy="196" r="44" /><circle cx="320" cy="244" r="40" /><circle cx="296" cy="148" r="40" />
          <circle cx="124" cy="104" r="42" /><circle cx="258" cy="104" r="42" /><circle cx="191" cy="96" r="46" />
          <circle cx="96" cy="292" r="36" fill="#5f2f1b" /><circle cx="286" cy="292" r="36" fill="#5f2f1b" />
          <circle cx="132" cy="300" r="30" fill="#5f2f1b" /><circle cx="250" cy="300" r="30" fill="#5f2f1b" />
          <rect x="80" y="130" width="222" height="170" rx="40" />
        </g>
        <path
          d="M40 210 q14 -12 30 0 M38 258 q14 -10 28 2 M314 210 q14 -12 30 0 M318 258 q14 -10 28 2 M60 150 q14 -10 28 0 M296 150 q14 -10 28 0"
          stroke="#5f2f1b" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7"
        />

        {/* Sweater and resting hands */}
        <path d={TORSO} fill={url('sweater')} />
        {pose !== 'cheer' && <>
          <RaisedSleeve d={HANGING_ARM.left} width={40} fill={url('sleeve')} />
          <path d={ARM_CREASE.left} stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>}
        {!RAISES_ARM.includes(pose) && <>
          <RaisedSleeve d={HANGING_ARM.right} width={40} fill={url('sleeve')} />
          <path d={ARM_CREASE.right} stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>}
        {restingLeft && (
          <g className="u-thea__rest">
            <Sleeve d="M92 424 Q118 442 142 438" width={32} fill={url('sleeve')} crease="M107 408 Q118 422 136 422" />
            <circle cx="155" cy="434" r="25" fill="#eaa27a" />
          </g>
        )}
        {restingRight && (
          <g className="u-thea__rest">
            <Sleeve d="M290 424 Q264 442 240 438" width={32} fill={url('sleeve')} crease="M275 408 Q264 422 246 422" />
            <circle cx="227" cy="434" r="25" fill="#eaa27a" />
          </g>
        )}

        {RAISES_ARM.includes(pose) && <UpperArm fill={url('sleeve')} />}
        {pose === 'cheer' && <g transform={MIRROR}><UpperArm fill={url('sleeve')} /></g>}

        {/* Neck and turtleneck: the top dips to show her neck, the bottom folds onto the sweater */}
        <rect x="164" y="258" width="54" height="40" fill="#d4826a" />
        <path d="M150 288 Q150 277 162 277 Q191 297 220 277 Q232 277 232 288 L236 314 Q191 336 146 314 Z" fill="#f8ecd8" />
        <path d="M162 278 Q191 297 220 278" stroke="#ead3b2" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M157 283 Q153 298 151 314 M225 283 Q229 298 231 314 M191 292 V325" stroke="#e3cba6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M144 313 Q191 338 238 313" stroke="#e3cba6" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <g fill="none" stroke="#e7b13b" strokeWidth="3">
          {CHAIN.map(([x, y, a]) => <ellipse key={x} cx={x} cy={y} rx="5" ry="3.5" transform={`rotate(${a} ${x} ${y})`} />)}
        </g>

        <g className="u-thea__head">
          <ellipse cx="97" cy="206" rx="14" ry="19" fill="#d4825c" />
          <ellipse cx="285" cy="206" rx="14" ry="19" fill="#d4825c" />
          <circle cx="93" cy="230" r="8" fill="none" stroke="#e7b13b" strokeWidth="4" />
          <circle cx="289" cy="230" r="8" fill="none" stroke="#e7b13b" strokeWidth="4" />

          {/* Face: a wide rounded square that stays straight-sided until low on the cheeks */}
          <path d={FACE} fill="#e9a077" />
          <path d={FACE} fill={url('faceGlow')} />

          {/* Two big curls sweep down from a center part */}
          <g clipPath={url('faceShape')}>
            <path d={HAIRLINE} fill="none" stroke="#d68a63" strokeWidth="7" strokeLinejoin="round" />
            <path d={`${HAIRLINE} L322 192 L322 40 L60 40 L60 192 Z`} fill={url('hair')} />
          </g>

          {/* Brows: tapered, inner ends tilted toward the center for a confident read */}
          <g transform={BROW_L[pose]}><g transform="rotate(5 150 152)">
            <path d="M126 158 Q138 144 152 144 Q166 144 174 150 Q177 156 171 158 Q160 155 150 155 Q138 155 129 160 Q124 162 126 158 Z" fill="#7d4228" />
          </g></g>
          <g transform={BROW_R[pose]}><g transform="rotate(-5 232 152)">
            <path className="u-thea__brow-raise" d="M256 158 Q244 144 230 144 Q216 144 208 150 Q205 156 211 158 Q222 155 232 155 Q244 155 253 160 Q258 162 256 158 Z" fill="#7d4228" />
          </g></g>

          {/* Eyes: dark iris, reflection arc, two highlights, thin liner and winged lashes */}
          {eyesClosed && (
            <g stroke="#4a1f0c" strokeWidth="6.5" strokeLinecap="round" fill="none">
              <path d="M124 198 Q148 172 174 198" /><path d="M208 198 Q234 172 258 198" />
              <path d="M126 192 L114 186 M256 192 L268 186" strokeWidth="5" />
            </g>
          )}
          {!eyesClosed && <>
          <g transform={`translate(148 191) scale(${EYE_SCALE[pose]}) translate(-152 -190)`}>
            <g className="u-thea__eye">
              <g clipPath={url('eyeL')}>
                <ellipse cx="152" cy="190" rx="29" ry="25" fill="#fff" />
                <g transform={iris(pose, 153)}>
                  <circle cx="153" cy="192" r="19.5" fill="#5a250c" />
                  <path d="M157.6 204.7 Q162.9 202.8 165.2 197.7" stroke="#97553a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {pose === 'sparkle'
                    ? <path d={`${star(148, 186, 10)} ${star(162, 201, 4.5)}`} fill="#fff" />
                    : <><circle cx="146" cy="181" r="5.8" fill="#fff" /><circle cx="139" cy="190" r="2.7" fill="#fff" /></>}
                </g>
                {pose === 'upset' && <rect x="118" y="160" width="70" height="20" fill="#e9a077" />}
                <path d="M120 194 A32 28 0 0 1 184 194" stroke="#4a1f0c" strokeWidth="9" fill="none" />
                {pose === 'upset' && <path d="M121 181 L184 183" stroke="#4a1f0c" strokeWidth="5" strokeLinecap="round" />}
              </g>
              <path d="M133 171 Q124 173 118 165 Q119 175 128 179 Z M126 180 Q118 183 111 177 Q113 187 124 187 Z" fill="#4a1f0c" />
            </g>
          </g>
          <g transform={`translate(234 191) scale(${EYE_SCALE[pose]}) translate(-230 -190)`}>
            <g className="u-thea__eye">
              <g clipPath={url('eyeR')}>
                <ellipse cx="230" cy="190" rx="29" ry="25" fill="#fff" />
                <g transform={iris(pose, 230)}>
                  <circle cx="230" cy="192" r="19.5" fill="#5a250c" />
                  <path d="M234.6 204.7 Q239.9 202.8 242.2 197.7" stroke="#97553a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {pose === 'sparkle'
                    ? <path d={`${star(225, 186, 10)} ${star(239, 201, 4.5)}`} fill="#fff" />
                    : <><circle cx="223" cy="181" r="5.8" fill="#fff" /><circle cx="216" cy="190" r="2.7" fill="#fff" /></>}
                </g>
                {pose === 'upset' && <rect x="194" y="160" width="70" height="20" fill="#e9a077" />}
                <path d="M198 194 A32 28 0 0 1 262 194" stroke="#4a1f0c" strokeWidth="9" fill="none" />
                {pose === 'upset' && <path d="M198 183 L261 181" stroke="#4a1f0c" strokeWidth="5" strokeLinecap="round" />}
              </g>
              <path d="M249 171 Q258 173 264 165 Q263 175 254 179 Z M256 180 Q264 183 271 177 Q269 187 258 187 Z" fill="#4a1f0c" />
            </g>
          </g>
          </>}

          {/* Cheeks lifted into the eyes: her default smirk, pushed further on the smug beat */}
          {!NO_CHEEK_LIFT.includes(pose) && <>
          <g clipPath={url('eyeLw')}><g className="u-thea__cheek"><path d="M110 222 Q148 205 186 216 L186 244 L110 244 Z" fill="#eaa27a" /></g></g>
          <g clipPath={url('eyeRw')}><g className="u-thea__cheek"><path d="M196 216 Q234 205 272 222 L272 244 L196 244 Z" fill="#eaa27a" /></g></g>
          <g className="u-thea__cheek" stroke="#d98d68" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M129 218 Q147 210 165 213" /><path d="M217 213 Q235 210 253 218" />
          </g>
          </>}

          <ellipse cx="128" cy="230" rx="14" ry="8" fill="#e7866f" opacity=".22" />
          <ellipse cx="254" cy="230" rx="14" ry="8" fill="#e7866f" opacity=".22" />
          <ellipse cx="191" cy="217" rx="10.5" ry="7" fill="#cd7c5d" />
          {(pose === 'basic' || pose === 'listening') && <path className="u-thea__mouth" d="M172 241 Q197 247 219 228" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" fill="none" />}
          {pose === 'curious' && <path d="M178 244 Q194 246 208 236" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" fill="none" />}
          {pose === 'oops' && <path d="M172 245 Q179 238 186 244 Q193 250 200 244 Q207 238 213 244" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {OPEN_SMILE.includes(pose) && <>
            <path d="M168 233 Q191 237 216 231 Q212 257 191 258 Q171 257 168 233 Z" fill="#8f3523" />
            <path d="M176 251 Q191 245 206 251 Q199 257 191 257 Q182 257 176 251 Z" fill="#d9705a" />
            <path d="M171 234 Q191 238 213 232 L212 238 Q191 242 172 239 Z" fill="#fff" />
          </>}
          {pose === 'laugh' && <g className="u-thea__laugh-mouth">
            <path d="M163 230 Q191 236 220 228 Q217 266 191 267 Q166 266 163 230 Z" fill="#8f3523" />
            <path d="M174 257 Q191 248 208 257 Q200 266 191 266 Q181 266 174 257 Z" fill="#d9705a" />
            <path d="M166 231 Q191 237 217 229 L216 237 Q191 243 167 239 Z" fill="#fff" />
          </g>}
          {pose === 'thinking' && <path d="M181 243 Q193 238 206 242" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" fill="none" />}
          {(pose === 'gift' || pose === 'thumbsup') && <path d="M170 235 Q191 255 214 233" stroke="#b9603f" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
          {pose === 'upset' && <path d="M175 249 Q191 236 208 248" stroke="#b9603f" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
          {pose === 'surprised' && <ellipse cx="191" cy="245" rx="8" ry="10" fill="#8f3523" />}
          <path d="M185 252 Q195 255 205 251" stroke="#d98d6a" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Rounded tortoiseshell wayfarers pushed up into her hair */}
          <path d="M106 80 L101 128 M276 80 L281 128" stroke="#4a2414" strokeWidth="4" strokeLinecap="round" />
          <path d="M101 74 Q102 65 114 65 L176 68 Q188 69 187 82 Q186 102 178 113 Q170 126 148 126 Q124 126 115 116 Q107 106 101 74 Z" fill={url('tort')} />
          <path d="M281 74 Q280 65 268 65 L206 68 Q194 69 195 82 Q196 102 204 113 Q212 126 234 126 Q258 126 267 116 Q275 106 281 74 Z" fill={url('tort')} />
          <path d={LENS_L} fill={url('lens')} />
          <path d={LENS_R} fill={url('lens')} />
          <g clipPath={url('lensL')}><path d="M122 120 L162 72 M140 122 L178 80" stroke="#fff" strokeWidth="8" opacity=".16" strokeLinecap="round" /></g>
          <g clipPath={url('lensR')}><path d="M204 120 L244 72 M222 122 L260 80" stroke="#fff" strokeWidth="8" opacity=".16" strokeLinecap="round" /></g>
          <path d="M184 85 Q191 79 198 85" stroke="#5a2c16" strokeWidth="8" fill="none" />
          <circle cx="110" cy="72" r="1.8" fill="#eadbd0" /><circle cx="272" cy="72" r="1.8" fill="#eadbd0" />
        </g>

        {pose === 'welcome' && <WavingForearm className="u-thea__wave" fill={url('sleeve')} />}

        {pose === 'thinking' && (
          <>
            <Sleeve d="M92 422 Q116 370 154 306" width={36} fill={url('sleeve')} crease="M112 416 Q132 374 164 320" />
            <circle cx="164" cy="286" r="23" fill="#eaa27a" />
            <path d="M176 270 Q184 262 180 254" stroke="#eaa27a" strokeWidth="10" strokeLinecap="round" fill="none" />
            <g className="u-thea__thought" fill="#fffaf2" stroke="#e3cba6" strokeWidth="3">
              <circle cx="300" cy="112" r="6" /><circle cx="318" cy="93" r="8.5" /><circle cx="338" cy="72" r="11" />
            </g>
          </>
        )}

        {pose === 'gift' && (
          <g className="u-thea__gift">
            <rect x="134" y="376" width="114" height="88" rx="9" fill="#b65b3c" />
            <rect x="134" y="376" width="114" height="10" fill="#9e4a2f" opacity=".5" />
            <rect x="128" y="362" width="126" height="24" rx="7" fill="#c86b4a" />
            <rect x="184" y="362" width="14" height="102" fill="#e7b13b" />
            <path d="M191 362 Q170 334 160 348 Q154 362 191 362 Z M191 362 Q212 334 222 348 Q228 362 191 362 Z" fill="#e7b13b" />
            <circle cx="191" cy="361" r="6" fill="#d39a2a" />
            <Sleeve d="M92 424 Q108 432 122 428" width={32} fill={url('sleeve')} />
            <Sleeve d="M290 424 Q274 432 260 428" width={32} fill={url('sleeve')} />
            <circle cx="132" cy="424" r="25" fill="#eaa27a" />
            <circle cx="250" cy="424" r="25" fill="#eaa27a" />
          </g>
        )}

        {pose === 'surprised' && (
          <g className="u-thea__sparkle" stroke="#e7b13b" strokeWidth="5" strokeLinecap="round">
            <path d="M58 92 L72 104 M44 128 L62 130 M70 64 L76 82" />
            <path d="M324 92 L310 104 M338 128 L320 130 M312 64 L306 82" />
          </g>
        )}

        {pose === 'curious' && (
          <g className="u-thea__query">
            <path d="M314 84 Q314 66 330 66 Q346 66 346 81 Q346 92 332 97 Q328 99 328 108" stroke="#b65b3c" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="328" cy="123" r="4.5" fill="#b65b3c" />
          </g>
        )}

        {pose === 'oops' && (
          <path className="u-thea__sweat" d="M286 132 Q298 150 298 158 A12 12 0 0 1 274 158 Q274 150 286 132 Z" fill="#9fd0ec" stroke="#6fb3d9" strokeWidth="2.5" />
        )}

        {pose === 'laugh' && (
          <>
            <g className="u-thea__tears" fill="#9fd0ec" stroke="#6fb3d9" strokeWidth="2">
              <path d="M114 196 Q106 210 106 215 A8 8 0 0 0 122 215 Q122 210 114 196 Z" />
              <path d="M268 196 Q260 210 260 215 A8 8 0 0 0 276 215 Q276 210 268 196 Z" />
            </g>
            <g className="u-thea__ha" fill="#b65b3c" fontFamily="inherit" fontWeight="800">
              <text x="34" y="112" fontSize="30" transform="rotate(-12 50 104)">ha</text>
              <text x="22" y="154" fontSize="24" transform="rotate(-6 36 148)">ha</text>
            </g>
          </>
        )}

        {pose === 'thumbsup' && (
          <g className="u-thea__shoulder">
            <g className="u-thea__thumb">
              <RaisedSleeve d="M338 356 Q342 326 337 302" width={36} fill={url('sleeve')} />
              <path d="M322 352 Q328 344 330 336" stroke="#ead2b2" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="318" y="266" width="36" height="34" rx="13" fill="#eaa27a" />
              <path d="M324 278 H346 M324 288 H346" stroke="#d98a63" strokeWidth="3" strokeLinecap="round" />
              <path d="M328 268 Q324 246 336 240" stroke="#eaa27a" strokeWidth="12" strokeLinecap="round" fill="none" />
            </g>
          </g>
        )}

        {pose === 'sparkle' && (
          <path className="u-thea__twinkle" d={`${star(62, 104, 13)} ${star(322, 90, 11)} ${star(336, 150, 7)} ${star(48, 160, 7)}`} fill="#e7b13b" />
        )}

        {pose === 'clap' && (
          <>
            <g className="u-thea__clap-l">
              <Sleeve d="M92 420 Q132 412 172 398" width={32} fill={url('sleeve')} crease="M104 406 Q132 398 162 386" />
              <ellipse cx="181" cy="390" rx="17" ry="24" fill="#eaa27a" transform="rotate(-12 181 390)" />
            </g>
            <g className="u-thea__clap-r">
              <Sleeve d="M290 420 Q250 412 210 398" width={32} fill={url('sleeve')} crease="M278 406 Q250 398 220 386" />
              <ellipse cx="201" cy="390" rx="17" ry="24" fill="#eaa27a" transform="rotate(12 201 390)" />
            </g>
            <path className="u-thea__twinkle" d="M152 376 L140 368 M150 396 H136 M230 376 L242 368 M232 396 H246" stroke="#e7b13b" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )}

        {pose === 'cheer' && (
          <>
            <WavingForearm className="u-thea__wave" fill={url('sleeve')} />
            <g transform={MIRROR}><WavingForearm className="u-thea__wave u-thea__wave--late" fill={url('sleeve')} /></g>
          </>
        )}

        {pose === 'upset' && (
          <g className="u-thea__huff">
            <Sleeve d="M92 420 Q170 422 236 398" width={34} fill={url('sleeve')} crease="M104 405 Q168 406 226 384" />
            <circle cx="242" cy="396" r="17" fill="#eaa27a" />
            <circle cx="140" cy="398" r="17" fill="#eaa27a" />
            <Sleeve d="M290 420 Q212 424 146 400" width={34} fill={url('sleeve')} crease="M278 404 Q212 408 156 386 M278 437 Q212 441 150 416" />
            <path d="M318 112 q10 10 0 20 M334 102 q-10 10 0 20 M306 128 q10 -10 20 0 M306 142 q10 10 20 0" stroke="#d0533a" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default TheaFigure;
