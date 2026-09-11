# Thea greeting release

Approved mixed-heritage Thea, exported from Spline scene:
https://app.spline.design/file/8f2abdbc-a91f-474d-af04-101c0a6b2d91

The first calendar-connect screen loads `public/models/thea-greeting-v2.glb` through a dynamic import. Other onboarding screens use a matching transparent WebP poster. The Spline greeting's entrance bounce, gentle tilt and breathing idle are reproduced in Three.js; this GLB has no skeletal rig or independent hand/lip animation.

## Mobile budget

- Source: 466,310 triangles, approximately 62 MiB GLB.
- Production: 69,946 triangles, approximately 1.1 MiB GLB; Meshopt compression, 1024px WebP textures.
- Poster: approximately 20 KiB, captured from the production renderer.
- Rendering capped at 30fps and 1.5 device pixel ratio, no shadow maps or postprocessing.
- Offscreen/hidden scenes stop rendering. Navigation disposes GPU resources.
- Reduced motion and data-saver skip the 3D download. Network, texture and context failures retain the poster. Loading has a 15-second timeout.
- Blob sources are allowed in image/connect CSP for GLB embedded texture decoding.

## Verification

Build and changed-file ESLint pass. Browser checks at 320x568, 390x844 and 1440x900: CTAs visible, no horizontal overflow, no JS exceptions, animated frames differ. Reduced motion makes no GLB request; failed GLB requests retain the poster; manual-entry navigation removes the canvas.

Full-project `tsc` is blocked by pre-existing Supabase CLI update text appended to `src/integrations/supabase/types.ts` on main (lines 1177-1178).
