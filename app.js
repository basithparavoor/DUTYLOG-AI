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
            ${
              approvedToday
              ?'Leave'
              :'Present'
            }
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

  return `

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
    return `
      <div class="empty">
        No reports found.
      </div>
    `;

  return `

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
                          r.profiles?.full_name||''
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
                        r.review_status||'pending'
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

          </select>

        </div>

        <div
          id="reportResults"
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

  const update=()=>{

    const q=
      ($('#search')?.value||'')
      .toLowerCase();

    const f=
      $('#filter')?.value||'';

    const filtered=
      reports.filter(
        r=>{

          const text=`
            ${r.report_date}
            ${r.notes||''}
            ${r.generated_report||''}
            ${r.profiles?.full_name||''}
          `.toLowerCase();

          const matchesText=
            !q||text.includes(q);

          const status=
            r.verified_at
            ?'verified'
            :(r.review_status||'pending');

          const matchesFilter=
            !f||status===f;

          return (
            matchesText&&
            matchesFilter
          );
        }
      );

    $('#reportResults').innerHTML=
      reportTable(
        filtered,
        isManager()
      );
  };

  $('#search').oninput=update;
  $('#filter').onchange=update;
}

function exportStaffPDF(id){

  const p=
    people.find(
      x=>x.id===id
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
    ['Name',p.full_name],
    ['Employee Code',p.employee_code||'—'],
    ['Email',p.email||'—'],
    ['Phone',p.phone||'—'],
    ['Address',p.address||'—'],
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

      doc.text(
        doc.splitTextToSize(
          String(v),
          145
        ),
        55,
        y
      );

      y+=10;
    }
  );

  doc.save(
    `STAFF_${
      String(p.full_name)
        .replace(/\s+/g,'_')
    }.pdf`
  );
}

function exportProfilePDF(){

  if(!profile)
    return;

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
    ['Name',p.full_name],
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

      doc.text(
        doc.splitTextToSize(
          String(v),
          145
        ),
        55,
        y
      );

      y+=10;
    }
  );

  doc.save(
    'DUTYLOG_Staff_Profile.pdf'
  );
}


/* =========================================================
   DUTYLOG AI — GLOBAL FUNCTIONS & MODAL SYSTEM
   ========================================================= */

function closeModal(){

  const back =
    document.getElementById('modalBack');

  const modal =
    document.getElementById('modal');

  if(back)
    back.classList.add('hidden');

  if(modal)
    modal.innerHTML='';
}


/* =========================================================
   REPORT VIEW
   ========================================================= */

function openReport(id){

  const r =
    reports.find(x => x.id === id);

  if(!r){
    toast('Report not found.');
    return;
  }

  const back =
    document.getElementById('modalBack');

  const modal =
    document.getElementById('modal');

  if(!back || !modal)
    return;

  back.classList.remove('hidden');

  modal.innerHTML = `

    <div class="modal-head">

      <div>
        <h2>Daily Duty Report</h2>

        <small>
          ${fmt(r.report_date)}
          ·
          ${esc(
            r.profiles?.full_name ||
            profile?.full_name ||
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
      r.review_status === 'check_requested'
      ? `
        <div class="notice">

          <b>Review Requested</b>

          <br>

          ${esc(
            r.review_remarks ||
            'Please review and resubmit this report.'
          )}

        </div>
      `
      : ''
    }

    <article
      id="paper"
      class="report-paper"
    >

      <h1>DAILY DUTY REPORT</h1>

      <div class="meta">
        ${esc(INSTITUTION)}
        ·
        ${fmt(r.report_date)}
      </div>

      <p>
        <b>Staff:</b>
        ${esc(
          r.profiles?.full_name ||
          profile?.full_name ||
          ''
        )}
      </p>

      <p>
        <b>Status:</b>
        ${esc(roleName(r.status))}
      </p>

      <div class="report-content">
        ${esc(
          r.generated_report ||
          r.notes ||
          'No report content available.'
        ).replace(/\n/g,'<br>')}
      </div>

      ${
        r.remarks
        ? `
          <p>
            <b>Remarks:</b>
            ${esc(r.remarks)}
          </p>
        `
        : ''
      }

      <hr>

      <p class="report-review">

        <b>Review Status:</b>

        ${
          r.verified_at
          ? 'Verified'
          : roleName(
              r.review_status ||
              'pending'
            )
        }

      </p>

    </article>

    <div
      class="actions"
      style="margin-top:16px"
    >

      <button
        class="ghost"
        onclick="exportPDF('${r.id}')"
      >
        Export PDF
      </button>

      <button
        class="ghost"
        onclick="exportDOCX('${r.id}')"
      >
        Export DOCX
      </button>

      ${
        isManager() && !r.verified_at
        ? `
          <button
            class="primary"
            onclick="
              reviewReport(
                '${r.id}',
                'verify'
              )
            "
          >
            ✓ Verify
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
        `
        : ''
      }

      ${
        !isManager() &&
        r.user_id === me?.id &&
        !r.verified_at &&
        (
          r.review_status === 'pending' ||
          r.review_status === 'check_requested' ||
          !r.review_status
        )
        ? `
          <button
            class="ghost"
            onclick="
              closeModal();
              view='generator';
              render();
            "
          >
            Edit / Resubmit
          </button>

          <button
            class="danger"
            onclick="
              deleteReport('${r.id}')
            "
          >
            Delete
          </button>
        `
        : ''
      }

    </div>
  `;
}


/* =========================================================
   REPORT REVIEW
   ========================================================= */

async function reviewReport(
  id,
  action
){

  const r =
    reports.find(x => x.id === id);

  if(!r){
    toast('Report not found.');
    return;
  }

  if(action === 'verify'){

    const {error} =
      await sb
        .from('reports')
        .update({
          verified_at:
            new Date().toISOString(),

          verified_by:
            me.id,

          review_status:
            'verified'
        })
        .eq('id',id);

    if(error){
      toast(error.message);
      return;
    }

    closeModal();

    toast(
      'Report verified successfully.'
    );
  }

  if(action === 'request_check'){

    const remarks =
      prompt(
        'Enter the instructions for the staff member:'
      );

    if(remarks === null)
      return;

    const {error} =
      await sb
        .from('reports')
        .update({
          review_status:
            'check_requested',

          review_remarks:
            remarks,

          verified_at:
            null,

          verified_by:
            null
        })
        .eq('id',id);

    if(error){
      toast(error.message);
      return;
    }

    closeModal();

    toast(
      'Check request sent to staff.'
    );
  }

  await load();
  render();
}


/* =========================================================
   DELETE REPORT
   ========================================================= */

async function deleteReport(id){

  if(
    !confirm(
      'Are you sure you want to delete this report?'
    )
  )
    return;

  const {error} =
    await sb
      .from('reports')
      .delete()
      .eq('id',id)
      .eq('user_id',me.id);

  if(error){
    toast(error.message);
    return;
  }

  closeModal();

  await load();

  toast(
    'Report deleted successfully.'
  );

  render();
}


/* =========================================================
   DEPARTMENTS
   ========================================================= */

async function addDepartment(){

  const input =
    document.getElementById('dn');

  const name =
    input?.value.trim();

  if(!name){
    toast('Enter a department name.');
    return;
  }

  const {error} =
    await sb
      .from('departments')
      .insert({
        name
      });

  if(error){
    toast(error.message);
    return;
  }

  toast(
    'Department added successfully.'
  );

  await load();

  render();
}


/* =========================================================
   POSITIONS
   ========================================================= */

async function addPosition(){

  const name =
    document.getElementById('pn')
      ?.value.trim();

  const level =
    Number(
      document.getElementById('pl')
        ?.value || 1
    );

  if(!name){
    toast('Enter a position title.');
    return;
  }

  const {error} =
    await sb
      .from('positions')
      .insert({
        title:name,
        level_no:level
      });

  if(error){
    toast(error.message);
    return;
  }

  toast(
    'Position added successfully.'
  );

  await load();

  render();
}


/* =========================================================
   LEAVE REVIEW
   ========================================================= */

async function reviewLeave(id){

  const l =
    leaves.find(x => x.id === id);

  if(!l){
    toast('Leave request not found.');
    return;
  }

  const back =
    document.getElementById('modalBack');

  const modal =
    document.getElementById('modal');

  back.classList.remove('hidden');

  modal.innerHTML = `

    <div class="modal-head">

      <div>

        <h2>Leave Request</h2>

        <small>
          ${fmt(l.start_date)}
          –
          ${fmt(l.end_date)}
        </small>

      </div>

      <button
        class="ghost"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

    <div class="notice">

      <b>
        ${esc(
          l.profiles?.full_name ||
          'Staff Member'
        )}
      </b>

      <br><br>

      <b>Leave Type:</b>
      ${esc(
        roleName(
          l.leave_type ||
          'Leave'
        )
      )}

      <br><br>

      <b>Reason:</b>

      <br>

      ${esc(
        l.reason ||
        l.leave_reason ||
        'No reason provided.'
      )}

    </div>

    <div class="field">

      <label>REVIEW REMARKS</label>

      <textarea
        id="leaveRemarks"
        rows="5"
        placeholder="Add remarks or instructions..."
      >${esc(
        l.review_remarks || ''
      )}</textarea>

    </div>

    <div class="actions">

      <button
        class="primary"
        onclick="
          processLeave(
            '${l.id}',
            'approved'
          )
        "
      >
        ✓ Approve
      </button>

      <button
        class="danger"
        onclick="
          processLeave(
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
          processLeave(
            '${l.id}',
            'reapply'
          )
        "
      >
        Request Reapply
      </button>

    </div>

  `;
}


/* =========================================================
   LEAVE PROCESSING
   ========================================================= */

async function processLeave(
  id,
  status
){

  const remarks =
    document.getElementById(
      'leaveRemarks'
    )?.value.trim() || null;

  const {error} =
    await sb
      .from('leave_requests')
      .update({

        status,

        review_remarks:
          remarks,

        reviewed_by:
          me.id,

        reviewed_at:
          new Date().toISOString()

      })
      .eq('id',id);

  if(error){
    toast(error.message);
    return;
  }

  closeModal();

  toast(
    status === 'approved'
      ? 'Leave approved.'
      : status === 'rejected'
        ? 'Leave rejected.'
        : 'Reapply request sent.'
  );

  await load();

  render();
}


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.closeModal =
  closeModal;

window.openReport =
  openReport;

window.exportPDF =
  typeof exportPDF === 'function'
    ? exportPDF
    : function(){
        toast(
          'PDF export is not available.'
        );
      };

window.exportDOCX =
  typeof exportDOCX === 'function'
    ? exportDOCX
    : function(){
        toast(
          'DOCX export is not available.'
        );
      };

window.exportStaffPDF =
  typeof exportStaffPDF === 'function'
    ? exportStaffPDF
    : function(){
        toast(
          'Staff PDF export is not available.'
        );
      };

window.exportProfilePDF =
  typeof exportProfilePDF === 'function'
    ? exportProfilePDF
    : function(){
        toast(
          'Profile PDF export is not available.'
        );
      };

window.deleteReport =
  deleteReport;

window.addDepartment =
  addDepartment;

window.addPosition =
  addPosition;

window.reviewReport =
  reviewReport;

window.verifyReport =
  reviewReport;

window.reviewLeave =
  reviewLeave;

window.processLeave =
  processLeave;

window.editLeave =
  typeof editLeave === 'function'
    ? editLeave
    : function(){
        toast(
          'Leave editing is not available.'
        );
      };

window.deleteLeave =
  typeof deleteLeave === 'function'
    ? deleteLeave
    : function(){
        toast(
          'Leave deletion is not available.'
        );
      };

window.downloadAttachment =
  typeof downloadAttachment === 'function'
    ? downloadAttachment
    : function(){
        toast(
          'Attachment download is not available.'
        );
      };

window.inviteUser =
  typeof inviteUser === 'function'
    ? inviteUser
    : function(){
        toast(
          'User invitation is not available.'
        );
      };

window.editUser =
  typeof editUser === 'function'
    ? editUser
    : function(){
        toast(
          'User management is not available.'
        );
      };

window.saveUser =
  typeof saveUser === 'function'
    ? saveUser
    : function(){
        toast(
          'User management is not available.'
        );
      };

window.saveInstitutionalDay =
  typeof saveInstitutionalDay === 'function'
    ? saveInstitutionalDay
    : function(){
        toast(
          'Institution calendar is not available.'
        );
      };

window.deleteInstitutionalDay =
  typeof deleteInstitutionalDay === 'function'
    ? deleteInstitutionalDay
    : function(){
        toast(
          'Institution calendar is not available.'
        );
      };

window.calendarDay =
  typeof calendarDay === 'function'
    ? calendarDay
    : function(){
        toast(
          'Calendar details are not available.'
        );
      };

window.viewStaff =
  typeof viewStaff === 'function'
    ? viewStaff
    : function(){
        toast(
          'Staff details are not available.'
        );
      };

      /* =========================================================
   DUTYLOG AI — APPLICATION INITIALIZATION
   ========================================================= */

async function init(){

  try{

    /* -----------------------------------------
       Google Login
       ----------------------------------------- */

    const googleBtn =
      document.getElementById('googleBtn');

    if(googleBtn){

      googleBtn.onclick = async () => {

        const {
          error
        } = await sb.auth.signInWithOAuth({

          provider:'google',

          options:{
            redirectTo:
              window.location.origin +
              window.location.pathname
          }

        });

        if(error)
          toast(
            'Google sign-in failed: ' +
            error.message
          );
      };
    }


    /* -----------------------------------------
       Sign Out
       ----------------------------------------- */

    const signout =
      document.getElementById('signout');

    if(signout){

      signout.onclick = async () => {

        const {
          error
        } = await sb.auth.signOut();

        if(error)
          toast(error.message);

      };
    }


    /* -----------------------------------------
       Mobile Menu
       ----------------------------------------- */

    const menu =
      document.getElementById('menu');

    if(menu){

      menu.onclick = () => {

        const sidebar =
          document.getElementById('sidebar');

        if(sidebar)
          sidebar.classList.toggle('open');

      };

    }


    /* -----------------------------------------
       Theme
       ----------------------------------------- */

    applyTheme();


    const themeToggle =
      document.getElementById(
        'themeToggle'
      );

    if(themeToggle){

      themeToggle.onclick =
        toggleTheme;

    }


    /* -----------------------------------------
       Check Existing Session
       ----------------------------------------- */

    const {
      data:{
        session
      }
    } =
      await sb.auth.getSession();


    if(session){

      await enter(session);

    }
    else{

      const authView =
        document.getElementById(
          'authView'
        );

      const app =
        document.getElementById(
          'app'
        );

      if(authView)
        authView.classList.remove(
          'hidden'
        );

      if(app)
        app.classList.add(
          'hidden'
        );

    }


    /* -----------------------------------------
       Authentication State Listener
       ----------------------------------------- */

    sb.auth.onAuthStateChange(
      async (
        event,
        session
      ) => {

        if(
          event === 'SIGNED_IN' &&
          session
        ){

          await enter(session);

        }

        if(
          event === 'SIGNED_OUT'
        ){

          window.location.reload();

        }

      }
    );


  }catch(error){

    console.error(
      'DUTYLOG initialization error:',
      error
    );

    toast(
      'Application initialization failed: ' +
      error.message
    );

  }

}

init();