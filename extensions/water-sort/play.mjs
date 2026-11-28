import {getArchetype} from './index.mjs';

const pkg = getArchetype('water_sort');
const spec = pkg.exampleSpec({capacity: 3, tubes: [['B', 'B', 'R'], ['R', 'R', 'G'], ['G', 'B', 'G'], []]});
const runtime = new pkg.Runtime(spec);
const board = document.querySelector('main');
const canvas = board.querySelector('canvas');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const palette = {R: '#b83f4e', B: '#245d9a', G: '#287859'};
const geometry = {left: 83, top: 73, width: 92, height: 172, gap: 154};
const cueDuration = 260;
const tubeX = index => geometry.left + index * geometry.gap;

let cursor = 0;
let selected = null;
let cue = null;
let lastFrame = null;
let message = '';

function rounded(x, y, width, height, radius, fill, stroke) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }
}

function label(text, x, y, color, size = 20) {
  context.font = `600 ${size}px system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function render() {
  const state = runtime.observe();
  const allowed = new Set(runtime.legalActions().filter(action => action.from === selected).map(action => action.to));
  context.fillStyle = '#e1ede3';
  context.fillRect(0, 0, canvas.width, canvas.height);
  rounded(35, 268, 650, 10, 5, '#c9d9cb');

  const {top, width, height} = geometry;
  const segment = (height - 16) / state.capacity;
  state.tubes.forEach((tube, index) => {
    const x = tubeX(index);
    context.lineWidth = index === selected ? 4 : 2;
    rounded(x, top, width, height, 16, '#f7fcf7', index === selected ? '#1c654f' : '#8ca797');
    tube.forEach((color, layer) => {
      const y = top + height - 8 - (layer + 1) * segment;
      rounded(x + 8, y + 1, width - 16, segment - 2, 7, palette[color]);
      label(color, x + width / 2, y + segment / 2, '#fff');
    });
    const focused = document.activeElement === canvas && index === cursor;
    rounded(x + width / 2 - 21, 289, 42, 33, 10, focused ? '#284e3f' : '#f7fcf7');
    label(String(index + 1), x + width / 2, 306, focused ? '#fff' : '#2f4e40', 18);
    if (allowed.has(index)) rounded(x + width / 2 - 4, 55, 8, 8, 4, '#27765a');
  });

  if (cue) {
    const progress = cue.elapsed / cueDuration;
    const x = tubeX(cue.from) + (tubeX(cue.to) - tubeX(cue.from)) * progress + width / 2;
    const y = top - 8 - 32 * Math.sin(progress * Math.PI);
    rounded(x - 6, y - 6, 12, 12, 6, palette[cue.color]);
  }

  const text = state.terminal?.status === 'WIN' ? `完成 · ${state.turn} 步`
    : state.terminal?.status === 'LOSE' ? '没有可用的倒液，重开再试'
    : message || (selected === null ? `已倒液 ${state.turn} 次` : `已选 ${selected + 1} 号管，选择目标`);
  if (status.textContent !== text) status.textContent = text;
}

function restart() {
  runtime.reset({seed: 11});
  selected = null;
  cursor = 0;
  cue = null;
  message = '';
  canvas.focus({preventScroll: true});
  render();
}

function activate(index) {
  if (runtime.isTerminal()) return;
  cursor = index;
  message = '';
  if (selected === index) {
    selected = null;
  } else if (selected === null) {
    if (runtime.state.tubes[index].length) selected = index;
    else message = '先选一根有液体的管';
  } else {
    const result = runtime.step({action: {type: 'pour', from: selected, to: index}, tick: runtime.state.tick});
    if (result.accepted) {
      cue = {...result.events.find(event => event.type === 'POUR'), elapsed: 0};
      selected = null;
    } else message = '这两根管之间不能倒液';
  }
  render();
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  const index = runtime.state.tubes.findIndex((_, i) => x >= tubeX(i) && x <= tubeX(i) + geometry.width);
  if (index >= 0 && y >= geometry.top && y <= 322) {
    canvas.focus({preventScroll: true});
    activate(index);
  }
});
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape', 'r', 'R', 'f', 'F'].includes(event.key)) return;
  event.preventDefault();
  if (event.repeat) return;
  const count = runtime.state.tubes.length;
  switch (event.key.toLowerCase()) {
    case 'arrowleft': cursor = (cursor + count - 1) % count; break;
    case 'arrowright': cursor = (cursor + 1) % count; break;
    case 'enter':
    case ' ': activate(cursor); return;
    case 'escape': selected = null; cue = null; message = ''; break;
    case 'r': restart(); return;
    case 'f':
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (board.requestFullscreen) board.requestFullscreen().catch(() => {});
      return;
  }
  render();
});
canvas.addEventListener('focus', render);
canvas.addEventListener('blur', render);
document.querySelector('#restart').addEventListener('click', restart);

window.render_game_to_text = () => JSON.stringify({
  ...runtime.observe(), selected, cursor, cue: cue !== null, status: status.textContent,
  coordinates: 'Canvas origin top left, tubes left to right, liquids bottom to top.',
});
window.advanceTime = ms => {
  if (cue && Number.isFinite(ms) && ms >= 0) {
    cue.elapsed += ms;
    if (cue.elapsed >= cueDuration) cue = null;
  }
  render();
};
function animate(now) {
  if (cue && lastFrame !== null) window.advanceTime(now - lastFrame);
  lastFrame = now;
  requestAnimationFrame(animate);
}

restart();
requestAnimationFrame(animate);
