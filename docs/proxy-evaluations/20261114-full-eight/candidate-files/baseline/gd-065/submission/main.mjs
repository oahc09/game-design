import * as cc from '../vendor/cocosair/cocosair.module.js';
import { createGame } from './game.mjs';
const app=await cc.createAirApp({canvas:'#GameCanvas',designResolution:{width:800,height:600,policy:0}}),scene=new cc.Scene('WaterSort'),ui=cc.createUICanvas(scene,'Canvas',{designWidth:800,designHeight:600}),n=new cc.Node('Backdrop');n.layer=cc.Layers.Enum.UI_2D;n.addComponent(cc.UITransform).setContentSize(800,600);let g=n.addComponent(cc.GraphicsComponent);g.fillColor=new cc.Color().fromHEX('#244257');g.rect(-380,-280,760,560);g.fill();ui.addChild(n);app.run(scene);
let game=createGame({}),records=[],cue={active:false,progress:0,cancelCount:0},cueDuration=420;
const view=document.querySelector('#view'),copy=v=>JSON.parse(JSON.stringify(v));
function draw(){
  const s=game.snapshot();
  view.innerHTML='<div class="tubes">'+s.tubes.map((t,i)=>`<div class="tube ${s.selected===i?'selected':''}" data-i="${i}">${t.map(c=>`<div class="liquid ${String(c)}"></div>`).join('')}</div>`).join('')+'</div>'+(cue.active?`<div class="pour-cue" data-cue="1" style="background:${cue.color??'#f5d56b'}"><span>${cue.count??1}</span></div>`:'');
  view.querySelectorAll('.tube').forEach(e=>e.onclick=()=>transition(+e.dataset.i));
  if(cue.active){const canvas=document.querySelector('#GameCanvas'),cr=canvas.getBoundingClientRect(),vr=view.getBoundingClientRect();const center=i=>{const el=view.querySelector(`.tube[data-i="${i}"]`);if(!el)return null;const r=el.getBoundingClientRect();return [(r.left+r.width/2-vr.left)/vr.width*100,(r.top+r.height/2-vr.top)/vr.height*100];};const a=center(cue.from),b=center(cue.to),dot=view.querySelector('[data-cue]');if(a&&b&&dot){const x=a[0]+(b[0]-a[0])*cue.progress,y=a[1]+(b[1]-a[1])*cue.progress;dot.style.left=`${x}%`;dot.style.top=`${y}%`;}}
}
function transition(action){
  const before=game.snapshot(),result=game.step({action,tick:before.tick}),after=game.snapshot();
  records.push({action:copy(action),accepted:!!result?.accepted,events:copy(result?.events??[]),before:copy(before),after:copy(after)});
  const pour=result?.events?.find(e=>e.type==='POUR');
  if(result?.accepted&&pour){cue={active:true,progress:0,cancelCount:cue.cancelCount,from:pour.from,to:pour.to,color:pour.color,count:pour.count,elapsedMs:0};}
  draw();return result;
}
function advanceCue(deltaMs){if(!cue.active)return;cue.elapsedMs+=Math.max(0,Number(deltaMs)||0);cue.progress=Math.min(1,cue.elapsedMs/cueDuration);if(cue.progress>=1)cue.active=false;}
function cancelVisual(){if(cue.active){cue.active=false;cue.cancelCount++;draw();return true;}return false;}
function visualState(){return {active:cue.active,progress:cue.progress,cancelCount:cue.cancelCount,from:cue.from??null,to:cue.to??null};}
function reset({content={},seed=0}={}){game=createGame({content,seed});records=[];cue={active:false,progress:0,cancelCount:0};draw();return copy(game.snapshot());}
function pointerForAction(action){const canvas=document.querySelector('#GameCanvas'),rect=canvas.getBoundingClientRect();const point=i=>{const tube=view.querySelector(`.tube[data-i="${i}"]`);if(!tube)return null;const r=tube.getBoundingClientRect();return [(r.left+r.width/2-rect.left)*800/rect.width,(r.top+r.height/2-rect.top)*600/rect.height];};const from=point(action?.from),to=point(action?.to);return from&&to?{from,to}:null;}
window.__candidate={createGame,get game(){return game},get state(){return copy(game.snapshot())}};
window.__acceptance={reset,snapshot:()=>copy(game.snapshot()),step:transition,frame:ms=>{advanceCue(ms);draw();return copy(game.snapshot());},log:()=>copy(records),designSize:{width:800,height:600},pointerForAction,visualState,cancelVisual};
window.render_game_to_text=()=>JSON.stringify(game.snapshot());window.advanceTime=ms=>window.__acceptance.frame(ms);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelVisual();}else if(/^[1-9]$/.test(e.key)){e.preventDefault();transition(+e.key-1);}else if(e.key==='0'){e.preventDefault();transition(9);}else if(['r','R','p','P'].includes(e.key)){e.preventDefault();transition(e.key);}},true);
let last=performance.now();function raf(now){const dt=now-last;last=now;if(cue.active){advanceCue(dt);draw();}requestAnimationFrame(raf);}requestAnimationFrame(raf);draw();
