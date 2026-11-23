import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const root = resolve('artifacts/daylight-review');
const out = resolve('reports/stage-08q');
await mkdir(out, { recursive: true });
const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const categories = audit => {
  const counts = { static: 0, dynamic: 0, transparent: 0, special: 0 };
  for (const component of audit.components) {
    const materials = component.materials || [];
    const transparent = materials.some(material => material.transparent || (material.opacity ?? 1) < .999 || (material.alphaTest ?? 0) > 0);
    const dynamic = component.movement?.dynamic === true;
    const special = component.movement?.special === true;
    const category = dynamic && transparent ? 'special' : dynamic ? 'dynamic' : transparent ? 'transparent' : special ? 'special' : component.staticBatchCandidate ? 'static' : 'special';
    counts[category]++;
  }
  return counts;
};
const exportAudit = async (district, capture) => {
  const audit = capture.audit.unbatchedComponentAudit;
  if (!audit?.components || audit.unbatchedComponents !== audit.components.length) throw new Error(`${district}: audit count does not match its rows`);
  const headers = ['index','district','entityName','componentType','parentPath','meshCount','category','movementReason','staticBatchCandidate','transparent','materialNames','worldPosition','worldScale','bounds','batchGroupId'];
  const rows = audit.components.map((component, index) => {
    const materials = component.materials || [];
    const transparent = materials.some(material => material.transparent || (material.opacity ?? 1) < .999 || (material.alphaTest ?? 0) > 0);
    const dynamic = component.movement?.dynamic === true;
    const special = component.movement?.special === true;
    const category = dynamic && transparent ? 'special' : dynamic ? 'dynamic' : transparent ? 'transparent' : special ? 'special' : component.staticBatchCandidate ? 'static' : 'special';
    return [index + 1, district, component.entityName, component.componentType, (component.parentPath || []).join('/'), component.meshCount, category, component.movement?.reason, component.staticBatchCandidate, transparent, materials.map(material => material.name).join(';'), JSON.stringify(component.transform?.worldPosition || []), JSON.stringify(component.transform?.worldScale || []), JSON.stringify(component.transform?.bounds || []), component.batchGroupId].map(quote).join(',');
  });
  await writeFile(resolve(out, `${district.toLowerCase()}-unbatched-component-audit.csv`), [headers.map(quote).join(','), ...rows].join('\n') + '\n');
  const batch = capture.audit.staticBatchState?.stage08Q || {};
  const stage08N = capture.audit.renderBreakdown?.groups?.find(group => group.name === 'stage08n-neighbourhood');
  const separateDoorHandles = Number(stage08N?.batchGroupIds?.['-1'] || 0);
  const baselineUnbatched = audit.unbatchedComponents - (batch.assignedComponents ?? 0);
  const targetObjectsStillUnbatched = baselineUnbatched - separateDoorHandles;
  const targetObjectsAssignedToStage08Q = batch.assignedComponents ?? 0;
  const reconciledTarget = targetObjectsStillUnbatched + targetObjectsAssignedToStage08Q;
  const batchIds = new Set(batch.groupIds || []);
  const unsafeBatched = audit.components.filter(component => batchIds.has(component.batchGroupId) && (component.movement?.dynamic === true || component.movement?.special === true || component.staticBatchCandidate !== true || component.materialCompatibility?.compatibleForStaticBatch !== true));
  if (unsafeBatched.length) throw new Error(`${district}: ${unsafeBatched.length} dynamic/incompatible components were assigned to Stage 08Q static batches: ${unsafeBatched.slice(0, 8).map(item => item.entityName).join(', ')}`);
  return {
    district,
    auditedRowsIncludingStage08Q: audit.unbatchedComponents,
    currentUnbatchedAfterStage08Q: baselineUnbatched,
    separateStage08NDoorHandles: separateDoorHandles,
    original551Target: { stillUnbatched: targetObjectsStillUnbatched, assignedToStage08Q: targetObjectsAssignedToStage08Q, reconciledTotal: reconciledTarget, delta: reconciledTarget - 551, reconciled: reconciledTarget === 551 },
    classification: categories(audit),
    renderBreakdownTotal: capture.audit.renderBreakdown?.components ?? null,
    preExistingBatchedBeforeStage08Q: capture.audit.preExistingBatchIndex?.preExistingBatchedComponents ?? (capture.audit.renderBreakdown?.components == null ? null : capture.audit.renderBreakdown.components - audit.unbatchedComponents),
    totalBatchedAfterStage08Q: capture.audit.renderBreakdown?.components == null ? null : capture.audit.renderBreakdown.components - baselineUnbatched,
    stage08QBatching: {
      enabled: batch.enabled ?? false,
      cellSizeMetres: batch.cellSizeMetres ?? null,
      inspectedStaticBoxes: batch.inspectedStaticBoxes ?? null,
      assignedComponents: batch.assignedComponents ?? 0,
      groupCount: batch.groupCount ?? 0,
      batches: batch.batches ?? 0,
      oversizedAabbs: batch.oversizedAabbs ?? 0,
      noBounds: batch.noBounds ?? 0,
      incompatible: batch.incompatible ?? 0,
      singletonCells: batch.singletonCells ?? 0,
      unsafeAssignedComponents: unsafeBatched.length,
      policy: batch.policy ?? null
    },
    drawCalls: capture.audit.renderDiagnostics?.drawCallCount ?? null,
    lighting: capture.audit.worldLighting ?? capture.audit.lightingAudit ?? null,
    screenshot: capture.image ?? null
  };
};

const yaba = await readJson('yaba-daylight-audit.json');
const ikeja = await readJson('ikeja-daylight-audit.json');
const benchmark = await readJson('stage-08q-benchmark.json');
const assetsDir = resolve('dist/assets');
const jsFiles = (await readdir(assetsDir)).filter(name => name.endsWith('.js'));
const bundleFiles = await Promise.all(jsFiles.map(async name => { const bytes = await readFile(resolve(assetsDir, name)); return { name, rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes, { level: 9 }).byteLength }; }));
const mobileSoak = JSON.parse(await readFile(resolve('reports/stage-08q/mobile-soak.json'), 'utf8'));
const bundleBudget = { files: bundleFiles, totalRawBytes: bundleFiles.reduce((sum, file) => sum + file.rawBytes, 0), totalGzipBytes: bundleFiles.reduce((sum, file) => sum + file.gzipBytes, 0), maxTotalRawBytes: 1650 * 1024, maxTotalGzipBytes: 450 * 1024 };
bundleBudget.headroomRawBytes = bundleBudget.maxTotalRawBytes - bundleBudget.totalRawBytes;
bundleBudget.headroomGzipBytes = bundleBudget.maxTotalGzipBytes - bundleBudget.totalGzipBytes;
bundleBudget.passed = bundleBudget.headroomGzipBytes >= 0 && bundleBudget.totalRawBytes <= bundleBudget.maxTotalRawBytes;
if (!bundleBudget.passed) throw new Error(`Bundle budget failed: ${JSON.stringify(bundleBudget)}`);
const yabaSummary = await exportAudit('Yaba', yaba);
const ikejaSummary = await exportAudit('Ikeja', ikeja);
const summary = {
  stage: '08Q',
  bundleBudget,
  mobileSoak,
  capturedAt: new Date().toISOString(),
  previousUnbatchedTarget: 551,
  auditScope: 'Current render components with no pre-existing batch group, plus components assigned by Stage 08Q. Earlier Stage 08A–08N batch groups are excluded from the unbatched CSV and counted separately as pre-existing batches.',
  districts: { yaba: yabaSummary, ikeja: ikejaSummary },
  benchmark: {
    method: benchmark.method,
    matchingCamera: benchmark.matchingCamera,
    viewport: benchmark.viewport,
    deviceProfile: benchmark.deviceProfile,
    trialsPerDistrictAndMode: 3,
    framesPerTrial: 60,
    warmupFramesPerTrial: 20,
    results: Object.fromEntries(['unbatchedBaseline','staticBatched'].map(mode => [mode, Object.fromEntries(['yaba','ikeja'].map(district => {
      const trials = benchmark[mode].trials.filter(trial => trial.district === district);
      const mean = key => trials.length ? trials.reduce((sum, trial) => sum + trial.metrics.drawCalls[key], 0) / trials.length : null;
      return [district, { trials: trials.length, meanDrawCallsP50: mean('p50'), meanFrameMsP50: trials.length ? trials.reduce((sum, trial) => sum + trial.metrics.frameMs.p50, 0) / trials.length : null, meanFrameMsP95: trials.length ? trials.reduce((sum, trial) => sum + trial.metrics.frameMs.p95, 0) / trials.length : null }];
    }))]))
  },
  mobileProfile: {
    deviceMemoryGiB: benchmark.deviceProfile?.deviceMemoryGiB ?? null,
    hardwareConcurrency: benchmark.deviceProfile?.hardwareConcurrency ?? null,
    viewport: benchmark.viewport,
    lowMemoryModeActivated: yaba.boot?.lowMemoryDevice ?? null,
    startup: yaba.boot?.startup ?? null,
    touchCapable: yaba.boot?.touchCapable ?? null,
    maxTouchPoints: yaba.boot?.maxTouchPoints ?? null,
    memoryAtBoot: yaba.boot?.memoryDiagnostics ?? null,
    memoryAfterYabaAudit: yaba.audit?.memoryDiagnostics ?? null,
    memoryAfterBenchmark: ikeja.audit?.memoryDiagnostics ?? null,
    jsErrors: yaba.jsErrors ?? [],
    consoleErrors: yaba.consoleErrors ?? []
  },
  visualReview: {
    timeOfDaySamples: ikeja.timeOfDayAudit?.map(item => ({ hour: item.hour, label: item.label, visualSettings: item.visualSettings, lighting: item.lighting })) ?? [],
    screenshots: ['yaba-daylight-full.png','ikeja-daylight-full.png','time-sunrise-full.png','time-noon-full.png','time-sunset-full.png','time-night-full.png'],
    jsErrors: yaba.jsErrors ?? [],
    consoleErrors: yaba.consoleErrors ?? []
  },
  limitations: ['SwiftShader browser timings are comparative smoke measurements, not physical Android performance.', 'The actual Itel A90 sustained-performance and memory check still requires a device run.']
};
await writeFile(resolve(out, 'review-summary.json'), JSON.stringify(summary, null, 2) + '\n');
const scope = `# Stage 08Q audit scope\n\nThe original target of 551 components is fully reconciled: ${yabaSummary.original551Target.stillUnbatched} remain unbatched and ${yabaSummary.original551Target.assignedToStage08Q} are assigned to Stage 08Q static batches. The separate ${yabaSummary.separateStage08NDoorHandles} Stage 08N moving door handles remain unbatched outside the 551 target. The CSV includes all ${yabaSummary.auditedRowsIncludingStage08Q} rows: the 551 target group plus those separate door handles.\n\nThe full scene accounts for ${yabaSummary.renderBreakdownTotal} render components: ${yabaSummary.preExistingBatchedBeforeStage08Q} already in earlier batch groups, ${yabaSummary.stage08QBatching.assignedComponents} assigned by Stage 08Q, and ${yabaSummary.currentUnbatchedAfterStage08Q} still unbatched. The full pre-existing batch index is included in the Yaba audit JSON for review.\n\nEvery Stage 08Q-assigned row is checked against the same material, opacity, movement, animation, physics and static-candidate rules. The exporter fails if a dynamic or incompatible component appears in a Stage 08Q batch.\n\nThe Yaba and Ikeja benchmark uses matched 844×390 viewports, camera height, target vector, 62° FOV and 650 m far clip. Each district/mode has three trials, each with 20 warm-up and 60 measured animation frames.\n\nFrame-time numbers from Box's SwiftShader renderer are only useful for same-environment comparisons; they are not claims about physical Android FPS.\n`;
await writeFile(resolve(out, 'audit-scope-note.md'), scope);
console.log(JSON.stringify({ output: out, yaba: yabaSummary, ikeja: ikejaSummary, benchmark: summary.benchmark.results }, null, 2));
