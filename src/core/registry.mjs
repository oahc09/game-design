import {validateSchema} from './schema.mjs';
export class RegistryError extends Error{constructor(code,message){super(message);this.code=code;}}
export class CapabilityRegistry{
 constructor(){this.items=new Map();}
 register(d){if(!d?.id)throw new RegistryError('SCHEMA_INVALID','Capability id required');if(this.items.has(d.id))throw new RegistryError('DUPLICATE_CAPABILITY',d.id);this.items.set(d.id,{requires:[],conflicts:[],...d});return this;}
 get(id){if(!this.items.has(id))throw new RegistryError('CAPABILITY_MISSING',id);return this.items.get(id);}
 resolve(ids){const done=new Set(),active=new Set(),result=[];const visit=id=>{if(active.has(id))throw new RegistryError('DEPENDENCY_CYCLE',id);if(done.has(id))return;const d=this.get(id);active.add(id);for(const dep of d.requires)visit(dep);active.delete(id);done.add(id);result.push(d);};ids.forEach(visit);for(const d of result)for(const c of d.conflicts)if(done.has(c))throw new RegistryError('CAPABILITY_CONFLICT',`${d.id}/${c}`);return result;}
}
export class ExtensionRegistry{
 constructor(){this.items=new Map();}
 register(id,schema){if(this.items.has(id))throw new RegistryError('DUPLICATE_EXTENSION',id);if(schema.additionalProperties!==false)throw new RegistryError('SCHEMA_INVALID','Extension root must be closed');this.items.set(id,schema);return this;}
 validate(extensions,path='extensions'){let errors=[];for(const [id,value]of Object.entries(extensions??{})){if(!this.items.has(id))errors.push({code:'EXTENSION_NOT_FOUND',path:`${path}.${id}`,message:'Unregistered extension'});else errors.push(...validateSchema(value,this.items.get(id),`${path}.${id}`));}return errors;}
}
export class ArchetypeRegistry{
 constructor(capabilities=new CapabilityRegistry(),extensions=new ExtensionRegistry()){this.capabilities=capabilities;this.extensions=extensions;this.items=new Map();}
 register(pkg){const m=pkg.manifest;if(!m?.id||!m.version||!m.rulesVersion||typeof pkg.Runtime!=='function')throw new RegistryError('SCHEMA_INVALID','Incomplete archetype');if(this.items.has(m.id))throw new RegistryError('DUPLICATE_ARCHETYPE',m.id);this.capabilities.resolve(m.requiredCapabilities);this.extensions.register(m.id,pkg.extensionSchema);this.items.set(m.id,pkg);return this;}
 get(id){if(!this.items.has(id))throw new RegistryError('ARCHETYPE_NOT_FOUND',id);return this.items.get(id);}
 resolve(id,mode){const pkg=this.get(id);if(mode&&!pkg.manifest.simulationModes.includes(mode))throw new RegistryError('SIMULATION_MODE_UNSUPPORTED',mode);return {package:pkg,capabilities:this.capabilities.resolve(pkg.manifest.requiredCapabilities)};}
}
export function defaultCapabilities(){const r=new CapabilityRegistry();for(const d of [{id:'events'},{id:'grid'},{id:'spatial2d'},{id:'turn_based'},{id:'fixed_step'},{id:'event_driven'},{id:'rng'},{id:'gravity',requires:['grid']},{id:'matching',requires:['grid']},{id:'collision',requires:['spatial2d']},{id:'combat',requires:['events']},{id:'projectile',requires:['spatial2d','collision'] }])r.register({...d,version:'0.1.0'});return r;}
