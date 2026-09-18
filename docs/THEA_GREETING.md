# Upper-body Thea onboarding character

Version 4 uses the user-selected upper-body character: oversized tortoiseshell glasses, swept hair, ivory knitwear and folded arms. It replaces version 3 throughout onboarding.

`public/models/thea-upper-body-v4.glb` contains the `Sass` skeletal animation: a chin lift, head tilt and subtle shoulder shrug. The base remains fixed. The greeting uses the original performance speed; presenting and listening contexts slow the same performance to 80% and 55%. This model has no wave or lip-sync animation.

## Runtime and assets

- Approximately 858 KiB GLB, Meshopt compression and WebP textures.
- Matching transparent posters for standard and compact placements.
- Camera and lighting match the approved comparison preview and keep the whole bust in frame.
- Three.js loads dynamically. Model bytes are shared across onboarding steps; GPU resources and skeletons belong to each mounted component and are disposed on navigation.
- Rendering is capped at 30fps and 1.5 device pixel ratio. Hidden and offscreen scenes pause.
- Reduced-motion and data-saver users receive the matching poster without a model download. Network, texture or context failures also retain the poster. Loading has a 15-second timeout.

## Verification

- Production build and changed-file ESLint.
- Browser checks at 320x568, 390x844 and 1440x900: calendar CTA visible, no horizontal overflow or JS exceptions.
- Manual entry through chat, gift recommendations and membership: one model request and one live canvas.
- Reduced motion: no model request. Failed model download: matching poster.
- Visual review of the first screen, compact chat header and matching posters.

Full-project typecheck remains blocked by pre-existing CLI text in generated Supabase types.
