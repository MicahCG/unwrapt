# Thea onboarding actions

`TheaCharacter.activity` selects the scene behavior without downloading another model or remounting the renderer:

- `idle`: the approved folded-arm pose and Sass animation.
- `calendar`: hand at chin, head tilt, floating calendar.
- `clipboard`: supported clipboard, moving pen and progressively revealed notes.
- `chat`: a 16-second coffee/wine cycle, reaching from behind her side, lifting the drink to her lips, then returning it.

The model remains the approved upper-body Thea. `thea-actions-v5.glb` splits the original folded body from the head/collar into `FoldedBody` and `TheaHead`; both retain the original skeleton and Sass clip. The source has fused folded sleeves, so action scenes hide `FoldedBody` and use articulated procedural knit sleeves, hands, torso and props. Keeping the folded sleeves visible during arm movement produces stretched geometry. Do not merge these meshes during future asset optimization. The split was made at Blender Z 0.85 in the normalized, two-unit-high source asset.

`theaActions.ts` owns all added geometry and materials. Sleeve vertex buffers update in place; resources are disposed with the renderer. The existing 30 fps cap, offscreen/background pause, shared model download and reduced-motion/data-saver poster fallback remain in place. These are real-time Three.js actions, not Spline exports or facial lip-sync. Jacket changes are not included.

Verification: inspect the full 16-second chat cycle, clipboard pen contact and calendar bounds at phone sizes. Check manual onboarding at 390×844 and 320×568, reduced motion, and navigation cleanup. Production verification must use the served renderer chunk and compare the deployed GLB hash with the checked-in asset.
