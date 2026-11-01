/** Public request contract, deliberately separate from schema and numeric gates. */
import {hash} from '../core/index.mjs';
export const TASK_CONTRACT_VERSION='task-contract-1.0.0';
export const readOnlyRequest=text=>/(?:只读|不修改(?:代码|文件)?|不要修改|仅诊断|read[ -]?only|do not modify|don't modify)/i.test(text);
function quantity(value){if(/^\d+$/.test(value))return Number(value);const digits={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};if(value.includes('十')){const [a,b]=value.split('十');return (a?digits[a]:1)*10+(b?digits[b]:0);}return digits[value];}
export function normalizeTaskContract(request,{archetype=null,requested_count=null,spawn_bounds=null}={}){
 const source=typeof request==='string'?request:request?.prompt??request?.text??'';
 const structured=typeof request==='object'?request:{};
 const matches=[...source.matchAll(/(?:追加|新增|生成|制作|增加)\s*([\d一二两三四五六七八九十]+)\s*(?:个|道)?(?:新)?关|(?:add|append|generate|create)\s+(\d+)\s+(?:new\s+)?levels?/gi)].map(m=>quantity(m[1]??m[2]));
 const counts=[...matches,...[structured.requested_count,requested_count].filter(v=>v!=null)];
 if(counts.some(n=>!Number.isSafeInteger(n)||n<1||n>1000)||new Set(counts).size>1)throw Error('INVALID_OR_CONFLICTING_REQUESTED_COUNT');
 const bounds=structured.spawn_bounds??spawn_bounds;
 if(bounds!==null)validateSpawnBounds(bounds);
 const permission=structured.permissions?.mode;
 if(permission!=null&&!['read_only','write'].includes(permission))throw Error('INVALID_TASK_PERMISSION');
 const contract={version:TASK_CONTRACT_VERSION,source,source_hash:hash(source),permissions:{mode:readOnlyRequest(source)||permission==='read_only'?'read_only':'write'},archetype:structured.archetype??archetype,requested_count:counts[0]??null,spawn_bounds:bounds};
 return contract;
}
export function validateSpawnBounds(b){
 if(!b||Array.isArray(b)||Object.keys(b).sort().join(',')!=='max_x,max_y,min_x,min_y'||Object.values(b).some(v=>!Number.isFinite(v))||b.min_x>b.max_x||b.min_y>b.max_y)throw Error('INVALID_SPAWN_BOUNDS');
 return b;
}
export function validateTaskSpecs(contract,specs,{project=null,checkCount=false}={}){
 const issues=[];
 if(contract?.version!==TASK_CONTRACT_VERSION)issues.push({code:'INVALID_TASK_CONTRACT_VERSION'});
 if(project?.archetype&&project.archetype!==contract.archetype)issues.push({code:'PROJECT_ARCHETYPE_MISMATCH'});
 if(!Array.isArray(specs)||!specs.length)issues.push({code:'EMPTY_TASK_SPECS'});
 for(const [i,spec] of (specs??[]).entries()){
  for(const section of ['game','design','content'])if(spec?.[section]?.archetype!==contract.archetype)issues.push({code:'TASK_ARCHETYPE_MISMATCH',level:i,section,actual:spec?.[section]?.archetype});
  if(contract.spawn_bounds){
   const b=validateSpawnBounds(contract.spawn_bounds),c=spec?.content?.extensions?.arcade_shooter;
   if(!c)issues.push({code:'SPAWN_BOUNDS_UNSUPPORTED',level:i});
   else for(const kind of ['enemies','spawns'])for(const [j,e] of (c[kind]??[]).entries())if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||e.x<b.min_x||e.x>b.max_x||e.y<b.min_y||e.y>b.max_y)issues.push({code:'SPAWN_OUTSIDE_TASK_BOUNDS',level:i,kind,index:j,x:e.x,y:e.y});
  }
 }
 if(checkCount&&contract.requested_count!=null&&specs?.length!==contract.requested_count)issues.push({code:'REQUESTED_COUNT_NOT_MET',requested:contract.requested_count,delivered:specs?.length??0});
 return {status:issues.length?'FAIL':'PASS',task_contract_pass:!issues.length,contract_hash:hash(contract),issues};
}
