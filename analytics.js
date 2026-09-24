const Analytics={
 stats(reports=Store.getReports(),year=new Date().getFullYear(),month=new Date().getMonth()){
  const days=new Date(year,month+1,0).getDate(), prefix=`${year}-${String(month+1).padStart(2,"0")}`;
  const r=reports.filter(x=>x.date.startsWith(prefix));return {calendar:days,working:r.filter(x=>x.status==="Working Day").length,holiday:r.filter(x=>x.status==="Holiday").length,leave:r.filter(x=>x.status==="Leave").length,completed:r.filter(x=>x.status==="Working Day"&&x.generatedReport).length,pending:r.filter(x=>x.status==="Working Day"&&!x.generatedReport).length,completion:Math.round((r.filter(x=>x.status==="Working Day").length?r.filter(x=>x.status==="Working Day"&&x.generatedReport).length/r.filter(x=>x.status==="Working Day").length:0)*100)}
 },
 categories(){const m={};Store.getReports().forEach(r=>(r.tags||[]).forEach(t=>m[t]=(m[t]||0)+1));return m},
 streak(){const dates=new Set(Store.getReports().filter(r=>r.status==="Working Day"&&r.generatedReport).map(r=>r.date));let d=new Date();let n=0;while(dates.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n}
};