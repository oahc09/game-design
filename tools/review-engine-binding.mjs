#!/usr/bin/env node
/** Separate text-review context; model advice is not qualified external review. */
import fs from 'node:fs/promises';import path from 'node:path';
import {invokeLocalText,strictObject} from '../src/benchmark/local-text-model.mjs';
import {bytesDigest,writeNew} from '../src/benchmark/evidence-collection.mjs';
const [executable,collection,output]=process.argv.slice(2);if(!output)throw Error('Usage: node tools/review-engine-binding.mjs CODEX_EXE COLLECTION NEW_OUTPUT');
const files=['src/adapters/web.mjs','tools/verify-frozen-engine-binding.mjs'];
const source=await Promise.all(files.map(async name=>{const bytes=await fs.readFile(name);return {path:name,sha256:bytesDigest(bytes),text:bytes.toString('utf8')};}));
const report=JSON.parse(await fs.readFile(path.join(collection,'report.json'),'utf8'));
const schema=strictObject({status:{type:'string',enum:['PASS','FAIL']},findings:{type:'array',items:strictObject({severity:{type:'string',enum:['BLOCKER','LIMITATION','NOTE']},text_zh:{type:'string'}})},scope_zh:{type:'string'}});
const prompt='审查以下工程门禁改动与采集脚本。只审查共享规则绑定，不要求实现候选代码、浏览器输入或视觉。旧 differential 在空动作初始状态损坏与返回terminal损坏时都误报PASS；新测试覆盖这两个反例和正确终局后动作。针对真实漏检、冻结保护、报告是否夸大给出建议。若存在阻止本轮工程结论的缺陷返回FAIL，否则PASS并注明限制。同provider模型建议不是合格外部评审；12配置/12cadence检查不是模型实现任务、真人验证或正式试验。不要要求无关架构扩展。\n'+JSON.stringify({source,report});
const result=await invokeLocalText(executable,path.resolve(output),prompt,schema);
const unchanged=(await Promise.all(source.map(async s=>bytesDigest(await fs.readFile(s.path))===s.sha256))).every(Boolean);
await writeNew(output,'review-binding.json',{status:result.transport.status==='PASS'&&result.answer?.status==='PASS'&&unchanged?'PASS_WITH_LIMITATIONS':'FAIL',source:source.map(({text,...rest})=>rest),report_sha256:bytesDigest(await fs.readFile(path.join(collection,'report.json'))),source_unchanged:unchanged,formal_independent:false,model_advice_only:true});
console.log(JSON.stringify({transport:result.transport.status,advice:result.answer?.status,source_unchanged:unchanged}));if(result.transport.status!=='PASS'||result.answer?.status!=='PASS'||!unchanged)process.exitCode=1;
