/** Verify historical provenance against its pinned source, not against a later repair. */
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {canonical} from '../../src/core/index.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function load(){
 const bytes=await fs.readFile(new URL('../../fixtures/historical-source/9fde0aa.json.gz',import.meta.url));
 if(sha(bytes)!=='726516c2b25d2842bb028172417cefed4bf7e1a2ad069c1c536404e17f7ccc67')throw Error('HISTORICAL_SOURCE_ARCHIVE_TAMPERED');
 const archive=JSON.parse(gunzipSync(bytes));if(archive.commit!=='9fde0aacc61f0655835ebf03bdc0d7e8788d13ee')throw Error('HISTORICAL_COMMIT_MISMATCH');
 return archive;
}
export async function historicalFileDigest(path){const archive=await load(),bytes=archive.retained_files[path];if(!bytes)throw Error('HISTORICAL_FILE_MISSING');return sha(Buffer.from(bytes,'base64'));}
export async function historicalSourceManifest(){
 const archive=await load(),files=Object.fromEntries(Object.entries(archive.files).sort(([a],[b])=>a.localeCompare(b)).map(([p,b])=>{if(!/^src\/(core|archetypes|framework)\/[\w.-]+\.mjs$/.test(p))throw Error('HISTORICAL_PATH');return [p,sha(Buffer.from(b,'base64'))];}));
 if(Object.keys(files).length!==24)throw Error('HISTORICAL_SOURCE_INCOMPLETE');
 return {algorithm:'sha256',scope:'Only executable src/core, src/archetypes and src/framework .mjs files; concurrent docs and M7 benchmark edits are outside this execution dependency set.',files,hash:sha(canonical(files))};
}
