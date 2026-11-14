import * as cc from '../vendor/cocosair/cocosair.module.js';
import { createGame } from './game.mjs';
const app = await cc.createAirApp({ canvas: '#GameCanvas', designResolution: { width: 800, height: 600, policy: 0 } });
const scene = new cc.Scene('Shooter');
const ui = cc.createUICanvas(scene, 'Canvas', { designWidth: 800, designHeight: 600 });
const n = new cc.Node('Arena'); n.layer = cc.Layers.Enum.UI_2D; n.addComponent(cc.UITransform).setContentSize(800, 600);
let g = n.addComponent(cc.GraphicsComponent); g.fillColor = new cc.Color().fromHEX('#183143'); g.rect(-380, -280, 760, 560); g.fill(); ui.addChild(n); app.run(scene);
let game = createGame({});
let records = [], held = new Set(), accumulator = 0, manual = false;
const copy = (v) => JSON.parse(JSON.stringify(v));
const STEP_MS = 1000 / 60, EPSILON_MS = 1e-7;
function draw() { const state=game.snapshot(),[minX,minY,maxX,maxY]=state.bounds,px=x=>((x-minX)/(maxX-minX))*100,py=y=>((y-minY)/(maxY-minY))*100;const validPoint=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);const obj=(p,cls,label)=>validPoint(p)?`<div class="${cls}" title="${label}" style="left:${px(p[0])}%;top:${py(p[1])}%"></div>`:'';const locatedEnemies=state.enemies.filter(e=>validPoint(e.position)),locatedProjectiles=state.projectiles.filter(p=>validPoint(p.position));const playerKnown=validPoint(state.player?.position);const unknown=state.enemies.length-locatedEnemies.length+state.projectiles.length-locatedProjectiles.length;document.querySelector('#view').innerHTML=`<div class="arena">${locatedEnemies.map(e=>obj(e.position,'enemy',`${e.id} hp ${e.health}`)).join('')}${locatedProjectiles.map(p=>obj(p.position,'projectile',p.id)).join('')}${playerKnown?obj(state.player.position,'player',`Player HP ${state.player.health}`):''}</div><div class="hud">HP ${state.player?.health??'—'} · Targets ${state.enemies.length}${unknown?` · Unlocated ${unknown}`:''}${!playerKnown?' · Player location unknown':''} · Tick ${state.tick}${state.terminal?` · ${state.terminal.status}`:''}</div>`; }
function transition(action) { const before = game.snapshot(); const result = game.step({ action, tick: before.tick }); const after = game.snapshot(); records.push({ action: copy(action), accepted: !!result?.accepted, events: copy(result?.events ?? []), before: copy(before), after: copy(after) }); if (action === 'restart' || action === 'r' || action === 'R') accumulator = 0; draw(); return result; }
function update(ms) { accumulator += Math.max(0, Number(ms) || 0); while (accumulator + EPSILON_MS >= STEP_MS) { const move = [(held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0), (held.has('ArrowDown') ? 1 : 0) - (held.has('ArrowUp') ? 1 : 0)]; transition({ move, fire: held.has('fire') }); accumulator -= STEP_MS; if (accumulator < 0 && accumulator > -EPSILON_MS) accumulator = 0; } draw(); }
function reset({ content = {}, seed = 1, manualClock = true } = {}) { game = createGame({ content, seed }); records = []; held.clear(); accumulator = 0; manual = manualClock; draw(); return copy(game.snapshot()); }
window.__candidate = { createGame, get game() { return game; }, get state() { return copy(game.snapshot()); } };
window.__acceptance = { reset, snapshot: () => copy(game.snapshot()), step: transition, frame: update, log: () => copy(records), designSize: { width: 800, height: 600 }, pointerForAction: () => null };
window.render_game_to_text = () => JSON.stringify(game.snapshot()); window.advanceTime = update;
window.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); held.add('fire'); } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); held.add(e.key); } else if (['r', 'R', 'p', 'P'].includes(e.key)) { e.preventDefault(); transition(e.key); } }, true);
window.addEventListener('keyup', e => { if (e.key === ' ') held.delete('fire'); else held.delete(e.key); }, true);
let last = performance.now(); function raf(now) { const dt = now - last; last = now; if (!manual) update(dt); requestAnimationFrame(raf); } requestAnimationFrame(raf); draw();


