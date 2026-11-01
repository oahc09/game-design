/** Fail-closed rules evidence validation. Does not certify aggregate metrics or design quality. */
import {canonical,hash,validateSeed} from '../core/index.mjs';
import {runReplay} from '../core/replay.mjs';
import {getArchetype} from '../archetypes/index.mjs';
export function validateSimulationReplays(spec,batch){
 const issues=[],add=(code,index=null)=>issues.push({code,episode_index:index});let checked=0;
 if(!batch||batch.complete!==true||!Array.isArray(batch.episodes)||!batch.episodes.length||!Number.isSafeInteger(batch.total)||batch.total!==batch.episodes.length||batch.completed!==batch.total||!Array.isArray(batch.pending)||batch.pending.length){return {status:'FAIL',issues:[{code:'INCOMPLETE_BATCH',episode_index:null}],checked_episodes:0};}
 const ids=new Set();
 for(const [index,episode]of batch.episodes.entries()){
  try{
   if(!episode||typeof episode.id!=='string'||ids.has(episode.id)){add('INVALID_EPISODE_ID',index);continue;}ids.add(episode.id);
   if(batch.episode_checksums?.[episode.id]!==hash(episode)){add('EPISODE_CHECKSUM_MISMATCH',index);continue;}
   const replay=episode.replay;
   if(episode.outcome==='INVALID'||!replay||!Array.isArray(replay.actions)||!replay.expected){add('MISSING_OR_INVALID_REPLAY',index);continue;}
   validateSeed(episode.seed);validateSeed(replay.seed);
   if(replay.archetype!==spec.game.archetype||canonical(replay.spec)!==canonical(spec)||canonical(replay.initial_content)!==canonical(spec.content)||replay.seed!==episode.seed){add('REPLAY_BINDING_MISMATCH',index);continue;}
   if(episode.steps!==replay.actions.length||episode.final_hash!==replay.expected.final_state_hash||canonical(episode.terminal)!==canonical(replay.expected.terminal)||episode.outcome!==(replay.expected.terminal?.status??'TRUNCATED')){add('EPISODE_RESULT_MISMATCH',index);continue;}
   const result=runReplay(replay,getArchetype);checked++;
   if(result.status!=='PASS')add('REPLAY_VERIFICATION_FAILED',index);
  }catch{add('MALFORMED_REPLAY_EVIDENCE',index);}
 }
 return {status:issues.length?'FAIL':'PASS',issues,checked_episodes:checked};
}
