const Calendar={
 state:{date:new Date()},
 render(container,selected){
   const d=this.state.date,y=d.getFullYear(),m=d.getMonth(),reports=Store.getReports(),first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate();
   let h=`<div class="section"><div class="calendar-head"><div><div class="eyebrow">Duty calendar</div><div class="month-title">${monthName(y,m)}</div></div><div class="calendar-nav"><button class="icon-btn" data-cal="-1">‹</button><button class="btn" data-cal="0">Today</button><button class="icon-btn" data-cal="1">›</button></div></div><div class="cal-grid">`;
   ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(x=>h+=`<div class="weekday">${x}</div>`);
   for(let i=0;i<first;i++)h+=`<div class="day-cell muted-day"></div>`;
   for(let n=1;n<=total;n++){const date=`${y}-${String(m+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`,r=reports.find(x=>x.date===date),today=date===isoToday(),cls=today?"today":"";let dot="",label="";
     if(r){dot=r.status==="Holiday"?"holiday":r.status==="Leave"?"leave":r.generatedReport?"complete":"pending";label=r.status==="Holiday"?r.holidayName:r.status==="Leave"?"Leave":r.generatedReport?"Completed":"Pending"}
     h+=`<div class="day-cell ${cls}" data-date="${date}"><div class="day-num">${n}</div>${dot?`<div class="day-status"><span class="dot ${dot}"></span><span>${esc(label)}</span></div>`:""}</div>`;
   }
   h+="</div><div style='display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:10px;color:var(--muted)'><span><i class='dot complete'></i> Completed</span><span><i class='dot pending'></i> Pending</span><span><i class='dot holiday'></i> Holiday</span><span><i class='dot leave'></i> Leave</span></div></div>";container.innerHTML=h;
   container.querySelectorAll("[data-date]").forEach(x=>x.onclick=()=>App.openReport(x.dataset.date));
   container.querySelectorAll("[data-cal]").forEach(x=>x.onclick=()=>{let v=+x.dataset.cal;if(v===0)this.state.date=new Date();else this.state.date=new Date(y,m+v,1);App.renderView("calendar")});
 }
};