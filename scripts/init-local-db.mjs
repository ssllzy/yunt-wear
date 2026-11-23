import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const dir of ['drizzle','cloudflare/migrations'])for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','site-creator-d1','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file',dir+'/'+f],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
}
