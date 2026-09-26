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


function closeModal(){

  const modalBack =
    document.getElementById('modalBack');

  if(modalBack){
    modalBack.classList.add('hidden');
  }

  const modal =
    document.getElementById('modal');

  if(modal){
    modal.innerHTML='';
  }
}
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

init();