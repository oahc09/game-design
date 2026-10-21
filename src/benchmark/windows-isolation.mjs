/** Windows execution prerequisites. Configuration is never promoted to measured isolation. */
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {realpath} from 'node:fs/promises';
const execFileAsync=promisify(execFile);
export function requireNtfs(type){if(String(type).trim().toUpperCase()!=='NTFS')throw Error(`NTFS_STAGING_REQUIRED:${type??'UNKNOWN'}`);}
export async function windowsFileSystem(location){
 if(process.platform!=='win32')throw Error('WINDOWS_ONLY');
 const drive=path.win32.parse(path.resolve(location)).root.slice(0,2);
 if(!/^[A-Za-z]:$/.test(drive))throw Error('LOCAL_WINDOWS_DRIVE_REQUIRED');
 const ps=path.join(process.env.SystemRoot??'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 const {stdout}=await execFileAsync(ps,['-NoProfile','-NonInteractive','-Command',`(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${drive}'").FileSystem`],{timeout:10000,windowsHide:true});
 return stdout.trim();
}
export async function canonicalNtfsDirectory(logical,{resolvePhysical=realpath,fileSystemOf=windowsFileSystem}={}){
 const physical=await resolvePhysical(logical);
 requireNtfs(await fileSystemOf(physical));
 return physical;
}
const boundaryChecks=['inside_read_write','outside_ntfs_read_denied','outside_ntfs_write_denied','outside_exfat_read_denied','outside_exfat_write_denied','network_denied','cwd_correct'];
export function validateNativeIsolationProbe(probe){
 const missing=boundaryChecks.filter(k=>probe?.checks?.[k]!==true);
 if(probe?.exit_code!==0)missing.push('successful_process_exit');
 return {status:missing.length?'BLOCKED':'LIMITED_BOUNDARY_CHECKS_PASS',missing,formal_ready:false,scope:'Listed observed boundaries only; process/asset/provider caps and independent evaluator still require audit'};
}
export function validateVmIsolationProbe(report,{expectedNonce,inputUnchanged,configUnchanged,hostMarkersUnchanged,hostWriteAttemptsAbsent}={}){
 const missing=[];
 if(!expectedNonce||report?.nonce!==expectedNonce)missing.push('nonce_binding');
 for(const [name,ok]of Object.entries({input_unchanged:inputUnchanged,config_unchanged:configUnchanged,host_markers_unchanged:hostMarkersUnchanged,host_write_attempts_absent:hostWriteAttemptsAbsent}))if(ok!==true)missing.push(name);
 for(const name of ['host_ntfs_hidden','host_exfat_hidden','host_ntfs_write_denied','host_exfat_write_denied','input_readonly','output_write_read','network_adapters_down'])if(report?.checks?.[name]!==true)missing.push(name);
 if(report?.status==='INFRA_FAILURE')missing.push('guest_process_success');
 return {status:missing.length?'BLOCKED':'LIMITED_VM_BOUNDARY_CHECKS_PASS',missing,formal_ready:false,scope:'Trusted static VM fixture boundaries only; not provider caps, lifecycle/process quotas, independent evaluation or M7 certification'};
}
function localAbsolute(p){return typeof p==='string'&&/^[A-Za-z]:[\\/]/.test(p)&&!/[\r\n\0]/.test(p);}
function xml(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
export function buildWindowsSandboxConfig({inputDir,outputDir}){
 if(!localAbsolute(inputDir)||!localAbsolute(outputDir))throw Error('ABSOLUTE_LOCAL_MAPPING_REQUIRED');
 const a=path.win32.resolve(inputDir),b=path.win32.resolve(outputDir);
 const nested=(x,y)=>{const r=path.win32.relative(x,y);return !r||(!r.startsWith('..')&&!path.win32.isAbsolute(r));};
 if(nested(a,b)||nested(b,a))throw Error('DISJOINT_MAPPING_DIRECTORIES_REQUIRED');
 return `<Configuration>\n  <vGPU>Disable</vGPU>\n  <Networking>Disable</Networking>\n  <ClipboardRedirection>Disable</ClipboardRedirection>\n  <AudioInput>Disable</AudioInput>\n  <VideoInput>Disable</VideoInput>\n  <PrinterRedirection>Disable</PrinterRedirection>\n  <MemoryInMB>2048</MemoryInMB>\n  <MappedFolders>\n    <MappedFolder><HostFolder>${xml(a)}</HostFolder><SandboxFolder>C:\\gd-input</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder>\n    <MappedFolder><HostFolder>${xml(b)}</HostFolder><SandboxFolder>C:\\gd-output</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder>\n  </MappedFolders>\n  <LogonCommand><Command>cmd.exe /d /c C:\\gd-input\\probe.cmd</Command></LogonCommand>\n</Configuration>\n`;
}
