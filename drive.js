/* Google Drive cloud backup layer.
   Uses Google Identity Services + Drive API appDataFolder.
   The user supplies only a Web OAuth Client ID; no secret is stored in the app. */
const DriveSync={
 token:null, expiresAt:0, fileId:null, fileName:'DUTYLOG_AI_BACKUP.json',
 clientId(){return localStorage.getItem('dutylog_google_client_id')||''},
 async loadGIS(){
   if(window.google?.accounts?.oauth2)return;
   await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>reject(Error('Google Identity Services could not load. Check your internet connection.'));document.head.appendChild(s)});
 },
 async connect(){
   const id=this.clientId(); if(!id)throw Error('Enter your Google OAuth Client ID in Settings first.');
   await this.loadGIS();
   return new Promise((resolve,reject)=>{
     const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:'https://www.googleapis.com/auth/drive.appdata',callback:async r=>{if(r.error){reject(Error(r.error_description||r.error));return}this.token=r.access_token;this.expiresAt=Date.now()+(r.expires_in||3600)*1000-60000;localStorage.setItem('dutylog_drive_connected','1');await this.refreshMeta();resolve(r)}});
     client.requestAccessToken({prompt:'consent'});
   });
 },
 async ensure(){if(this.token&&Date.now()<this.expiresAt)return true;if(localStorage.getItem('dutylog_drive_connected')==='1'){try{await this.connectSilent()}catch{return false}return true}return false},
 async connectSilent(){await this.loadGIS();return new Promise((resolve,reject)=>{const client=google.accounts.oauth2.initTokenClient({client_id:this.clientId(),scope:'https://www.googleapis.com/auth/drive.appdata',callback:r=>{if(r.error)return reject(Error(r.error));this.token=r.access_token;this.expiresAt=Date.now()+(r.expires_in||3600)*1000-60000;resolve(r)}});client.requestAccessToken({prompt:''})})},
 headers(){return {Authorization:`Bearer ${this.token}`}},
 async api(url,opts={}){const r=await fetch(url,{...opts,headers:{...this.headers(),...(opts.headers||{})}});if(r.status===401){this.token=null;throw Error('Google Drive authorization expired. Reconnect in Settings.')}if(!r.ok){const t=await r.text();throw Error(t||`Drive error ${r.status}`)}return r.status===204?null:r.json()},
 async findFile(){const q=encodeURIComponent("name='DUTYLOG_AI_BACKUP.json' and trashed=false");const x=await this.api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)`);this.fileId=x.files?.[0]?.id||null;return x.files?.[0]||null},
 payload(){return {app:'DUTYLOG AI',version:2,lastUpdated:new Date().toISOString(),device:navigator.userAgent,reports:Store.getReports(),settings:Store.getSettings(),metadata:{totalReports:Store.getReports().length,lastReportDate:Store.getReports().map(x=>x.date).sort().at(-1)||null}}},
 async backup(){if(!await this.ensure())throw Error('Connect Google Drive first.');const body=JSON.stringify(this.payload(),null,2);const existing=await this.findFile();let r;
   if(existing){const form=new FormData();form.append('metadata',new Blob([JSON.stringify({name:this.fileName})],{type:'application/json'}));form.append('file',new Blob([body],{type:'application/json'}));r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`,{method:'PATCH',headers:this.headers(),body:form});}
   else{const form=new FormData();form.append('metadata',new Blob([JSON.stringify({name:this.fileName,parents:['appDataFolder'],mimeType:'application/json'})],{type:'application/json'}));form.append('file',new Blob([body],{type:'application/json'}));r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:this.headers(),body:form});}
   if(!r.ok)throw Error(await r.text());const meta=await r.json();this.fileId=meta.id;localStorage.setItem('dutylog_last_backup',new Date().toISOString());return meta;
 },
 async download(){if(!await this.ensure())throw Error('Connect Google Drive first.');const f=await this.findFile();if(!f)throw Error('No DUTYLOG AI cloud backup was found.');const r=await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,{headers:this.headers()});if(!r.ok)throw Error(await r.text());return {data:await r.json(),modifiedTime:f.modifiedTime};},
 async sync(){const remote=await this.download(),local=Store.getReports();const rr=remote.data.reports||[];const lm=Math.max(0,...local.map(x=>new Date(x.updatedAt||x.createdAt||0).getTime()));const rm=new Date(remote.modifiedTime||remote.data.lastUpdated||0).getTime();
   if(rm>lm){const choice=confirm('A newer DUTYLOG AI backup is available in Google Drive.\n\nOK = Restore cloud data\nCancel = Merge cloud + this device');if(choice){Store.saveReports(rr);if(remote.data.settings)Store.saveSettings({...Store.getSettings(),...remote.data.settings});return {mode:'restored'}}}
   const map=new Map(local.map(x=>[x.date,x]));rr.forEach(x=>{const old=map.get(x.date);if(!old||new Date(x.updatedAt||x.createdAt||0)>new Date(old.updatedAt||old.createdAt||0))map.set(x.date,x)});Store.saveReports([...map.values()].sort((a,b)=>a.date.localeCompare(b.date)));await this.backup();return {mode:'merged'};
 },
 async refreshMeta(){try{const f=await this.findFile();const el=document.getElementById('driveMeta');if(el)el.textContent=f?`Cloud backup: ${new Date(f.modifiedTime).toLocaleString('en-IN')}`:'Connected · No backup yet';const st=document.getElementById('driveStatus');if(st)st.textContent=f?'Cloud connected · synced':'Google Drive connected';}catch{}} ,
 disconnect(){this.token=null;this.expiresAt=0;this.fileId=null;localStorage.removeItem('dutylog_drive_connected');const e=document.getElementById('driveStatus');if(e)e.textContent='Local only';const m=document.getElementById('driveMeta');if(m)m.textContent='Google Drive disconnected.'}
};
