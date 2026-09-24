function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
const Exporter={
 paper(r){
  const s=Store.getSettings(), activities=(r.activities||[]).map(x=>`<li>${esc(x)}</li>`).join("");
  return `<article class="report-paper" id="printPaper"><div class="inst">${esc(s.institution).toUpperCase()}</div><div class="report-title">DAILY DUTY REPORT</div>
  <div class="report-meta"><div><b>Submitted to:</b> ${esc(s.authority)}</div><div><b>Submitted by:</b> ${esc(s.name)}</div><div><b>Date:</b> ${esc(fmtDate(r.date))}</div><div><b>Day:</b> ${esc(r.day||dayName(r.date))}</div><div><b>Status:</b> ${esc(r.status)}</div>${s.designation?`<div><b>Designation:</b> ${esc(s.designation)}</div>`:""}</div>
  ${r.status==="Working Day"?`<h4>DAILY DUTY REPORT</h4><p>${esc(r.generatedReport||r.notes||"No report content.")}</p>`:""}
  ${s.showActivities&&activities?`<h4>KEY ACTIVITIES</h4><ul>${activities}</ul>`:""}
  ${s.showRemarks&&r.remarks?`<h4>REMARKS</h4><p>${esc(r.remarks)}</p>`:""}
  ${r.status==="Holiday"?`<h4>HOLIDAY</h4><p><b>${esc(r.holidayName||"Holiday")}</b>${r.holidayDescription?` — ${esc(r.holidayDescription)}`:""}</p>`:""}
  ${r.status==="Leave"?`<h4>LEAVE DETAILS</h4><p><b>Type:</b> ${esc(r.leaveType||"Leave")}<br><b>Reason:</b> ${esc(r.leaveReason||"")}</p>`:""}
  ${s.showSignature?`<div class="signature"><div class="signature-line">${esc(s.name)}<br>${esc(s.designation||"")}</div></div>`:""}</article>`
 },
 async pdf(r){
   const {jsPDF}=window.jspdf||{}; if(!jsPDF)throw Error("PDF library unavailable");
   const doc=new jsPDF("p","mm","a4"), s=Store.getSettings(), margin=18, width=210-margin*2;
   doc.setTextColor(25,35,55); doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text(s.institution.toUpperCase(),105,20,{align:"center"});
   doc.setFontSize(18);doc.text("DAILY DUTY REPORT",105,32,{align:"center"});
   doc.setDrawColor(210,215,225);doc.line(margin,38,192,38);
   doc.setFont("helvetica","normal");doc.setFontSize(10);
   let y=47; [["Submitted to",s.authority],["Submitted by",s.name],["Date",fmtDate(r.date)],["Day",r.day||dayName(r.date)],["Status",r.status]].forEach(([a,b])=>{doc.setFont("helvetica","bold");doc.text(a+":",margin,y);doc.setFont("helvetica","normal");doc.text(String(b||""),margin+31,y);y+=6});
   y+=7;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(r.status==="Working Day"?"DAILY DUTY REPORT":r.status.toUpperCase(),margin,y);y+=7;doc.setFont("helvetica","normal");doc.setFontSize(10);
   const text=r.generatedReport||r.notes||r.holidayName||r.leaveReason||"No report content."; const lines=doc.splitTextToSize(text,width);
   lines.forEach(line=>{if(y>276){doc.addPage();y=20}doc.text(line,margin,y);y+=5});
   if((r.activities||[]).length){y+=7;doc.setFont("helvetica","bold");doc.text("KEY ACTIVITIES",margin,y);y+=7;doc.setFont("helvetica","normal");r.activities.forEach(a=>{doc.text("• "+a,margin,y);y+=5})}
   if(r.remarks){y+=7;doc.setFont("helvetica","bold");doc.text("REMARKS",margin,y);y+=7;doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(r.remarks,width),margin,y)}
   doc.setFontSize(8);doc.setTextColor(100);doc.text(s.name+"  •  "+s.institution,105,289,{align:"center"});
   doc.save(`Duty_Report_${r.date}.pdf`);
 },
 async docx(r){
   const D=window.docx;if(!D)throw Error("DOCX library unavailable");const s=Store.getSettings();
   const children=[new D.Paragraph({text:s.institution.toUpperCase(),heading:D.HeadingLevel.HEADING_2,alignment:D.AlignmentType.CENTER}),
   new D.Paragraph({text:"DAILY DUTY REPORT",heading:D.HeadingLevel.HEADING_1,alignment:D.AlignmentType.CENTER}),
   new D.Paragraph({text:`Submitted to: ${s.authority}\nSubmitted by: ${s.name}\nDate: ${fmtDate(r.date)}\nDay: ${r.day||dayName(r.date)}\nStatus: ${r.status}`})];
   if(r.status==="Working Day")children.push(new D.Paragraph({text:"DAILY DUTY REPORT",heading:D.HeadingLevel.HEADING_2}),new D.Paragraph(r.generatedReport||r.notes||""));
   if(r.activities?.length){children.push(new D.Paragraph({text:"KEY ACTIVITIES",heading:D.HeadingLevel.HEADING_2}),...r.activities.map(a=>new D.Paragraph({text:a,bullet:{level:0}})))}
   if(r.remarks)children.push(new D.Paragraph({text:"REMARKS",heading:D.HeadingLevel.HEADING_2}),new D.Paragraph(r.remarks));
   children.push(new D.Paragraph({text:`\n${s.name}\n${s.designation||""}`}));
   const blob=await D.Packer.toBlob(new D.Document({sections:[{properties:{},children}]}));const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Duty_Report_${r.date}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
 },
 csv(){
   const rows=[["Date","Day","Status","Holiday","Leave Type","Leave Reason","Notes","Generated Report","Activities","Remarks"],...Store.getReports().map(r=>[r.date,r.day,r.status,r.holidayName||"",r.leaveType||"",r.leaveReason||"",r.notes||"",r.generatedReport||"",(r.activities||[]).join(" | "),r.remarks||""])];
   const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");this.download(csv,"dutylog_archive.csv","text/csv")
 },
 json(){this.download(Store.exportJSON(),"dutylog_backup.json","application/json")},
 download(data,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
};