/* ============================================
   YAHA COOPERATIVE DASHBOARD — app.js
   ============================================ */

// ---- DATA ----
const TARGETS = {
  q1: { asset:1672833, profit:355499, member:27.75, share:341500, loan:5416667, deposit:975833, active:60, app:30, npl:25, npl2:40, collect:60, satso:20 },
  q2: { asset:3345666, profit:710999, member:55.5,  share:683000, loan:10833333, deposit:1951667, active:60, app:30, npl:25, npl2:40, collect:60, satso:20 },
  q3: { asset:5018498, profit:1066498, member:83.25, share:1024500, loan:16250000, deposit:2927500, active:60, app:30, npl:25, npl2:40, collect:60, satso:20 }
};

const DEFAULT_ACTUALS = {
  q1: { asset:-708833, profit:-1330092, member:32, share:398900, loan:4846032, deposit:-2289560, active:29.8, app:20.4, npl:5.7, npl2:0.4, collect:13.3, satso:12.2 },
  q2: { asset:-918153, profit:-948953,  member:38, share:514470, loan:8276556,  deposit:-3579150, active:29.8, app:20.4, npl:5.9, npl2:0.4, collect:25.0, satso:12.2 },
  q3: { asset:-1009996,profit:-721329,  member:32, share:653820, loan:12340670, deposit:-4383682, active:29.8, app:21.3, npl:6.1, npl2:0.4, collect:32.2, satso:12.2 }
};

let actuals = JSON.parse(JSON.stringify(DEFAULT_ACTUALS));
let dashQ = 1;
let inputQ = 1;
let cmpChart = null;
let kpiChart = null;
let nplChart = null;

const PERIODS = { 1:'ต.ค. — ธ.ค.', 2:'ม.ค. — มี.ค.', 3:'เม.ย. — มิ.ย.' };
const LABELS = {
  asset:'สินทรัพย์รวม', profit:'ผลกำไร', member:'สมาชิกเพิ่ม (คน)',
  share:'มูลค่าหุ้น', loan:'ปล่อยสินเชื่อ', deposit:'เงินรับฝาก',
  active:'สมาชิกเคลื่อนไหว', app:'ใช้งาน App', npl:'NPL (บาท)',
  npl2:'NPL (ราย)', collect:'จัดเก็บหนี้', satso:'สมาชิก สต.สอ.'
};

// ---- HELPERS ----
function fmt(v, isPercent) {
  if (isPercent) return v.toFixed(1) + '%';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return sign + (abs/1e6).toFixed(2) + 'M฿';
  if (abs >= 1e3) return sign + Math.round(abs/1e3) + 'K฿';
  return Math.round(v) + '฿';
}

function isGood(key, val, tgt) {
  // For NPL: lower is better
  if (key === 'npl' || key === 'npl2') return val <= tgt;
  return val >= tgt;
}

function badgeHTML(good) {
  if (good) return '<span class="progress-badge badge-green">เกินเป้า</span>';
  return '<span class="progress-badge badge-red">ต่ำกว่าเป้า</span>';
}

// ---- NAVIGATION ----
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'npl') renderNPLChart();
}

// ---- QUARTER SELECT ----
function setDashQ(q, btn) {
  dashQ = q;
  document.getElementById('sidebar-q').textContent = q;
  document.querySelectorAll('#dash-qtabs .qtab').forEach((b, i) => {
    b.classList.toggle('active', i + 1 === q);
  });
  renderDashboard();
}

function setInputQ(q) {
  inputQ = q;
  [1,2,3].forEach(i => {
    document.getElementById('iq'+i).classList.toggle('active', i === q);
  });
  loadInputForm();
}

// ---- RENDER DASHBOARD ----
function renderDashboard() {
  const qk = 'q' + dashQ;
  const d  = actuals[qk];
  const tg = TARGETS[qk];

  // Metric cards
  const cardKeys = [
    { k:'asset',  label:'สินทรัพย์รวม',    isP:false },
    { k:'profit', label:'ผลกำไร',           isP:false },
    { k:'member', label:'สมาชิกเพิ่ม (คน)', isP:false },
    { k:'share',  label:'มูลค่าหุ้นเพิ่ม', isP:false }
  ];

  document.getElementById('metrics-grid').innerHTML = cardKeys.map(c => {
    const good = isGood(c.k, d[c.k], tg[c.k]);
    const cls  = good ? 'up' : 'down';
    return `<div class="metric-card">
      <div class="metric-label">${c.label}</div>
      <div class="metric-value ${cls}">${fmt(d[c.k], c.isP)}</div>
      <div class="metric-sub ${cls}">เป้า: ${fmt(tg[c.k], c.isP)} ${good ? '▲' : '▼'}</div>
    </div>`;
  }).join('');

  // Comparison bar chart
  const cmpLabels = ['สินทรัพย์', 'กำไร', 'สินเชื่อ', 'เงินฝาก'];
  const cmpActual = [d.asset, d.profit, d.loan, d.deposit];
  const cmpTarget = [tg.asset, tg.profit, tg.loan, tg.deposit];

  if (cmpChart) cmpChart.destroy();
  cmpChart = new Chart(document.getElementById('cmpChart'), {
    type: 'bar',
    data: {
      labels: cmpLabels,
      datasets: [
        { label:'ผลจริง', data:cmpActual, backgroundColor:'#2563eb', borderRadius:4, barPercentage:.45 },
        { label:'เป้า',   data:cmpTarget, backgroundColor:'#e5e7eb', borderRadius:4, barPercentage:.45 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx => ctx.dataset.label + ': ' + fmt(ctx.parsed.y, false) } } },
      scales:{
        x:{ grid:{display:false}, ticks:{font:{size:11}, color:'#9ca3af'} },
        y:{ grid:{color:'rgba(0,0,0,0.05)'}, ticks:{ font:{size:10}, color:'#9ca3af',
          callback: v => {
            const a = Math.abs(v);
            const s = v < 0 ? '-' : '';
            if(a>=1e6) return s+(a/1e6).toFixed(1)+'M';
            if(a>=1e3) return s+(a/1e3).toFixed(0)+'K';
            return v;
          }
        }}
      }
    }
  });

  // KPI summary donut-style bar chart (over/under per quarter)
  const overUnder = [1,2,3].map(q => {
    const qa = actuals['q'+q];
    const qt = TARGETS['q'+q];
    let over=0, under=0;
    Object.keys(qt).forEach(k => {
      if (isGood(k, qa[k], qt[k])) over++; else under++;
    });
    return { over, under };
  });

  if (kpiChart) kpiChart.destroy();
  kpiChart = new Chart(document.getElementById('kpiChart'), {
    type: 'bar',
    data: {
      labels: ['Q1','Q2','Q3'],
      datasets: [
        { label:'เกินเป้า',    data: overUnder.map(x=>x.over),  backgroundColor:'#16a34a', borderRadius:4 },
        { label:'ต่ำกว่าเป้า', data: overUnder.map(x=>x.under), backgroundColor:'#dc2626', borderRadius:4 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:{display:false}, ticks:{font:{size:11}, color:'#9ca3af'} },
        y:{ grid:{color:'rgba(0,0,0,0.05)'}, ticks:{font:{size:11}, color:'#9ca3af', stepSize:1}, max:12 }
      }
    }
  });

  // Progress bars for member KPIs
  const progKeys = [
    { k:'active',  label:'สมาชิกเคลื่อนไหว', tgt:60  },
    { k:'app',     label:'ใช้งาน App',         tgt:30  },
    { k:'collect', label:'จัดเก็บหนี้',        tgt:60  },
    { k:'satso',   label:'สมาชิก สต.สอ.',      tgt:20  },
    { k:'npl',     label:'NPL (บาท) — ต่ำดี',  tgt:25, invert:true }
  ];

  document.getElementById('progress-list').innerHTML = progKeys.map(p => {
    const val  = d[p.k] || 0;
    const pct  = Math.min(100, (Math.abs(val) / p.tgt) * 100);
    const good = p.invert ? val <= p.tgt : val >= p.tgt;
    const color = good ? '#16a34a' : (pct > 50 ? '#d97706' : '#dc2626');
    return `<div class="progress-row">
      <span class="progress-name">${p.label}</span>
      <div class="progress-bg">
        <div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${color};"></div>
      </div>
      <span class="progress-val ${good?'up':'down'}">${val.toFixed(1)}%</span>
      ${badgeHTML(good)}
    </div>`;
  }).join('');

  // Full KPI table
  const allKPIs = [
    { k:'asset',   y68:18544223, y69:20073993, isP:false },
    { k:'profit',  y68:3540523,  y69:4265993,  isP:false },
    { k:'member',  y68:336,      y69:333,      isP:false },
    { k:'share',   y68:3803700,  y69:4098000,  isP:false },
    { k:'loan',    y68:47000000, y69:65000000, isP:false },
    { k:'deposit', y68:11200000, y69:11710000, isP:false },
    { k:'active',  y68:0.6,      y69:0.6,      isP:true, mult:100 },
    { k:'app',     y68:0.3,      y69:0.3,      isP:true, mult:100 },
    { k:'npl',     y68:0.25,     y69:0.25,     isP:true, mult:100 },
    { k:'collect', y68:0.6,      y69:0.6,      isP:true, mult:100 },
    { k:'satso',   y68:0.2,      y69:0.2,      isP:true, mult:100 }
  ];

  document.getElementById('kpi-tbody').innerHTML = allKPIs.map(row => {
    const actual = d[row.k] != null ? d[row.k] : 0;
    const target = tg[row.k] != null ? tg[row.k] : 0;
    const diff   = actual - target;
    const good   = isGood(row.k, actual, target);
    const diffCls = diff >= 0 ? 'up' : 'down';
    return `<tr>
      <td>${LABELS[row.k]}</td>
      <td>${row.isP ? (row.y68*100).toFixed(0)+'%' : fmt(row.y68,false)}</td>
      <td>${row.isP ? (row.y69*100).toFixed(0)+'%' : fmt(row.y69,false)}</td>
      <td>${row.isP ? target.toFixed(1)+'%' : fmt(target,false)}</td>
      <td class="${good?'up':'down'}" style="font-weight:600;">${row.isP ? actual.toFixed(1)+'%' : fmt(actual,false)}</td>
      <td class="${diffCls}">${row.isP ? (diff>0?'+':'')+diff.toFixed(1)+'%' : (diff>0?'+':'')+fmt(diff,false)}</td>
      <td>${badgeHTML(good)}</td>
    </tr>`;
  }).join('');
}

// ---- INPUT FORM ----
function loadInputForm() {
  const d  = actuals['q'+inputQ];
  const tg = TARGETS['q'+inputQ];
  const fields = ['asset','profit','member','share','loan','deposit','active','app','npl','npl2','collect','satso'];
  fields.forEach(f => {
    const el = document.getElementById('f_'+f);
    if (el) el.value = d[f] != null ? d[f] : '';
  });

  const hints = {
    asset:   'เป้าสะสม ' + fmt(tg.asset,false),
    profit:  'เป้าสะสม ' + fmt(tg.profit,false),
    member:  'เป้าสะสม ' + tg.member.toFixed(2) + ' คน',
    share:   'เป้าสะสม ' + fmt(tg.share,false),
    loan:    'เป้าสะสม ' + fmt(tg.loan,false),
    deposit: 'เป้าสะสม ' + fmt(tg.deposit,false)
  };
  Object.keys(hints).forEach(k => {
    const el = document.getElementById('h_'+k);
    if (el) el.textContent = hints[k];
  });
}

function saveAndGo() {
  const fields = ['asset','profit','member','share','loan','deposit','active','app','npl','npl2','collect','satso'];
  const newData = {};
  fields.forEach(f => {
    const el = document.getElementById('f_'+f);
    newData[f] = el && el.value !== '' ? parseFloat(el.value) : actuals['q'+inputQ][f];
  });
  actuals['q'+inputQ] = newData;
  showToast();
  setTimeout(() => {
    showPage('dashboard', document.querySelector('.nav-item'));
    document.querySelectorAll('.nav-item').forEach((n,i) => n.classList.toggle('active', i===0));
  }, 600);
}

function clearInputForm() {
  ['asset','profit','member','share','loan','deposit','active','app','npl','npl2','collect','satso'].forEach(f => {
    const el = document.getElementById('f_'+f);
    if (el) el.value = '';
  });
}

function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---- NPL TREND CHART ----
function renderNPLChart() {
  if (nplChart) nplChart.destroy();
  nplChart = new Chart(document.getElementById('nplTrendChart'), {
    type: 'line',
    data: {
      labels: ['Q1','Q2','Q3'],
      datasets: [
        { label:'ค่าเผื่อเงินกู้สามัญ (M฿)',    data:[3.41,3.41,3.45], borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.07)', fill:true, tension:.4, pointRadius:4, borderWidth:2 },
        { label:'ค่าเผื่อรายได้ค้างรับ (M฿)',   data:[2.51,2.53,2.55], borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.06)',  fill:true, tension:.4, pointRadius:4, borderWidth:2 },
        { label:'รวมค่าเผื่อทั้งหมด (M฿)',      data:[6.95,6.93,7.00], borderColor:'#d97706', borderDash:[4,3], backgroundColor:'transparent', fill:false, tension:.4, pointRadius:4, borderWidth:2 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:true, position:'top', labels:{ font:{size:11}, boxWidth:10, usePointStyle:true } } },
      scales:{
        x:{ grid:{display:false}, ticks:{font:{size:11}, color:'#9ca3af'} },
        y:{ grid:{color:'rgba(0,0,0,0.05)'}, ticks:{font:{size:11}, color:'#9ca3af', callback:v=>v+'M'} }
      }
    }
  });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  loadInputForm();
});
