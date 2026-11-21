import {packages} from '../../src/archetypes/index.mjs';
import {ArchetypeRegistry, defaultCapabilities} from '../../src/core/registry.mjs';
import * as waterSort from './runtime.mjs';

export const registry = new ArchetypeRegistry(defaultCapabilities());
for (const pkg of [...Object.values(packages), waterSort]) registry.register(pkg);

export const getArchetype = id => registry.get(id);
