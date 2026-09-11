# Thea character and screen actions

The production renderer uses `thea-upper-body-v4.glb`, the approved character with the original textured sweater, necklaces and two folded arms. Its Sass clip provides head and shoulder motion. The calendar screen also gets a floating calendar decoration.

The procedural body, extra sleeves/hands, clipboard and drinks from PR #27 have been removed. They did not preserve the approved character quality. `thea-actions-v5.glb` remains available only for older cached clients; current code must not load it.

The original supplied GLB has one mesh, no skin and no animation clips. Genuine arm gestures require preparing that mesh (separating and repairing the folded arms, preserving texture detail, then rigging and weight painting) or obtaining an editable rigged source. Do not simulate this by overlaying arms, swapping in a primitive torso, or showing hand-held props detached from her actual hands.

`TheaCharacter.activity` retains the screen context for a future corrected rig. Only `calendar` currently adds a prop; `clipboard` and `chat` retain the original character and Sass clip until an approved rig is available. The renderer retains the 30 fps cap, visibility pause, shared model bytes, cleanup and reduced-motion/data-saver poster fallback.
