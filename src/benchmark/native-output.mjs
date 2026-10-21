/** Evaluator-side normalization for the public engine-native boundary.
 * No candidate module is loaded here. The supervisor supplies an already isolated
 * createGame function and task-public mappings. No GameSpec enters candidate code.
 */
import {clone,hash}from '../core/index.mjs';
export function createNativeRuntimeFactory(createGame,{publicContent,projectState=state=>state,mapAction=action=>action}={}){
 if(typeof createGame!=='function'||typeof publicContent!=='function')throw new TypeError('Supervisor-owned createGame and publicContent mapping required');
 return spec=>{
  let game=null;const runtime={state:null,
   reset({seed=1,content=spec.content}={}){const input={seed,content:clone(publicContent(content,spec))};game=createGame(input);if(!game||typeof game.snapshot!=='function'||typeof game.step!=='function')throw new TypeError('Native game must expose snapshot and step');this.state=clone(projectState(game.snapshot(),spec));if(!Number.isInteger(this.state.tick)||!('terminal'in this.state))throw new TypeError('Public state mapping must expose tick and terminal');return this.clone();},
   step({action,tick=this.state.tick}){const before=hash(this.state);const result=game.step({action:clone(mapAction(action,spec)),tick});if(!result||typeof result.accepted!=='boolean'||!Array.isArray(result.events))throw new TypeError('Native transition must expose accepted and events');this.state=clone(projectState(game.snapshot(),spec));return {previousStateHash:before,nextState:this.clone(),accepted:result.accepted,events:clone(result.events),terminal:clone(this.state.terminal)};},
   clone(){return clone(this.state);},isTerminal(){return clone(this.state.terminal);},
   restore(state){if(typeof game.restore!=='function')throw Error('NATIVE_INITIAL_STATE_RESTORE_UNSUPPORTED');game.restore(clone(state));this.state=clone(projectState(game.snapshot(),spec));return this.clone();}
  };return runtime;
 };
}
