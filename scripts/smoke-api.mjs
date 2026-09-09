const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const r=await fetch(base+'/api/data',{headers:{cookie}});const d=await r.json();console.log({login:login.status,status:r.status,error:d.error,role:d.me?.role,assets:d.assets?.length});
if(r.ok){const source=await fetch(base+'/api/data?view=source&source=provided-2569&sheet=สำนักงาน&kind=pending',{headers:{cookie}});const s=await source.json();console.log({source:source.status,stats:s.stats,first:s.rows?.[0]?.asset?.name});}
