import assert from 'node:assert/strict';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import {splitAmounts,expandRange,classify,satang,bookValue} from '../../shared/domain.ts';
assert.deepEqual(splitAmounts(400,37000000,189),[17482500,19517500]);
for(const n of [0,400,401,-1,1.2])assert.throws(()=>splitAmounts(400,37000000,n));
assert.deepEqual(expandRange('4354-4331-071-213-1(2)ถึง-2(2)',2),['4354-4331-071-213-1(2)','4354-4331-071-213-2(2)']);
assert.equal(expandRange('a-1(20) ถึง 20(20)',2),null);
assert.equal(satang('1,925.75'),192575);assert.throws(()=>satang('1.001'));
const source=JSON.parse(fs.readFileSync(new URL('../data/provided.json',import.meta.url),'utf8')),rows=classify(source);
assert.equal(rows.length,4312);assert.equal(rows.find(x=>x.key==='สำนักงาน:50').asset.totalSatang,37000000);
for(const key of ['คอม:32','คอม:33']){const r=rows.find(x=>x.key===key);assert.equal(r.kind,'asset');assert.match(r.groupName,/NonLinear/);assert.match(r.groupName,/160500/);assert.ok(r.issue);}
assert.match(rows.find(x=>x.key==='คอม:36').groupName,/มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน/);
assert.equal(rows.find(x=>x.key==='สำนักงาน:1080').kind,'asset');
assert.equal(bookValue({receivedDate:'2020-01-01',lifeYears:5,salvageSatang:100,totalSatang:10000},new Date('2030-01-01')),100);
console.log('PASS domain: exact money, invalid splits, code ranges, raw preservation, NonLinear groups, merged rows, depreciation floor');
const base=process.env.ASSET_TEST_URL||'http://127.0.0.1:5174';
const people={admin:['test-admin','admin@example.test'],staff:['test-staff','staff@example.test'],head:['test-head','head@example.test'],deputy:['test-deputy','deputy@example.test'],dean:['test-dean','dean@example.test']};
async function call(role,body,path=''){const identity=people[role];const r=await fetch(base+'/api/data'+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':identity[0],'oai-authenticated-user-email':identity[1],...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({token:crypto.randomUUID(),...body}):undefined});return {status:r.status,...await r.json()};}
function good(r){assert.equal(r.status,200,JSON.stringify(r));return r;}
const suffix=Date.now().toString(36);
good(await call('admin'));
for(const role of ['staff','head','deputy','dean'])good(await call('admin',{action:'user',email:people[role][1],name:role,role,active:true}));
assert.equal((await call('staff',{action:'workflow',chain:['head']})).status,403);
assert.equal((await call('admin',{action:'user',email:'bad@example.test',name:'bad',role:'toString'})).status,400);
const proto={code:'CHAIR-'+suffix,name:'เก้าอี้ทดสอบ',quantity:400,unitSatang:92500,totalSatang:37000000,location:'ห้องทดสอบ',branch:'ทดสอบ',category:'ครุภัณฑ์สำนักงาน',condition:'normal',groupName:'ชุดทดสอบ',notes:'',receivedDate:'',lifeYears:0,salvageSatang:0};
let r=good(await call('staff',{action:'create',asset:proto}));const parent=r.id;
let state=good(await call('staff'));let a=state.assets.find(x=>x.id===parent);
assert.equal((await call('staff',{action:'edit',id:parent,version:a.version,asset:{...a,location:'ย้ายข้ามอนุมัติ'},reason:'bad'})).status,400);
assert.equal((await call('staff',{action:'create',asset:{...proto,code:'INVALID-'+suffix,receivedDate:'2026-02-31'}})).status,400);
const token='split-'+suffix,body={action:'split',id:parent,version:a.version,quantity:189,condition:'damaged',reason:'ตรวจพบชำรุด',token};
good(await call('staff',body));good(await call('staff',body));
state=good(await call('staff'));const children=state.assets.filter(x=>x.parentId===parent);
assert.equal(children.length,2);assert.equal(children.reduce((n,x)=>n+x.quantity,0),400);assert.equal(children.reduce((n,x)=>n+x.totalSatang,0),37000000);
assert.equal(children.find(x=>x.condition==='damaged').totalSatang,17482500);assert.equal(state.assets.find(x=>x.id===parent).lifecycle,'split');
a=children.find(x=>x.condition==='normal');
const concurrent=await Promise.all([call('staff',{action:'split',id:a.id,version:a.version,quantity:10,condition:'damaged',reason:'race1'}),call('staff',{action:'split',id:a.id,version:a.version,quantity:20,condition:'damaged',reason:'race2'})]);assert.equal(concurrent.filter(x=>x.status===200).length,1);
const range=good(await call('staff',{action:'create',asset:{...proto,code:'AIR-'+suffix+'-1(2)ถึง-2(2)',quantity:2,unitSatang:100,totalSatang:200}}));
state=good(await call('staff'));const units=state.assets.filter(x=>x.parentId===range.id);assert.equal(units.length,2);assert.notEqual(units[0].id,units[1].id);
good(await call('staff',{action:'edit',id:units[0].id,version:units[0].version,asset:{...units[0],condition:'damaged'},reason:'เครื่องแรกชำรุด'}));
state=good(await call('staff'));assert.equal(state.assets.find(x=>x.id===units[1].id).condition,'normal');
a=state.assets.find(x=>x.id===units[1].id);
good(await call('staff',{action:'request',id:a.id,version:a.version,kind:'transfer',payload:{location:'ปลายทาง',branch:'สาขาใหม่'},reason:'ขอโอนย้าย'}));
let request=good(await call('head')).requests.find(x=>x.assetId===a.id&&x.status==='pending');
assert.equal((await call('admin',{action:'approve',id:request.id,version:request.version})).status,403);
assert.equal((await call('dean',{action:'approve',id:request.id,version:request.version})).status,403);
for(const role of ['head','deputy','dean']){request=good(await call(role)).requests.find(x=>x.id===request.id);good(await call(role,{action:'approve',id:request.id,version:request.version,reason:'เห็นชอบ'}));}
state=good(await call('staff'));assert.equal(state.assets.find(x=>x.id===a.id).location,'ปลายทาง');assert.equal(state.requests.find(x=>x.id===request.id).status,'approved');
const round=good(await call('staff',{action:'round',name:'รอบทดสอบ '+suffix,year:2569}));assert.equal((await call('staff',{action:'closeRound',id:round.id})).status,400);
const items=good(await call('staff',null,'?view=stocktake&round='+round.id)).items;
for(const i of items)good(await call('staff',{action:'check',id:i.id,result:'normal',quantity:JSON.parse(i.snapshot).quantity,reason:'ตรวจจริง'}));
good(await call('staff',{action:'closeRound',id:round.id}));assert.equal((await call('staff',{action:'check',id:items[0].id,result:'normal',quantity:1})).status,400);
const wb=new ExcelJS.Workbook(),sh=wb.addWorksheet('สำนักงาน');sh.addRow(['ลำดับ','หมายเลขครุภัณฑ์','รายการ','จำนวน','ราคาต่อหน่วย','จำนวนเงิน','หมายเหตุ']);sh.addRow([1,'UPLOAD-'+suffix,'ทดสอบต้นฉบับ',1,250,250,'ห้องทดสอบ']);
const form=new FormData();form.set('file',new File([await wb.xlsx.writeBuffer()],'test-'+suffix+'.xlsx'));form.set('source',JSON.stringify({sheets:[{name:'forged',rows:[]}]}));
const upload=await fetch(base+'/api/data',{method:'POST',headers:{'oai-authenticated-user-id':people.staff[0],'oai-authenticated-user-email':people.staff[1]},body:form});const up=await upload.json();assert.equal(upload.status,200,JSON.stringify(up));
const parsed=good(await call('staff',null,'?view=source&source='+up.id));assert.equal(parsed.rows.find(x=>x.kind==='asset').asset.totalSatang,25000);assert.equal(parsed.sheets[0],'สำนักงาน');
const unauth=await fetch(base+'/api/data');assert.equal(unauth.status,401);
console.log('PASS API: 5 roles, invalid enums/dates, approval order, no direct transfer, exact split, replay, concurrency, independent units, stocktake close, server-verified XLSX, anonymous rejection');

