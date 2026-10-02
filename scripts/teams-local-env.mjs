// Writes only isolated local credentials, never reads a linked/hosted project.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const raw=execFileSync('npx',['--yes','supabase@2.118.0','status','-o','env'],{encoding:'utf8'});
const env=Object.fromEntries([...raw.matchAll(/^(\w+)="(.*)"$/gm)].map(m=>[m[1],m[2]]));
if(env.API_URL!=='http://127.0.0.1:57321'||!env.ANON_KEY||!env.SERVICE_ROLE_KEY)throw Error('Start the isolated genesis-teams stack first.');
fs.writeFileSync('.env.local',`NEXT_PUBLIC_SUPABASE_URL=${env.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${env.SERVICE_ROLE_KEY}\nNEXT_PUBLIC_ENABLE_LOCAL_SUPABASE=true\nTEAMS_ENABLED=true\nNEXT_PUBLIC_APP_URL=http://127.0.0.1:4318\n`,{flag:'wx',mode:0o600});
console.log('Local-only Teams environment created. Existing environment files are never overwritten.');
