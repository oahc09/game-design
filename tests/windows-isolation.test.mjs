import test from 'node:test';import assert from 'node:assert/strict';
import {requireNtfs,canonicalNtfsDirectory,validateNativeIsolationProbe,validateVmIsolationProbe,buildWindowsSandboxConfig} from '../src/benchmark/windows-isolation.mjs';
test('VM result requires exact nonce, unchanged inputs/config/markers and both-volume read/write denials',()=>{
 const report={nonce:'test-nonce',checks:{host_ntfs_hidden:true,host_exfat_hidden:true,host_ntfs_write_denied:true,host_exfat_write_denied:true,input_readonly:true,output_write_read:true,network_adapters_down:true}};
 const options={expectedNonce:'test-nonce',inputUnchanged:true,configUnchanged:true,hostMarkersUnchanged:true,hostWriteAttemptsAbsent:true};
 assert.equal(validateVmIsolationProbe(report,options).status,'LIMITED_VM_BOUNDARY_CHECKS_PASS');assert.equal(validateVmIsolationProbe(report,options).formal_ready,false);
 for(const field of ['inputUnchanged','configUnchanged','hostMarkersUnchanged','hostWriteAttemptsAbsent'])assert.equal(validateVmIsolationProbe(report,{...options,[field]:false}).status,'BLOCKED');
 for(const field of Object.keys(report.checks))assert.equal(validateVmIsolationProbe({...report,checks:{...report.checks,[field]:false}},options).status,'BLOCKED');
 assert.equal(validateVmIsolationProbe({...report,nonce:'another-run'},options).status,'BLOCKED');assert.equal(validateVmIsolationProbe(null,options).status,'BLOCKED');
});
test('MSIX redirected staging binds to its physical path before filesystem validation',async()=>{
 let checked=null;const physical='C:\\Users\\test\\Packages\\app\\LocalCache\\Local\\owned';
 const actual=await canonicalNtfsDirectory('C:\\Users\\test\\AppData\\Local\\owned',{resolvePhysical:async()=>physical,fileSystemOf:async p=>{checked=p;return 'NTFS'}});
 assert.equal(actual,physical);assert.equal(checked,physical);
 await assert.rejects(()=>canonicalNtfsDirectory('alias',{resolvePhysical:async()=> 'E:\\owned',fileSystemOf:async()=> 'exFAT'}),/NTFS_STAGING_REQUIRED/);
});
test('Windows staging rejects exFAT, unknown and non-NTFS filesystems',()=>{
 assert.doesNotThrow(()=>requireNtfs('NTFS'));for(const type of ['exFAT','FAT32','ReFS','',null])assert.throws(()=>requireNtfs(type),/NTFS_STAGING_REQUIRED/);
});
test('startup or one-volume protection cannot certify native isolation',()=>{
 assert.equal(validateNativeIsolationProbe({exit_code:0}).status,'BLOCKED');
 const checks={inside_read_write:true,outside_ntfs_read_denied:true,outside_ntfs_write_denied:true,outside_exfat_read_denied:false,outside_exfat_write_denied:false,network_denied:true,cwd_correct:true};
 const r=validateNativeIsolationProbe({exit_code:0,checks});assert.deepEqual(r.missing,['outside_exfat_read_denied','outside_exfat_write_denied']);
 checks.outside_exfat_read_denied=checks.outside_exfat_write_denied=true;
 assert.equal(validateNativeIsolationProbe({exit_code:1,checks}).status,'BLOCKED');
 const limited=validateNativeIsolationProbe({exit_code:0,checks});assert.equal(limited.status,'LIMITED_BOUNDARY_CHECKS_PASS');assert.equal(limited.formal_ready,false);
});
test('VM maps only disjoint fixed input/output folders, disables network and host integrations',()=>{
 const xml=buildWindowsSandboxConfig({inputDir:'C:\\owned\\a&input',outputDir:'C:\\owned\\output'});
 assert.ok(xml.includes('a&amp;input'));assert.equal((xml.match(/<MappedFolder>/g)||[]).length,2);assert.ok(xml.includes('<ReadOnly>true</ReadOnly>'));assert.ok(xml.includes('<ReadOnly>false</ReadOnly>'));
 for(const feature of ['Networking','ClipboardRedirection','AudioInput','VideoInput','PrinterRedirection','vGPU'])assert.ok(xml.includes(`<${feature}>Disable</${feature}>`));
 assert.ok(xml.includes('<MemoryInMB>2048</MemoryInMB>'));
 for(const [inputDir,outputDir]of [['relative','C:\\out'],['C:\\same','C:\\same'],['C:\\in','C:\\in\\output'],['\\\\server\\share','C:\\out']])assert.throws(()=>buildWindowsSandboxConfig({inputDir,outputDir}));
});
