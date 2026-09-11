# Expressive Thea onboarding character

Version 3 replaces the old whole-body floating model throughout onboarding. Spline converted the approved big-eyed, loose-curled character reference into a textured mesh. The mesh was welded before reduction to preserve surface continuity, then rigged and animated in Blender.

`public/models/thea-expressive-v3.glb` contains a five-bone skeleton and three 12-second performances:

- `Wave`: independent upper-arm, forearm and wrist movement for the welcome and calendar-connect screens.
- `Present`: open-hand gesture with a small head movement for people found, gift ideas and interest acknowledgement.
- `Listen`: a restrained head nod for manual entry, chat before interests, membership and completion.

The body root remains fixed. There is no lip-sync or facial blendshape animation in this version. Reduced-motion and data-saver users receive matching stills instead.

## Runtime and asset budget

- Original Spline generation: 461,240 faces, approximately 49 MB.
- Production: 83,022 triangles, approximately 1.7 MiB GLB, Meshopt compression and 2048px WebP textures.
- Matching transparent WebP posters, with a separate compact framing for the chat header.
- Three.js is dynamically imported. Model bytes are shared across onboarding steps; skeletons and GPU resources belong to the mounted component and are disposed on navigation.
- Gesture changes crossfade without reloading the model.
- Rendering is capped at 30fps and 1.5 device pixel ratio. Hidden and offscreen scenes pause; no shadow maps or postprocessing.
- Reduced motion and data-saver skip the model download. Network, texture and context failures retain the poster. Loading has a 15-second timeout.
- Existing blob image/connect CSP allowances support GLB embedded textures.

## Verification

- Production build and changed-file ESLint pass.
- Browser checks at 320x568, 390x844 and 1440x900: calendar CTA visible, no horizontal overflow or JS exceptions.
- Manual entry through chat, gift recommendations and membership retains one live canvas and makes one model download.
- Reduced motion makes no model request; failed model requests retain the poster.
- Sampled skinned vertices across the wave: approximately 8 cm hand travel and zero foot travel. Close-up rendering checked for mesh seams and deformation.

Full-project `tsc` remains blocked by pre-existing Supabase CLI update text appended to `src/integrations/supabase/types.ts` on main (lines 1177-1178).
