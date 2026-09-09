import { env } from 'cloudflare:workers';
import { getChatGPTUser } from './auth';
import { Asset, Source, classify, roles, conditions, requestTypes, expandRange, splitAmounts } from '@/shared/domain';
import {parseWorkbook} from '@/shared/workbook';
import supplied from '@/backend/data/provided.json';
type Member={id:string;email:string;name:string;role:keyof typeof roles;active:number};
export class ApiError extends Error{constructor(message:string,public status=400){super(message);}}
export function db(){if(!env.DB)throw new ApiError('ฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่',503);return env.DB;}
export function q(sql:string,...args:unknown[]){return db().prepare(sql).bind(...args);}
export async function all<T=Record<string,unknown>>(sql:string,...args:unknown[]):Promise<T[]>{return (await q(sql,...args).all<T>()).results;}
export async function one<T=Record<string,unknown>>(sql:string,...args:unknown[]):Promise<T|null>{return q(sql,...args).first<T>();}
const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID();
export function clean(v:unknown,max=5000){if(typeof v!=='string'||v.length>max)throw new ApiError('ข้อความไม่ถูกต้องหรือยาวเกินกำหนด');return v.trim();}
export async function member():Promise<Member>{
 const u=await getChatGPTUser();if(!u)throw new ApiError('กรุณาเข้าสู่ระบบ',401);
 let m=await one<Member>('SELECT * FROM users WHERE id=?',u.userId);
 if(!m){
  const count=await one<{n:number}>('SELECT count(*) n FROM users');
  if(!count?.n){
   try{await db().batch([q("INSERT INTO settings (key,value) VALUES ('bootstrap',?)",u.userId),q('INSERT INTO users (id,email,name,role,active,createdAt) VALUES (?,?,?,?,1,?)',u.userId,u.email.toLowerCase(),u.displayName,'admin',now())]);}catch{ /* Another first request may have completed setup. */ }
  }else{
   const invite=await one<{name:string;role:keyof typeof roles}>('SELECT * FROM invites WHERE email=? AND active=1',u.email.toLowerCase());
   if(invite)await q('INSERT OR IGNORE INTO users (id,email,name,role,active,createdAt) VALUES (?,?,?,?,1,?)',u.userId,u.email.toLowerCase(),invite.name||u.displayName,invite.role,now()).run();
  }
  m=await one<Member>('SELECT * FROM users WHERE id=?',u.userId);
 }
 if(!m?.active)throw new ApiError('บัญชีนี้ยังไม่ได้รับสิทธิ์ กรุณาติดต่อ Admin',403);return m;
}
export function allow(m:Member,allowed:string[]){if(!allowed.includes(m.role))throw new ApiError('บัญชีนี้ไม่มีสิทธิ์ดำเนินการ',403);}
export function audit(m:Member,action:string,assetId:string|null,before:unknown,after:unknown,reason=''){
 return q('INSERT INTO audit (id,assetId,actor,actorName,action,before,after,reason,createdAt) VALUES (?,?,?,?,?,?,?,?,?)',id(),assetId,m.id,m.name,action,JSON.stringify(before),JSON.stringify(after),reason,now());
}
function guard(m:Member,token:string,sql:string,...args:unknown[]){return q('INSERT INTO operations (id,valid,actor,createdAt) VALUES (?,('+sql+'),?,?)',token,...args,m.id,now());}
function dims(a:Partial<Asset>){return [q('INSERT OR IGNORE INTO locations (name) VALUES (?)',a.location),q('INSERT OR IGNORE INTO branches (name) VALUES (?)',a.branch),q('INSERT OR IGNORE INTO categories (name) VALUES (?)',a.category),q('INSERT OR IGNORE INTO asset_groups (name,description) VALUES (?,?)',a.groupName,a.groupName)];}
export function validated(b:Record<string,unknown>):Partial<Asset>{
 const a:Record<string,unknown>={};for(const k of ['code','name','notes','location','branch','groupName','category','receivedDate','serial','brand','custodian'])a[k]=clean(b[k]??'');
 for(const k of ['quantity','unitSatang','totalSatang','lifeYears','salvageSatang']){const n=Number(b[k]??0);if(!Number.isSafeInteger(n)||n<0||n>100000000000000)throw new ApiError('จำนวนและมูลค่าต้องเป็นตัวเลขที่ถูกต้อง');a[k]=n;}
 if(!a.code||!a.name||!a.category||!a.branch||!a.location)throw new ApiError('กรุณาระบุรหัส ชื่อ ประเภท สาขา และสถานที่');
 if(!(Number(a.quantity)>0)||Number(a.quantity)>1000000)throw new ApiError('จำนวนต้องเป็นจำนวนเต็ม 1–1,000,000');
 if(Number(a.salvageSatang)>Number(a.totalSatang)||Number(a.lifeYears)>100)throw new ApiError('ตรวจสอบอายุใช้งานและมูลค่าซาก');
 if(a.receivedDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(a.receivedDate))||!Number.isFinite(Date.parse(String(a.receivedDate)))||new Date(String(a.receivedDate)).toISOString().slice(0,10)!==a.receivedDate))throw new ApiError('วันที่รับไม่ถูกต้อง');
 a.condition=clean(b.condition??'normal');if(!Object.hasOwn(conditions,String(a.condition)))throw new ApiError('สถานะไม่ถูกต้อง');
 return a;
}
const columns=['id','code','name','quantity','unitSatang','totalSatang','notes','location','branch','groupName','category','condition','lifecycle','version','parentId','sourceId','sourceRow','receivedDate','lifeYears','salvageSatang','serial','brand','custodian','createdAt'];
function insert(a:Partial<Asset>){return q('INSERT INTO assets ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')',...columns.map(k=>(a as Record<string,unknown>)[k]??null));}
async function asset(id:string){const a=await one<Asset>('SELECT * FROM assets WHERE id=?',id);if(!a)throw new ApiError('ไม่พบครุภัณฑ์',404);return a;}
export async function getSource(sourceId:string):Promise<Source>{
 if(sourceId==='provided-2569')return supplied as Source;
 const f=await one<{objectKey:string}>('SELECT objectKey FROM imports WHERE id=?',sourceId);if(!f||!env.BUCKET)throw new ApiError('ไม่พบไฟล์',404);
 const obj=await env.BUCKET.get(f.objectKey+'.json');if(!obj)throw new ApiError('ไม่พบข้อมูลต้นฉบับ',404);return obj.json<Source>();
}
export async function getData(m:Member,url:URL){
 const view=url.searchParams.get('view')||'state';
 if(view==='source'){
  const s=await getSource(url.searchParams.get('source')||'provided-2569');let rows=classify(s);
  const decisions=await all<{sourceRow:string;decision:string}>('SELECT sourceRow,decision FROM source_rows WHERE sourceId=?',s.id);
  const done=new Set(decisions.map(x=>x.sourceRow));
  const stats={rows:rows.length,assets:rows.filter(x=>x.kind==='asset').length,review:rows.filter(x=>x.kind==='asset'&&x.issue).length,annotations:rows.filter(x=>x.kind!=='asset').length,imported:done.size};
  const sheet=url.searchParams.get('sheet'),search=url.searchParams.get('q')?.toLowerCase(),kind=url.searchParams.get('kind');
  if(sheet&&sheet!=='all')rows=rows.filter(x=>x.sheet===sheet);
  if(search)rows=rows.filter(x=>JSON.stringify(x.values).toLowerCase().includes(search));
  if(kind==='pending')rows=rows.filter(x=>x.kind==='asset'&&!done.has(x.key));
  if(kind==='review')rows=rows.filter(x=>x.kind==='asset'&&!!x.issue&&!done.has(x.key));
  if(kind==='ready')rows=rows.filter(x=>x.kind==='asset'&&!x.issue&&!done.has(x.key));
  if(kind==='annotations')rows=rows.filter(x=>x.kind!=='asset');
  const page=Math.max(0,Number(url.searchParams.get('page'))||0),size=40;
  return {id:s.id,name:s.name,hash:s.hash,sheets:s.sheets.map(x=>x.name),stats,total:rows.length,rows:rows.slice(page*size,(page+1)*size).map(x=>({...x,done:done.has(x.key)}))};
 }
 if(view==='history')return {events:await all('SELECT * FROM audit WHERE assetId=? ORDER BY createdAt DESC',url.searchParams.get('asset')),children:await all('SELECT * FROM assets WHERE parentId=?',url.searchParams.get('asset'))};
 if(view==='stocktake')return {items:await all('SELECT s.*,a.code,a.name FROM stocktake_items s JOIN assets a ON a.id=s.assetId WHERE roundId=? ORDER BY a.code',url.searchParams.get('round'))};
 const [assets,requests,rounds,users,invites,events,imports,settings,approvals]=await Promise.all([
 all<Asset>('SELECT * FROM assets ORDER BY createdAt DESC'),all('SELECT r.*,a.code,a.name FROM requests r JOIN assets a ON a.id=r.assetId ORDER BY r.createdAt DESC'),all('SELECT s.*,(SELECT count(*) FROM stocktake_items WHERE roundId=s.id) total,(SELECT count(*) FROM stocktake_items WHERE roundId=s.id AND result!=?) checked FROM stocktakes s ORDER BY createdAt DESC','pending'),
 m.role==='admin'?all('SELECT * FROM users'):[],m.role==='admin'?all('SELECT * FROM invites'):[],
 all('SELECT * FROM audit ORDER BY createdAt DESC LIMIT 100'),all('SELECT * FROM imports'),all<{key:string;value:string}>('SELECT * FROM settings WHERE key!=?','bootstrap'),all('SELECT p.*,u.name actorName FROM approvals p LEFT JOIN users u ON u.id=p.actor ORDER BY p.createdAt')
 ]);
 return {me:m,assets,requests,rounds,users,invites,events,imports:[{id:supplied.id,name:supplied.name,hash:supplied.hash,rowCount:4312},...imports],settings:Object.fromEntries(settings.map(s=>[s.key,s.value])),approvals};
}
export async function mutate(m:Member,b:Record<string,any>){
 const action=clean(b.action,50);const token=clean(b.token||id(),100);
 const existing=await one('SELECT id FROM operations WHERE id=? AND actor=?',token,m.id);if(existing)return {ok:true,replayed:true};
 if(action==='user'){
  allow(m,['admin']);const email=clean(b.email,200).toLowerCase(),role=clean(b.role,20),name=clean(b.name,200);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!Object.hasOwn(roles,role))throw new ApiError('อีเมลหรือบทบาทไม่ถูกต้อง');
  const target=await one<Member>('SELECT * FROM users WHERE email=?',email);const active=b.active===false?0:1;
  if(target?.id===m.id&&(role!=='admin'||!active))throw new ApiError('ไม่สามารถปิดสิทธิ์ Admin ของตนเอง');
  await db().batch([q('INSERT INTO invites (email,role,name,active) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,name=excluded.name,active=excluded.active',email,role,name,active),q('UPDATE users SET role=?,name=?,active=? WHERE email=?',role,name,active,email),audit(m,'จัดการสิทธิ์ผู้ใช้',null,target,{email,role,name,active})]);return {ok:true};
 }
 if(action==='workflow'){allow(m,['admin']);const chain=b.chain;if(!Array.isArray(chain)||!chain.length||chain.length>3||new Set(chain).size!==chain.length||chain.some(x=>!['head','deputy','dean'].includes(x)))throw new ApiError('สายอนุมัติไม่ถูกต้อง');
 await db().batch([q("INSERT INTO settings (key,value) VALUES ('workflow',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(chain)),audit(m,'กำหนดสายอนุมัติ',null,null,chain)]);return {ok:true};}
 if(action==='create'||action==='import'){
  allow(m,['staff','admin']);const a=validated(b.asset);let sourceId:string|null=null,sourceRow:string|null=null,raw:unknown=null;
  if(action==='import'){
   sourceId=clean(b.sourceId);sourceRow=clean(b.sourceRow);const src=await getSource(sourceId),row=classify(src).find(x=>x.key===sourceRow);if(!row||row.kind!=='asset')throw new ApiError('เลือกแถวรายการครุภัณฑ์');
   if(!b.reviewed)throw new ApiError('กรุณาตรวจสอบข้อมูลก่อนนำเข้า');raw=row;
   if(row.groupName&&!String(a.groupName).includes(row.groupName))throw new ApiError('ต้องเก็บข้อความชุด / โครงการต้นฉบับไว้ในหมวด');
  }
  if(Number(a.unitSatang)*Number(a.quantity)!==Number(a.totalSatang)&&!clean(b.reason??''))throw new ApiError('ยอดเงินไม่ตรงสูตร กรุณาระบุเหตุผลที่ใช้ยอดนี้');
  const range=expandRange(String(a.code),Number(a.quantity));
  if(String(a.code).includes('ถึง')&&!range)throw new ApiError('กรุณายืนยันหมายเลขครุภัณฑ์ที่ชัดเจนก่อนนำเข้า เก็บรหัสช่วงเดิมในหมายเหตุ');
  const base={...a,id:id(),lifecycle:range?'split':'active',version:1,parentId:null,sourceId,sourceRow,createdAt:now()} as Asset;
  const statements=[...dims(base),insert(base)];
  if(sourceId)statements.push(q('INSERT INTO source_rows (id,sourceId,sourceRow,raw,decision,reason,actor,createdAt) VALUES (?,?,?,?,?,?,?,?)',id(),sourceId,sourceRow,JSON.stringify(raw),'imported',clean(b.reason??''),m.id,now()));
  if(range){const amounts=splitAmounts(base.quantity,base.totalSatang,1);range.forEach((code,i)=>statements.push(insert({...base,id:id(),code,quantity:1,totalSatang:amounts[i],salvageSatang:i===0?Math.floor(base.salvageSatang/2):base.salvageSatang-Math.floor(base.salvageSatang/2),lifecycle:'active',parentId:base.id})));}
  statements.push(guard(m,token,'SELECT 1'),audit(m,sourceId?'นำเข้าครุภัณฑ์':'เพิ่มครุภัณฑ์',base.id,null,base,clean(b.reason??'')));
  await db().batch(statements);return {ok:true,id:base.id};
 }
 if(action==='edit'||action==='split'||action==='request'||action==='repairComplete'){
  allow(m,['staff','admin']);const a=await asset(clean(b.id));if(a.lifecycle!=='active')throw new ApiError('รายการนี้ถูกแบ่งยอดหรือปิดบัญชีแล้ว');
  if(a.version!==b.version)throw new ApiError('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
  const pending=await one('SELECT id FROM requests WHERE assetId=? AND status=?',a.id,'pending');
  if(pending)throw new ApiError('รายการนี้มีคำขอรออนุมัติ กรุณาดำเนินการคำขอให้เสร็จก่อน');
  const reason=clean(b.reason??'');const statements=[guard(m,token,"SELECT count(*) FROM assets WHERE id=? AND version=? AND lifecycle='active'",a.id,a.version)];
  if(action==='edit'){
   const next=validated(b.asset);if(next.location!==a.location||next.branch!==a.branch)throw new ApiError('การเปลี่ยนสถานที่หรือสาขาต้องส่งคำขอโอนย้าย');if(next.condition!==a.condition&&(next.condition==='repair'||a.condition==='repair'))throw new ApiError('การเข้า/ออกสถานะซ่อมต้องใช้คำขอซ่อมหรือบันทึกซ่อมเสร็จ');if(!reason)throw new ApiError('กรุณาระบุเหตุผลการแก้ไข');
   if(next.quantity!==a.quantity||next.totalSatang!==a.totalSatang||next.unitSatang!==a.unitSatang)throw new ApiError('จำนวนและมูลค่าที่ลงทะเบียนแล้วแก้ตรงนี้ไม่ได้ ใช้แบ่งล็อตหรือบันทึกปรับปรุงแยกพร้อมหลักฐาน');
   if(a.groupName&&!String(next.groupName).includes(a.groupName))throw new ApiError('ต้องเก็บข้อความหมวดเดิมไว้ สามารถเพิ่มข้อความได้');
   const keys=Object.keys(next);
   statements.push(...dims(next),q('UPDATE assets SET '+keys.map(k=>k+'=?').join(',')+',version=version+1 WHERE id=?',...keys.map(k=>(next as Record<string,unknown>)[k]),a.id),audit(m,'แก้ไขครุภัณฑ์',a.id,a,next,reason));
  }
  if(action==='split'){
   if(a.condition==='repair')throw new ApiError('กรุณาบันทึกผลการซ่อมก่อนแบ่งล็อต');
   if(!reason)throw new ApiError('กรุณาระบุเหตุผลการแบ่งล็อต');
   const take=Number(b.quantity),amounts=splitAmounts(a.quantity,a.totalSatang,take);const salvage=splitAmounts(a.quantity,a.salvageSatang,take);
   const cond=clean(b.condition);if(!Object.hasOwn(conditions,cond)||cond==='repair')throw new ApiError('สถานะไม่ถูกต้อง');
   const children=[{...a,id:id(),parentId:a.id,code:a.code+' / 1-'+a.version,quantity:take,totalSatang:amounts[0],salvageSatang:salvage[0],condition:cond,version:1,createdAt:now()},{...a,id:id(),parentId:a.id,code:a.code+' / 2-'+a.version,quantity:a.quantity-take,totalSatang:amounts[1],salvageSatang:salvage[1],version:1,createdAt:now()}];
   statements.push(q("UPDATE assets SET lifecycle='split',version=version+1 WHERE id=?",a.id),...children.map(insert),audit(m,'แบ่งล็อต',a.id,a,children,reason));
  }
  if(action==='request'){
   const kind=clean(b.kind);if(!Object.hasOwn(requestTypes,kind)||!reason)throw new ApiError('ระบุประเภทและเหตุผลของคำขอ');
   if(kind==='transfer'&&(!clean(b.payload?.location??'')||!clean(b.payload?.branch??'')))throw new ApiError('ระบุสถานที่และสาขาปลายทาง');
   const config=await one<{value:string}>("SELECT value FROM settings WHERE key='workflow'");const chain=config?.value||'["head","deputy","dean"]';
   const req={id:id(),assetId:a.id,assetVersion:a.version,kind,payload:b.payload||{},reason,chain};
   statements.push(q('INSERT INTO requests (id,assetId,assetVersion,kind,payload,reason,stage,chain,status,version,actor,createdAt) VALUES (?,?,?,?,?,?,0,?,\'pending\',1,?,?)',req.id,a.id,a.version,kind,JSON.stringify(req.payload),reason,chain,m.id,now()),q('UPDATE assets SET version=version+1 WHERE id=?',a.id),q('UPDATE requests SET assetVersion=? WHERE id=?',a.version+1,req.id),audit(m,'ส่งคำขอ '+requestTypes[kind as keyof typeof requestTypes],a.id,a,req,reason));
  }
  if(action==='repairComplete'){
   if(a.condition!=='repair'||!reason)throw new ApiError('เลือกรายการที่กำลังซ่อม และระบุผลการซ่อม');
   const cost=Number(b.costSatang);if(!Number.isSafeInteger(cost)||cost<0)throw new ApiError('ค่าซ่อมไม่ถูกต้อง');
   statements.push(q("UPDATE assets SET condition='normal',version=version+1 WHERE id=?",a.id),audit(m,'ซ่อมเสร็จ',a.id,a,{condition:'normal',costSatang:cost},reason));
  }
  await db().batch(statements);return {ok:true};
 }
 if(action==='approve'||action==='reject'){
  const r=await one<any>('SELECT * FROM requests WHERE id=?',clean(b.id));if(!r||r.status!=='pending'||r.version!==b.version)throw new ApiError('คำขอเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
  const chain=JSON.parse(r.chain);allow(m,[chain[r.stage]]);if(r.actor===m.id)throw new ApiError('ไม่สามารถอนุมัติคำขอตนเอง');
  const a=await asset(r.assetId);if(a.version!==r.assetVersion||a.lifecycle!=='active')throw new ApiError('ข้อมูลครุภัณฑ์เปลี่ยนแล้ว คำขอเดิมใช้ไม่ได้',409);
  const note=clean(b.reason??'');if(action==='reject'&&!note)throw new ApiError('กรุณาระบุเหตุผลส่งกลับ');
  const final=action==='approve'&&r.stage===chain.length-1;
  const statements=[guard(m,token,"SELECT count(*) FROM requests WHERE id=? AND version=? AND status='pending'",r.id,r.version),guard(m,token+'-asset',"SELECT count(*) FROM assets WHERE id=? AND version=? AND lifecycle='active'",a.id,a.version),
  q('INSERT INTO approvals (id,requestId,stage,decision,actor,note,createdAt) VALUES (?,?,?,?,?,?,?)',id(),r.id,r.stage,action,m.id,note,now()),
  q('UPDATE requests SET stage=?,status=?,version=version+1 WHERE id=?',r.stage+(action==='approve'?1:0),action==='reject'?'rejected':final?'approved':'pending',r.id),
  audit(m,action==='reject'?'ส่งคำขอกลับ':'อนุมัติคำขอ',a.id,r,{stage:r.stage+1,final},note)];
  if(final){
   const payload=JSON.parse(r.payload);if(r.kind==='transfer'){const loc=clean(payload.location),branch=clean(payload.branch);statements.push(q('INSERT OR IGNORE INTO locations (name) VALUES (?)',loc),q('INSERT OR IGNORE INTO branches (name) VALUES (?)',branch),q('UPDATE assets SET location=?,branch=?,version=version+1 WHERE id=?',loc,branch,a.id));}
   if(r.kind==='repair')statements.push(q("UPDATE assets SET condition='repair',version=version+1 WHERE id=?",a.id));
   if(r.kind==='disposal')statements.push(q("UPDATE assets SET lifecycle='disposed',version=version+1 WHERE id=?",a.id));
   statements.push(audit(m,'ดำเนินการ '+requestTypes[r.kind as keyof typeof requestTypes],a.id,a,{...JSON.parse(r.payload),kind:r.kind},r.reason));
  }
  await db().batch(statements);return {ok:true};
 }
 if(action==='round'){
  allow(m,['staff','admin']);const name=clean(b.name,200),year=Number(b.year);if(!name||!Number.isInteger(year)||year<2500||year>2800)throw new ApiError('ชื่อรอบหรือปีงบประมาณไม่ถูกต้อง');
  const n=await one<{n:number}>("SELECT count(*) n FROM assets WHERE lifecycle='active'");if(!n?.n)throw new ApiError('ยังไม่มีทะเบียนครุภัณฑ์สำหรับตรวจนับ');
  const rid=id();await db().batch([guard(m,token,'SELECT 1'),q('INSERT INTO stocktakes (id,name,year,status,createdAt) VALUES (?,?,?,\'open\',?)',rid,name,year,now()),q("INSERT INTO stocktake_items (id,roundId,assetId,snapshot,result,notes) SELECT ?||id,?,id,json_object('code',code,'name',name,'quantity',quantity,'location',location,'branch',branch,'totalSatang',totalSatang),'pending','' FROM assets WHERE lifecycle='active'",rid,rid),audit(m,'เปิดรอบตรวจนับ',null,null,{id:rid,name,year})]);return {ok:true,id:rid};
 }
 if(action==='check'){
  allow(m,['staff','admin']);const result=clean(b.result);if(!['normal','damaged','missing','mismatch'].includes(result))throw new ApiError('ผลตรวจไม่ถูกต้อง');
  const i=await one<any>("SELECT i.* FROM stocktake_items i JOIN stocktakes s ON s.id=i.roundId WHERE i.id=? AND s.status='open'",clean(b.id));if(!i)throw new ApiError('รอบตรวจนับปิดแล้ว หรือไม่พบรายการ');
  const qty=Number(b.quantity),expected=JSON.parse(i.snapshot).quantity;
  if(!Number.isSafeInteger(qty)||qty<0||qty>expected)throw new ApiError('จำนวนที่พบต้องอยู่ระหว่าง 0 ถึงจำนวนตามทะเบียน');
  if(result==='normal'&&qty!==expected)throw new ApiError('จำนวนไม่ตรงทะเบียน กรุณาเลือกข้อมูลไม่ตรง');
  if(result==='missing'&&qty!==0)throw new ApiError('ผลไม่พบต้องมีจำนวนที่พบเป็น 0');
  await db().batch([guard(m,token,"SELECT count(*) FROM stocktakes WHERE id=? AND status='open'",i.roundId),q('UPDATE stocktake_items SET result=?,quantity=?,notes=?,actor=?,checkedAt=? WHERE id=?',result,qty,clean(b.reason??''),m.id,now(),i.id),audit(m,'บันทึกตรวจนับ',i.assetId,i,{result,quantity:qty},clean(b.reason??''))]);return {ok:true};
 }
 if(action==='closeRound'){
  allow(m,['staff','admin']);const rid=clean(b.id),remaining=await one<{n:number}>("SELECT count(*) n FROM stocktake_items WHERE roundId=? AND result='pending'",rid);if(remaining?.n)throw new ApiError('ยังมีรายการไม่ได้ตรวจนับ '+remaining.n+' รายการ');
  await db().batch([guard(m,token,"SELECT count(*) FROM stocktakes WHERE id=? AND status='open'",rid),q("UPDATE stocktakes SET status='closed',closedAt=? WHERE id=?",now(),rid),audit(m,'ปิดรอบตรวจนับ',null,null,{id:rid})]);return {ok:true};
 }
 throw new ApiError('ไม่พบการทำงานนี้',404);
}
export async function upload(m:Member,form:FormData){
 allow(m,['staff','admin']);if(!env.BUCKET)throw new ApiError('พื้นที่เก็บไฟล์ไม่พร้อม',503);
 const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024||!file.name.toLowerCase().endsWith('.xlsx'))throw new ApiError('รองรับไฟล์ .xlsx ไม่เกิน 10 MB');
 const bytes=await file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash===supplied.hash)return {ok:true,id:supplied.id,duplicate:true};
 const old=await one<{id:string}>('SELECT id FROM imports WHERE hash=?',hash);if(old)return {ok:true,id:old.id,duplicate:true};
 const s=await parseWorkbook(file);const count=s?.sheets?.reduce((n,x)=>n+x.rows.length,0);
 if(!s||!count||count>20000||s.sheets.length>100)throw new ApiError('โครงสร้างไฟล์ไม่ถูกต้อง หรือเกิน 20,000 แถว');
 s.id=id();s.hash=hash;s.name=file.name;for(const sh of s.sheets){clean(sh.name,200);for(const row of sh.rows){if(!Number.isInteger(row.row)||row.row<1||!Array.isArray(row.values)||row.values.length>100||JSON.stringify(row.values).length>50000)throw new ApiError('โครงสร้างแถวไม่ถูกต้อง');}}
 const key='imports/'+s.id;await env.BUCKET.put(key,bytes);await env.BUCKET.put(key+'.json',JSON.stringify(s));
 await db().batch([q('INSERT INTO imports (id,name,hash,objectKey,rowCount,createdAt,actor) VALUES (?,?,?,?,?,?,?)',s.id,s.name,hash,key,count,now(),m.id),audit(m,'อัปโหลด Excel',null,null,{id:s.id,name:s.name,rows:count})]);return {ok:true,id:s.id};
}

