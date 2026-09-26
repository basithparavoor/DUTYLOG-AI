const SUPABASE_URL='https://lksdkaiwvkcvjrfcqcpc.supabase.co';
const SUPABASE_KEY='sb_publishable_lzFKFj0DBgI49MC4anKtEw_TMSajPTx';
const INSTITUTION='Thaiba Garden Group of Institutions';

const sb=window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

let me=null;
let profile=null;
let view='dashboard';

let reports=[];
let people=[];
let departments=[];
let positions=[];
let leaves=[];
let institutionalDays=[];

const esc=s=>String(s??'').replace(
  /[&<>'"]/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[c])
);

const fmt=d=>d
  ?new Date(d+'T00:00:00').toLocaleDateString(
    undefined,
    {
      day:'2-digit',
      month:'short',
      year:'numeric'
    }
  )
  :'—';

const initials=n=>String(n||'U')
  .split(/\s+/)
  .map(x=>x[0])
  .slice(0,2)
  .join('')
  .toUpperCase();

function toast(t){

  const el=$('#toast');

  if(!el){
    console.warn(t);
    return;
  }

  el.innerHTML=`
    <div
      class="notice"
      style="
        position:fixed;
        right:18px;
        bottom:18px;
        z-index:999;
        box-shadow:var(--shadow)
      "
    >
      ${esc(t)}
    </div>
  `;

  setTimeout(
    ()=>el.innerHTML='',
    3200
  );
}

function roleName(r){
  return String(r||'')
    .replaceAll('_',' ')
    .replace(/\b\w/g,x=>x.toUpperCase());
}

function isManager(){
  return(
    profile?.role==='admin'||
    profile?.role==='joint_director'
  );
}

function today(){
  return new Date()
    .toISOString()
    .slice(0,10);
}

async function init(){

  try{

    const googleBtn=$('#googleBtn');

    if(googleBtn){

      googleBtn.onclick=async()=>{

        const {error}=
          await sb.auth.signInWithOAuth({
            provider:'google',
            options:{
              redirectTo:
                location.origin+
                location.pathname
            }
          });

        if(error)
          toast(
            'Google sign-in failed: '+
            error.message
          );
      };
    }

    const signout=$('#signout');

    if(signout){

      signout.onclick=async()=>{

        const {error}=
          await sb.auth.signOut();

        if(error)
          toast(error.message);
      };
    }

    const menu=$('#menu');

    if(menu){

      menu.onclick=()=>{
        const sidebar=$('#sidebar');

        if(sidebar)
          sidebar.classList.toggle('open');
      };
    }

    const themeToggle=$('#themeToggle');

    if(themeToggle)
      themeToggle.onclick=toggleTheme;

    applyTheme();

    const {
      data:{
        session
      }
    }=await sb.auth.getSession();

    if(session){

      await enter(session);

    }else{

      const authView=$('#authView');
      const app=$('#app');

      if(authView)
        authView.classList.remove('hidden');

      if(app)
        app.classList.add('hidden');
    }

    sb.auth.onAuthStateChange(
      async(event,session)=>{

        if(
          event==='SIGNED_IN' &&
          session
        ){

          await enter(session);
        }

        if(event==='SIGNED_OUT')
          location.reload();
      }
    );

  }catch(error){

    console.error(
      'DUTYLOG initialization error:',
      error
    );

    toast(
      'Application initialization failed: '+
      error.message
    );
  }
}

function applyTheme(){

  const saved=
    localStorage.getItem(
      'dutylog_theme'
    )||'light';

  document.documentElement.dataset.theme=
    saved;

  const b=$('#themeToggle');

  if(b)
    b.textContent=
      saved==='dark'
        ?'☾'
        :'☼';
}

function toggleTheme(){

  const next=
    document.documentElement.dataset.theme==='dark'
      ?'light'
      :'dark';

  localStorage.setItem(
    'dutylog_theme',
    next
  );

  applyTheme();
}

async function enter(session){

  me=session.user;

  const {
    data,
    error
  }=await sb
    .from('profiles')
    .select(
      '*,departments(name),positions(title),manager:manager_id(full_name)'
    )
    .eq('id',me.id)
    .single();

  if(error){

    toast(error.message);
    return;
  }

  profile=data;

  $('#authView')?.classList.add('hidden');
  $('#app')?.classList.remove('hidden');

  if($('#sideName'))
    $('#sideName').textContent=
      profile.full_name||me.email;

  if($('#sideRole'))
    $('#sideRole').textContent=
      roleName(profile.role);

  if($('#sideAvatar'))
    $('#sideAvatar').textContent=
      initials(profile.full_name);

  buildNav();

  await load();

  view=
    profile.profile_completed
      ?'dashboard'
      :'profile';

  render();
}

function buildNav(){

  let items=[
    ['dashboard','⌂','Dashboard'],
    ['reports','▤','My Reports'],
    ['calendar','▦','Calendar'],
    ['generator','✦','Report Generator'],
    ['leave','◷','Leave Management'],
    ['profile','◎','My Profile']
  ];

  if(isManager()){

    items.push(
      ['verification','✓','Report Review'],
      ['staff','♙','Staff Directory'],
      ['institutional','◈','Institution Calendar']
    );
  }

  if(profile?.role==='admin'){

    items.push(
      ['users','♟','Users'],
      ['departments','▦','Departments'],
      ['positions','◆','Positions'],
      ['settings','⚙','Settings']
    );
  }

  const nav=$('#nav');

  if(nav){

    nav.innerHTML=
      items.map(x=>`
        <button
          class="nav ${view===x[0]?'active':''}"
          data-view="${x[0]}"
        >
          <i>${x[1]}</i>
          <span>${x[2]}</span>
        </button>
      `).join('');
  }

  const mobile=$('#mobileNav');

  if(mobile){

    mobile.innerHTML=
      items.slice(0,5).map(x=>`
        <button
          class="mnav ${view===x[0]?'active':''}"
          data-view="${x[0]}"
        >
          <i>${x[1]}</i>
          <span>${x[2]}</span>
        </button>
      `).join('');
  }

  $$('.nav,.mnav').forEach(
    b=>b.onclick=()=>{
      view=b.dataset.view;
      $('#sidebar')?.classList.remove('open');
      render();
    }
  );
}

async function load(){

  if($('#syncState'))
    $('#syncState').textContent='● Syncing';

  const rq=
    isManager()
      ?sb
        .from('reports')
        .select(
          '*,profiles!reports_user_id_fkey(full_name,email,department_id,position_id)'
        )
        .order(
          'report_date',
          {ascending:false}
        )
      :sb
        .from('reports')
        .select('*')
        .eq('user_id',me.id)
        .order(
          'report_date',
          {ascending:false}
        );

  const rr=await rq;

  reports=rr.data||[];

  if(rr.error)
    toast(rr.error.message);

  const lr=
    isManager()
      ?sb
        .from('leave_requests')
        .select(
          '*,profiles!leave_requests_user_id_fkey(full_name,email,department_id),reviewer:reviewed_by(full_name)'
        )
        .order(
          'start_date',
          {ascending:false}
        )
      :sb
        .from('leave_requests')
        .select('*')
        .eq('user_id',me.id)
        .order(
          'start_date',
          {ascending:false}
        );

  const ld=await lr;

  leaves=ld.data||[];

  if(ld.error)
    toast(ld.error.message);

  const idq=
    sb
      .from('institutional_days')
      .select('*,departments(name)')
      .order(
        'day_date',
        {ascending:false}
      );

  const idr=await idq;

  institutionalDays=
    idr.data||[];

  if(idr.error)
    console.warn(
      'Institution calendar:',
      idr.error.message
    );

  if(isManager()){

    const p=
      await sb
        .from('profiles')
        .select(
          '*,departments(name),positions(title),manager:manager_id(full_name)'
        )
        .order('full_name');

    people=p.data||[];

    const d=
      await sb
        .from('departments')
        .select('*')
        .order('name');

    departments=d.data||[];

    const po=
      await sb
        .from('positions')
        .select('*')
        .order('level_no');

    positions=po.data||[];
  }

  if($('#syncState'))
    $('#syncState').textContent='● Live';
}

function setHead(k,t){

  if($('#kicker'))
    $('#kicker').textContent=k;

  if($('#title'))
    $('#title').textContent=t;
}

function shell(
  title,
  sub,
  body,
  actions=''
){

  setHead(
    'DUTYLOG AI',
    title
  );

  const main=$('#main');

  if(!main)
    return;

  main.innerHTML=`
    <div class="page-head">
      <div>
        <h2>${title}</h2>
        <p>${sub}</p>
      </div>

      <div class="actions">
        ${actions}
      </div>
    </div>

    ${body}
  `;
}

function render(){

  buildNav();

  const fn={
    dashboard,
    reports:reportsPage,
    calendar,
    generator,
    leave:leavePage,
    profile:profilePage,
    verification,
    staff:staffPage,
    institutional:institutionalPage,
    users:usersPage,
    departments:departmentPage,
    positions:positionPage,
    settings
  }[view]||dashboard;

  fn();
}

function statusBadge(s){

  const map={
    approved:'b-green',
    verified:'b-green',
    working:'b-green',
    pending:'b-orange',
    check_requested:'b-orange',
    reapply:'b-orange',
    rejected:'b-red',
    holiday:'b-blue',
    leave:'b-orange'
  };

  return`
    <span class="badge ${map[s]||'b-blue'}">
      ${esc(roleName(s))}
    </span>
  `;
}

function dashboard(){

  const totalStaff=
    people.filter(
      p=>p.active&&p.role==='staff'
    ).length;

  const submitted=
    reports.filter(
      r=>
        r.status==='working'||
        r.status==='leave'||
        r.status==='holiday'
    ).length;

  const verified=
    reports.filter(
      r=>r.verified_at
    ).length;

  const pending=
    reports.filter(
      r=>!r.verified_at
    ).length;

  if(isManager()){

    const approved=
      leaves.filter(
        l=>l.status==='approved'
      ).length;

    const absent=
      leaves.filter(
        l=>
          l.status==='approved'&&
          l.start_date<=today()&&
          l.end_date>=today()
      ).length;

    const present=
      Math.max(
        0,
        totalStaff-absent
      );

    const body=`

      <div class="grid stats">

        <div class="stat">
          <small>Total Staff</small>
          <b>${totalStaff}</b>
        </div>

        <div class="stat">
          <small>Present Today</small>
          <b>${present}</b>
        </div>

        <div class="stat">
          <small>On Leave Today</small>
          <b>${absent}</b>
        </div>

        <div class="stat">
          <small>Reports Pending</small>
          <b>${pending}</b>
        </div>

      </div>

      <div
        class="grid stats"
        style="margin-top:15px"
      >

        <div class="stat">
          <small>Reports Submitted</small>
          <b>${submitted}</b>
        </div>

        <div class="stat">
          <small>Reports Verified</small>
          <b>${verified}</b>
        </div>

        <div class="stat">
          <small>Leave Requests</small>
          <b>
            ${
              leaves.filter(
                l=>
                  l.status==='pending'||
                  l.status==='reapply'
              ).length
            }
          </b>
        </div>

        <div class="stat">
          <small>Approved Leave Records</small>
          <b>${approved}</b>
        </div>

      </div>

      <div
        class="grid two"
        style="margin-top:16px"
      >

        <section class="card">
          <h3>Recent activity</h3>
          ${reportTable(
            reports.slice(0,8),
            true
          )}
        </section>

        <section class="card">
          <h3>Pending actions</h3>
          ${managerActionSummary()}
        </section>

      </div>
    `;

    shell(
      'Dashboard',
      'Institutional overview and current staff activity',
      body,
      `
        <button
          class="primary"
          onclick="view='verification';render()"
        >
          Open Review
        </button>
      `
    );

  }else{

    const approvedToday=
      leaves.some(
        l=>
          l.status==='approved'&&
          l.start_date<=today()&&
          l.end_date>=today()
      );

    const body=`

      <div class="grid stats">

        <div class="stat">
          <small>Reports Submitted</small>
          <b>${submitted}</b>
        </div>

        <div class="stat">
          <small>Reports Verified</small>
          <b>${verified}</b>
        </div>

        <div class="stat">
          <small>Reports Pending</small>
          <b>${pending}</b>
        </div>

        <div class="stat">
          <small>Leave Status</small>
          <b>
            ${approvedToday?'Leave':'Present'}
          </b>
        </div>

      </div>

      <div
        class="grid two"
        style="margin-top:16px"
      >

        <section class="card">
          <h3>Recent reports</h3>
          ${reportTable(
            reports.slice(0,8)
          )}
        </section>

        <section class="card">
          <h3>Leave requests</h3>
          ${leaveTable(
            leaves.slice(0,5)
          )}
        </section>

      </div>
    `;

    shell(
      'Dashboard',
      'Your work, attendance and leave overview',
      body,
      `
        <button
          class="primary"
          onclick="view='generator';render()"
        >
          ＋ New Report
        </button>

        <button
          class="ghost"
          onclick="view='leave';render()"
        >
          Apply Leave
        </button>
      `
    );
  }
}

function managerActionSummary(){

  const rp=
    reports.filter(
      r=>!r.verified_at
    ).length;

  const lp=
    leaves.filter(
      l=>
        l.status==='pending'||
        l.status==='reapply'
    ).length;

  return`
    <div class="notice">
      ${rp}
      report${rp===1?'':'s'}
      awaiting review.
    </div>

    <div
      class="notice"
      style="margin-top:8px"
    >
      ${lp}
      leave request${lp===1?'':'s'}
      awaiting action.
    </div>
  `;
}

function reportTable(
  arr,
  manager=false
){

  if(!arr.length)
    return`
      <div class="empty">
        No reports found.
      </div>
    `;

  return`
    <div class="table-wrap">

      <table class="table">

        <thead>
          <tr>
            <th>Date</th>
            ${
              manager
                ?'<th>Staff</th>'
                :''
            }
            <th>Status</th>
            <th>Review</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${
            arr.map(
              r=>`

                <tr>

                  <td>
                    ${fmt(r.report_date)}
                  </td>

                  ${
                    manager
                    ?`
                      <td>
                        ${esc(
                          r.profiles?.full_name||
                          ''
                        )}
                      </td>
                    `
                    :''
                  }

                  <td>
                    ${statusBadge(r.status)}
                  </td>

                  <td>
                    ${
                      r.verified_at
                      ?statusBadge('verified')
                      :statusBadge(
                        r.review_status||
                        'pending'
                      )
                    }
                  </td>

                  <td>
                    <button
                      class="ghost"
                      onclick="openReport('${r.id}')"
                    >
                      View
                    </button>
                  </td>

                </tr>

              `
            ).join('')
          }

        </tbody>

      </table>

    </div>
  `;
}

function reportsPage(){

  shell(
    'Reports',
    'Search and review institutional reports',

    `
      <div class="card">

        <div class="actions">

          <input
            id="search"
            placeholder="Search date, notes, staff..."
            style="
              flex:1;
              min-width:220px;
              border:1px solid var(--line);
              border-radius:12px;
              padding:11px
            "
          >

          <select
            id="filter"
            style="
              border:1px solid var(--line);
              border-radius:12px;
              padding:11px
            "
          >

            <option value="">
              All
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="check_requested">
              Check requested
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="working">
              Working
            </option>

            <option value="leave">
              Leave
            </option>

            <option value="holiday">
              Holiday
            </option>

          </select>

        </div>

        <div
          id="reportList"
          style="margin-top:15px"
        >
          ${reportTable(
            reports,
            isManager()
          )}
        </div>

      </div>
    `
  );

  if($('#search'))
    $('#search').oninput=
      filterReports;

  if($('#filter'))
    $('#filter').onchange=
      filterReports;
}

function filterReports(){

  const s=
    ($('#search')?.value||'')
      .toLowerCase();

  const f=
    $('#filter')?.value||'';

  const a=
    reports.filter(
      r=>
        (
          !s||
          JSON.stringify(r)
            .toLowerCase()
            .includes(s)
        )&&
        (
          !f||
          (
            f==='verified'
              ?!!r.verified_at
              :f==='pending'
                ?(
                  !r.verified_at&&
                  (
                    r.review_status||
                    'pending'
                  )==='pending'
                )
                :f==='check_requested'
                  ?r.review_status===
                    'check_requested'
                  :r.status===f
          )
        )
    );

  if($('#reportList'))
    $('#reportList').innerHTML=
      reportTable(
        a,
        isManager()
      );
}

function generator(){

  const t=today();

  shell(
    'Report Generator',
    'Create a clear daily work record',

    `
      <div class="card">

        <form
          id="reportForm"
          class="form-grid"
        >

          <div class="field">

            <label>DATE</label>

            <input
              id="rdate"
              type="date"
              value="${t}"
            >

          </div>

          <div class="field">

            <label>STATUS</label>

            <select id="rstatus">

              <option value="working">
                Working day
              </option>

              <option value="holiday">
                Holiday
              </option>

              <option value="leave">
                Leave
              </option>

            </select>

          </div>

          <div class="field full">

            <label>KEY NOTES</label>

            <textarea
              id="notes"
              placeholder="Record duties, meetings, classes, visits, follow-ups and completed work."
            ></textarea>

          </div>

          <div class="field full">

            <label>PROFESSIONAL REPORT</label>

            <textarea
              id="generated"
              placeholder="Generate a polished report from your notes."
            ></textarea>

          </div>

          <div class="field full">

            <label>REMARKS</label>

            <input
              id="remarks"
              placeholder="Optional"
            >

          </div>

          <div class="actions full">

            <button
              type="button"
              class="ghost"
              id="gen"
            >
              Generate Draft
            </button>

            <button
              class="primary"
            >
              Save Report
            </button>

          </div>

        </form>

      </div>
    `
  );

  if($('#gen')){

    $('#gen').onclick=()=>{

      $('#generated').value=
        makeReport(
          $('#notes').value,
          $('#rdate').value,
          $('#rstatus').value
        );
    };
  }

  if($('#reportForm'))
    $('#reportForm').onsubmit=
      saveReport;
}

function makeReport(
  notes,
  date,
  status
){

  if(!notes.trim())
    return '';

  const intro=
    status==='working'
      ?`I carried out my assigned institutional duties on ${fmt(date)}. `
      :status==='leave'
        ?`I was on leave on ${fmt(date)}. `
        :`The institution observed a holiday on ${fmt(date)}. `;

  return(
    intro+
    notes
      .trim()
      .replace(/\s+/g,' ')
      .split(/(?<=[.!?])\s+/)
      .map(
        s=>
          s.charAt(0).toUpperCase()+
          s.slice(1)
      )
      .join(' ')
  );
}

async function saveReport(e){

  e.preventDefault();

  if(profile.role!=='staff')
    return toast(
      'Report submission is available to staff accounts.'
    );

  const date=$('#rdate')?.value;

  if(!date)
    return toast(
      'Select a report date.'
    );

  const institutional=
    institutionalDays.find(
      x=>
        x.day_date===date&&
        (
          x.department_id==null||
          x.department_id===profile.department_id
        )
    );

  if(
    institutional&&
    institutional.day_type==='holiday'
  ){

    return toast(
      'This date is marked as an institutional holiday and cannot be changed.'
    );
  }

  const row={
    user_id:me.id,
    report_date:date,
    status:$('#rstatus').value,
    notes:$('#notes').value,
    generated_report:$('#generated').value,
    remarks:$('#remarks').value,
    review_status:'pending',
    resubmitted_at:new Date().toISOString()
  };

  const {error}=
    await sb
      .from('reports')
      .upsert(
        row,
        {
          onConflict:
            'user_id,report_date'
        }
      );

  if(error){

    toast(error.message);

  }else{

    toast('Report saved');

    await load();

    view='reports';

    render();
  }
}

function calendar(){

  const now=new Date();

  const y=now.getFullYear();
  const m=now.getMonth();

  const days=
    new Date(
      y,
      m+1,
      0
    ).getDate();

  const start=
    new Date(
      y,
      m,
      1
    ).getDay();

  let cells='';

  for(
    let i=0;
    i<start;
    i++
  ){

    cells+='<div></div>';
  }

  for(
    let d=1;
    d<=days;
    d++
  ){

    const k=
      `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const r=
      reports.find(
        x=>x.report_date===k
      );

    const lv=
      leaves.find(
        x=>
          x.start_date<=k&&
          x.end_date>=k
      );

    const inst=
      institutionalDays.find(
        x=>
          x.day_date===k&&
          (
            x.department_id==null||
            x.department_id===
              profile.department_id
          )
      );

    let label=
      r
        ?(
          r.verified_at
            ?'Verified'
            :roleName(
              r.review_status||
              r.status
            )
        )
        :lv
          ?roleName(lv.status)
          :inst
            ?`${roleName(inst.day_type)} · ${inst.title}`
            :'No entry';

    cells+=`

      <button
        class="card"
        style="
          min-height:76px;
          padding:10px;
          text-align:left
        "
        onclick="calendarDay('${k}')"
      >

        <b>${d}</b>

        <small
          style="
            display:block;
            margin-top:8px;
            color:${
              inst?.day_type==='holiday'
                ?'var(--accent)'
                :lv
                  ?'var(--warning)'
                  :'var(--muted)'
            }
          "
        >
          ${esc(label)}
        </small>

      </button>

    `;
  }

  shell(
    'Calendar',
    'Work, reports, leave and institutional dates',

    `
      <div class="card">

        <h3>
          ${now.toLocaleDateString(
            undefined,
            {
              month:'long',
              year:'numeric'
            }
          )}
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(7,1fr);
            gap:8px;
            margin-top:12px
          "
        >
          ${cells}
        </div>

      </div>
    `
  );
}

function calendarDay(date){

  const r=
    reports.find(
      x=>x.report_date===date
    );

  const lv=
    leaves.find(
      x=>
        x.start_date<=date&&
        x.end_date>=date
    );

  const inst=
    institutionalDays.find(
      x=>
        x.day_date===date&&
        (
          x.department_id==null||
          x.department_id===
            profile.department_id
        )
    );

  $('#modalBack')?.classList.remove(
    'hidden'
  );

  const modal=$('#modal');

  if(!modal)
    return;

  modal.innerHTML=`

    <div class="modal-head">

      <div>

        <h2>${fmt(date)}</h2>

        <small>
          ${INSTITUTION}
        </small>

      </div>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    ${
      inst
      ?`
        <div class="notice">

          ${statusBadge(inst.day_type)}

          <b>
            ${esc(inst.title)}
          </b>

          ${
            inst.departments?.name
              ?` · ${esc(inst.departments.name)}`
              :''
          }

        </div>
      `
      :''
    }

    ${
      lv
      ?`
        <div
          class="notice"
          style="margin-top:10px"
        >
          Leave:
          ${statusBadge(lv.status)}
          ·
          ${esc(lv.leave_type)}
          <br>
          ${esc(lv.reason)}
        </div>
      `
      :''
    }

    ${
      r
      ?`
        <div
          class="actions"
          style="margin-top:14px"
        >
          <button
            class="primary"
            onclick="
              closeModal();
              openReport('${r.id}')
            "
          >
            Open Report
          </button>
        </div>
      `
      :
      (
        !inst&&!lv
          ?`
            <div
              class="actions"
              style="margin-top:14px"
            >
              <button
                class="primary"
                onclick="
                  closeModal();
                  view='generator';
                  render()
                "
              >
                Create Report
              </button>
            </div>
          `
          :''
      )
    }

  `;
}

function verification(){

  const pending=
    reports.filter(
      r=>!r.verified_at
    );

  shell(
    'Report Review',
    'Review submitted reports and return records for clarification',

    `
      <section class="card">

        <h3>
          Pending review ·
          ${pending.length}
        </h3>

        ${
          pending.length
          ?`
            <div class="table-wrap">

              <table class="table">

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Review</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  ${
                    pending.map(
                      r=>`

                        <tr>

                          <td>
                            ${fmt(r.report_date)}
                          </td>

                          <td>
                            ${esc(
                              r.profiles?.full_name||
                              ''
                            )}
                          </td>

                          <td>
                            ${esc(
                              departments.find(
                                d=>
                                  d.id===
                                  r.profiles?.department_id
                              )?.name||
                              '—'
                            )}
                          </td>

                          <td>
                            ${statusBadge(r.status)}
                          </td>

                          <td>
                            ${statusBadge(
                              r.review_status||
                              'pending'
                            )}
                          </td>

                          <td class="actions">

                            <button
                              class="ghost"
                              onclick="
                                openReport('${r.id}')
                              "
                            >
                              View
                            </button>

                            <button
                              class="primary"
                              onclick="
                                reviewReport(
                                  '${r.id}',
                                  'verify'
                                )
                              "
                            >
                              Verify
                            </button>

                            <button
                              class="ghost"
                              onclick="
                                reviewReport(
                                  '${r.id}',
                                  'request_check'
                                )
                              "
                            >
                              Request Check
                            </button>

                          </td>

                        </tr>

                      `
                    ).join('')
                  }

                </tbody>

              </table>

            </div>
          `
          :`
            <div class="empty">
              All submitted reports have been reviewed.
            </div>
          `
        }

      </section>
    `
  );
}

async function reviewReport(
  id,
  action
){

  const remarks=
    prompt(
      action==='verify'
        ?'Remarks (optional):'
        :'What should be checked or corrected?'
    );

  if(
    action==='request_check'&&
    !remarks?.trim()
  ){

    return toast(
      'Add a note for the staff member.'
    );
  }

  const {error}=
    await sb.rpc(
      'review_report',
      {
        p_report_id:id,
        p_action:action,
        p_remarks:remarks||null
      }
    );

  if(error){

    toast(error.message);

  }else{

    toast(
      action==='verify'
        ?'Report verified'
        :'Check request sent'
    );

    await load();

    render();
  }
}

function staffPage(){

  const rows=
    people.map(
      p=>`

        <tr>

          <td>
            <b>
              ${esc(p.full_name)}
            </b>

            <br>

            <small>
              ${esc(p.email||'')}
            </small>
          </td>

          <td>
            ${roleName(p.role)}
          </td>

          <td>
            ${esc(
              p.departments?.name||
              '—'
            )}
          </td>

          <td>
            ${esc(
              p.positions?.title||
              '—'
            )}
          </td>

          <td>
            ${esc(p.phone||'—')}
          </td>

          <td>
            ${
              p.profile_completed
                ?'Complete'
                :'Incomplete'
            }
          </td>

          <td>

            <button
              class="ghost"
              onclick="
                viewStaff('${p.id}')
              "
            >
              View
            </button>

          </td>

        </tr>

      `
    ).join('');

  shell(
    'Staff Directory',
    'Institutional staff records and contact information',

    `
      <div class="card">

        <div class="table-wrap">

          <table class="table">

            <thead>

              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Department</th>
                <th>Position</th>
                <th>Phone</th>
                <th>Profile</th>
                <th></th>
              </tr>

            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

        </div>

      </div>
    `
  );
}

function viewStaff(id){

  const p=
    people.find(
      x=>x.id===id
    );

  if(!p)
    return;

  $('#modalBack')?.classList.remove(
    'hidden'
  );

  const modal=$('#modal');

  if(!modal)
    return;

  modal.innerHTML=`

    <div class="modal-head">

      <div>

        <h2>
          ${esc(p.full_name)}
        </h2>

        <small>
          ${roleName(p.role)}
        </small>

      </div>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    <article class="report-paper">

      <p>
        <b>Employee Code:</b>
        ${esc(p.employee_code||'—')}
      </p>

      <p>
        <b>Email:</b>
        ${esc(p.email||'—')}
      </p>

      <p>
        <b>Phone:</b>
        ${esc(p.phone||'—')}
      </p>

      <p>
        <b>Address:</b>
        ${esc(p.address||'—')}
      </p>

      <p>
        <b>Department:</b>
        ${esc(p.departments?.name||'—')}
      </p>

      <p>
        <b>Position:</b>
        ${esc(p.positions?.title||'—')}
      </p>

      <p>
        <b>Joining Date:</b>
        ${fmt(p.joining_date)}
      </p>

      <p>
        <b>Emergency Contact:</b>
        ${esc(p.emergency_contact||'—')}
        ${
          p.emergency_phone
            ?' · '+esc(p.emergency_phone)
            :''
        }
      </p>

    </article>

    <div
      class="actions"
      style="margin-top:14px"
    >

      <button
        class="primary"
        onclick="
          exportStaffPDF('${id}')
        "
      >
        Export PDF
      </button>

    </div>
  `;
}

function institutionalPage(){

  const rows=
    institutionalDays.map(
      d=>`

        <tr>

          <td>
            ${fmt(d.day_date)}
          </td>

          <td>
            ${statusBadge(d.day_type)}
          </td>

          <td>
            ${esc(d.title)}
          </td>

          <td>
            ${esc(
              d.departments?.name||
              'All Departments'
            )}
          </td>

          <td>
            ${esc(d.notes||'')}
          </td>

          <td>

            <button
              class="danger"
              onclick="
                deleteInstitutionalDay(
                  '${d.id}'
                )
              "
            >
              Delete
            </button>

          </td>

        </tr>
      `
    ).join('');

  shell(
    'Institution Calendar',
    'Set institution-wide or department-specific working and holiday dates',

    `
      <div class="grid two">

        <section class="card">

          <h3>
            Add calendar date
          </h3>

          <div class="form-grid">

            <div class="field">

              <label>DATE</label>

              <input
                id="id_date"
                type="date"
                value="${today()}"
              >

            </div>

            <div class="field">

              <label>TYPE</label>

              <select id="id_type">

                <option value="working">
                  Working Day
                </option>

                <option value="holiday">
                  Holiday
                </option>

              </select>

            </div>

            <div class="field full">

              <label>TITLE</label>

              <input
                id="id_title"
                placeholder="e.g. Special working day"
              >

            </div>

            <div class="field">

              <label>DEPARTMENT</label>

              <select id="id_dep">

                <option value="">
                  All Departments
                </option>

                ${
                  departments.map(
                    d=>`
                      <option
                        value="${d.id}"
                      >
                        ${esc(d.name)}
                      </option>
                    `
                  ).join('')
                }

              </select>

            </div>

            <div class="field">

              <label>NOTES</label>

              <input
                id="id_notes"
                placeholder="Optional"
              >

            </div>

          </div>

          <button
            class="primary"
            style="margin-top:14px"
            onclick="
              saveInstitutionalDay()
            "
          >
            Save Date
          </button>

        </section>

        <section class="card">

          <h3>
            Calendar policy
          </h3>

          <p class="muted">
            Dates defined here are applied
            to the selected department or to
            the whole institution. Staff
            cannot override an institutional
            holiday.
          </p>

        </section>

      </div>

      <section
        class="card"
        style="margin-top:16px"
      >

        <h3>
          Defined dates
        </h3>

        <div class="table-wrap">

          <table class="table">

            <thead>

              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Title</th>
                <th>Department</th>
                <th>Notes</th>
                <th></th>
              </tr>

            </thead>

            <tbody>

              ${
                rows||
                `
                  <tr>
                    <td colspan="6">
                      No institutional dates configured.
                    </td>
                  </tr>
                `
              }

            </tbody>

          </table>

        </div>

      </section>
    `
  );
}

async function saveInstitutionalDay(){

  const row={

    day_date:
      $('#id_date')?.value,

    day_type:
      $('#id_type')?.value,

    title:
      $('#id_title')?.value.trim(),

    department_id:
      $('#id_dep')?.value||
      null,

    notes:
      $('#id_notes')?.value.trim()||
      null,

    set_by:
      me.id
  };

  if(
    !row.day_date||
    !row.title
  ){

    return toast(
      'Enter a date and title'
    );
  }

  const {error}=
    await sb
      .from('institutional_days')
      .upsert(
        row,
        {
          onConflict:
            'day_date,department_id'
        }
      );

  if(error){

    toast(error.message);

  }else{

    toast(
      'Institutional date saved'
    );

    await load();

    render();
  }
}

async function deleteInstitutionalDay(id){

  if(
    !confirm(
      'Remove this institutional date?'
    )
  )
    return;

  const {error}=
    await sb
      .from('institutional_days')
      .delete()
      .eq('id',id);

  if(error){

    toast(error.message);

  }else{

    await load();
    render();
  }
}

function leavePage(){

  const mine=leaves;

  const managerPending=
    isManager()
      ?mine.filter(
        x=>
          x.status==='pending'||
          x.status==='reapply'
      )
      :[];

  let form='';

  if(profile.role==='staff'){

    form=`

      <section class="card">

        <h3>
          Apply for Leave
        </h3>

        <form
          id="leaveForm"
          class="form-grid"
        >

          <div class="field">

            <label>LEAVE TYPE</label>

            <select id="l_type">

              <option>
                Casual Leave
              </option>

              <option>
                Medical Leave
              </option>

              <option>
                Emergency Leave
              </option>

              <option>
                Personal Leave
              </option>

              <option>
                Other
              </option>

            </select>

          </div>

          <div class="field">

            <label>FROM</label>

            <input
              id="l_from"
              type="date"
              value="${today()}"
            >

          </div>

          <div class="field">

            <label>TO</label>

            <input
              id="l_to"
              type="date"
              value="${today()}"
            >

          </div>

          <div class="field full">

            <label>
              DETAILED REASON
            </label>

            <textarea
              id="l_reason"
              placeholder="Explain the reason for your leave request."
            ></textarea>

          </div>

          <div class="field full">

            <label>
              ATTACHMENT
            </label>

            <input
              id="l_file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            >

          </div>

          <div class="actions full">

            <button
              class="primary"
            >
              Submit Leave Request
            </button>

          </div>

        </form>

      </section>
    `;
  }

  const body=
    form+

    `
      <section
        class="card"
        style="margin-top:16px"
      >

        <h3>
          ${
            isManager()
              ?'Leave Register'
              :'Leave History'
          }
        </h3>

        ${leaveTable(
          mine,
          true
        )}

      </section>
    `+

    (
      isManager()
      ?`
        <section
          class="card"
          style="margin-top:16px"
        >

          <h3>
            Pending decisions ·
            ${managerPending.length}
          </h3>

          ${
            leaveTable(
              managerPending,
              true,
              true
            )
          }

        </section>
      `
      :''
    );

  shell(
    'Leave Management',
    isManager()
      ?'Review leave requests and maintain the leave register.'
      :'Apply for leave, track decisions and maintain your leave history.',
    body
  );

  if(profile.role==='staff'&&$('#leaveForm'))
    $('#leaveForm').onsubmit=
      submitLeave;
}

function leaveTable(
  arr,
  showActions=false,
  managerActions=false
){

  if(!arr.length)
    return`
      <div class="empty">
        No leave records found.
      </div>
    `;

  return`

    <div class="table-wrap">

      <table class="table">

        <thead>

          <tr>

            <th>Period</th>

            ${
              isManager()
                ?'<th>Staff</th>'
                :''
            }

            <th>Type</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Remarks</th>
            <th>Actions</th>

          </tr>

        </thead>

        <tbody>

          ${
            arr.map(
              l=>`

                <tr>

                  <td>
                    ${fmt(l.start_date)}
                    –
                    ${fmt(l.end_date)}
                  </td>

                  ${
                    isManager()
                    ?`
                      <td>
                        ${esc(
                          l.profiles?.full_name||
                          ''
                        )}
                      </td>
                    `
                    :''
                  }

                  <td>
                    ${esc(
                      l.leave_type
                    )}
                  </td>

                  <td
                    style="
                      white-space:normal;
                      min-width:220px
                    "
                  >
                    ${esc(l.reason)}
                  </td>

                  <td>
                    ${statusBadge(
                      l.status
                    )}
                  </td>

                  <td
                    style="
                      white-space:normal
                    "
                  >
                    ${esc(
                      l.reviewer_remarks||
                      l.review_remarks||
                      ''
                    )}
                  </td>

                  <td class="actions">

                    ${
                      managerActions
                      ?`

                        <button
                          class="primary"
                          onclick="
                            reviewLeave(
                              '${l.id}',
                              'approved'
                            )
                          "
                        >
                          Approve
                        </button>

                        <button
                          class="danger"
                          onclick="
                            reviewLeave(
                              '${l.id}',
                              'rejected'
                            )
                          "
                        >
                          Reject
                        </button>

                        <button
                          class="ghost"
                          onclick="
                            reviewLeave(
                              '${l.id}',
                              'reapply'
                            )
                          "
                        >
                          Reapply
                        </button>

                      `
                      :
                      showActions&&
                      [
                        'pending',
                        'reapply'
                      ].includes(l.status)
                      ?`

                        <button
                          class="ghost"
                          onclick="
                            editLeave(
                              '${l.id}'
                            )
                          "
                        >
                          Edit
                        </button>

                        <button
                          class="danger"
                          onclick="
                            deleteLeave(
                              '${l.id}'
                            )
                          "
                        >
                          Delete
                        </button>

                      `
                      :
                      (
                        l.attachment_path
                          ?`
                            <button
                              class="ghost"
                              onclick="
                                downloadAttachment(
                                  '${esc(
                                    l.attachment_path
                                  )}'
                                )
                              "
                            >
                              File
                            </button>
                          `
                          :''
                      )
                    }

                  </td>

                </tr>

              `
            ).join('')
          }

        </tbody>

      </table>

    </div>
  `;
}

async function submitLeave(e){

  e.preventDefault();

  const a=$('#l_from')?.value;
  const b=$('#l_to')?.value;
  const reason=
    $('#l_reason')?.value.trim();

  if(
    !a||
    !b||
    a>b||
    !reason
  ){

    return toast(
      'Complete the leave dates and reason'
    );
  }

  let path=null;

  const f=
    $('#l_file')?.files?.[0];

  if(f){

    path=
      await uploadFile(
        f,
        `leave/${me.id}/${crypto.randomUUID()}-${f.name}`
      );

    if(!path)
      return;
  }

  const {error}=
    await sb
      .from('leave_requests')
      .insert({

        user_id:me.id,

        leave_type:
          $('#l_type').value,

        start_date:a,

        end_date:b,

        reason,

        attachment_path:path,

        status:'pending'
      });

  if(error){

    toast(error.message);

  }else{

    toast(
      'Leave request submitted'
    );

    await load();

    render();
  }
}

async function uploadFile(
  file,
  path
){

  const {error}=
    await sb
      .storage
      .from('dutylog-private')
      .upload(
        path,
        file,
        {
          upsert:false
        }
      );

  if(error){

    toast(error.message);
    return null;
  }

  return path;
}

async function downloadAttachment(
  path
){

  const {
    data,
    error
  }=
    await sb
      .storage
      .from('dutylog-private')
      .createSignedUrl(
        path,
        600
      );

  if(error)
    toast(error.message);
  else
    window.open(
      data.signedUrl,
      '_blank'
    );
}

async function reviewLeave(
  id,
  action
){

  let remarks=
    prompt(
      action==='approved'
        ?'Approval remarks (optional):'
        :action==='rejected'
          ?'Reason for rejection:'
          :'What should be updated before resubmission?'
    );

  if(
    (
      action==='rejected'||
      action==='reapply'
    )&&
    !remarks?.trim()
  ){

    return toast(
      'Add a remark.'
    );
  }

  const {error}=
    await sb.rpc(
      'review_leave',
      {
        p_leave_id:id,
        p_action:action,
        p_remarks:
          remarks||null
      }
    );

  if(error){

    toast(error.message);

  }else{

    toast(
      'Leave request updated'
    );

    await load();

    render();
  }
}

function editLeave(id){

  const l=
    leaves.find(
      x=>x.id===id
    );

  if(!l)
    return;

  $('#modalBack')?.classList.remove(
    'hidden'
  );

  const modal=$('#modal');

  if(!modal)
    return;

  modal.innerHTML=`

    <div class="modal-head">

      <h2>
        Edit Leave Request
      </h2>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    <form
      id="editLeaveForm"
      class="form-grid"
    >

      <div class="field">

        <label>TYPE</label>

        <input
          id="el_type"
          value="${esc(l.leave_type)}"
        >

      </div>

      <div class="field">

        <label>FROM</label>

        <input
          id="el_from"
          type="date"
          value="${l.start_date}"
        >

      </div>

      <div class="field">

        <label>TO</label>

        <input
          id="el_to"
          type="date"
          value="${l.end_date}"
        >

      </div>

      <div class="field full">

        <label>REASON</label>

        <textarea
          id="el_reason"
        >${esc(l.reason)}</textarea>

      </div>

      <div class="actions full">

        <button class="primary">
          Save & Reapply
        </button>

      </div>

    </form>
  `;

  $('#editLeaveForm').onsubmit=
    async e=>{

      e.preventDefault();

      const from=
        $('#el_from').value;

      const to=
        $('#el_to').value;

      if(
        !from||
        !to||
        from>to
      ){

        return toast(
          'Check the leave dates.'
        );
      }

      const {error}=
        await sb
          .from('leave_requests')
          .update({

            leave_type:
              $('#el_type').value,

            start_date:from,

            end_date:to,

            reason:
              $('#el_reason').value,

            status:'pending',

            reviewer_remarks:null,

            review_remarks:null,

            reviewed_by:null,

            reviewed_at:null,

            updated_at:
              new Date().toISOString()

          })
          .eq('id',id);

      if(error){

        toast(error.message);

      }else{

        toast(
          'Leave request updated'
        );

        closeModal();

        await load();

        render();
      }
    };
}

async function deleteLeave(id){

  if(
    !confirm(
      'Delete this leave request?'
    )
  )
    return;

  const {error}=
    await sb
      .from('leave_requests')
      .delete()
      .eq('id',id);

  if(error)
    toast(error.message);
  else{

    await load();
    render();
  }
}

function profilePage(){

  const p=profile;

  shell(
    'My Profile',
    'Maintain your institutional staff record',

    `
      <div class="grid two">

        <section class="card">

          <h3>
            Personal information
          </h3>

          <form
            id="profileForm"
            class="form-grid"
          >

            <div class="field">

              <label>FULL NAME</label>

              <input
                id="p_name"
                value="${esc(
                  p.full_name||''
                )}"
              >

            </div>

            <div class="field">

              <label>PHONE</label>

              <input
                id="p_phone"
                value="${esc(
                  p.phone||''
                )}"
              >

            </div>

            <div class="field full">

              <label>ADDRESS</label>

              <textarea
                id="p_address"
              >${esc(
                p.address||''
              )}</textarea>

            </div>

            <div class="field">

              <label>
                EMPLOYEE CODE
              </label>

              <input
                id="p_code"
                value="${esc(
                  p.employee_code||''
                )}"
              >

            </div>

            <div class="field">

              <label>
                JOINING DATE
              </label>

              <input
                id="p_joining"
                type="date"
                value="${p.joining_date||''}"
              >

            </div>

            <div class="field">

              <label>
                EMERGENCY CONTACT
              </label>

              <input
                id="p_ec"
                value="${esc(
                  p.emergency_contact||''
                )}"
              >

            </div>

            <div class="field">

              <label>
                EMERGENCY PHONE
              </label>

              <input
                id="p_ep"
                value="${esc(
                  p.emergency_phone||''
                )}"
              >

            </div>

            <div class="field full">

              <label>
                PHOTO
              </label>

              <input
                id="p_photo"
                type="file"
                accept="image/*"
              >

            </div>

            <div class="actions full">

              <button class="primary">
                Save Profile
              </button>

              <button
                type="button"
                class="ghost"
                onclick="
                  exportProfilePDF()
                "
              >
                Export PDF
              </button>

            </div>

          </form>

        </section>

        <section class="card">

          <h3>
            Institutional record
          </h3>

          <div class="notice">

            <b>
              ${esc(
                p.email||me.email
              )}
            </b>

            <br>

            ${roleName(p.role)}

            <br>

            ${esc(
              p.departments?.name||
              'Department not assigned'
            )}

            <br>

            ${esc(
              p.positions?.title||
              'Position not assigned'
            )}

          </div>

          ${
            p.profile_completed
              ?''
              :`
                <div
                  class="notice"
                  style="margin-top:10px"
                >
                  Complete your name,
                  phone, address and photo
                  to finish your staff profile.
                </div>
              `
          }

        </section>

      </div>
    `
  );

  if($('#profileForm'))
    $('#profileForm').onsubmit=
      saveProfile;
}

async function saveProfile(e){

  e.preventDefault();

  let photo=
    profile.photo_url;

  const f=
    $('#p_photo')?.files?.[0];

  if(f){

    photo=
      await uploadFile(
        f,
        `profiles/${me.id}/${crypto.randomUUID()}-${f.name}`
      );

    if(!photo)
      return;
  }

  const payload={

    full_name:
      $('#p_name').value.trim(),

    phone:
      $('#p_phone').value.trim(),

    address:
      $('#p_address').value.trim(),

    employee_code:
      $('#p_code').value.trim()||
      null,

    joining_date:
      $('#p_joining').value||
      null,

    emergency_contact:
      $('#p_ec').value.trim()||
      null,

    emergency_phone:
      $('#p_ep').value.trim()||
      null,

    photo_url:photo,

    profile_completed:
      !!(
        $('#p_name').value.trim()&&
        $('#p_phone').value.trim()&&
        $('#p_address').value.trim()
      )

  };

  const {
    data,
    error
  }=
    await sb
      .from('profiles')
      .update(payload)
      .eq('id',me.id)
      .select(
        '*,departments(name),positions(title),manager:manager_id(full_name)'
      )
      .single();

  if(error){

    toast(error.message);

  }else{

    profile=data;

    if($('#sideName'))
      $('#sideName').textContent=
        profile.full_name;

    if($('#sideAvatar'))
      $('#sideAvatar').textContent=
        initials(
          profile.full_name
        );

    toast(
      'Profile updated'
    );

    view='dashboard';

    await load();

    render();
  }
}

function usersPage(){

  const rows=
    people.map(
      p=>`

        <tr>

          <td>

            <b>
              ${esc(p.full_name)}
            </b>

            <br>

            <small>
              ${esc(p.email||'')}
            </small>

          </td>

          <td>
            ${roleName(p.role)}
          </td>

          <td>
            ${esc(
              p.departments?.name||
              '—'
            )}
          </td>

          <td>
            ${esc(
              p.positions?.title||
              '—'
            )}
          </td>

          <td>
            ${
              p.profile_completed
                ?'Complete'
                :'Incomplete'
            }
          </td>

          <td>
            ${
              p.active
                ?'Active'
                :'Inactive'
            }
          </td>

          <td>

            <button
              class="ghost"
              onclick="
                editUser('${p.id}')
              "
            >
              Manage
            </button>

          </td>

        </tr>

      `
    ).join('');

  shell(
    'Users',
    'Manage institutional accounts and access',

    `
      <div class="grid two">

        <section class="card">

          <h3>
            Invite User
          </h3>

          <div class="form-grid">

            <div class="field">

              <label>NAME</label>

              <input id="u_name">

            </div>

            <div class="field">

              <label>EMAIL</label>

              <input
                id="u_email"
                type="email"
              >

            </div>

            <div class="field">

              <label>ROLE</label>

              <select id="u_role">

                <option value="staff">
                  Staff
                </option>

                <option value="joint_director">
                  Joint Director
                </option>

                <option value="admin">
                  Admin
                </option>

              </select>

            </div>

            <div class="field">

              <label>
                DEPARTMENT
              </label>

              <select id="u_dep">

                <option value="">
                  Not assigned
                </option>

                ${
                  departments.map(
                    d=>`
                      <option
                        value="${d.id}"
                      >
                        ${esc(d.name)}
                      </option>
                    `
                  ).join('')
                }

              </select>

            </div>

            <div class="field">

              <label>
                POSITION
              </label>

              <select id="u_pos">

                <option value="">
                  Not assigned
                </option>

                ${
                  positions.map(
                    p=>`
                      <option
                        value="${p.id}"
                      >
                        ${esc(p.title)}
                      </option>
                    `
                  ).join('')
                }

              </select>

            </div>

            <div class="field">

              <label>
                REPORTS UNDER
              </label>

              <select id="u_mgr">

                <option value="">
                  Top level
                </option>

                ${
                  people
                    .filter(
                      p=>p.active
                    )
                    .map(
                      p=>`
                        <option
                          value="${p.id}"
                        >
                          ${esc(p.full_name)}
                        </option>
                      `
                    ).join('')
                }

              </select>

            </div>

          </div>

          <button
            class="primary"
            style="margin-top:14px"
            onclick="
              inviteUser()
            "
          >
            Send Invitation
          </button>

        </section>

        <section class="card">

          <h3>
            Account overview
          </h3>

          <p class="muted">
            Roles, departments, positions
            and reporting lines are managed
            centrally.
          </p>

        </section>

      </div>

      <section
        class="card"
        style="margin-top:16px"
      >

        <h3>
          All Users
        </h3>

        <div class="table-wrap">

          <table class="table">

            <thead>

              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Position</th>
                <th>Profile</th>
                <th>Status</th>
                <th></th>
              </tr>

            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

        </div>

      </section>
    `
  );
}

async function inviteUser(){

  const email=
    $('#u_email')?.value.trim();

  const name=
    $('#u_name')?.value.trim();

  if(!email||!name)
    return toast(
      'Enter the name and email'
    );

  const {
    data,
    error
  }=
    await sb.functions.invoke(
      'admin-users',
      {
        body:{
          email,
          full_name:name,
          role:$('#u_role').value,
          department_id:
            $('#u_dep').value||
            null,
          position_id:
            $('#u_pos').value||
            null,
          manager_id:
            $('#u_mgr').value||
            null
        }
      }
    );

  if(error){

    toast(error.message);

  }else if(data?.error){

    toast(data.error);

  }else{

    toast(
      'Invitation sent'
    );

    await load();

    render();
  }
}

function editUser(id){

  const p=
    people.find(
      x=>x.id===id
    );

  if(!p)
    return;

  $('#modalBack')?.classList.remove(
    'hidden'
  );

  const modal=$('#modal');

  if(!modal)
    return;

  modal.innerHTML=`

    <div class="modal-head">

      <h2>
        Manage User
      </h2>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    <div class="form-grid">

      <div class="field">

        <label>NAME</label>

        <input
          id="e_name"
          value="${esc(p.full_name)}"
        >

      </div>

      <div class="field">

        <label>ROLE</label>

        <select id="e_role">

          <option value="staff">
            Staff
          </option>

          <option value="joint_director">
            Joint Director
          </option>

          <option value="admin">
            Admin
          </option>

        </select>

      </div>

      <div class="field">

        <label>
          DEPARTMENT
        </label>

        <select id="e_dep">

          <option value="">
            Not assigned
          </option>

          ${
            departments.map(
              d=>`
                <option
                  value="${d.id}"
                  ${
                    p.department_id===d.id
                      ?'selected'
                      :''
                  }
                >
                  ${esc(d.name)}
                </option>
              `
            ).join('')
          }

        </select>

      </div>

      <div class="field">

        <label>
          POSITION
        </label>

        <select id="e_pos">

          <option value="">
            Not assigned
          </option>

          ${
            positions.map(
              x=>`
                <option
                  value="${x.id}"
                  ${
                    p.position_id===x.id
                      ?'selected'
                      :''
                  }
                >
                  ${esc(x.title)}
                </option>
              `
            ).join('')
          }

        </select>

      </div>

      <div class="field">

        <label>
          REPORTS UNDER
        </label>

        <select id="e_mgr">

          <option value="">
            Top level
          </option>

          ${
            people
              .filter(
                x=>x.id!==p.id
              )
              .map(
                x=>`
                  <option
                    value="${x.id}"
                    ${
                      p.manager_id===x.id
                        ?'selected'
                        :''
                    }
                  >
                    ${esc(x.full_name)}
                  </option>
                `
              ).join('')
          }

        </select>

      </div>

      <div class="field">

        <label>STATUS</label>

        <select id="e_active">

          <option
            value="true"
            ${
              p.active
                ?'selected'
                :''
            }
          >
            Active
          </option>

          <option
            value="false"
            ${
              !p.active
                ?'selected'
                :''
            }
          >
            Inactive
          </option>

        </select>

      </div>

    </div>

    <div
      class="actions"
      style="margin-top:16px"
    >

      <button
        class="primary"
        onclick="
          saveUser('${id}')
        "
      >
        Save Changes
      </button>

    </div>
  `;

  $('#e_role').value=
    p.role;
}

async function saveUser(id){

  const {error}=
    await sb
      .from('profiles')
      .update({

        full_name:
          $('#e_name').value.trim(),

        role:
          $('#e_role').value,

        department_id:
          $('#e_dep').value||
          null,

        position_id:
          $('#e_pos').value||
          null,

        manager_id:
          $('#e_mgr').value||
          null,

        active:
          $('#e_active').value===
          'true'

      })
      .eq('id',id);

  if(error){

    toast(error.message);

  }else{

    closeModal();

    await load();

    render();

    toast(
      'User updated'
    );
  }
}

function departmentPage(){

  shell(
    'Departments',
    'Manage institutional departments',

    `
      <div class="card">

        <div class="actions">

          <input
            id="dn"
            placeholder="Department name"
            style="
              flex:1;
              border:1px solid var(--line);
              border-radius:12px;
              padding:11px
            "
          >

          <button
            class="primary"
            onclick="
              addDepartment()
            "
          >
            Add Department
          </button>

        </div>

        <div
          class="chips"
          style="margin-top:16px"
        >

          ${
            departments.map(
              d=>`
                <span class="chip">
                  ${esc(d.name)}
                </span>
              `
            ).join('')
          }

        </div>

      </div>
    `
  );
}

async function addDepartment(){

  const n=
    $('#dn')?.value.trim();

  if(!n)
    return toast(
      'Enter a department name.'
    );

  const {error}=
    await sb
      .from('departments')
      .insert({
        name:n
      });

  if(error){

    toast(error.message);

  }else{

    toast(
      'Department added'
    );

    await load();

    render();
  }
}

function positionPage(){

  shell(
    'Positions',
    'Manage institutional positions',

    `
      <div class="card">

        <div class="actions">

          <input
            id="pn"
            placeholder="Position title"
            style="
              flex:1;
              border:1px solid var(--line);
              border-radius:12px;
              padding:11px
            "
          >

          <input
            id="pl"
            type="number"
            min="1"
            value="1"
            style="
              width:90px;
              border:1px solid var(--line);
              border-radius:12px;
              padding:11px
            "
          >

          <button
            class="primary"
            onclick="
              addPosition()
            "
          >
            Add Position
          </button>

        </div>

        <div
          class="chips"
          style="margin-top:16px"
        >

          ${
            positions.map(
              p=>`
                <span class="chip">
                  ${esc(p.title)}
                  · L${p.level_no}
                </span>
              `
            ).join('')
          }

        </div>

      </div>
    `
  );
}

async function addPosition(){

  const n=
    $('#pn')?.value.trim();

  if(!n)
    return toast(
      'Enter a position title.'
    );

  const {error}=
    await sb
      .from('positions')
      .insert({

        title:n,

        level_no:
          +($('#pl')?.value)||1

      });

  if(error){

    toast(error.message);

  }else{

    toast(
      'Position added'
    );

    await load();

    render();
  }
}

function settings(){

  shell(
    'Settings',
    'Application and account preferences',

    `
      <div class="grid two">

        <section class="card">

          <h3>
            Institution
          </h3>

          <div class="notice">

            <b>
              ${INSTITUTION}
            </b>

            <br>

            DUTYLOG AI

            <br>

            Institutional Work Journal

          </div>

        </section>

        <section class="card">

          <h3>
            Account
          </h3>

          <div class="notice">

            ${esc(
              profile.email||
              me.email
            )}

            <br>

            ${roleName(
              profile.role
            )}

          </div>

        </section>

      </div>
    `
  );
}
async function openReport(id){

  const r=
    reports.find(
      x=>x.id===id
    );

  if(!r){

    toast(
      'Report not found.'
    );

    return;
  }

  const canEdit=
    profile.role==='staff'&&
    r.user_id===me.id&&
    !r.verified_at&&
    [
      'pending',
      'check_requested'
    ].includes(
      r.review_status||
      'pending'
    );

  $('#modalBack')?.classList.remove(
    'hidden'
  );

  const modal=$('#modal');

  if(!modal)
    return;

  modal.innerHTML=`

    <div class="modal-head">

      <div>

        <h2>
          Daily Duty Report
        </h2>

        <small>

          ${fmt(r.report_date)}

          ·

          ${esc(
            r.profiles?.full_name||
            profile.full_name||
            ''
          )}

        </small>

      </div>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    ${
      r.review_status===
      'check_requested'
      ?`
        <div
          class="notice"
          style="margin-bottom:12px"
        >

          <b>
            Review request
          </b>

          <br>

          ${esc(
            r.review_remarks||
            'Please review and resubmit.'
          )}

        </div>
      `
      :''
    }

    <article
      id="paper"
      class="report-paper"
    >

      <h1>
        DAILY DUTY REPORT
      </h1>

      <div class="meta">

        ${INSTITUTION}

        ·

        ${fmt(r.report_date)}

      </div>

      <p>

        <b>Staff:</b>

        ${esc(
          r.profiles?.full_name||
          profile.full_name
        )}

      </p>

      <p>

        <b>Status:</b>

        ${esc(
          roleName(r.status)
        )}

      </p>

      <p>

        ${esc(
          r.generated_report||
          r.notes||
          'No report text'
        )}

      </p>

      ${
        r.remarks
        ?`
          <p>

            <b>
              Remarks:
            </b>

            ${esc(r.remarks)}

          </p>
        `
        :''
      }

      <hr>

      <p
        style="
          font-size:12px;
          color:#6d7890
        "
      >

        Review:

        ${
          r.verified_at
            ?'Verified'
            :roleName(
              r.review_status||
              'pending'
            )
        }

      </p>

    </article>

    <div
      class="actions"
      style="margin-top:15px"
    >

      <button
        class="ghost"
        onclick="
          exportPDF('${id}')
        "
      >
        PDF
      </button>

      <button
        class="ghost"
        onclick="
          exportDOCX('${id}')
        "
      >
        DOCX
      </button>

      ${
        isManager()&&!r.verified_at
        ?`

          <button
            class="primary"
            onclick="
              closeModal();
              reviewReport(
                '${id}',
                'verify'
              )
            "
          >
            Verify
          </button>

          <button
            class="ghost"
            onclick="
              closeModal();
              reviewReport(
                '${id}',
                'request_check'
              )
            "
          >
            Request Check
          </button>

        `
        :''
      }

      ${
        canEdit
        ?`

          <button
            class="ghost"
            onclick="
              closeModal();
              view='generator';
              render()
            "
          >
            Edit / Resubmit
          </button>

          <button
            class="danger"
            onclick="
              deleteReport('${id}')
            "
          >
            Delete
          </button>

        `
        :''
      }

    </div>
  `;
}

function closeModal(){

  const back=$('#modalBack');

  if(back)
    back.classList.add(
      'hidden'
    );

  const modal=$('#modal');

  if(modal)
    modal.innerHTML='';
}

async function deleteReport(id){

  if(
    !confirm(
      'Delete this report?'
    )
  )
    return;

  const {error}=
    await sb
      .from('reports')
      .delete()
      .eq('id',id)
      .eq('user_id',me.id);

  if(error){

    toast(error.message);

  }else{

    closeModal();

    await load();

    render();

    toast(
      'Report deleted'
    );
  }
}

function exportPDF(id){

  const r=
    reports.find(
      x=>x.id===id
    );

  if(!r)
    return toast(
      'Report not found.'
    );

  if(!window.jspdf)
    return toast(
      'PDF library is not loaded.'
    );

  const {
    jsPDF
  }=window.jspdf;

  const doc=
    new jsPDF({
      format:'a4',
      unit:'mm'
    });

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(16);

  doc.text(
    'DAILY DUTY REPORT',
    105,
    22,
    {
      align:'center'
    }
  );

  doc.setFontSize(10);

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    INSTITUTION,
    105,
    29,
    {
      align:'center'
    }
  );

  let y=42;

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Staff:',
    20,
    y
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    r.profiles?.full_name||
    profile.full_name||
    '',
    38,
    y
  );

  y+=8;

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Date:',
    20,
    y
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    fmt(r.report_date),
    38,
    y
  );

  y+=12;

  const text=
    r.generated_report||
    r.notes||
    '';

  const lines=
    doc.splitTextToSize(
      text,
      170
    );

  doc.text(
    lines,
    20,
    y
  );

  y+=
    lines.length*6+
    8;

  if(r.remarks){

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Remarks:',
      20,
      y
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    const remarks=
      doc.splitTextToSize(
        r.remarks,
        145
      );

    doc.text(
      remarks,
      42,
      y
    );
  }

  doc.save(
    `DUTYLOG_${r.report_date}.pdf`
  );
}

async function exportDOCX(id){

  const r=
    reports.find(
      x=>x.id===id
    );

  if(!r)
    return toast(
      'Report not found.'
    );

  if(!window.docx)
    return toast(
      'DOCX library is not loaded.'
    );

  const D=window.docx;

  const children=[

    new D.Paragraph({
      text:
        'DAILY DUTY REPORT',
      heading:
        D.HeadingLevel.TITLE,
      alignment:
        D.AlignmentType.CENTER
    }),

    new D.Paragraph({
      text:
        INSTITUTION,
      alignment:
        D.AlignmentType.CENTER
    }),

    new D.Paragraph({
      text:
        `Staff: ${
          r.profiles?.full_name||
          profile.full_name||
          ''
        }`
    }),

    new D.Paragraph({
      text:
        `Date: ${
          fmt(r.report_date)
        }`
    }),

    new D.Paragraph({
      text:
        r.generated_report||
        r.notes||
        ''
    })

  ];

  if(r.remarks){

    children.push(
      new D.Paragraph({
        text:
          `Remarks: ${
            r.remarks
          }`
      })
    );
  }

  const blob=
    await D.Packer.toBlob(
      new D.Document({
        sections:[
          {
            children
          }
        ]
      })
    );

  const a=
    document.createElement(
      'a'
    );

  a.href=
    URL.createObjectURL(
      blob
    );

  a.download=
    `DUTYLOG_${r.report_date}.docx`;

  a.click();

  setTimeout(
    ()=>{
      URL.revokeObjectURL(
        a.href
      );
    },
    1000
  );
}

function exportStaffPDF(id){

  const p=
    people.find(
      x=>x.id===id
    );

  if(!p)
    return toast(
      'Staff record not found.'
    );

  if(!window.jspdf)
    return toast(
      'PDF library is not loaded.'
    );

  const {
    jsPDF
  }=window.jspdf;

  const doc=
    new jsPDF({
      format:'a4',
      unit:'mm'
    });

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(18);

  doc.text(
    INSTITUTION,
    105,
    22,
    {
      align:'center'
    }
  );

  doc.setFontSize(14);

  doc.text(
    'STAFF PROFILE',
    105,
    32,
    {
      align:'center'
    }
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(11);

  let y=50;

  [
    [
      'Name',
      p.full_name
    ],
    [
      'Employee Code',
      p.employee_code||'—'
    ],
    [
      'Email',
      p.email||'—'
    ],
    [
      'Phone',
      p.phone||'—'
    ],
    [
      'Address',
      p.address||'—'
    ],
    [
      'Department',
      p.departments?.name||'—'
    ],
    [
      'Position',
      p.positions?.title||'—'
    ],
    [
      'Joining Date',
      fmt(p.joining_date)
    ],
    [
      'Emergency Contact',
      `${p.emergency_contact||'—'} ${
        p.emergency_phone||''
      }`
    ]
  ].forEach(
    ([k,v])=>{

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        `${k}:`,
        20,
        y
      );

      doc.setFont(
        'helvetica',
        'normal'
      );

      const lines=
        doc.splitTextToSize(
          String(v),
          145
        );

      doc.text(
        lines,
        55,
        y
      );

      y+=
        Math.max(
          10,
          lines.length*6
        );
    }
  );

  doc.save(
    `STAFF_${
      String(
        p.full_name
      ).replace(
        /\s+/g,
        '_'
      )
    }.pdf`
  );
}

function exportProfilePDF(){

  if(!profile)
    return;

  if(!window.jspdf)
    return toast(
      'PDF library is not loaded.'
    );

  const p=profile;

  const {
    jsPDF
  }=window.jspdf;

  const doc=
    new jsPDF({
      format:'a4',
      unit:'mm'
    });

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(18);

  doc.text(
    INSTITUTION,
    105,
    22,
    {
      align:'center'
    }
  );

  doc.setFontSize(14);

  doc.text(
    'STAFF PROFILE',
    105,
    32,
    {
      align:'center'
    }
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  let y=50;

  [
    [
      'Name',
      p.full_name
    ],
    [
      'Email',
      p.email||me.email
    ],
    [
      'Phone',
      p.phone||'—'
    ],
    [
      'Address',
      p.address||'—'
    ],
    [
      'Employee Code',
      p.employee_code||'—'
    ],
    [
      'Joining Date',
      fmt(p.joining_date)
    ],
    [
      'Emergency Contact',
      `${p.emergency_contact||'—'} ${
        p.emergency_phone||''
      }`
    ]
  ].forEach(
    ([k,v])=>{

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        `${k}:`,
        20,
        y
      );

      doc.setFont(
        'helvetica',
        'normal'
      );

      const lines=
        doc.splitTextToSize(
          String(v),
          145
        );

      doc.text(
        lines,
        55,
        y
      );

      y+=
        Math.max(
          10,
          lines.length*6
        );
    }
  );

  doc.save(
    'DUTYLOG_Staff_Profile.pdf'
  );
}


/* =========================================================
   GLOBAL FUNCTION EXPORTS
   ========================================================= */

window.closeModal=
  closeModal;

window.openReport=
  openReport;

window.exportPDF=
  exportPDF;

window.exportDOCX=
  exportDOCX;

window.exportStaffPDF=
  exportStaffPDF;

window.exportProfilePDF=
  exportProfilePDF;

window.deleteReport=
  deleteReport;

window.addDepartment=
  addDepartment;

window.addPosition=
  addPosition;

window.verifyReport=
  reviewReport;

window.reviewReport=
  reviewReport;

window.reviewLeave=
  reviewLeave;

window.editLeave=
  editLeave;

window.deleteLeave=
  deleteLeave;

window.downloadAttachment=
  downloadAttachment;

window.inviteUser=
  inviteUser;

window.editUser=
  editUser;

window.saveUser=
  saveUser;

window.saveInstitutionalDay=
  saveInstitutionalDay;

window.deleteInstitutionalDay=
  deleteInstitutionalDay;

window.calendarDay=
  calendarDay;

window.viewStaff=
  viewStaff;


/* =========================================================
   START APPLICATION
   ========================================================= */

init();