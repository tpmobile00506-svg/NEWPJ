import {Asset,Source,headers11} from '@/shared/domain';
const row=(a:Asset,i:number)=>[i+1,a.code,a.name,a.quantity,a.unitSatang/100,a.totalSatang/100,a.notes,a.location,a.branch,a.groupName,a.category];
export async function exportWorkbook(assets:Asset[]){
 assets=assets.filter(a=>a.lifecycle!=='split');
 const Excel=await import('exceljs'),w=new Excel.Workbook();w.creator='ทะเบียนครุภัณฑ์ มหาวิทยาลัยกาฬสินธุ์';
 const s=w.addWorksheet('ทะเบียนครุภัณฑ์',{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 s.addRow(headers11);assets.forEach((a,i)=>s.addRow(row(a,i)));s.columns.forEach((c,i)=>{c.width=[9,34,48,11,18,20,34,27,18,58,29][i];});
 s.eachRow((r,n)=>{r.height=n===1?30:Math.max(36,Math.min(150,Math.ceil(Math.max(String(r.getCell(3).value||'').length/45,String(r.getCell(10).value||'').length/50))*22));r.eachCell(c=>{c.font={name:'Tahoma',size:11,bold:n===1,color:{argb:n===1?'FFFFFFFF':'FF21304A'}};c.alignment={vertical:'middle',wrapText:true};if(n===1)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1A3B82'}};});});
 for(const k of [5,6])s.getColumn(k).numFmt='#,##0.00';s.getColumn(4).numFmt='0';s.autoFilter={from:'A1',to:{row:assets.length+1,column:11}};
 s.pageSetup.printTitlesRow='1:1';const bytes=await w.xlsx.writeBuffer();save(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'ทะเบียนครุภัณฑ์-11-คอลัมน์.xlsx');
}
function save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function printAssets(assets:Asset[]){
 const old=document.getElementById('asset-print');old?.remove();const div=document.createElement('div');div.id='asset-print';div.className='print-only';
 const h=document.createElement('h2');h.className='print-title';h.textContent='ทะเบียนครุภัณฑ์ · มหาวิทยาลัยกาฬสินธุ์';div.appendChild(h);
 const t=document.createElement('table');t.className='print-table';const head=t.createTHead().insertRow();headers11.forEach(x=>{const c=document.createElement('th');c.textContent=x;head.appendChild(c);});const body=t.createTBody();assets.forEach((a,i)=>{const r=body.insertRow();row(a,i).forEach(v=>{r.insertCell().textContent=String(v??'');});});div.appendChild(t);document.body.appendChild(div);window.print();div.remove();
}

