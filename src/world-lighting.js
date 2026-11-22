import { CameraFrame, CLOUDTYPE_FLAT, Color, DynamicSkyEffect } from 'playcanvas';

/** Lightweight day/night, atmospheric sky and single-sun lighting for Naija City. */
export function createWorldLighting({ app, camera, sun, lowMemoryDevice = false }) {
  // A single directional light is the only dynamic shadow caster. Keep its
  // shadow volume close to the player so the large city stays mobile-friendly.
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 55 : 90;
  sun.light.numCascades = 1;

  app.scene.ambientLight = new Color(0.28, 0.30, 0.34);
  app.scene.exposure = 1.0;

  const frame = new CameraFrame(app, camera.camera);
  const sky = new DynamicSkyEffect(app.graphicsDevice);
  sky.light = sun.light;
  sky.elevation = 38;
  sky.azimuth = 115;
  sky.sunIntensity = 1.65;
  sky.moonIntensity = 0.24;
  sky.luminance = 0.9;
  sky.turbidity = 3.2;
  sky.rayleigh = 1.7;
  sky.twilightGlow = 0.7;
  sky.starBrightness = 0.12;
  sky.cloudType = CLOUDTYPE_FLAT;
  sky.cloudCoverage = 0.28;
  sky.cloudSoftness = 0.72;
  sky.cloudOpacity = 0.82;
  sky.cloudBrightness = 0.78;
  sky.cloudNightBrightness = 0.035;
  sky.cloudSize = 9000;
  sky.windSpeed = 5.5;
  sky.windDirection = 68;
  // Small environment atlas; rebake only after a noticeable sun movement.
  // Avoid interpolation targets to conserve memory on entry-level Android.
  sky.lighting = true;
  sky.lightingResolution = lowMemoryDevice ? 96 : 128;
  sky.atlasSize = 256;
  sky.lightingThreshold = 10;
  sky.lightingInterpolation = false;
  frame.addEffect(sky);

  let gameHours = 9.25;
  let elapsed = 0;
  let lastFrameUpdate = 0;
  const update = (dt) => {
    elapsed += Math.max(0, Math.min(dt, 0.1));
    // One complete in-game day lasts 24 real minutes (one game minute per second).
    gameHours = (gameHours + Math.max(0, Math.min(dt, 0.1)) / 60) % 24;
    const solarPhase = ((gameHours - 6) / 12) * Math.PI;
    sky.elevation = Math.sin(solarPhase) * 68;
    sky.azimuth = (gameHours / 24) * 360 + 90;
    frame.update();
    lastFrameUpdate = elapsed;
  };

  const getState = () => ({
    enabled: true,
    timeHours: Number(gameHours.toFixed(2)),
    timeLabel: `${String(Math.floor(gameHours)).padStart(2, '0')}:${String(Math.floor((gameHours % 1) * 60)).padStart(2, '0')}`,
    sunElevation: Number(sky.elevation.toFixed(1)),
    cloudType: 'flat',
    cloudCoverage: sky.cloudCoverage,
    shadows: sun.light.castShadows,
    shadowResolution: sun.light.shadowResolution,
    shadowDistance: sun.light.shadowDistance,
    lightingAtlas: sky.atlasSize,
    lastFrameUpdate
  });

  return {
    update,
    getState,
    destroy() {
      frame.removeEffect(sky);
      sky.destroy();
      frame.destroy();
    }
  };
}
