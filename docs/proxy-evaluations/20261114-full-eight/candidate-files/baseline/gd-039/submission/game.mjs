export function createGame({ content = {}, seed = 1 } = {}) {
  const sourceBoard = content.board ?? [[0,1,0,2],[1,0,2,1],[2,0,1,2],[0,2,1,0]];
  const rows = sourceBoard.length, cols = sourceBoard[0]?.length ?? 0;
  const colors = content.colors ?? 3;
  const blockers = content.blockers ?? [];
  const blocked = (x,y) => Array.isArray(blockers[y]) ? blockers[y][x] === true : blockers.some?.(p => Array.isArray(p) && p[0] === x && p[1] === y) ?? false;
  const initialBoard = sourceBoard.map((row,y) => row.map((v,x) => blocked(x,y) ? 'blocker' : v));
  const moves0 = content.moves ?? 12;
  let rng, s;
  const copy = v => JSON.parse(JSON.stringify(v));
  function randomColor() {
    if (Array.isArray(content.refill_stream) && content.refill_stream.length) {
      const value = content.refill_stream[s.refill_index++ % content.refill_stream.length];
      return Number(value) % colors;
    }
    rng = (1664525 * rng + 1013904223) >>> 0;
    return rng % colors;
  }
  function reset() {
    rng = (seed >>> 0) || 1;
    s = { board: copy(initialBoard), moves: moves0, tick: 0, terminal: null, resolving: false, paused: false, score: 0, refill_index: 0 };
    return snapshot();
  }
  function snapshot() { return copy(s); }
  function matches() {
    const set = new Set(), b = s.board;
    for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
      const c=b[y][x]; if (c === null || c === 'blocker') continue;
      if (x+2<cols && b[y][x+1]===c && b[y][x+2]===c) for(let i=0;i<3;i++) set.add(`${x+i},${y}`);
      if (y+2<rows && b[y+1][x]===c && b[y+2][x]===c) for(let i=0;i<3;i++) set.add(`${x},${y+i}`);
    }
    return set;
  }
  function step({ action } = {}) {
    const events=[];
    const a=typeof action==='string'?action:(action?.action??action?.type);
    if(a==='restart'||a==='r'||a==='R'){reset();return {accepted:true,events,terminal:null};}
    if(a==='pause'||a==='p'||a==='P'){s.paused=!s.paused;return {accepted:true,events,terminal:s.terminal};}
    if(s.paused||s.terminal||s.resolving)return {accepted:false,events,terminal:s.terminal};
    const from=action?.from??action?.a, to=action?.to??action?.b;
    if(!Array.isArray(from)||!Array.isArray(to))return {accepted:false,events,terminal:s.terminal};
    const [x,y]=from,[u,v]=to;
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(u)||!Number.isInteger(v)||Math.abs(x-u)+Math.abs(y-v)!==1||!s.board[y]||!s.board[v]||x<0||u<0||x>=cols||u>=cols||y>=rows||v>=rows||s.board[y][x]==='blocker'||s.board[v][u]==='blocker')return {accepted:false,events,terminal:s.terminal};
    [s.board[y][x],s.board[v][u]]=[s.board[v][u],s.board[y][x]];
    if(!matches().size){[s.board[y][x],s.board[v][u]]=[s.board[v][u],s.board[y][x]];return {accepted:false,events,terminal:s.terminal};}
    s.moves--;s.tick++;s.resolving=true;
    let wave=0, found;
    while((found=matches()).size){
      const cells=[...found].map(k=>k.split(',').map(Number));
      events.push({type:'MATCH_CLEAR',wave,cells});
      for(const [cx,cy] of cells){s.board[cy][cx]=null;s.score++;}
      events.push({type:'GRAVITY',wave});
      for(let cx=0;cx<cols;cx++){
        let end=rows-1;
        while(end>=0){if(s.board[end][cx]==='blocker'){end--;continue;}let start=end;while(start>=0&&s.board[start][cx]!=='blocker')start--;const ys=[];for(let cy=end;cy>start;cy--)ys.push(cy);const values=ys.map(cy=>s.board[cy][cx]).filter(z=>z!==null);while(values.length<ys.length)values.unshift(randomColor());ys.forEach((cy,i)=>s.board[cy][cx]=values[i]);end=start-1;}
      }
      events.push({type:'REFILL',wave});wave++;
    }
    s.resolving=false;
    events.push({type:'OBJECTIVE_CHECK',score:s.score,moves:s.moves});
    if(s.moves<=0)s.terminal={status:'ended',reason:'moves_exhausted'};
    return {accepted:true,events,terminal:s.terminal};
  }
  reset();
  return {snapshot,step,reset};
}
