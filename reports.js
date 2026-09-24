const Reports={
 filter(q,status="All"){let a=Store.getReports();if(status!=="All")a=a.filter(r=>r.status===status);q=(q||"").toLowerCase().trim();if(q)a=a.filter(r=>JSON.stringify(r).toLowerCase().includes(q));return a.sort((a,b)=>b.date.localeCompare(a.date))},
 activityTags:["Academic","Administrative","Student Affairs","Documentation","Event","Meeting","Library","Examination","Communication","Supervision","Planning","Maintenance","Other"]
};