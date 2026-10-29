# Verification — 2026-10-17

Story: open the floating edit → select a person/product → view isolated slow-motion media and details → add/remove an item in a locally persisted bag → return to the scene.

- JavaScript syntax: `npm run check` passes.
- HTTP: homepage 200; MP4 range request 206 with correct Content-Range and video/mp4 type.
- Browser: all 14 scene video elements loaded with no media errors. The 15th media file is the alternative person-focus clip.
- Visual: desktop scene displays independent person/products/ribbons without their original rectangular backgrounds; product focus view displays the bag and item panel. 390px iframe layout checked for homepage and bag focus.
- Interaction: bag focus, add, subtotal $245, remove to empty, back, search “headphones”, global pause and resume, person focus switching to person-focus.mp4 verified in browser.
- Console: no warning/error messages observed during the browser checks.
- Original videos and first-frame assets unchanged; optimized copies reside in media/.

Limits: no production checkout, inventory or alternate full-body personas. Real-time background masking and first-frame loop fading are prototype compositing; edge precision and seamless body movement require further finishing for publication. Browser storage can be cleared by the user or browser. Mobile was tested with a 390px embedded viewport, not physical-device performance profiling.
