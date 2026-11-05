import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const configs=['apps/api/wrangler.local.jsonc','apps/web/wrangler.jsonc','apps/admin/wrangler.jsonc'];
const children=configs.map((config,i)=>spawn(process.execPath,[cli,'dev','--config',config,'--inspector-port',String(9240+i)],{cwd:root,stdio:['ignore','inherit','inherit']}));
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const child of children){child.on('error',e=>{console.error(e.message);stop(1);});child.on('exit',code=>{if(!stopping)stop(code??1);});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
