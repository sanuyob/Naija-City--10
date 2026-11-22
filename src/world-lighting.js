import { Color } from 'playcanvas';

/**
 * Mobile-first daylight foundation.
 *
 * This stage deliberately contains no post-processing, sky shader, cloud
 * renderer, environment-atlas bake, or per-frame lighting animation.
 * Add those only after the direct-lighting baseline passes visual and
 * device-performance checks.
 */
export function createWorldLighting({ app, sun, lowMemoryDevice = false }) {
  // One directional sun. A single cascade avoids multiplying shadow renders.
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 48 : 72;
  sun.light.numCascades = 1;

  // Lift shaded building faces without flattening the direct sunlight.
  app.scene.ambientLight = new Color(0.28, 0.30, 0.33);
  app.scene.exposure = 1.0;

  // The sun entity's orientation and color are authored in game.js.
  // No frame effects or environment lighting are created in this phase.
  const getState = () => ({
    enabled: true,
    phase: 'daylight-foundation',
    dynamicSky: false,
    clouds: false,
    fog: false,
    timeOfDay: 'static-daylight',
    shadows: sun.light.castShadows,
    shadowType: 'PCF-default',
    shadowResolution: sun.light.shadowResolution,
    shadowDistance: sun.light.shadowDistance,
    shadowCascades: sun.light.numCascades,
    postProcessing: false,
    environmentAtlas: false
  });

  return {
    // Reserved for the later day/night stage. Intentionally no per-frame work.
    update() {},
    getState,
    destroy() {}
  };
}
