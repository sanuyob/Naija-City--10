import * as pc from 'playcanvas';

/**
 * Stage 08F repeatable on-device profiling harness.
 * Keeps a bounded rolling sample set and exposes a JSON snapshot/download.
 * It measures the current device; it does not infer phone performance from UA.
 */
export function createStage08FDeviceProfiler({ app, canvas, device, stage08E }) {
  const startedAt = performance.now();
  const samples = [];
  const maxSamples = 1800;
  let firstBuildingMs = null;
  let lastLoadedCount = 0;
  let frameCounter = 0;

  function sample() {
    const now = performance.now();
    const frameMs = Number(app.stats?.frameTime) || 0;
    if (frameMs > 0 && Number.isFinite(frameMs)) {
      samples.push({ t: Math.round(now - startedAt), ms: frameMs });
      if (samples.length > maxSamples) samples.shift();
    }
    frameCounter++;
    const stage = stage08E?.getState?.();
    const loaded = Number(stage?.loadedBuildings) || 0;
    if (loaded > 0 && firstBuildingMs === null) firstBuildingMs = Math.round(now - startedAt);
    lastLoadedCount = loaded;
  }

  function percentile(sorted, p) {
    if (!sorted.length) return null;
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  }

  function snapshot() {
    const frameTimes = samples.map(s => s.ms).sort((a, b) => a - b);
    const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : null;
    const heapBytes = performance.memory?.usedJSHeapSize ?? null;
    const stats = app.stats || {};
    const stage = stage08E?.getState?.() || {};
    return {
      stage: '08F',
      capturedAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      sampleCount: frameTimes.length,
      frame: {
        averageMs: avg,
        p50Ms: percentile(frameTimes, 0.50),
        p95Ms: percentile(frameTimes, 0.95),
        worstMs: frameTimes.length ? frameTimes[frameTimes.length - 1] : null,
        estimatedAverageFps: avg ? 1000 / avg : null
      },
      rendering: {
        drawCalls: stats.drawCallCount ?? null,
        primitiveCount: stats.primitiveCount ?? null,
        gpuResourceMiB: Number.isFinite(stats.vramTotalBytes) ? stats.vramTotalBytes / 1048576 : null,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        renderer: device.unmaskedRenderer || 'not exposed'
      },
      memory: { jsHeapMiB: heapBytes === null ? null : heapBytes / 1048576 },
      device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemoryGiB: navigator.deviceMemory || null,
        screen: { width: screen.width, height: screen.height, orientation: screen.orientation?.type || null }
      },
      loading: {
        firstBuildingMs: firstBuildingMs,
        loadedBuildings: lastLoadedCount,
        expectedBuildings: stage.expectedBuildings ?? null,
        loadingBuildings: stage.loadingBuildings ?? null,
        failedBuildings: stage.failedBuildings ?? null
      },
      limitations: [
        'GPU memory is the engine-reported tracked resource estimate, not a full operating-system VRAM measurement.',
        'JavaScript heap is omitted on browsers that do not expose performance.memory.',
        'A browser run is not a substitute for a physical-device test.'
      ]
    };
  }

  function download() {
    const payload = JSON.stringify(snapshot(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'naija-city-stage-08f-device-profile.json';
    anchor.click();
    URL.revokeObjectURL(url);
    return payload;
  }

  app.on('frameend', sample);
  return {
    snapshot,
    download,
    reset() {
      samples.length = 0;
      firstBuildingMs = null;
      lastLoadedCount = 0;
      frameCounter = 0;
    },
    destroy() { app.off('frameend', sample); },
    get sampleCount() { return samples.length; }
  };
}
