import * as cc from '../vendor/cocosair/cocosair.module.js';
import { createGame } from './game.mjs';
const app=await cc.createAirApp({canvas:'#GameCanvas',designResolution:{width:800,height:600,policy:0}}),scene=new cc.Scene('Blocks'),canvas=cc.createUICanvas(scene,'Canvas',{designWidth:800,designHeight:600}),n=new cc.Node('Board');
n.layer=cc.Layers.Enum.UI_2D;n.addComponent(cc.UITransform).setContentSize(800,600);const g=n.addComponent(cc.GraphicsComponent);g.fillColor=new cc.Color().fromHEX('#243441');g.rect(-370,-270,740,540);g.fill();canvas.addChild(n);app.run(scene);
let game=createGame({}),records=[],held=new Set(),acc=0,rotateQueued=false,manual=false;
const copy=v=>JSON.parse(JSON.stringify(v)),STEP_MS=1000/60,EPSILON_MS=1e-7;
function draw(){
 const s=game.snapshot();let rows=s.board.map(r=>r.map(v=>v?'[]':' .').join(''));
 for(let y=0;y<s.active.shape.length;y++)for(let x=0;x<s.active.shape[y].length;x++)if(s.active.shape[y][x]){const yy=s.active.y+y;if(rows[yy])rows[yy]=rows[yy].slice(0,(s.active.x+x)*2)+'[]'+rows[yy].slice((s.active.x+x)*2+2);}
 const next=s.preview[0].shape.map(r=>r.map(v=>v?'[]':'  ').join('')).join('\n');
 document.querySelector('#view').innerHTML=`<div class="game-ui"><pre class="board">${rows.join('\n')}\nlines ${s.lines} · pieces ${s.locked_piece_count}${s.terminal?' · GAME OVER':''}${s.paused?' · PAUSED':''}</pre><aside class="next"><b>Next</b><pre>${next}</pre></aside></div>`;
}
function transition(action){const before=game.snapshot(),result=game.step({action,tick:before.tick}),after=game.snapshot();records.push({action:copy(action),accepted:!!result?.accepted,events:copy(result?.events??[]),before:copy(before),after:copy(after)});if(action==='restart'||action==='r'||action==='R')acc=0;draw();return result;}
function update(ms){acc+=Math.max(0,Number(ms)||0);while(acc+EPSILON_MS>=STEP_MS){const action=rotateQueued?'rotate':held.has('ArrowLeft')?'ArrowLeft':held.has('ArrowRight')?'ArrowRight':held.has('ArrowDown')?'ArrowDown':'tick';if(rotateQueued)rotateQueued=false;transition(action);acc-=STEP_MS;if(acc<0&&acc>-EPSILON_MS)acc=0;}draw();}
function reset({content={},seed=1,manualClock=true}={}){game=createGame({content,seed});records=[];held.clear();rotateQueued=false;acc=0;manual=manualClock;draw();return copy(game.snapshot());}
window.__candidate={createGame,get game(){return game},get state(){return copy(game.snapshot())}};
window.__acceptance={reset,snapshot:()=>copy(game.snapshot()),step:transition,frame:update,log:()=>copy(records),designSize:{width:800,height:600},pointerForAction:()=>null};window.render_game_to_text=()=>JSON.stringify(game.snapshot());window.advanceTime=update;
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();held.add(e.key);}else if(e.key==='ArrowUp'){e.preventDefault();if(!e.repeat)rotateQueued=true;}else if(['r','R','p','P'].includes(e.key)){e.preventDefault();transition(e.key);}},true);window.addEventListener('keyup',e=>held.delete(e.key),true);
let last=performance.now();function raf(now){const dt=now-last;last=now;if(!manual)update(dt);requestAnimationFrame(raf);}requestAnimationFrame(raf);draw();

