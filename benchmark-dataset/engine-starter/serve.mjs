// Dependency-free local static server. Identical in both experiment arms.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.PORT??8185),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/'){res.writeHead(302,{Location:'/benchmark-dataset/engine-starter/index.html'});res.end();return;}const file=await fs.realpath(path.resolve(root,'.'+name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(!(await fs.stat(file)).isFile())throw Error('Not a file');res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Engine starter http://127.0.0.1:${port}`));
