export function createGame({content={},seed=0}={}){
 const base=content.grid??['#######','# . . #','# $$  #','#  @  #','#######'];let initial=parse(base);let s={...initial,tick:0,terminal:null,paused:false};
 function parse(grid){let player=null,boxes=[],goals=[],walls=[];grid.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')walls.push([x,y]);if(c==='@')player=[x,y];if(c==='$')boxes.push([x,y]);if(c==='.')goals.push([x,y]);}));return {grid:[...grid],player,boxes,goals,walls};}
 const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1];
 function snapshot(){return JSON.parse(JSON.stringify({tick:s.tick,terminal:s.terminal,player:s.player,boxes:s.boxes,goals:s.goals,grid:s.grid,paused:s.paused}));}
 function step({action}={}){const before=snapshot();let events=[],accepted=false;let a=typeof action==='string'?action:action?.direction??action?.key??action?.type;
 if(a==='restart'||a==='r'||a==='R'){s={...parse(base),tick:0,terminal:null,paused:false};return {accepted:true,events:[],terminal:null};}
 if(a==='pause'||a==='p'||a==='P'){s.paused=!s.paused;return {accepted:true,events:[],terminal:null};}
 if(s.terminal||s.paused)return {accepted:false,events,terminal:s.terminal};
 let d={ArrowUp:[0,-1],up:[0,-1],ArrowDown:[0,1],down:[0,1],ArrowLeft:[-1,0],left:[-1,0],ArrowRight:[1,0],right:[1,0]}[a];if(!d)return {accepted:false,events,terminal:s.terminal};
 const q=[s.player[0]+d[0],s.player[1]+d[1]];if(s.walls.some(p=>eq(p,q)))return {accepted:false,events,terminal:s.terminal};const bi=s.boxes.findIndex(p=>eq(p,q));if(bi>=0){const dest=[q[0]+d[0],q[1]+d[1]];if(s.walls.some(p=>eq(p,dest))||s.boxes.some((p,i)=>i!==bi&&eq(p,dest)))return {accepted:false,events,terminal:s.terminal};s.boxes[bi]=dest;events.push({type:'PUSH',box:dest});}
 s.player=q;s.tick++;accepted=true;if(s.goals.every(g=>s.boxes.some(b=>eq(g,b)))){s.terminal={status:'won',reason:'all_goals_filled'};events.push({type:'WIN'});}return {accepted,events,terminal:s.terminal};}
 return {snapshot,step,reset(){s={...parse(base),tick:0,terminal:null,paused:false};}};
}
