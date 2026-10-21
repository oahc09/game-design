/** Scores actual model plans against the existing, separately held routing fixtures. */
export function reviewModelRoutes(fixtures,rows){
 if(!Array.isArray(fixtures)||!fixtures.length||!Array.isArray(rows))throw Error('NONEMPTY_ROUTING_INPUT_REQUIRED');
 const expectedIds=new Set(fixtures.map(f=>f.id)),issues=[],byId=new Map();
 for(const row of rows){
  if(!row||!expectedIds.has(row.id)){issues.push({code:'UNKNOWN_ROW',id:row?.id});continue;}
  if(byId.has(row.id)){issues.push({code:'DUPLICATE_ROW',id:row.id});byId.set(row.id,null);continue;}
  byId.set(row.id,row);
 }
 const cases=fixtures.map(f=>{
  const r=byId.get(f.id),e=f.expected,errors=[];
  if(!r)errors.push('missing_or_duplicate_row');
  else{
   if(r.task_type!==e.task_type)errors.push('task_type');
   if(r.archetype!==e.archetype)errors.push('archetype');
   if(e.archetype_status&&r.archetype_status!==e.archetype_status)errors.push('archetype_status');
   const roles=Array.isArray(r.roles)?r.roles:[],tools=Array.isArray(r.tools)?r.tools:[];
   if(!Array.isArray(r.roles)||!Array.isArray(r.tools))errors.push('invalid_role_or_tool_list');
   for(const role of e.roles??[])if(!roles.includes(role))errors.push(`role:${role}`);
   for(const tool of e.tools??[])if(!tools.includes(tool))errors.push(`tool:${tool}`);
   for(const tool of e.forbidden_tools??[])if(tools.includes(tool))errors.push(`forbidden_tool:${tool}`);
   if(e.contract&&r.contract!==e.contract)errors.push('contract');
  }
  return {id:f.id,archetype:e.archetype,task_type:e.task_type,status:errors.length?'FAIL':'PASS',issues:errors,model_route:r??null};
 });
 const group=key=>Object.fromEntries([...new Set(cases.map(c=>c[key]))].map(k=>{const subset=cases.filter(c=>c[key]===k);return [k,{total:subset.length,passed:subset.filter(c=>c.status==='PASS').length}]}));
 return {kind:'ACTUAL_MODEL_ROUTING_REVIEW',status:issues.length||cases.some(c=>c.status==='FAIL')?'FAIL':'PASS',total:cases.length,passed:cases.filter(c=>c.status==='PASS').length,issues,cases,by_archetype:group('archetype'),by_task_type:group('task_type'),scope:'Plans only on development fixtures; no gameplay implementation or formal effectiveness certification'};
}
