# Naija City — real Android performance capture

The Playwright/SwiftShader suites are regression tests, not device benchmarks. To measure the actual Itel A90 (or another Android phone), the game must be opened in the phone's own browser from a production build hosted at a URL the phone can reach.

1. Open the production game URL in Chrome on the phone and rotate to landscape. Do not use a desktop remote browser or a screenshot preview.
2. Let the environment finish its initial loading. Move around the intended district for at least 60 seconds so the renderer, traffic, NPC streaming and character clothes are represented in the measurements.
3. Tap **PERF** in the top-right tools area. This opens the rolling live performance panel and the **EXPORT DEVICE PROFILE** button.
4. Tap **EXPORT DEVICE PROFILE**. The JSON file is collected from that phone's browser and includes browser/device identity, WebGL renderer, viewport and DPR, frame-time percentiles, FPS estimate, draw calls, CPU update/render time, engine-tracked GPU resources, JavaScript heap when exposed, and live district/NPC/outfit counts.
5. Keep the report unchanged and attach it to the project review. Compare results only between the same scene, district, camera mode, device and browser settings.

The GPU memory field is PlayCanvas's tracked resource estimate, not a complete operating-system VRAM reading. Some Android browsers hide GPU names and JavaScript heap counters; those fields will be `not exposed` or `null` rather than guessed. A physical-device result is not complete until this export is captured on the actual phone.
