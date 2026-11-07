// Targeted regression checks over actual captured browser observations.
// A PASS here covers only the named repairs, never complete task acceptance.
export function targetChecks(record) {
 const snapshots=record.snapshots??[],at=i=>snapshots.find(s=>s.phase==='action-'+i)?.state;
 const equal=(a,b)=>a!=null&&b!=null&&JSON.stringify(a)===JSON.stringify(b);
 const observed=record.status==='OBSERVED'&&!(record.errors??[]).length;
 let checks;
 if(record.task_id==='gd-009') {
  const initial=at(0);
  checks={observed,initial_present:initial!=null,moved_before_restart:!!at(1)&&!equal(initial,at(1)),lowercase_restart:equal(initial,at(2)),uppercase_restart:!!at(3)&&!equal(initial,at(3))&&equal(initial,at(4)),canvas_focus_verified:snapshots.find(s=>s.phase==='action-5')?.canvas_focused===true,focused_move:!!at(6)&&!equal(initial,at(6)),focused_restart:equal(initial,at(7)),paused_move_blocked:equal(at(8),at(9)),paused_restart:equal(initial,at(10)),win_reached:['win','won'].includes(String(at(16)?.terminal?.status).toLowerCase()),terminal_restart:equal(initial,at(17)),resumed_after_restart:!!at(18)&&!equal(initial,at(18)),final_restart:equal(initial,at(19))};
 } else if(record.task_id==='gd-019') {
  const futureKeys=new Set(['preview','queue','bag','sequence','next','nextPiece','next_piece','rngState','rng_state']);
  const leaks=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,v])=>(futureKeys.has(key)&&v!=null&&(!Array.isArray(v)||v.length>0))||leaks(v));
  checks={observed,all_snapshots_present:snapshots.length===12&&snapshots.every(s=>s.state!=null&&!s.state_error),public_states_hide_future:snapshots.length>0&&snapshots.every(s=>!leaks(s.state)),public_facade_hides_future:snapshots.length>0&&snapshots.every(s=>s.public_facade!=null&&!s.public_facade.has_raw_runtime&&!leaks(s.public_facade.state)),post_reset_hides_future:at(5)!=null&&!leaks(at(5))};
 } else throw Error('Unsupported targeted task '+record.task_id);
 return {task_id:record.task_id,label:record.label,blind_id:record.blind_id,artifact_digest:record.artifact_digest,status:Object.values(checks).every(v=>v===true)?'PASS':'FAIL',checks,scope:'Named restart/future-observation regression only; complete task obligations NOT_EVALUATED'};
}
