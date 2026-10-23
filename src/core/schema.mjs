/** Deliberately bounded JSON Schema 2020-12 subset; fails closed on unsupported assertion keywords. */
const ANNOTATIONS=new Set(['$schema','$id','$comment','title','description','default','examples','readOnly','writeOnly','deprecated','$defs','definitions']);
const SUPPORTED=new Set(['$ref','type','enum','const','required','properties','additionalProperties','items','prefixItems','minItems','maxItems','uniqueItems','minProperties','maxProperties','minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','minLength','maxLength','pattern','oneOf','anyOf','allOf','not','if','then','else','dependentRequired']);
const own=(object,key)=>Object.hasOwn(object,key);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const equal=(a,b)=>a===b||(Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>equal(v,b[i])):object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>own(b,k)&&equal(a[k],b[k])));
function jsonValue(value,active=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value!=='object'||active.has(value))return false;
 if(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 active.add(value);const valid=Array.isArray(value)?Array.from({length:value.length},(_,i)=>own(value,i)&&jsonValue(value[i],active)).every(Boolean):Object.values(value).every(v=>jsonValue(v,active));active.delete(value);return valid;
}
function reference(root,ref){
 if(ref==='#')return root;
 if(typeof ref!=='string'||!ref.startsWith('#/'))return undefined;
 let target=root;
 for(const key of ref.slice(2).split('/')){let decoded;try{decoded=decodeURIComponent(key).replaceAll('~1','/').replaceAll('~0','~');}catch{return undefined;}if(!object(target)&&!Array.isArray(target)||!own(target,decoded))return undefined;target=target[decoded];}
 return target;
}
/** Inspect all branches before evaluation: unsupported schemas cannot become matches via not/anyOf. */
export function validateSchemaDefinition(schema,root=schema){
 const errors=[],seen=new Set();
 const fail=(path,message)=>errors.push({code:'SCHEMA_INVALID',path,message,schema_error:true});
 function walk(s,path,active=new Set()){
  if(typeof s==='boolean')return;
  if(!object(s)){fail(path,'Expected object or boolean schema');return;}
  if(active.has(s)){fail(path,'Non-progressing schema reference');return;}
  if(seen.has(s))return;seen.add(s);active=new Set([...active,s]);
  for(const key of Object.keys(s))if(!SUPPORTED.has(key)&&!ANNOTATIONS.has(key))fail(path,`Unsupported schema keyword ${key}`);
  if(own(s,'$ref')){const target=reference(root,s.$ref);if(target===undefined)fail(path,'Unresolved or external schema reference');else walk(target,s.$ref,active);}
  const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string')&&new Set(v).size===v.length;
  if(own(s,'type')){const types=Array.isArray(s.type)?s.type:[s.type];if(!types.length||!strings(types)||types.some(t=>!['null','boolean','object','array','number','integer','string'].includes(t)))fail(path,'Invalid type');}
  for(const key of ['required'])if(own(s,key)&&!strings(s[key]))fail(path,`Invalid ${key}`);
  for(const key of ['enum'])if(own(s,key)&&(!Array.isArray(s[key])||!s[key].length||!jsonValue(s[key])))fail(path,`Invalid ${key}`);
  if(own(s,'const')&&!jsonValue(s.const))fail(path,'Invalid const');
  for(const key of ['minItems','maxItems','minProperties','maxProperties','minLength','maxLength'])if(own(s,key)&&(!Number.isInteger(s[key])||s[key]<0))fail(path,`Invalid ${key}`);
  for(const key of ['minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf'])if(own(s,key)&&(typeof s[key]!=='number'||!Number.isFinite(s[key])||(key==='multipleOf'&&s[key]<=0)))fail(path,`Invalid ${key}`);
  if(own(s,'uniqueItems')&&typeof s.uniqueItems!=='boolean')fail(path,'Invalid uniqueItems');
  if(own(s,'pattern'))try{if(typeof s.pattern!=='string')throw Error();new RegExp(s.pattern,'u');}catch{fail(path,'Invalid pattern');}
  for(const key of ['oneOf','anyOf','allOf','prefixItems'])if(own(s,key)){if(!Array.isArray(s[key])||!s[key].length)fail(path,`Invalid ${key}`);else s[key].forEach((v,i)=>walk(v,`${path}/${key}/${i}`,key==='prefixItems'?new Set():active));}
  for(const key of ['properties','$defs','definitions'])if(own(s,key)){if(!object(s[key]))fail(path,`Invalid ${key}`);else for(const [k,v]of Object.entries(s[key]))walk(v,`${path}/${key}/${k}`);}
  for(const key of ['not','if','then','else','items','additionalProperties'])if(own(s,key))walk(s[key],`${path}/${key}`,['items','additionalProperties'].includes(key)?new Set():active);
  if(own(s,'dependentRequired')){if(!object(s.dependentRequired))fail(path,'Invalid dependentRequired');else for(const v of Object.values(s.dependentRequired))if(!strings(v))fail(path,'Invalid dependentRequired');}
 }
 if(!jsonValue(root))fail('$','Schema must be finite JSON');else walk(schema,'$');
 return errors;
}
export function validateSchema(value,schema,path='$',root=schema){
 const errors=validateSchemaDefinition(schema,root);if(errors.length)return errors;
 if(!jsonValue(value))return [{code:'SCHEMA_INVALID',path,message:'Value must be finite JSON'}];
 return evaluate(value,schema,path,root,new Map());
}
function evaluate(value,schema,path,root,active){
 const errors=[];const fail=(message)=>errors.push({code:'SCHEMA_INVALID',path,message});
 if(schema===true)return errors;if(schema===false){fail('Forbidden value');return errors;}
 const paths=active.get(schema)??new Set();if(paths.has(path)){fail('Non-progressing schema reference');return errors;}
 // Each branch receives its own recursion ancestry; sibling alternatives remain independent.
 active=new Map(active);active.set(schema,new Set([...paths,path]));
 const check=(v,s,p=path)=>evaluate(v,s,p,root,active),match=s=>check(value,s).length===0;
 if(own(schema,'$ref'))errors.push(...check(value,reference(root,schema.$ref)));
 if(schema.oneOf&&schema.oneOf.filter(match).length!==1)fail('Must match exactly one schema');if(schema.anyOf&&!schema.anyOf.some(match))fail('Must match a schema');if(schema.allOf)for(const s of schema.allOf)errors.push(...check(value,s));if(own(schema,'not')&&match(schema.not))fail('Prohibited schema');if(own(schema,'if')){const key=match(schema.if)?'then':'else';if(own(schema,key))errors.push(...check(value,schema[key]));}
 const type=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
 const accepts=t=>t==='integer'?Number.isInteger(value):t==='number'?typeof value==='number'&&Number.isFinite(value):type(value)===t;
 if(schema.type&&!(Array.isArray(schema.type)?schema.type:[schema.type]).some(accepts)){fail(`Expected ${schema.type}`);return errors;}
 if(own(schema,'const')&&!equal(value,schema.const))fail('Const mismatch');if(schema.enum&&!schema.enum.some(x=>equal(x,value)))fail('Value outside enum');
 if(typeof value==='number'){if(!Number.isFinite(value))fail('Nonfinite number');for(const [k,cmp]of [['minimum',(x,y)=>x<y],['maximum',(x,y)=>x>y],['exclusiveMinimum',(x,y)=>x<=y],['exclusiveMaximum',(x,y)=>x>=y]])if(schema[k]!==undefined&&cmp(value,schema[k]))fail(k);if(schema.multipleOf&&Math.abs(value/schema.multipleOf-Math.round(value/schema.multipleOf))>1e-9)fail('multipleOf');}
 if(typeof value==='string'){const length=[...value].length;if(schema.minLength!==undefined&&length<schema.minLength)fail('minLength');if(schema.maxLength!==undefined&&length>schema.maxLength)fail('maxLength');if(schema.pattern&&!new RegExp(schema.pattern,'u').test(value))fail('pattern');}
 if(Array.isArray(value)){if(schema.minItems!==undefined&&value.length<schema.minItems)fail('minItems');if(schema.maxItems!==undefined&&value.length>schema.maxItems)fail('maxItems');if(schema.uniqueItems&&value.some((v,i)=>value.slice(0,i).some(x=>equal(x,v))))fail('uniqueItems');value.forEach((v,i)=>{const s=schema.prefixItems?.[i]??schema.items;if(s!==undefined)errors.push(...check(v,s,`${path}[${i}]`));});}
 if(object(value)){const keys=Object.keys(value);if(schema.minProperties!==undefined&&keys.length<schema.minProperties)fail('minProperties');if(schema.maxProperties!==undefined&&keys.length>schema.maxProperties)fail('maxProperties');for(const key of schema.required??[])if(!own(value,key))errors.push({code:'SCHEMA_INVALID',path:`${path}.${key}`,message:'Required field'});for(const [key,v]of Object.entries(value)){const s=own(schema.properties??{},key)?schema.properties[key]:schema.additionalProperties;if(s!==undefined)errors.push(...check(v,s,`${path}.${key}`));}for(const [k,deps]of Object.entries(schema.dependentRequired??{}))if(own(value,k))for(const d of deps)if(!own(value,d))fail(`${k} requires ${d}`);}
 return errors;
}
export function validateAction(action,space){
 if(!space)return false;switch(space.type){case'discrete':return space.values?.some(x=>JSON.stringify(x)===JSON.stringify(action))??false;case'continuous':{const vals=Array.isArray(action)?action:[action];const size=(space.shape??[1]).reduce((a,b)=>a*b,1);return vals.length===size&&vals.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=(space.min??-Infinity)&&x<=(space.max??Infinity));}case'multi_discrete':case'multidiscrete':return Array.isArray(action)&&action.length===space.values.length&&action.every((v,i)=>space.values[i].includes(v));case'composite':return !!action&&typeof action==='object'&&!Array.isArray(action)&&Object.keys(action).every(k=>k in space.fields)&&Object.entries(space.fields).every(([k,s])=>k in action&&validateAction(action[k],s));case'temporal':return validateAction(action,space.base);default:return false;}
}
