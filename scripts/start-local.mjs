import {copyFileSync,existsSync} from 'node:fs';
if(existsSync('.dev.vars'))copyFileSync('.dev.vars','dist/server/.dev.vars');
process.argv=[process.execPath,'node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0'];
await import('./sites-env.mjs');
await import('../node_modules/wrangler/bin/wrangler.js');
