import { Color } from 'playcanvas';

/**
 * Phase 1 lighting baseline for Naija City.
 *
 * Keep this deliberately simple: one fixed directional sun, modest ambient
 * fill, and one nearby shadow map. Sky animation, clouds, fog, environment
 * baking and post effects are intentionally deferred until this baseline is
 * visually approved and profiled on target mobile hardware.
 */
export function createWorldLighting({ app, camera, sun, lowMemoryDevice = false }) {
  // Stable daytime sun: no per-frame rotation or atmospheric simulation.
  sun.setEulerAngles(48, 28, 0);
  sun.light.color = new Color(1.0, 0.93, 0.82);
  sun.light.intensity = 1.35;

  // One directional shadow map. Keep the default PCF 3x3 filter; avoid PCF 5x5,
  // PCSS, extra cascades and additional shadow-casting lights on mobile.
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 42 : 68;
  sun.light.numCascades = 1;
  sun.light.shadowIntensity = 0.78;

  // Neutral daylight fill lifts shaded building faces without flattening
  // material contrast. Exposure remains at the neutral baseline.
  app.scene.ambientLight = new Color(0.31, 0.32, 0.34);
  app.scene.exposure = 1.0;

  // A simple clear-color sky only. No sky shader, clouds, fog or post effect.
  camera.camera.clearColor = new Color(0.46, 0.65, 0.84);

  return {
    update() {
      // Intentionally empty: lighting is static in this first tuning pass.
    },
    getState() {
      return {
        enabled: true,
        mode: 'static-daylight-baseline',
        sunIntensity: sun.light.intensity,
        ambientLight: [0.31, 0.32, 0.34],
        exposure: app.scene.exposure,
        shadows: sun.light.castShadows,
        shadowResolution: sun.light.shadowResolution,
        shadowDistance: sun.light.shadowDistance,
        shadowCascades: sun.light.numCascades,
        shadowIntensity: sun.light.shadowIntensity,
        atmosphericEffects: false
      };
    },
    destroy() {
      // No post effects or auxiliary GPU resources are allocated.
    }
  };
}
