import * as cc from '../vendor/cocosair/cocosair.module.js';import {createGame} from './game.mjs';
const app=await cc.createAirApp({canvas:'#GameCanvas',designResolution:{width:800,height:600,policy:0},diagnostics:'warnings'});const scene=new cc.Scene('Sokoban');const canvas=cc.createUICanvas(scene,'Canvas',{designWidth:800,designHeight:600});const n=new cc.Node('EngineBackground');n.layer=cc.Layers.Enum.UI_2D;n.addComponent(cc.UITransform).setContentSize(800,600);const gr=n.addComponent(cc.GraphicsComponent);gr.fillColor=new cc.Color().fromHEX('#202c35');gr.rect(-400,-300,800,600);gr.fill();canvas.addChild(n);app.run(scene);
let game=createGame({});const el=document.querySelector('#view');let records=[];const copy=v=>JSON.parse(JSON.stringify(v));
function draw(){
 const s=game.snapshot(),grid=s.grid,columns=grid[0]?.length??0;
 const cells=grid.flatMap((row,y)=>[...row].map((c,x)=>{const icon=c==='#'?'':(s.player[0]===x&&s.player[1]===y?'☺':s.boxes.some(p=>p[0]===x&&p[1]===y)?'📦':'');const classes=(c==='#'?'wall ':'')+(c==='.'?'goal':'');return '<div class="cell '+classes+'">'+icon+'</div>';})).join('');
 el.innerHTML='<div class="board" style="grid-template-columns:repeat('+columns+',54px)">'+cells+'</div>'+(s.paused?'<b>Paused</b>':'')+(s.terminal?'<b>All goals filled!</b>':'');
}
function transition(action){const before=game.snapshot(),result=game.step({action,tick:before.tick}),after=game.snapshot();records.push({action:copy(action),accepted:!!result?.accepted,events:copy(result?.events??[]),before:copy(before),after:copy(after)});draw();return result;}
function reset({content={},seed=0}={}){game=createGame({content,seed});records=[];draw();return copy(game.snapshot());}
window.__candidate={createGame,get state(){return copy(game.snapshot())},get game(){return game}};window.__acceptance={reset,snapshot:()=>copy(game.snapshot()),step:transition,frame:()=>{draw();return copy(game.snapshot())},log:()=>copy(records),designSize:{width:800,height:600},pointerForAction:()=>null};
window.render_game_to_text=()=>JSON.stringify(game.snapshot());window.advanceTime=ms=>{window.__acceptance.frame(ms);};window.addEventListener('keydown',e=>{let a=e.key==='r'||e.key==='R'?'restart':e.key==='p'||e.key==='P'?'pause':e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','restart','pause'].includes(a)){e.preventDefault();transition(a);}},true);draw();




