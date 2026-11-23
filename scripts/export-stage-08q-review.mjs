import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('artifacts/daylight-review');
const audit=JSON.parse(await readFile(resolve(root,'yaba-daylight-audit.json'),'utf8')).audit.unbatchedComponentAudit;
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const headers=['index','entityName','componentType','parentPath','meshCount','category','reason','staticBatchCandidate','transparent','materialNames','worldPosition','worldScale','bounds','batchGroupId'];
const rows=audit.components.map((c,i)=>{
 const mats=c.materials||[];
 const transparent=mats.some(m=>m.transparent||m.blendType!==3);
 const dynamic=c.movement?.reason==='name/animation/skin/physics heuristic';
 const category=transparent?(dynamic?'special':'transparent'):dynamic?'dynamic':c.staticBatchCandidate?'static':'special';
 return [i+1,c.entityName,c.componentType,(c.parentPath||[]).join('/'),c.meshCount,category,c.movement?.reason,c.staticBatchCandidate,transparent,mats.map(m=>m.name).join(';'),JSON.stringify(c.transform?.worldPosition||[]),JSON.stringify(c.transform?.worldScale||[]),JSON.stringify(c.transform?.bounds||[]),c.batchGroupId].map(quote).join(',');
});
const csv=[headers.map(quote).join(','),...rows].join('\n')+'\n';
const summary={stage:'08Q',capturedAt:new Date().toISOString(),auditedComponentCount:audit.unbatchedComponents,classification:audit.classification,categories:{static:audit.components.filter(c=>c.staticBatchCandidate).length,dynamic:audit.components.filter(c=>c.movement?.reason==='name/animation/skin/physics heuristic'&&!(c.materials||[]).some(m=>m.transparent||m.blendType!==3)).length,transparent:audit.components.filter(c=>(c.materials||[]).some(m=>m.transparent||m.blendType!==3)&&c.movement?.reason!=='name/animation/skin/physics heuristic').length,special:audit.components.filter(c=>c.movement?.reason==='name/animation/skin/physics heuristic'&&(c.materials||[]).some(m=>m.transparent||m.blendType!==3)).length},note:'Full capture currently reports 569 unbatched components; this is 18 more than the earlier 551-object target snapshot. The export preserves every captured row so none is silently discarded.',batching:{cellSizeMetres:48,assignedComponents:279,groupCount:32,batches:66,oversizedAabbs:10,singletonCells:2},benchmark:JSON.parse(await readFile(resolve(root,'stage-08q-benchmark.json'),'utf8'))};
const out=resolve('reports/stage-08q');await mkdir(out,{recursive:true});await writeFile(resolve(out,'unbatched-component-audit.csv'),csv);await writeFile(resolve(out,'review-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({auditRows:rows.length,csvBytes:Buffer.byteLength(csv),summary:summary.categories,output:out}));
[exit status 0]