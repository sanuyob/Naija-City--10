export function mountDeviceBaseline({ app, canvas, device, stats, getRenderDiagnostics }) {
  const button = document.getElementById('baseline-toggle');
  const output = document.getElementById('baseline-report');
  const state = { active: false, startedAt: 0, frames: [] };
  window.__NAIJA_DEVICE_BASELINE__ = { state: 'ready', report: null };
  if (!button || !output) return;
  button.addEventListener('click', () => {
    if (state.active) return;
    state.active = true;
    state.startedAt = performance.now();
    state.frames = [];
    output.hidden = false;
    output.textContent = 'Running a 30-second on-device test. Keep the game open and do not switch apps…';
    button.textContent = 'TEST RUNNING…';
    window.__NAIJA_DEVICE_BASELINE__ = { state: 'running', report: null };
  });
  app.on('frameend', () => {
    if (!state.active) return;
    const frameMs = Number(stats.frameTime || 0);
    if (frameMs > 0 && Number.isFinite(frameMs)) state.frames.push(frameMs);
    if (performance.now() - state.startedAt < 30000) return;
    state.active = false;
    const sorted = [...state.frames].sort((a, b) => a - b);
    const average = sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length);
    const at = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
    const diagnostics = getRenderDiagnostics();
    const report = {
      testSeconds: 30,
      frames: sorted.length,
      averageFps: Number((1000 / Math.max(average, 0.01)).toFixed(1)),
      averageFrameMs: Number(average.toFixed(2)),
      p95FrameMs: Number(at(0.95).toFixed(2)),
      p99FrameMs: Number(at(0.99).toFixed(2)),
      peakFrameMs: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
      device: {
        userAgent: navigator.userAgent,
        deviceMemoryGiB: navigator.deviceMemory || 'not exposed',
        hardwareConcurrency: navigator.hardwareConcurrency || 'not exposed',
        dpr: window.devicePixelRatio || 1,
        viewport: [window.innerWidth, window.innerHeight],
        canvas: [canvas.width, canvas.height]
      },
      renderer: {
        gpu: device.unmaskedRenderer || 'not exposed',
        drawCalls: stats.drawCallCount || 0,
        meshInstances: diagnostics.meshInstances,
        gpuResourcesMiB: Number(((stats.vramTotalBytes || 0) / 1048576).toFixed(1)),
        jsHeapMiB: performance.memory?.usedJSHeapSize
          ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1))
          : 'not exposed'
      }
    };
    window.__NAIJA_DEVICE_BASELINE__ = { state: 'complete', report };
    output.textContent = 'ON-DEVICE PERFORMANCE REPORT\n' + JSON.stringify(report, null, 2) + '\n\nLong-press this report to select and copy it.';
    button.textContent = 'RUN AGAIN · 30s';
  });
}
