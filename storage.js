const DB_KEY="dutylog_reports_v1", SETTINGS_KEY="dutylog_settings_v1", DRAFT_KEY="dutylog_draft_v1";
const DEFAULT_SETTINGS={name:"Muhammad Basith Adany",designation:"",institution:"Thaiba Garden Group of Institutions",department:"",authority:"The Joint Director",email:"",phone:"",theme:"system",language:"English",reportStyle:"Formal",showActivities:true,showRemarks:true,showSignature:true,showPageNumbers:true,signatureType:"typed",signatureData:""};
const Store={
 getReports(){try{return JSON.parse(localStorage.getItem(DB_KEY)||"[]")}catch{return[]}},
 saveReports(x){localStorage.setItem(DB_KEY,JSON.stringify(x))},
 getSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}}catch{return {...DEFAULT_SETTINGS}}},
 saveSettings(x){localStorage.setItem(SETTINGS_KEY,JSON.stringify(x))},
 getDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||"null")}catch{return null}},
 saveDraft(x){localStorage.setItem(DRAFT_KEY,JSON.stringify(x))},
 clearDraft(){localStorage.removeItem(DRAFT_KEY)},
 upsert(report){
   const a=this.getReports(), i=a.findIndex(x=>x.date===report.date);
   if(i>=0)a[i]={...a[i],...report,updatedAt:new Date().toISOString()}; else a.push({...report,id:crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   a.sort((x,y)=>x.date.localeCompare(y.date));this.saveReports(a);return i>=0?"updated":"created";
 },
 remove(id){this.saveReports(this.getReports().filter(x=>x.id!==id))},
 exportJSON(){return JSON.stringify({version:1,reports:this.getReports(),settings:this.getSettings()},null,2)},
 importJSON(obj,replace=false){if(!obj||!Array.isArray(obj.reports))throw Error("Invalid DUTYLOG backup");if(replace)this.saveReports(obj.reports);else{const map=new Map(this.getReports().map(x=>[x.date,x]));obj.reports.forEach(x=>map.set(x.date,x));this.saveReports([...map.values()].sort((a,b)=>a.date.localeCompare(b.date)))}if(obj.settings)this.saveSettings({...this.getSettings(),...obj.settings})}
};
const isoToday=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(d+"T00:00:00"));
const dayName=d=>new Intl.DateTimeFormat("en-IN",{weekday:"long"}).format(new Date(d+"T00:00:00"));
const monthName=(y,m)=>new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric"}).format(new Date(y,m,1));
