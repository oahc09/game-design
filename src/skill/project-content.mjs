/** Fresh development content; never edits or replaces research/playtest freezes. */
import {getArchetype} from '../archetypes/index.mjs';
import {clone} from '../core/index.mjs';
import {readFileSync} from 'node:fs';
export const projectThemes={
 arcade_shooter:{title:'星港 · 护航',subtitle:'穿过三段航线，让运输队安全抵达。',accent:'#73edcc',controls:'WASD / 方向键移动 · 鼠标瞄准 · 空格或按住画面射击',objective:'击落本航线全部敌机，保持存活'},
 sokoban:{title:'仓间 · 归位',accent:'#edbb78',controls:'方向键 / WASD 推动箱子 · 箱子只能推，不能拉',objective:'把全部箱子推到圆形目标上'},
 falling_blocks:{title:'落点 · 整理',accent:'#e4cb8d',controls:'左右移动 · ↑ 旋转 · ↓ 软降 · 空格硬降 · C 暂存',objective:'完成本关要求的消行数量'},
 match3:{title:'拾色 · 连锁',accent:'#d5a9e9',controls:'点击相邻色块交换 · 只消耗有效交换的步数',objective:'在步数用尽前完成颜色或分数目标'},
 merge2048:{title:'倍数 · 生长',accent:'#8fc8ee',controls:'方向键 / WASD 或滑动棋盘 · 相同数字相碰时合并',objective:'合成目标数字，注意保留空格'},
 block_puzzle:{title:'留白 · 拼合',accent:'#8bd9be',controls:'先选下方方块，再点击棋盘放置 · 无旋转',objective:'填满行或列以消除，完成目标行数'},
};
export function projectLevels(id,primary){
 const pkg=getArchetype(id);
 let definitions;
 if(id==='arcade_shooter')definitions=[
  ['近岸巡航','清理前方机群，留意第二批增援。',{enemyHP:1,enemySpeed:4,enemyFireIntervalTicks:150,maxTicks:3600,enemies:[{x:30,y:15},{x:50,y:20},{x:70,y:15}],spawns:[{tick:240,x:35,y:10},{tick:240,x:65,y:10}]}],
  ['交错航道','保持移动，侧翼机群会依次进入。',{enemyHP:2,enemySpeed:5,enemyFireIntervalTicks:110,maxTicks:3600,enemies:[{x:20,y:15},{x:50,y:10},{x:80,y:15}],spawns:[{tick:240,x:20,y:8},{tick:360,x:80,y:8},{tick:480,x:50,y:8}]}],
  ['星港防线','集中火力清除重型机，同时避开弹幕。',{enemyHP:2,enemySpeed:5,enemyFireIntervalTicks:90,maxTicks:4200,enemies:[{x:50,y:12,hp:5,radius:4,speed:3},{x:25,y:20},{x:75,y:20}],spawns:[{tick:240,x:18,y:10},{tick:240,x:82,y:10},{tick:480,x:35,y:10},{tick:480,x:65,y:10}]}],
 ].map(([title,description,config])=>({title,description,spec:pkg.exampleSpec({config:{height:130,playerY:108,...config}})}));
 else if(id==='sokoban')definitions=[
  ['先后有序','先绕到箱子下方，再推向亮着的目标。',{map:['#######','#     #','# . . #','# $ $ #','#  @  #','#######'],maxMoves:60}],
  ['穿过拐角','墙体让路线转弯；别把箱子推到角落。',{map:['########','#  .   #','#  $   #','# ##   #','# @ $ .#','########'],maxMoves:80}],
  ['并排归位','为另一只箱子留下行走空间。',{map:['########','# ..   #','# $$ # #','#    @ #','########'],maxMoves:80}],
 ].map(([title,description,config])=>({title,description,spec:pkg.exampleSpec(config)}));
 else if(id==='falling_blocks')definitions=[
  ['找到竖井','旋转长条，对准预留的缺口。',{width:8,height:14,targetLines:2,initialBoard:Array.from({length:14},(_,y)=>Array.from({length:8},(_,x)=>y>=12&&x!==4?7:0)),sequence:['I','O','T'],maxTicks:7200}],
  ['侧边通道','这次缺口在侧面，先移动再落下。',{width:8,height:14,targetLines:3,initialBoard:Array.from({length:14},(_,y)=>Array.from({length:8},(_,x)=>y>=11&&x!==1?7:0)),sequence:['I','L','O'],maxTicks:7200}],
  ['从零搭建','保持表面平整，逐步完成四次消行。',{width:8,height:14,targetLines:4,maxTicks:10800}],
 ].map(([title,description,config])=>({title,description,spec:pkg.exampleSpec({config})}));
 else if(id==='match3'){
  const catalog=JSON.parse(readFileSync(new URL('../../web/calibrated-configs.json',import.meta.url),'utf8'));
  const frozen=(stage,title,description)=>{const r=catalog.records.find(r=>r.archetype===id&&r.stage===stage);if(!r)throw Error('FROZEN_MATCH3_STAGE_MISSING');return {title,description,spec:clone(r.spec),source:{catalog_id:r.id,spec_sha256:r.spec_sha256}};};
  definitions=[{title:'暖色起步',description:'观察交换后的连线，收集 350 分。',spec:pkg.exampleSpec()},frozen('teaching','一抹青色','10 步内收集 14 颗青色棋子，先观察目标。'),frozen('challenge','连锁挑战','17 步内收集 29 颗青色棋子，争取每次交换的连锁。')];
 }
 else if(id==='merge2048')definitions=[
  ['第一次翻倍','先合成 128，学会为空格留出位置。',{target:128,moveLimit:400}],
  ['向角落生长','合成 512，试着把大数字留在同一侧。',{target:512,moveLimit:700}],
  ['经典终点','从两个小数字出发，抵达 2048。',{target:2048,moveLimit:1000}],
 ].map(([title,description,config])=>({title,description,spec:pkg.exampleSpec(config)}));
 else if(id==='block_puzzle')definitions=[
  ['拼出整行','凑齐两条整行或整列，保留方块的入口。',{targetLines:2,maxPlacements:60,streamPolicy:'cycle',pieceStream:['tri_h','tri_v','square','domino_h']}],
  ['多一种选择','托盘增加到四块，安排好落点顺序。',{width:7,batchSize:4,targetLines:4,maxPlacements:80}],
  ['留白的艺术','完成八条消除，别让零碎空格堵住自己。',{targetLines:8,maxPlacements:100}],
 ].map(([title,description,config])=>({title,description,spec:pkg.exampleSpec(config)}));
 else throw Error('PLAYABLE_CONTENT_NOT_IMPLEMENTED:'+id);
 if(primary)definitions[0].spec=clone(primary);
 return definitions.map((level,index)=>{if(!level.source&&(!primary||index!==0)){level.spec.metadata.id=`playable-${id}-${index+1}`;level.spec.content.id=`playable-${id}-content-${index+1}`;}return {id:`level-${index+1}`,...level};});
}
