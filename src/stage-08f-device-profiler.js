import * as pc from 'playcanvas';

/**
 * Stage 08F repeatable on-device profiling harness.
 * Keeps a bounded rolling sample set and exposes a JSON snapshot/download.
 * It measures the current device; it does not infer phone performance from UA.
 */
export function createStage08FDeviceProfiler({ app, canvas, device, stage08E }) {
  const startedAt = performance.now();
  const samples = [];
  // Retain up to five minutes at 60 Hz for a repeatable mobile drive test.
  // A circular buffer avoids Array.shift() copying thousands of samples every frame.
  const maxSamples = 18000;
  let sampleCursor = 0;
  let sampleCount = 0;
  let firstBuildingMs = null;
  let lastLoadedCount = 0;
  let frameCounter = 0;

  function sample() {
    const now = performance.now();
    const frameMs = Number(app.stats?.frameTime) || 0;
    if (frameMs > 0 && Number.isFinite(frameMs)) {
      const stats = app.stats || {};
      samples[sampleCursor] = {
        t: Math.round(now - startedAt),
        ms: frameMs,
        drawCalls: Number(stats.drawCallCount) || 0,
        gpuBytes: Number(stats.vramTotalBytes) || 0,
        cpuUpdateMs: Number(stats.cpuUpdateTime) || 0,
        cpuRenderMs: Number(stats.cpuRenderTime) || 0
      };
      sampleCursor = (sampleCursor + 1) % maxSamples;
      sampleCount = Math.min(sampleCount + 1, maxSamples);
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

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function peak(values) {
    return values.length ? Math.max(...values) : null;
  }

  function snapshot() {
    const activeSamples = sampleCount === maxSamples
      ? samples.slice(sampleCursor).concat(samples.slice(0, sampleCursor))
      : samples.slice(0, sampleCount);
    const sorted = activeSamples.map(sample => sample.ms).sort((a, b) => a - b);
    const drawCalls = activeSamples.map(sample => sample.drawCalls);
    const gpuMiB = activeSamples.map(sample => sample.gpuBytes / 1048576).filter(value => value > 0);
    const cpuUpdate = activeSamples.map(sample => sample.cpuUpdateMs);
    const cpuRender = activeSamples.map(sample => sample.cpuRenderMs);
    const avg = average(sorted);
    const heapBytes = performance.memory?.usedJSHeapSize ?? null;
    const stats = app.stats || {};
    const stage = stage08E?.getState?.() || {};
    const game = window.__NAIJA_GAME__ || {};
    const vehicle = game.getVehicleState?.() || {};
    const batches = game.getStaticBatchState?.() || {};
    const traffic = game.getTrafficPositions?.() || [];
    return {
      stage: '08F',
      capturedAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      sampleCount: sorted.length,
      sampledDurationMs: activeSamples.length > 1 ? activeSamples[activeSamples.length - 1].t - activeSamples[0].t : 0,
      frame: {
        averageMs: avg,
        p50Ms: percentile(sorted, 0.50),
        p95Ms: percentile(sorted, 0.95),
        worstMs: sorted.length ? sorted[sorted.length - 1] : null,
        estimatedAverageFps: avg ? 1000 / avg : null
      },
      rendering: {
        drawCalls: stats.drawCallCount ?? null,
        averageDrawCalls: average(drawCalls),
        peakDrawCalls: peak(drawCalls),
        primitiveCount: stats.primitiveCount ?? null,
        gpuResourceMiB: Number.isFinite(stats.vramTotalBytes) ? stats.vramTotalBytes / 1048576 : null,
        averageGpuResourceMiB: average(gpuMiB),
        peakGpuResourceMiB: peak(gpuMiB),
        averageCpuUpdateMs: average(cpuUpdate),
        averageCpuRenderMs: average(cpuRender),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        renderer: device.unmaskedRenderer || 'not exposed'
      },
      city: {
        trafficActors: traffic.length,
        vehicle: {
          available: vehicle.available ?? null,
          occupied: vehicle.occupied ?? null,
          speedKmh: vehicle.speedKmh ?? null
        },
        staticBatches: batches
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
      sampleCursor = 0;
      sampleCount = 0;
      firstBuildingMs = null;
      lastLoadedCount = 0;
      frameCounter = 0;
    },
    destroy() { app.off('frameend', sample); },
    get sampleCount() { return sampleCount; }
  };
}
{­²Ö­ºÍ