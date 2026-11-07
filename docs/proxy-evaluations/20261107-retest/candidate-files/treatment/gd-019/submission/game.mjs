import {Runtime,exampleSpec,pieceCells} from '../src/archetypes/falling_blocks.mjs';
const defaults={width:10,height:20,gravityTicks:30,lockDelayTicks:2,previewCount:1,targetLines:40,maxTicks:18000,sequence:[]};
export function createGame({content={},seed=1}={}){const raw=content.extensions?.falling_blocks??content,config={...defaults,...raw,width:raw.board_width??raw.width??defaults.width,height:raw.board_height??raw.height??defaults.height,gravityTicks:30,lockDelayTicks:2,initialBoard:raw.board??raw.initialBoard??[]};const spec=exampleSpec({config});const runtime=new Runtime(spec);runtime.reset({seed,content:spec.content});
function snapshot(){const s=runtime.state;return {tick:s.tick,terminal:s.terminal,board:structuredClone(s.board),active:s.activePiece?{shape:s.activePiece.type,x:s.activePiece.x,y:s.activePiece.y,rotation:s.activePiece.rotation}:null,gravity_counter:s.gravityAccumulator,lock_counter:s.lockTicks,locked_piece_count:s.piecesLocked,lines:s.lines,score:s.score}}
function step({action='NOOP',tick=runtime.state.tick}={}){const before=runtime.state.tick,result=runtime.step({action,tick});return {accepted:result.accepted,events:result.events.map(e=>e.type==='PieceLocked'?{type:'LOCK',piece:e.piece,cells:e.cells,tick:e.tick}:e),terminal:runtime.state.terminal,tick:before}}
function reset(next={}){runtime.reset({seed:next.seed??seed,content:next.content??spec.content});return snapshot()}
return {snapshot,step,reset,restore(s){runtime.restore(s)},get state(){return snapshot()}}}
export {pieceCells};
