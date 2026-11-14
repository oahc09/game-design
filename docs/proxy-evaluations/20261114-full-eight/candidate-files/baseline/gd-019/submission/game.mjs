export function createGame({content={},seed=1}={}){
  const W=content.board_width??10,H=content.board_height??20,G=content.gravity_ticks??30,L=content.lock_ticks??2;
  const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]]];
  const byName={I:[[1,1,1,1]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1]],L:[[1,0,0],[1,1,1]],J:[[0,0,1],[1,1,1]],S:[[0,1,1],[1,1,0]],Z:[[1,1,0],[0,1,1]]};
  let bag=0;
  function fresh(){let shape=content.active_piece?.shape??shapes[(seed+bag++)%shapes.length];if(typeof shape==='string')shape=byName[shape.toUpperCase()]??byName.T;return {board:content.board?.map(r=>r.map(v=>v?1:0))??Array.from({length:H},()=>Array(W).fill(0)),active:{shape:shape.map(r=>[...r]),x:content.active_piece?.x??3,y:content.active_piece?.y??0},gravity_counter:0,lock_counter:0,locked_piece_count:0,tick:0,terminal:null,paused:false,lines:0};}
  let s=fresh();
  const snapshot=()=>({...JSON.parse(JSON.stringify(s)),preview:[{shape:shapes[(seed+bag)%shapes.length].map(row=>[...row])}]});
  function valid(x,y,shape=s.active.shape){return shape.every((r,dy)=>r.every((v,dx)=>!v||(x+dx>=0&&x+dx<W&&y+dy<H&&(y+dy<0||!s.board[y+dy][x+dx]))));}
  function step({action}={}){
    if(typeof action==='object'&&action!==null)action=action.action??action.direction??action.key??action.type;
    const events=[];
    if(action==='restart'||action==='r'||action==='R'){bag=0;s=fresh();return {accepted:true,events,terminal:null};}
    if(action==='pause'||action==='p'||action==='P'){s.paused=!s.paused;return {accepted:true,events,terminal:s.terminal};}
    if(s.paused||s.terminal)return {accepted:false,events,terminal:s.terminal};
    const a=String(action??'');
    const supported=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','left','right','up','down','rotate','wait','tick'];
    if(!supported.includes(a))return {accepted:false,events,terminal:s.terminal};
    if(a==='ArrowLeft'||a==='left'){if(valid(s.active.x-1,s.active.y))s.active.x--;}
    if(a==='ArrowRight'||a==='right'){if(valid(s.active.x+1,s.active.y))s.active.x++;}
    if(a==='ArrowUp'||a==='up'||a==='rotate'){const rot=s.active.shape[0].map((_,i)=>s.active.shape.map(r=>r[i]).reverse());if(valid(s.active.x,s.active.y,rot))s.active.shape=rot;}
    if(a==='ArrowDown'||a==='down')s.gravity_counter=G-1;
    s.tick++;s.gravity_counter++;
    if(s.gravity_counter>=G){s.gravity_counter=0;if(valid(s.active.x,s.active.y+1))s.active.y++;}
    if(!valid(s.active.x,s.active.y+1)){
      s.lock_counter++;
      if(s.lock_counter>=L){
        for(let y=0;y<s.active.shape.length;y++)for(let x=0;x<s.active.shape[y].length;x++)if(s.active.shape[y][x]){const yy=s.active.y+y;if(yy>=0)s.board[yy][s.active.x+x]=1;}
        s.locked_piece_count++;events.push({type:'LOCK',count:s.locked_piece_count});
        const kept=s.board.filter(r=>r.some(v=>!v)),clear=H-kept.length;
        if(clear){s.lines+=clear;s.board=Array.from({length:clear},()=>Array(W).fill(0)).concat(kept);events.push({type:'LINE_CLEAR',count:clear});}
        s.active={shape:shapes[(seed+bag++)%shapes.length],x:3,y:0};s.lock_counter=0;
        if(!valid(s.active.x,s.active.y))s.terminal={status:'lost',reason:'top_out'};
      }
    }else s.lock_counter=0;
    return {accepted:true,events,terminal:s.terminal};
  }
  function reset(){bag=0;s=fresh();return snapshot();}
  return {snapshot,step,reset};
}
