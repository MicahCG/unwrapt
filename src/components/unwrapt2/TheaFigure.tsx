import React, { useId } from 'react';

export type TheaPose = 'basic' | 'welcome' | 'thinking' | 'gift' | 'surprised';

interface TheaFigureProps {
  /** `full` shows her waist-up; `portrait` crops to head and shoulders for avatars. */
  framing?: 'full' | 'portrait';
  pose?: TheaPose;
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
const BROW_L: Record<TheaPose, string> = { basic: '', welcome: 'translate(0 -4)', thinking: 'translate(0 1)', gift: 'translate(0 -3)', surprised: 'translate(0 -10) rotate(-4 150 152)' };
const BROW_R: Record<TheaPose, string> = { basic: '', welcome: 'translate(0 -4)', thinking: 'translate(0 -8) rotate(-4 232 152)', gift: 'translate(0 -3)', surprised: 'translate(0 -10) rotate(4 232 152)' };
// Thinking glances up and away; surprised shrinks the irises so more white shows.
const iris = (pose: TheaPose, cx: number) =>
  pose === 'thinking' ? 'translate(5 -5)' : pose === 'surprised' ? `translate(${cx} 192) scale(.85) translate(${-cx} -192)` : undefined;
const EYE_SCALE: Record<TheaPose, number> = { basic: 1.04, welcome: 1.04, thinking: 1.04, gift: 1.04, surprised: 1.12 };

/**
 * Thea, drawn as layered SVG (approved benchmark v1 in Design/Thea Concepts).
 * Eyes, brows, cheeks, mouth, head and body are separate groups so CSS can animate them,
 * and each pose swaps the arms, mouth and brows around the same face.
 */
export const TheaFigure: React.FC<TheaFigureProps> = ({ framing = 'full', pose = 'basic', animated = true, className = '', style }) => {
  // Every instance needs its own ids, or a hidden copy breaks the gradients of a visible one.
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const restingLeft = pose === 'basic' || pose === 'welcome' || pose === 'surprised';
  const restingRight = pose === 'basic' || pose === 'thinking' || pose === 'surprised';

  return (
    <svg
      viewBox={VIEW_BOX[framing]}
      className={`u-thea u-thea--${pose} ${animated ? '' : 'u-thea--still'} ${className}`}
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
        <path d="M130 300 L252 300 Q276 302 288 318 Q306 344 330 432 Q340 470 312 472 L70 472 Q42 470 52 432 Q76 344 94 318 Q106 302 130 300 Z" fill={url('sweater')} />
        <g stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none">
          {restingLeft && <path d="M124 378 Q120 400 118 420 M96 424 Q120 418 142 422" />}
          {restingRight && <path d="M258 378 Q262 400 264 420 M240 422 Q262 418 286 424" />}
        </g>
        <g fill="#eaa27a">
          {restingLeft && <circle cx="155" cy="434" r="27" />}
          {restingRight && <circle cx="227" cy="434" r="27" />}
        </g>

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
          <g transform={`translate(148 191) scale(${EYE_SCALE[pose]}) translate(-152 -190)`}>
            <g className="u-thea__eye">
              <g clipPath={url('eyeL')}>
                <ellipse cx="152" cy="190" rx="29" ry="25" fill="#fff" />
                <g transform={iris(pose, 153)}>
                  <circle cx="153" cy="192" r="19.5" fill="#5a250c" />
                  <path d="M157.6 204.7 Q162.9 202.8 165.2 197.7" stroke="#97553a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <circle cx="146" cy="181" r="5.8" fill="#fff" /><circle cx="139" cy="190" r="2.7" fill="#fff" />
                </g>
                <path d="M120 194 A32 28 0 0 1 184 194" stroke="#4a1f0c" strokeWidth="9" fill="none" />
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
                  <circle cx="223" cy="181" r="5.8" fill="#fff" /><circle cx="216" cy="190" r="2.7" fill="#fff" />
                </g>
                <path d="M198 194 A32 28 0 0 1 262 194" stroke="#4a1f0c" strokeWidth="9" fill="none" />
              </g>
              <path d="M249 171 Q258 173 264 165 Q263 175 254 179 Z M256 180 Q264 183 271 177 Q269 187 258 187 Z" fill="#4a1f0c" />
            </g>
          </g>

          {/* Cheeks lifted into the eyes: her default smirk, pushed further on the smug beat */}
          {pose !== 'surprised' && <>
          <g clipPath={url('eyeLw')}><g className="u-thea__cheek"><path d="M110 222 Q148 205 186 216 L186 244 L110 244 Z" fill="#eaa27a" /></g></g>
          <g clipPath={url('eyeRw')}><g className="u-thea__cheek"><path d="M196 216 Q234 205 272 222 L272 244 L196 244 Z" fill="#eaa27a" /></g></g>
          <g className="u-thea__cheek" stroke="#d98d68" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M129 218 Q147 210 165 213" /><path d="M217 213 Q235 210 253 218" />
          </g>
          </>}

          <ellipse cx="128" cy="230" rx="14" ry="8" fill="#e7866f" opacity=".22" />
          <ellipse cx="254" cy="230" rx="14" ry="8" fill="#e7866f" opacity=".22" />
          <ellipse cx="191" cy="217" rx="10.5" ry="7" fill="#cd7c5d" />
          {pose === 'basic' && <path className="u-thea__mouth" d="M172 241 Q197 247 219 228" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" fill="none" />}
          {pose === 'welcome' && <>
            <path d="M168 233 Q191 237 216 231 Q212 257 191 258 Q171 257 168 233 Z" fill="#8f3523" />
            <path d="M176 251 Q191 245 206 251 Q199 257 191 257 Q182 257 176 251 Z" fill="#d9705a" />
            <path d="M171 234 Q191 238 213 232 L212 238 Q191 242 172 239 Z" fill="#fff" />
          </>}
          {pose === 'thinking' && <path d="M181 243 Q193 238 206 242" stroke="#b9603f" strokeWidth="4.2" strokeLinecap="round" fill="none" />}
          {pose === 'gift' && <path d="M170 235 Q191 255 214 233" stroke="#b9603f" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
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

        {pose === 'welcome' && (
          <>
            {/* Upper arm drops from the shoulder to an elbow just outside her body; a soft
                outline keeps each segment readable against the sweater */}
            <path d="M262 332 Q308 338 334 374" stroke="#e6cfab" strokeWidth="44" strokeLinecap="round" fill="none" />
            <path d="M262 332 Q308 338 334 374" stroke="#f6e4c9" strokeWidth="38" strokeLinecap="round" fill="none" />
            {/* Forearm and hand wave from the elbow */}
            <g className="u-thea__wave">
              <path d="M334 374 Q334 330 326 292" stroke="#e6cfab" strokeWidth="40" strokeLinecap="round" fill="none" />
              <path d="M334 374 Q334 330 326 292" stroke="#f6e4c9" strokeWidth="34" strokeLinecap="round" fill="none" />
              <path d="M311 302 Q326 296 342 302" stroke="#e6cfab" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <circle cx="325" cy="272" r="23" fill="#eaa27a" />
              <path d="M310 256 Q307 244 315 239 M322 250 Q322 238 330 236 M334 254 Q338 244 345 246" stroke="#eaa27a" strokeWidth="9.5" strokeLinecap="round" fill="none" />
            </g>
          </>
        )}

        {pose === 'thinking' && (
          <>
            <path d="M118 444 Q128 372 158 302" stroke="#f6e4c9" strokeWidth="44" strokeLinecap="round" fill="none" />
            <path d="M136 318 Q152 312 168 322" stroke="#ead2b2" strokeWidth="4.5" strokeLinecap="round" fill="none" />
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
      </g>
    </svg>
  );
};

export default TheaFigure;
