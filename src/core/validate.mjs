import {canonical} from './index.mjs';
import gameplaySchema from './gameplay-schema.mjs';
import {validateSchema} from './schema.mjs';
export function validateSpec(spec,registry){
 const issues=validateSchema(spec,gameplaySchema);if(issues.length)return {status:'FAIL',issues,gates:{schema:'FAIL'}};
 const issue=(code,path,message)=>issues.push({code,path,message});
 if(spec.design.archetype!==spec.game.archetype||spec.content.archetype!==spec.game.archetype)issue('REFERENCE_MISMATCH','game.archetype','Design, game and content archetypes differ');
 if(spec.design.session.target_minutes.min>spec.design.session.target_minutes.max)issue('SCHEMA_INVALID','design.session','Invalid min/max');
 try{const {package:pkg}=registry.resolve(spec.game.archetype,spec.runtime.simulation_mode);issues.push(...registry.extensions.validate(spec.extensions),...registry.extensions.validate(spec.content.extensions,'content.extensions'));
 if(!spec.content.extensions[pkg.manifest.id])issue('EXTENSION_NOT_FOUND','content.extensions','Archetype configuration missing');
 if(spec.provenance.rules_version!==pkg.manifest.rulesVersion)issue('RULES_VERSION_MISMATCH','provenance.rules_version',`Expected ${pkg.manifest.rulesVersion}`);
 if(!pkg.manifest.contentTypes.includes(spec.content.type))issue('CONTENT_TYPE_UNSUPPORTED','content.type',spec.content.type);
 issues.push(...pkg.validateContent(spec.content));
 if(!issues.length){const runtime=new pkg.Runtime(spec);runtime.reset({seed:0,content:spec.content});if(canonical(runtime.actionSpace())!==canonical(spec.action_space))issue('ACTION_SPACE_MISMATCH','action_space','Declared actions differ from authoritative runtime contract');}
 }catch(e){issue(e.code??'VALIDATION_ERROR','registry',e.message);}
 return {status:issues.length?'FAIL':'PASS',issues,gates:{schema:issues.length?'FAIL':'PASS',extension:issues.some(x=>x.code==='EXTENSION_NOT_FOUND')?'FAIL':'PASS',capability:issues.some(x=>x.code.startsWith('CAPABILITY'))?'FAIL':'PASS',reference:issues.some(x=>x.code.includes('MISMATCH'))?'FAIL':'PASS'}};
}
