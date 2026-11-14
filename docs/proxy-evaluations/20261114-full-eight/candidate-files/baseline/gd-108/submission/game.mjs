export function createGame({content={},seed=11}={}){
  const cards=content.cards??['Scout','Guard','Bolt','Mend','Strike','Guard','Bolt','Scout'];
  const opening=content.opening_hand_size??3,startMana=content.mana??3;
  const healths=[content.health??10,content.opponent_health??10];
  const copy=v=>JSON.parse(JSON.stringify(v));let s;
  function makePlayer(index){
    const explicitDeck=index===0&&Array.isArray(content.zones?.deck);
    let rng=((seed>>>0)+index)>>>0;
    let order=explicitDeck?copy(content.zones.deck):copy(cards);
    const rand=()=>{rng=(1664525*rng+1013904223)>>>0;return rng;};
    if(!explicitDeck)for(let i=order.length-1;i>0;i--){const j=rand()%(i+1);[order[i],order[j]]=[order[j],order[i]];}
    const hand=index===0&&Array.isArray(content.zones?.hand)?copy(content.zones.hand):order.splice(0,opening);
    return {id:index===0?'player1':'player2',health:healths[index],mana:startMana,deckOrder:order,hand,discard:index===0?copy(content.zones?.discard??[]):[]};
  }
  function active(){return s.players[s.activeIndex];}
  function opponent(){return s.players[1-s.activeIndex];}
  function reset(){s={tick:0,activeIndex:0,players:[makePlayer(0),makePlayer(1)],pending:null,terminal:null,paused:false,steps:0};return snapshot();}
  function snapshot(){const p=active(),other=opponent();return {tick:s.tick,terminal:copy(s.terminal),zones:{deck:{count:p.deckOrder.length},hand:{count:p.hand.length},discard:copy(p.discard)},phase:'player',active_player:p.id,mana:p.mana,health:p.health,opponent_health:other.health,pending:s.pending?{dueTick:s.pending.dueTick}:null,paused:s.paused};}
  function visibleHand(){return copy(active().hand);}
  function resolve(action,events){
    const p=active(),other=opponent();
    if(action==='pass'||action==='Enter'){const from=p.id;s.activeIndex=1-s.activeIndex;active().mana=startMana;events.push({type:'PASS',from,to:active().id});return true;}
    const slot=Number.isInteger(action?.slot)?action.slot:Number.isInteger(action?.cardIndex)?action.cardIndex:null;
    if(slot===null)return action==='wait';
    const card=p.hand.splice(slot,1)[0];p.mana--;p.discard.push(card);
    if(card==='Mend')p.health=Math.min(healths[s.activeIndex],p.health+2);else other.health-=card==='Strike'?3:2;
    events.push({type:'PLAY',card},{type:'DISCARD',card});
    if(p.deckOrder.length){p.hand.push(p.deckOrder.shift());events.push({type:'DRAW'});}
    return true;
  }
  function finish(){const loser=s.players.find(p=>p.health<=0);if(loser){const winner=s.players.find(p=>p.id!==loser.id);s.terminal={status:winner.id===active().id?'won':'lost',reason:'player_health_zero',winner:winner.id};}}
  function step({action}={}){
    const a=typeof action==='string'?action:(action?.action??action?.type??action);
    if(a==='restart'||a==='r'||a==='R'){reset();return {accepted:true,events:[],terminal:null};}
    if(a==='pause'||a==='p'||a==='P'){s.paused=!s.paused;return {accepted:true,events:[],terminal:s.terminal};}
    if(s.paused||s.terminal)return {accepted:false,events:[],terminal:s.terminal};
    const queued=s.pending&&s.tick+1>=s.pending.dueTick?s.pending.action:null;
    const candidate=queued??action;
    const effective=typeof candidate==='object'&&candidate!==null&&(candidate.type==='pass'||candidate.type==='wait')?candidate.type:candidate;
    const slot=Number.isInteger(effective?.slot)?effective.slot:Number.isInteger(effective?.cardIndex)?effective.cardIndex:null;
    if(slot!==null&&(active().mana<1||!active().hand[slot]))return {accepted:false,events:[],terminal:s.terminal};
    if(!(effective==='wait'||effective==='pass'||effective==='Enter'||slot!==null))return {accepted:false,events:[],terminal:s.terminal};
    s.tick++;s.steps++;const events=[];if(queued)s.pending=null;resolve(effective,events);finish();return {accepted:true,events,terminal:s.terminal};
  }
  function queueDelayed(action,delay=1){if(!Number.isInteger(delay)||delay<1||s.pending||s.terminal)return {accepted:false};s.pending={action:copy(action),dueTick:s.tick+delay};return {accepted:true,dueTick:s.pending.dueTick};}
  reset();return {snapshot,step,reset,queueDelayed,visibleHand};
}
