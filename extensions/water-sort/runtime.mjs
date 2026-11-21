import {BaseRuntime, clone, makeSpec} from '../../src/core/index.mjs';
import {validateSchema} from '../../src/core/schema.mjs';

const maxTubes = 32;
export const manifest = {
  id: 'water_sort',
  version: '0.1.0',
  rulesVersion: 'water_sort_v0.1',
  simulationModes: ['TURN_BASED'],
  requiredCapabilities: ['turn_based', 'events'],
  contentTypes: ['level', 'challenge'],
  playerModels: [],
};

export const extensionSchema = {
  type: 'object',
  properties: {
    capacity: {type: 'integer', minimum: 1, maximum: 12},
    tubes: {
      type: 'array', minItems: 2, maxItems: maxTubes,
      items: {type: 'array', maxItems: 12, items: {type: 'string', minLength: 1}},
    },
  },
  required: ['capacity', 'tubes'],
  additionalProperties: false,
};

const configOf = content => content?.extensions?.water_sort ?? content;
const configPath = 'content.extensions.water_sort';

export function validateContent(content) {
  const config = configOf(content);
  const errors = validateSchema(config, extensionSchema, configPath);
  if (errors.length) return errors;
  if (config.tubes.some(tube => tube.length > config.capacity)) {
    errors.push({code: 'TUBE_OVER_CAPACITY', path: configPath + '.tubes', message: 'Tube exceeds its capacity'});
  }
  if (!config.tubes.some(tube => tube.length)) {
    errors.push({code: 'EMPTY_PUZZLE', path: configPath + '.tubes', message: 'At least one tube must contain liquid'});
  }
  return errors;
}

function canPour(state, from, to) {
  const validIndex = index => Number.isInteger(index) && index >= 0 && index < state.tubes.length;
  if (!validIndex(from) || !validIndex(to) || from === to) return false;
  const source = state.tubes[from];
  const target = state.tubes[to];
  return source.length > 0 && target.length < state.capacity
    && (!target.length || target.at(-1) === source.at(-1));
}

export function legalActions(state) {
  if (state.terminal) return [];
  return state.tubes.flatMap((_, from) => state.tubes.flatMap((_, to) =>
    canPour(state, from, to) ? [{type: 'pour', from, to}] : []));
}

function outcome(state) {
  if (state.tubes.every(tube => !tube.length
    || (tube.length === state.capacity && tube.every(color => color === tube[0])))) {
    return {status: 'WIN', reason: 'SORTED'};
  }
  if (!legalActions(state).length) return {status: 'LOSE', reason: 'NO_LEGAL_POUR'};
  return null;
}

export class Runtime extends BaseRuntime {
  reset({seed = 1, content = this.spec.content} = {}) {
    const errors = validateContent(content);
    if (errors.length) throw new Error(errors.map(error => error.code).join(','));
    this.state = {...this.resetBase(seed), ...clone(configOf(content))};
    this.state.terminal = outcome(this.state);
    return this.clone();
  }

  legalActions(state = this.state) {
    return legalActions(state);
  }

  step({action, tick} = {}) {
    const state = this.state;
    if (state.terminal) return this.reject('TERMINAL');
    if (tick !== undefined && tick !== state.tick) return this.reject('TICK_MISMATCH');
    if (action?.type !== 'pour' || !canPour(state, action.from, action.to)) {
      return this.reject('INVALID_ACTION');
    }

    const {from, to} = action;
    const previous = this.begin(action, tick);
    const source = state.tubes[from];
    const target = state.tubes[to];
    const color = source.at(-1);
    const limit = Math.min(source.length, state.capacity - target.length);
    let amount = 1;
    while (amount < limit && source.at(-1 - amount) === color) amount++;
    target.push(...source.splice(-amount));
    state.tick++;
    state.turn++;
    state.terminal = outcome(state);
    const events = [{type: 'POUR', from, to, color, amount}];
    if (state.terminal) events.push({type: 'ObjectiveCompleted', outcome: state.terminal});
    events.push({type: 'StateAdvanced', tick: state.tick, turn: state.turn});
    return this.finish(previous, events);
  }
}

export function exampleSpec(overrides = {}) {
  const config = {capacity: 4, tubes: [['R', 'B', 'R', 'B'], ['B', 'R', 'B', 'R'], [], []], ...overrides};
  const indices = Array.from({length: maxTubes}, (_, index) => index);
  return makeSpec(manifest.id, 'TURN_BASED', config, {
    type: 'composite',
    fields: {
      type: {type: 'discrete', values: ['pour']},
      from: {type: 'discrete', values: indices},
      to: {type: 'discrete', values: indices},
    },
  });
}
