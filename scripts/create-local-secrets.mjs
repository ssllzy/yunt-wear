import {randomBytes,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const password=randomBytes(32).toString('base64url');
const hash='sha256-random-v1$'+createHash('sha256').update(password).digest('hex');
writeFileSync('.dev.vars','YUNT_ADMIN_PASSWORD_HASH='+hash+'\nYUNT_SESSION_SECRET='+randomBytes(32).toString('hex')+'\nYUNT_PUBLIC_ORIGIN=http://localhost:5173\n',{flag:'wx'});
writeFileSync('local-admin.txt',password+'\n',{flag:'wx'});
console.log('Local secrets created in ignored .dev.vars and local-admin.txt.');
