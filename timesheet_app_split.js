// timesheet_app.js

let currentWeek = null;
let currentDay = null;
const app = document.getElementById('app');
const overlay = document.getElementById('formOverlay');
const logsPage = document.getElementById('logsPage');
const sigCanvas = document.getElementById('sigPad');
const sigPad = new SignaturePad(sigCanvas,{backgroundColor:'rgba(255,255,255,0)'});

let timesheets = JSON.parse(localStorage.getItem('weeklyTimesheets') || '{}');
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

function saveStorage(){localStorage.setItem('weeklyTimesheets',JSON.stringify(timesheets));}

function showStart(){
  logsPage.style.display='none';
  app.style.display='flex';
}

function totalHours(week){
  if(!timesheets[week]) return 0;
  return Object.values(timesheets[week]).reduce((acc,e)=>acc+(e.hoursCustomer||0)+(e.hoursCg||0),0);
}

function showWeeks(){
  const totalWeek1 = totalHours('week1');
  const totalWeek2 = totalHours('week2');
  app.innerHTML=`<div class="center">
    <div>Total Hours Combined: ${totalWeek1+totalWeek2}</div>
    <button class="week-btn" id="week1Btn">Week 1\n(${totalWeek1} hrs)</button>
    <button class="week-btn" id="week2Btn">Week 2\n(${totalWeek2} hrs)</button>
    <button id="doneWeeks">Done</button>
  </div>`;
  document.getElementById('week1Btn').onclick=()=>showGrid('week1');
  document.getElementById('week2Btn').onclick=()=>showGrid('week2');
  document.getElementById('doneWeeks').onclick=showStart;
}

function showGrid(week){
  currentWeek = week;
  let gridHTML = '<div class="grid">';
  for(const d of days){
    const dayHours = timesheets[week]&&timesheets[week][d]? timesheets[week][d].hoursCustomer+timesheets[week][d].hoursCg:0;
    gridHTML+=`<div class="day-btn" data-day="${d}">${d}\n(${dayHours} hrs)</div>`;
  }
  gridHTML+='</div><div class="center"><button id="exportPdf">Export PDF</button><button id="backWeeks">Back</button></div>';
  app.innerHTML=gridHTML;
  document.querySelectorAll('.day-btn').forEach(b=>b.onclick=()=>editDay(b.dataset.day));
  document.getElementById('exportPdf').onclick=()=>exportPDF(currentWeek);
  document.getElementById('backWeeks').onclick=showWeeks;
}

function editDay(day){
  currentDay = day;
  overlay.style.display='flex';
  const entry = timesheets[currentWeek]&&timesheets[currentWeek][day]?timesheets[currentWeek][day]:{};
  document.getElementById('date').value = entry.date || '';
  document.getElementById('address').value = entry.address || '';
  document.getElementById('jobType').value = entry.jobType || '';
  document.getElementById('hoursCustomer').value = entry.hoursCustomer || '';
  document.getElementById('hoursCg').value = entry.hoursCg || '';
  document.getElementById('paymentMethod').value = entry.paymentMethod || 'Cash';
  document.getElementById('billingSent').value = entry.billingSent || 'No';
  sigPad.clear();
  if(entry.signature){
    const img=new Image();
    img.src=entry.signature;
    img.onload=()=>{sigPad.clear();sigCanvas.getContext('2d').drawImage(img,0,0,sigCanvas.width,sigCanvas.height);}
  };
}

document.getElementById('backBtn').onclick=()=>{overlay.style.display='none';};

document.getElementById('saveDay').onclick=()=>{
  if(!timesheets[currentWeek]) timesheets[currentWeek]={};
  timesheets[currentWeek][currentDay]={
    date:document.getElementById('date').value,
    address:document.getElementById('address').value,
    jobType:document.getElementById('jobType').value,
    hoursCustomer:parseFloat(document.getElementById('hoursCustomer').value)||0,
    hoursCg:parseFloat(document.getElementById('hoursCg').value)||0,
    paymentMethod:document.getElementById('paymentMethod').value,
    billingSent:document.getElementById('billingSent').value,
    signature:sigPad.isEmpty()?null:sigPad.toDataURL('image/png')
  };
  saveStorage();
  overlay.style.display='none';
  showGrid(currentWeek);
};

function exportPDF(week){
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y=10;
  const weekEntries = timesheets[week]||{};
  for(const d of days){
    const e = weekEntries[d];
    if(e){
      pdf.setFontSize(12);
      pdf.text(`${d}: ${e.date}`,10,y); y+=6;
      pdf.text(`Address: ${e.address}`,10,y); y+=6;
      pdf.text(`Job Type: ${e.jobType}`,10,y); y+=6;
      pdf.text(`Hours Customer: ${e.hoursCustomer}`,10,y); y+=6;
      pdf.text(`Hours CGYAIR: ${e.hoursCg}`,10,y); y+=6;
      pdf.text(`Payment Method: ${e.paymentMethod}`,10,y); y+=6;
      pdf.text(`Billing Sent: ${e.billingSent}`,10,y); y+=6;
      if(e.signature){
        const imgProps = pdf.getImageProperties(e.signature);
        pdf.addImage(e.signature,'PNG',10,y,100,60); y+=65;
      }
      y+=4;
    }
  }
  pdf.setFontSize(14);
  pdf.text(`Total hours ${week}: ${totalHours(week)}`,10,y); y+=10;
  pdf.text(`Combined Total Hours: ${totalHours('week1')+totalHours('week2')}`,10,y);
  pdf.save(`${week}_timesheet.pdf`);
}

showStart();

document.getElementById('createTimesheet').onclick=showWeeks;
document.getElementById('viewLogs').onclick=()=>{
  app.style.display='none';
  logsPage.style.display='flex';
  showLogs();
};

function showLogs(){
  const logsMonths = document.getElementById('logsMonths');
  const logsList = document.getElementById('logsList');
  logsMonths.innerHTML='';
  logsList.innerHTML='';
  const months = {};
  Object.keys(timesheets).forEach(week=>{
    Object.values(timesheets[week]).forEach(entry=>{
      if(entry.date){
        const m = new Date(entry.date).toLocaleString('default',{month:'long', year:'numeric'});
        if(!months[m]) months[m]=[];
        months[m].push(entry);
      }
    });
  });
  for(const m of Object.keys(months)){
    const div = document.createElement('div');
    div.textContent=m;
    div.onclick=()=>{
      logsList.innerHTML='';
      months[m].forEach(e=>{
        const ldiv=document.createElement('div');
        ldiv.textContent=`${e.date} - ${e.jobType} - ${e.hoursCustomer+e.hoursCg} hrs`;
        logsList.appendChild(ldiv);
      });
    };
    logsMonths.appendChild(div);
  }
}
