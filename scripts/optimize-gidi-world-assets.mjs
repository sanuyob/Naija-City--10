import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const MANIFEST_PATH = path.join(PUBLIC, 'assets/gidi/manifest.json');
const OUT_DIR = path.join(PUBLIC, 'assets/gidi/optimized');
const CLI = path.join(ROOT, 'node_modules/.bin/gltf-transform');
const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const filterArg = process.argv.find(arg => arg.startsWith('--filter='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const filter = filterArg ? filterArg.slice('--filter='.length) : null;
const partialRun = Number.isFinite(limit) || Boolean(filter);

const tasks = [{ key: 'infrastructure', ref: manifest.infrastructure }];
for (const cell of manifest.cells || []) {
  tasks.push({ key: `${cell.id}:full`, cell, field: 'full', ref: cell.full });
  tasks.push({ key: `${cell.id}:lod1`, cell, field: 'lod1', ref: cell.lod1 });
}
const selected = tasks.filter(task => task.ref && !task.ref.startsWith('assets/gidi/optimized/') && (!filter || task.ref.includes(filter))).slice(0, limit);
assert.ok(selected.length > 0, 'No source GIDI assets require optimization.');
await fs.mkdir(OUT_DIR, { recursive: true });

const report = [];
for (let i = 0; i < selected.length; i++) {
  const task = selected[i];
  const sourcePath = path.join(PUBLIC, task.ref);
  const base = path.basename(sourcePath, '.gltf');
  const joinedPath = path.join(OUT_DIR, `${base}.joined.gltf`);
  const outputPath = path.join(OUT_DIR, `${base}.gltf`);
  const outputRef = `assets/gidi/optimized/${base}.gltf`;
  const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const originalMeshCount = source.meshes?.length || 0;
  const originalPrimitiveCount = (source.meshes || []).reduce((n, mesh) => n + (mesh.primitives?.length || 0), 0);

  await execFileAsync(CLI, ['join', sourcePath, joinedPath], { maxBuffer: 32 * 1024 * 1024 });
  await execFileAsync(CLI, ['meshopt', joinedPath, outputPath], { maxBuffer: 32 * 1024 * 1024 });

  const optimized = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  const optimizedMeshCount = optimized.meshes?.length || 0;
  const optimizedPrimitiveCount = (optimized.meshes || []).reduce((n, mesh) => n + (mesh.primitives?.length || 0), 0);
  assert.ok(optimizedMeshCount <= originalMeshCount, `${task.key}: mesh count increased (${originalMeshCount} → ${optimizedMeshCount})`);
  assert.ok(optimizedPrimitiveCount <= originalPrimitiveCount, `${task.key}: primitive count increased (${originalPrimitiveCount} → ${optimizedPrimitiveCount})`);
  assert.ok((optimized.extensionsRequired || []).includes('EXT_meshopt_compression'), `${task.key}: output is missing required meshopt compression`);

  for (const buffer of optimized.buffers || []) {
    if (!buffer.uri || buffer.uri.startsWith('data:')) continue;
    await fs.access(path.resolve(path.dirname(outputPath), buffer.uri));
  }
  for (const image of optimized.images || []) {
    if (!image.uri || image.uri.startsWith('data:')) continue;
    await fs.access(path.resolve(path.dirname(outputPath), image.uri));
  }

  const referencedFiles = [outputPath, ...(optimized.buffers || []).map(buffer => buffer.uri).filter(uri => uri && !uri.startsWith('data:')).map(uri => path.resolve(path.dirname(outputPath), uri))];
  let outputBytes = 0;
  for (const file of new Set(referencedFiles)) outputBytes += (await fs.stat(file)).size;
  const sourceBytes = (await fs.stat(sourcePath)).size + (source.buffers || []).reduce((n, buffer) => n + (buffer.uri && !buffer.uri.startsWith('data:') ? (0) : 0), 0);

  if (task.key === 'infrastructure') manifest.infrastructure = outputRef;
  else task.cell[task.field] = outputRef;

  // Remove only this task's intermediate join file and the intermediate binary sidecars.
  await fs.rm(joinedPath, { force: true });
  for (const file of await fs.readdir(OUT_DIR)) {
    if (file.startsWith(`${base}.joined_`)) await fs.rm(path.join(OUT_DIR, file), { force: true });
  }
  report.push({ key: task.key, source: task.ref, optimized: outputRef, sourceMeshes: originalMeshCount, optimizedMeshes: optimizedMeshCount, sourcePrimitives: originalPrimitiveCount, optimizedPrimitives: optimizedPrimitiveCount, drawItemReductionPercent: originalPrimitiveCount ? Number(((1 - optimizedPrimitiveCount / originalPrimitiveCount) * 100).toFixed(1)) : 0, outputGltfAndBuffersBytes: outputBytes, sourceGltfJsonBytes: sourceBytes });
  process.stdout.write(`[${i + 1}/${selected.length}] ${task.key}: ${originalPrimitiveCount} → ${optimizedPrimitiveCount} primitives; ${outputBytes.toLocaleString()} bytes\n`);
}

// A limited test run deliberately does not mutate the runtime manifest.
if (partialRun) {
  await fs.writeFile(path.join(OUT_DIR, 'optimization-report.partial.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ partial: true, processed: report.length, report }, null, 2));
} else {
  manifest.assetOptimization = {
    pipeline: 'gltf-transform join + meshopt',
    version: '4.5.1',
    staticGeometry: true,
    note: 'Baked static cell/infrastructure geometry is merged by compatible material before runtime streaming. Runtime batches are not used for the streamed GIDI imports.'
  };
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest) + '\n');
  await fs.writeFile(path.join(OUT_DIR, 'optimization-report.json'), JSON.stringify({ count: report.length, report }, null, 2) + '\n');
  console.log(JSON.stringify({ pass: true, optimizedAssets: report.length, totalPrimitivesBefore: report.reduce((n, item) => n + item.sourcePrimitives, 0), totalPrimitivesAfter: report.reduce((n, item) => n + item.optimizedPrimitives, 0), report }, null, 2));
}
