export function createGame({ content = {}, seed = 0 } = {}) {
  const platforms=content.platforms??[[0,0,4,1],[6,2,4,1]],start=content.player_start??[0,0],home=content.checkpoint??start;
  const physics={gravity:content.generation_physics?.gravity??0.035,horizontalSpeed:content.generation_physics?.horizontal_speed??0.18,jumpSpeed:content.generation_physics?.jump_speed??0.34,radius:content.generation_physics?.radius??0.35,height:content.generation_physics?.height??1};
  const copy=v=>JSON.parse(JSON.stringify(v));let s;
  function resolveSpawn(x,y){let grounded=false;for(const [px,py,w,h] of platforms){const overlapsX=x+physics.radius>px&&x-physics.radius<px+w,top=py+h,bottom=y-physics.height;if(!overlapsX)continue;if(bottom<top&&y>py){y=top+physics.height;grounded=true;}else if(Math.abs(bottom-top)<1e-9)grounded=true;}return {x,y,grounded};}
  function reset(){const spawn=resolveSpawn(start[0],start[1]+physics.height);s={tick:0,terminal:null,player:{x:spawn.x,y:spawn.y},velocity:{x:0,y:0},grounded:spawn.grounded,checkpoint:[...home],paused:false};return snapshot();}
  function snapshot(){return {...copy(s),platforms:copy(platforms),capsule:{radius:physics.radius,height:physics.height}};}
  function step({action}={}){
    const events=[];const a=typeof action==='string'?action:(action?.action??action?.type);
    if(a==='restart'||a==='r'||a==='R'){reset();return {accepted:true,events,terminal:null};}
    if(a==='pause'||a==='p'||a==='P'){s.paused=!s.paused;return {accepted:true,events,terminal:s.terminal};}
    if(s.paused||s.terminal)return {accepted:false,events,terminal:s.terminal};
    let move=Array.isArray(action?.move)?action.move:null;let dx=move?move[0]:((a==='ArrowRight'||a==='right')?1:0)-((a==='ArrowLeft'||a==='left')?1:0);
    const jump=a==='jump'||a===' '||a==='Space'||action?.jump===true;
    const checkpoint=a==='checkpoint'||a==='c'||a==='C'||action?.checkpoint===true;
    s.tick++;
    if(dx)s.velocity.x=Math.sign(dx)*physics.horizontalSpeed;else s.velocity.x=0;
    if(jump&&s.grounded){s.velocity.y=physics.jumpSpeed;s.grounded=false;events.push({type:'JUMP'});}
    const oldX=s.player.x,oldY=s.player.y,nx=oldX+s.velocity.x;let resolvedX=nx;
    for(const [px,py,w,h] of platforms){const verticalOverlap=oldY>py&&oldY-physics.height<py+h;if(verticalOverlap&&nx+physics.radius>px&&nx-physics.radius<px+w){if(s.velocity.x>0&&oldX+physics.radius<=px)resolvedX=px-physics.radius;else if(s.velocity.x<0&&oldX-physics.radius>=px+w)resolvedX=px+w+physics.radius;else resolvedX=oldX;}}
    s.player.x=resolvedX;
    const wasGrounded=s.grounded;s.velocity.y-=physics.gravity;let ny=oldY+s.velocity.y;s.grounded=false;
    for(const [px,py,w,h] of platforms){const overlapsX=s.player.x+physics.radius>px&&s.player.x-physics.radius<px+w;const top=py+h,bottom=py;
      if(overlapsX&&s.velocity.y<=0&&oldY-physics.height>=top&&ny-physics.height<=top){ny=top+physics.height;s.velocity.y=0;s.grounded=true;if(!wasGrounded)events.push({type:'LAND'});}
      else if(overlapsX&&s.velocity.y>0&&oldY<=bottom&&ny>=bottom){ny=bottom;s.velocity.y=0;events.push({type:'COLLIDE',side:'ceiling'});}
    }
    s.player.y=ny;
    if(s.grounded&&s.player.y<=physics.height+0.01&&s.player.x+physics.radius>=0&&s.player.x-physics.radius<=4)s.checkpoint=[0,0];
    if(s.player.y< -4||s.player.x>14||s.player.x< -4){const spawn=resolveSpawn(s.checkpoint[0],s.checkpoint[1]+physics.height);s.player={x:spawn.x,y:spawn.y};s.velocity={x:0,y:0};s.grounded=spawn.grounded;events.push({type:'COLLIDE'});}
    if(checkpoint){s.checkpoint=[s.player.x,s.player.y-physics.height];events.push({type:'CHECKPOINT'});}
    return {accepted:true,events,terminal:s.terminal};
  }
  reset();return {snapshot,step,reset};
}

