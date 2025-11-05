import React, { useEffect, useMemo, useState } from "react";

// --- FiveM Attendance Admin Mock (สไตล์แอดมิน โทนทางการ ภาษาไทยเต็มระบบ) ---
// - ไฟล์เดียว React + Tailwind เพื่อพรีวิวทันที
// - Sidebar ซ้าย + Topbar ขาว + การ์ดขาว แบบระบบองค์กร
// - ความเป็นส่วนตัว: ข้อมูลรวม/อนุมัติลา แสดงเฉพาะเมื่อปลดล็อกด้วยรหัสเจ้าของ (เดโม่: 246810)
// - หน้า: แดชบอร์ด, พนักงาน, ตารางกะ, ประวัติลงเวลา, เข้างาน/ออกงาน, มาสาย, การลา, ล่วงเวลา

/*************************
 * ข้อมูลและยูทิลิตี้
 *************************/
const AGENCIES = [
  { id: "police", name: "ตำรวจ" },
  { id: "ems", name: "หมอ" },
  { id: "council", name: "สภา" },
  { id: "admin", name: "แอดมิน" },
];

// แท็บบนแดชบอร์ด (รวม "แอดมิน" เพื่อดูภาพรวมทุกหน่วย)
const DASHBOARD_TABS = [
  { id: "ems", name: "หมอ" },
  { id: "police", name: "ตำรวจ" },
  { id: "council", name: "สภา" },
  { id: "admin", name: "แอดมิน" },
];

// เทมเพลตกะ (0=อา..6=ส.)
const SHIFT_TEMPLATES = {
  police: {
    0: [{ start: "09:00", end: "17:00" }],
    1: [{ start: "09:00", end: "17:00" }],
    2: [{ start: "09:00", end: "17:00" }],
    3: [{ start: "09:00", end: "17:00" }],
    4: [{ start: "09:00", end: "17:00" }],
    5: [{ start: "10:00", end: "18:00" }],
    6: [{ start: "10:00", end: "18:00" }],
  },
  ems: {
    0: [{ start: "08:00", end: "16:00" }, { start: "16:00", end: "00:00" }],
    1: [{ start: "08:00", end: "16:00" }, { start: "16:00", end: "00:00" }],
    2: [{ start: "08:00", end: "16:00" }, { start: "16:00", end: "00:00" }],
    3: [{ start: "08:00", end: "16:00" }, { start: "16:00", end: "00:00" }],
    4: [{ start: "08:00", end: "16:00" }, { start: "16:00", end: "00:00" }],
    5: [{ start: "12:00", end: "20:00" }],
    6: [{ start: "12:00", end: "20:00" }],
  },
  council: {
    0: [],
    1: [{ start: "13:00", end: "17:00" }],
    2: [{ start: "13:00", end: "17:00" }],
    3: [{ start: "13:00", end: "17:00" }],
    4: [{ start: "13:00", end: "17:00" }],
    5: [],
    6: [],
  },
  admin: {
    0: [],
    1: [{ start: "09:00", end: "17:00" }],
    2: [{ start: "09:00", end: "17:00" }],
    3: [{ start: "09:00", end: "17:00" }],
    4: [{ start: "09:00", end: "17:00" }],
    5: [{ start: "09:00", end: "17:00" }],
    6: [],
  },
};

const TH_DAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function todayKey(d = new Date()) { return d.getDay(); }
function pad2(n) { return String(n).padStart(2, "0"); }
function parseTimeToDate(base, HHmm) {
  const [h, m] = HHmm.split(":").map(Number);
  const d = new Date(base); d.setHours(h, m, 0, 0); return d;
}
function toHM(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function diffMin(a, b) { return Math.round((b - a) / 60000); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function classNames(...xs){ return xs.filter(Boolean).join(" "); }

function useClock(){
  const [now, setNow] = useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  return now;
}

// ชื่อไทยของหน่วยงาน
function agencyLabel(id){
  switch(id){
    case "police": return "ตำรวจ";
    case "ems": return "หมอ";
    case "council": return "สภา";
    case "admin": return "แอดมิน";
    default: return id;
  }
}

// helper: หาชื่อใน roster แอดมินของวันนั้น
function resolveAdminSlotsForName(roster, day, name){
  const list = (roster?.[day]||[]).filter(e => (e.name||"").trim() === (name||"").trim());
  return list.map(({start,end})=>({start,end}));
}

/*************************
 * Self Tests (กัน regression)
 *************************/
function runSelfTests(){
  try {
    const base = new Date(2025,0,1,0,0,0,0);
    const t = parseTimeToDate(base, "09:30");
    console.assert(t.getHours()===9 && t.getMinutes()===30, "parseTimeToDate ผิด");

    const a = new Date(2025,0,1,9,0,0,0);
    const b = new Date(2025,0,1,10,30,0,0);
    console.assert(diffMin(a,b)===90, "diffMin ผิด");

    // เคสข้ามวัน: 16:00 → 00:00 ต้องเลิกวันถัดไป
    const probe = new Date(2025,0,5,16,0,0,0); // อา 16:00
    const slot = SHIFT_TEMPLATES.ems[0][1]; // 16:00 → 00:00
    const s = parseTimeToDate(probe, slot.start);
    const rawE = parseTimeToDate(probe, slot.end);
    const e = (slot.end==="00:00" || rawE<=s) ? new Date(rawE.getTime()+86400000) : rawE;
    console.assert(e > s, "เลิกงาน 00:00 ต้องเป็นวันถัดไป");

    // แอดมินต้องมีเทมเพลตวันจันทร์ 09:00-17:00
    const mon = SHIFT_TEMPLATES.admin[1][0];
    console.assert(mon.start==="09:00" && mon.end==="17:00", "เทมเพลตแอดมินผิด");

    // ทดสอบ resolver ของ roster แอดมิน
    const roster = { 1: [{ name:"ทดสอบ", start:"10:00", end:"18:00" }] };
    const r = resolveAdminSlotsForName(roster, 1, "ทดสอบ");
    console.assert(r.length===1 && r[0].start==="10:00", "resolver roster แอดมินผิด");

    console.assert(agencyLabel("admin")==="แอดมิน", "label แอดมินผิด");
  } catch(e){
    console.warn("Self tests error:", e);
  }
}

/*************************
 * ชิ้นส่วน UI พื้นฐาน
 *************************/
const SidebarLink = ({ active, label, onClick, badge, icon }) => (
  <button onClick={onClick} className={classNames(
    "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
    active 
      ? "bg-blue-600 text-white" 
      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
  )}>
    <span className={classNames(
      "inline-flex h-7 w-7 items-center justify-center text-xs font-semibold transition-all",
      active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
    )}>
      {icon}
    </span>
    <span className="flex-1 text-left tracking-wide">{label}</span>
    {badge ? (
      <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
        {badge}
      </span>
    ) : null}
  </button>
);

const KPI = ({ title, value, footer, agency = "admin" }) => {
  const colorMap = {
    ems: "bg-gradient-to-br from-teal-600 to-teal-700",
    police: "bg-gradient-to-br from-blue-700 to-blue-800",
    council: "bg-gradient-to-br from-slate-700 to-slate-800",
    admin: "bg-gradient-to-br from-indigo-600 to-indigo-700",
  };
  return (
    <div className={`rounded-xl ${colorMap[agency] || colorMap.admin} p-5 text-white shadow-sm`}>
      <div className="text-xs/5 opacity-90">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {footer && <div className="mt-3 text-[12px] opacity-80">{footer}</div>}
    </div>
  );
};

const Card = ({ title, children, right }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {right}
    </div>
    <div className="p-4 text-sm text-slate-700">{children}</div>
  </div>
);

const Pill = ({ tone = "neutral", children }) => {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-100 text-emerald-700",
    bad: "bg-rose-100 text-rose-700",
    warn: "bg-amber-100 text-amber-700",
    info: "bg-sky-100 text-sky-700",
  };
  return <span className={classNames("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs", map[tone])}>{children}</span>;
};

/*************************
 * คอมโพเนนต์หลัก
 *************************/
export default function FiveMAttendanceAdminFormal(){
  const now = useClock();

  // เส้นทางหน้า
  const [route, setRoute] = useState("dashboard");
  const [dashTab, setDashTab] = useState("admin"); // แดชบอร์ดตามหน่วยงาน

  // ความเป็นส่วนตัวเจ้าของระบบ
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [ownerCode, setOwnerCode] = useState("");
  const DEMO_OWNER = "246810";

  // โหลดข้อมูลจาก localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // แปลง date strings กลับเป็น Date objects สำหรับ logs
        if (key === 'attendance_logs') {
          return parsed.map(log => ({
            ...log,
            clockInAt: new Date(log.clockInAt),
            clockOutAt: new Date(log.clockOutAt)
          }));
        }
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
    }
    return defaultValue;
  };

  // ข้อมูลพนักงาน/เวลา (บันทึกใน localStorage)
  const [employees, setEmployees] = useState(() => loadFromStorage('attendance_employees', [
    { id: "1", name: "สมชาย ตัวอย่าง", agency: "police", status: "active", pin: "1234" },
    { id: "2", name: "สมหญิง ดีมาก", agency: "ems", status: "active", pin: "5678" },
  ]));
  
  // ตั้งค่าเริ่มต้นให้เป็นพนักงานคนแรก
  const [displayName, setDisplayName] = useState(employees[0]?.name || "");
  const [selectedAgency, setSelectedAgency] = useState(employees[0]?.agency || AGENCIES[0].id);
  const [activeLog, setActiveLog] = useState(null); // { name, agency, clockInAt }
  const [logs, setLogs] = useState(() => loadFromStorage('attendance_logs', []));

  // การลา
  const [leaveRequests, setLeaveRequests] = useState(() => loadFromStorage('attendance_leaves', []));
  const [leaveForm, setLeaveForm] = useState({ from: "", to: "", reason: "" });

  // ระบบแจ้งเตือนเจ้าของ
  const [notifications, setNotifications] = useState([]);

  // Roster แอดมินรายสัปดาห์ (ต่อวัน → รายชื่อ+เวลา)
  const [adminRoster, setAdminRoster] = useState({
    1: [{ name: "แอดมินเอ", start: "09:00", end: "17:00" }],
    2: [{ name: "แอดมินบี", start: "09:00", end: "17:00" }],
    3: [],
    4: [],
    5: [],
    0: [],
    6: [],
  });

  // บันทึกข้อมูลลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      localStorage.setItem('attendance_employees', JSON.stringify(employees));
    } catch (error) {
      console.error('Error saving employees:', error);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('attendance_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem('attendance_leaves', JSON.stringify(leaveRequests));
    } catch (error) {
      console.error('Error saving leaves:', error);
    }
  }, [leaveRequests]);

  // เมตริก (รวม)
  const todayLogsAll = useMemo(()=> logs.filter(l => isSameDay(l.clockInAt, now)), [logs, now]);
  const lateTodayAll = todayLogsAll.filter(l => l.late).length;
  const onTimeTodayAll = todayLogsAll.length - lateTodayAll;
  const onTimePctAll = todayLogsAll.length ? Math.round((onTimeTodayAll/todayLogsAll.length)*100) : 0;
  const totalEmployeesAll = useMemo(()=> new Set(logs.map(l=>l.name)).size || 0, [logs]);

  // ตัวช่วยเลือกกะวันนี้ (ไว้ใช้ขยายต่อ)
  const todaysShifts = useMemo(()=>{
    const map = SHIFT_TEMPLATES[selectedAgency]||{}; return map[todayKey(now)]||[];
  },[selectedAgency, now]);

  function findExpectedStart(agency, at, name, roster){
    const day = todayKey(at);

    // 1) ถ้าเป็นแอดมิน และมีระบุชื่อใน roster ของวันนั้น → ใช้เวลาจาก roster ก่อน
    let slots = [];
    if (agency === "admin"){
      const personal = resolveAdminSlotsForName(roster, day, name);
      slots = personal.length ? personal : ((SHIFT_TEMPLATES[agency]||{})[day]||[]);
    } else {
      slots = ((SHIFT_TEMPLATES[agency]||{})[day]||[]);
    }

    if (!slots.length) return null;

    const withDates = slots.map(s=>({
      start: parseTimeToDate(at, s.start),
      end: (()=>{ const e = parseTimeToDate(at, s.end); return (s.end==="00:00"||e<=parseTimeToDate(at,s.start))? new Date(e.getTime()+86400000): e; })()
    }));
    // เลือกช่วงที่เริ่มใกล้ที่สุด
    let best = withDates[0];
    let minDiff = Infinity;
    withDates.forEach(w=>{ const d = Math.abs(w.start - at); if (d < minDiff){ minDiff=d; best=w; } });
    return best;
  }

  function handleClockIn(proofImage = null){
    if (activeLog) return;
    const clockInAt = new Date();
    const expected = findExpectedStart(selectedAgency, clockInAt, displayName, adminRoster);
    const graceMin = 5; // อนุโลม 5 นาที
    const late = expected ? (clockInAt > new Date(expected.start.getTime() + graceMin*60000)) : false;
    setActiveLog({ name: displayName, agency: selectedAgency, clockInAt, clockInProof: proofImage });
    (window).__lateFlag = late;
    
    // แจ้งเตือนเจ้าของ
    if(ownerUnlocked) {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'clockin',
        message: `${displayName} (${agencyLabel(selectedAgency)}) เข้างาน`,
        time: clockInAt,
        read: false
      }, ...prev]);
    }
  }

  function handleClockOut(proofImage = null){
    if (!activeLog) return;
    const clockOutAt = new Date();
    const minutes = diffMin(activeLog.clockInAt, clockOutAt);
    const id = `${Date.now()}`;
    setLogs(prev => [{ 
      id, 
      name: activeLog.name, 
      agency: activeLog.agency, 
      clockInAt: activeLog.clockInAt, 
      clockOutAt, 
      minutes, 
      late: !!(window).__lateFlag,
      clockInProof: activeLog.clockInProof,
      clockOutProof: proofImage
    }, ...prev]);
    
    // แจ้งเตือนเจ้าของ
    if(ownerUnlocked) {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'clockout',
        message: `${activeLog.name} (${agencyLabel(activeLog.agency)}) ออกงาน (${Math.floor(minutes/60)} ชม. ${minutes%60} นาที)`,
        time: clockOutAt,
        read: false
      }, ...prev]);
    }
    
    setActiveLog(null); delete (window).__lateFlag;
  }

  function submitLeave(){
    if (!leaveForm.from || !leaveForm.to || !leaveForm.reason) return;
    const id = `${Date.now()}`;
    setLeaveRequests(prev => [{ id, name: displayName, agency: selectedAgency, ...leaveForm, status: "รออนุมัติ" }, ...prev]);
    
    // แจ้งเตือนเจ้าของ
    if(ownerUnlocked) {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'leave',
        message: `${displayName} (${agencyLabel(selectedAgency)}) ยื่นขอลา ${leaveForm.from} ถึง ${leaveForm.to}`,
        time: new Date(),
        read: false
      }, ...prev]);
    }
    
    setLeaveForm({ from: "", to: "", reason: "" });
  }

  function approveLeave(id, ok){
    if (!ownerUnlocked) return;
    setLeaveRequests(prev => prev.map(r => r.id===id ? { ...r, status: ok?"อนุมัติ":"ไม่อนุมัติ", approvedAt: new Date() } : r));
  }

  useEffect(()=>{ runSelfTests(); },[]);

  /*************************
   * โครงหน้า
   *************************/
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:flex md:flex-col">
        <div className="flex flex-col items-center justify-center px-4 py-6">
          <img src="/LOGO_24hr_Gif_Alpha.gif" alt="Logo 24hr" className="h-32 w-32 object-contain" />
        </div>
        <nav className="px-3 py-2 text-sm space-y-1">
          <div className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">หน้าหลัก</div>
          <SidebarLink icon="▤" label="แดชบอร์ด" active={route==='dashboard'} onClick={()=>setRoute('dashboard')} />
          <SidebarLink icon="⚑" label="พนักงาน" active={route==='employees'} onClick={()=>setRoute('employees')} />
          <div className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">จัดการเวลา</div>
          <SidebarLink icon="◷" label="ตารางกะ" active={route==='schedule'} onClick={()=>setRoute('schedule')} />
          <SidebarLink icon="▦" label="ประวัติลงเวลา" active={route==='att_sheet'} onClick={()=>setRoute('att_sheet')} />
          <SidebarLink icon="◉" label="เข้างาน" active={route==='clockin'} onClick={()=>setRoute('clockin')} />
          <SidebarLink icon="○" label="ออกงาน" active={route==='clockout'} onClick={()=>setRoute('clockout')} />
          <SidebarLink icon="◔" label="มาสาย" active={route==='late'} onClick={()=>setRoute('late')} />
          <SidebarLink icon="◫" label="การลา" active={route==='leave'} onClick={()=>setRoute('leave')} badge={leaveRequests.filter(r=>r.status==='รออนุมัติ').length||undefined} />
          <SidebarLink icon="◐" label="ล่วงเวลา" active={route==='ot'} onClick={()=>setRoute('ot')} />
        </nav>
        <div className="mt-auto space-y-3 p-3 text-[12px]">
          <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg text-slate-400">◈</span>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">ผู้ดูแลระบบ</div>
                {ownerUnlocked ? (
                  <div className="mt-0.5 text-xs text-emerald-400 font-medium">● ออนไลน์</div>
                ) : (
                  <div className="mt-0.5 text-xs text-slate-500 font-medium">● ออฟไลน์</div>
                )}
              </div>
            </div>
            {!ownerUnlocked ? (
              <div>
                <input 
                  value={ownerCode} 
                  onChange={e=>setOwnerCode(e.target.value)}
                  onKeyPress={e => {
                    if(e.key === 'Enter') {
                      setOwnerUnlocked(ownerCode===DEMO_OWNER);
                      if(ownerCode===DEMO_OWNER) setOwnerCode("");
                    }
                  }}
                  placeholder="รหัส 6 หลัก (กด Enter)" 
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" 
                />
              </div>
            ) : (
              <button 
                onClick={()=>{
                  setOwnerUnlocked(false);
                  setOwnerCode("");
                  setNotifications([]);
                }}
                className="w-full rounded-md bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-600"
              >
                <span>◀</span>
                <span>ออกจากระบบ</span>
              </button>
            )}
          </div>
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 text-center text-slate-500 text-xs">
            <div className="font-semibold">24HR Attendance System</div>
            <div className="text-[10px] mt-1 text-slate-600">Version 1.0.0</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
            {/* ซ้าย */}
            <div className="flex items-center gap-4">
              <button className="md:hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">☰</button>
            </div>

            {/* ขวา - เวลาและการแจ้งเตือน */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 border border-slate-200">
                <span className="text-lg">🕐</span>
                <div className="text-xs">
                  <div className="font-medium text-slate-700">{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-slate-500">{now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => {
                    if(ownerUnlocked) {
                      const dropdown = document.getElementById('notification-dropdown');
                      dropdown?.classList.toggle('hidden');
                      setNotifications(prev => prev.map(n => ({...n, read: true})));
                    }
                  }}
                  className="relative rounded-lg bg-white border border-slate-200 p-2.5 hover:bg-slate-50 transition-all"
                >
                  <span className="text-xl">🔔</span>
                  {ownerUnlocked && notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                
                {ownerUnlocked && (
                  <div 
                    id="notification-dropdown"
                    className="hidden absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-50"
                  >
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-white">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">🔔 แจ้งเตือนเจ้าของระบบ</div>
                        <button 
                          onClick={() => setNotifications([])}
                          className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 10).map(notif => (
                          <div 
                            key={notif.id} 
                            className={`border-b border-slate-100 p-3 hover:bg-slate-50 ${!notif.read ? 'bg-orange-50/50' : ''}`}
                          >
                            <div className="flex gap-2">
                              <span className="text-lg">
                                {notif.type === 'clockin' ? '🟢' : notif.type === 'clockout' ? '🔴' : '🏖️'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-800">{notif.message}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {notif.time.toLocaleTimeString('th-TH')} • {notif.time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          <div className="text-4xl mb-2">🔕</div>
                          <div className="text-sm">ไม่มีการแจ้งเตือน</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* เนื้อหา */}
        <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
          {route==='dashboard' && (
            <DashboardSection now={now} dashTab={dashTab} setDashTab={setDashTab} logs={logs} leaveRequests={leaveRequests} ownerUnlocked={ownerUnlocked} totals={{totalEmployeesAll,onTimePctAll,onTimeTodayAll,lateTodayAll}} setRoute={setRoute} />
          )}
          {route==='employees' && (
            <EmployeesSection employees={employees} setEmployees={setEmployees} ownerUnlocked={ownerUnlocked} />
          )}
          {route==='schedule' && (
            <ScheduleSection selectedAgency={selectedAgency} setSelectedAgency={setSelectedAgency} now={now} adminRoster={adminRoster} setAdminRoster={setAdminRoster} />
          )}
          {route==='att_sheet' && (
            <AttendanceSheetSection logs={logs} ownerUnlocked={ownerUnlocked} />
          )}
          {route==='clockin' && (
            <ClockInSection now={now} selectedAgency={selectedAgency} setSelectedAgency={setSelectedAgency} displayName={displayName} setDisplayName={setDisplayName} activeLog={activeLog} handleClockIn={handleClockIn} employees={employees} />
          )}
          {route==='clockout' && (
            <ClockOutSection now={now} selectedAgency={selectedAgency} setSelectedAgency={setSelectedAgency} displayName={displayName} setDisplayName={setDisplayName} activeLog={activeLog} handleClockOut={handleClockOut} employees={employees} />
          )}
          {route==='late' && (
            <LateSection logs={logs} ownerUnlocked={ownerUnlocked} />
          )}
          {route==='leave' && (
            <LeaveSection ownerUnlocked={ownerUnlocked} selectedAgency={selectedAgency} setSelectedAgency={setSelectedAgency} displayName={displayName} leaveForm={leaveForm} setLeaveForm={setLeaveForm} submitLeave={submitLeave} leaveRequests={leaveRequests} approveLeave={approveLeave} />
          )}
          {route==='ot' && (
            <OvertimeSection logs={logs} ownerUnlocked={ownerUnlocked} />
          )}
        </main>
      </div>
    </div>
  );
}

/*************************
 * ส่วนของแต่ละหน้า
 *************************/
function DashboardSection({ now, dashTab, setDashTab, logs, leaveRequests, ownerUnlocked, totals, setRoute }){
  const [reportAgency, setReportAgency] = useState("admin");
  
  // ฟิลเตอร์ข้อมูลตามแท็บ
  const filterByTab = (arr) => arr.filter(x => dashTab==='admin' ? true : x.agency===dashTab);
  const todayLogs = logs.filter(l => isSameDay(l.clockInAt, now));
  const todayFiltered = filterByTab(todayLogs);
  const lateToday = todayFiltered.filter(l=>l.late).length;
  const onTimeToday = todayFiltered.length - lateToday;
  const onTimePct = todayFiltered.length ? Math.round((onTimeToday/todayFiltered.length)*100) : 0;
  const totalEmployees = new Set(filterByTab(logs).map(l=>l.name)).size;

  const pendingLeaves = filterByTab(leaveRequests).filter(r=>r.status==='รออนุมัติ');
  
  // สำหรับรายงานประจำเดือน
  const reportFilteredLogs = useMemo(() => {
    return reportAgency === 'admin' ? logs : logs.filter(l => l.agency === reportAgency);
  }, [logs, reportAgency]);

  // ฟังก์ชันส่งออก CSV
  function exportCSV(){
    if(!logs.length) {
      alert('ไม่มีข้อมูลให้ส่งออก');
      return;
    }
    const headers = 'ชื่อ,หน่วยงาน,เข้างาน,ออกงาน,นาที,สถานะ\n';
    const csv = logs.map(l => 
      `${l.name},${agencyLabel(l.agency)},${l.clockInAt.toLocaleString('th-TH')},${l.clockOutAt.toLocaleString('th-TH')},${l.minutes},${l.late?'มาสาย':'ตรงเวลา'}`
    ).join('\n');
    const blob = new Blob(['\ufeff' + headers + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="mb-3 text-sm text-slate-500">ยินดีต้อนรับสู่ <span className="font-medium text-slate-700">ระบบบันทึกเวลาเข้างาน</span></div>

      {/* แท็บหน่วยงาน */}
      <div className="flex flex-wrap gap-2">
        {DASHBOARD_TABS.map(t => {
          const activeColorMap = {
            ems: "bg-teal-600 border-teal-600",
            police: "bg-blue-700 border-blue-700",
            council: "bg-slate-700 border-slate-700",
            admin: "bg-indigo-600 border-indigo-600",
          };
          const hoverColorMap = {
            ems: "hover:border-teal-400",
            police: "hover:border-blue-400",
            council: "hover:border-slate-400",
            admin: "hover:border-indigo-400",
          };
          return (
            <button key={t.id} onClick={()=>setDashTab(t.id)} className={classNames("rounded-full px-4 py-1.5 text-sm border transition-all", dashTab===t.id?`${activeColorMap[t.id]} text-white`:`bg-white text-slate-700 border-slate-200 ${hoverColorMap[t.id]}`)}>{t.name}</button>
          );
        })}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI agency={dashTab} title="จำนวนพนักงานทั้งหมด" value={dashTab==='admin'? totals.totalEmployeesAll : totalEmployees} footer={<span className="opacity-80">นับจากการมีบันทึกในระบบ</span>} />
        <KPI agency={dashTab} title="เปอร์เซ็นต์ตรงเวลา (วันนี้)" value={`${dashTab==='admin'? totals.onTimePctAll : onTimePct} %`} />
        <KPI agency={dashTab} title="ตรงเวลาวันนี้" value={dashTab==='admin'? totals.onTimeTodayAll : onTimeToday} />
        <KPI agency={dashTab} title="มาสายวันนี้" value={dashTab==='admin'? totals.lateTodayAll : lateToday} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="รายงานประจำเดือน">
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-slate-600 uppercase tracking-wide">หน่วยงาน</label>
            <select 
              value={reportAgency} 
              onChange={e=>setReportAgency(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="admin">รวมทุกหน่วย</option>
              <option value="ems">หมอ</option>
              <option value="police">ตำรวจ</option>
              <option value="council">สภา</option>
            </select>
          </div>
          <div className="space-y-3">
            <div className="border-l-4 border-teal-600 bg-slate-50 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-semibold text-slate-600 uppercase">เข้างาน</div>
                <div className="text-3xl font-bold text-slate-800">{Math.max(0, reportFilteredLogs.length)}</div>
              </div>
              <div className="mt-1 text-xs text-slate-500">ครั้ง (เดือนนี้)</div>
            </div>
            <div className="border-l-4 border-slate-600 bg-slate-50 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-semibold text-slate-600 uppercase">ออกงาน</div>
                <div className="text-3xl font-bold text-slate-800">{Math.max(0, reportFilteredLogs.length)}</div>
              </div>
              <div className="mt-1 text-xs text-slate-500">ครั้ง (เดือนนี้)</div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-slate-600 uppercase mb-3">สรุป</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded">
                <div className="text-xs text-slate-500">รอบทำงานสมบูรณ์</div>
                <div className="mt-1 text-xl font-bold text-slate-700">{Math.max(0, reportFilteredLogs.length)}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <div className="text-xs text-slate-500">ยังไม่ออกงาน</div>
                <div className="mt-1 text-xl font-bold text-slate-700">0</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="คำขอลา" right={<Pill tone={pendingLeaves.length? 'warn':'neutral'}>{pendingLeaves.length} รออนุมัติ</Pill>}>
          {ownerUnlocked ? (
            <ul className="space-y-2">
              {pendingLeaves.slice(0,5).map(r=> (
                <li key={r.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="font-medium text-slate-800">{r.name} • {agencyLabel(r.agency)}</div>
                  <div className="mt-1 text-slate-600">{r.from} → {r.to} — {r.reason}</div>
                  <div className="mt-1"><Pill tone="warn">รออนุมัติ</Pill></div>
                </li>
              ))}
              {pendingLeaves.length===0 && <div className="text-slate-500">ไม่มีคำขอลาที่รออนุมัติ</div>}
            </ul>
          ) : (
            <div className="text-slate-500">(ซ่อน — ต้องปลดล็อกเจ้าของระบบ)</div>
          )}
        </Card>

        <Card title="การทำงานด่วน">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={exportCSV} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-orange-300 hover:shadow transition-all">ส่งออก CSV</button>
            <button onClick={()=>setRoute('schedule')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-orange-300 hover:shadow transition-all">จัดการตารางกะ</button>
            <button onClick={()=>setRoute('late')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-orange-300 hover:shadow transition-all">ดูรายชื่อมาสาย</button>
            <button onClick={()=>setRoute('leave')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-orange-300 hover:shadow transition-all">อนุมัติคำขอลา</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmployeesSection({ employees, setEmployees, ownerUnlocked }){
  const [form, setForm] = useState({ name: "", agency: "police", pin: "" });
  const [filterAgency, setFilterAgency] = useState("all");
  
  // กรองพนักงานตามหน่วยงาน
  const filteredEmployees = useMemo(() => {
    if (filterAgency === "all") return employees;
    return employees.filter(e => e.agency === filterAgency);
  }, [employees, filterAgency]);

  function addEmployee(){
    if (!ownerUnlocked) {
      alert('⚠️ ต้องปลดล็อกเจ้าของระบบก่อน');
      return;
    }
    if (!form.name.trim()) {
      alert('⚠️ กรุณากรอกชื่อพนักงาน');
      return;
    }
    if (!form.pin.trim() || form.pin.length < 4) {
      alert('⚠️ กรุณากรอก PIN 4 หลักขึ้นไป');
      return;
    }
    const id = `${Date.now()}`;
    setEmployees(prev => [...prev, { id, name: form.name.trim(), agency: form.agency, pin: form.pin.trim(), status: "active" }]);
    setForm({ name: "", agency: "police", pin: "" });
  }

  function removeEmployee(id){
    if (!ownerUnlocked) {
      alert('⚠️ ต้องปลดล็อกเจ้าของระบบก่อน');
      return;
    }
    if (confirm('ยืนยันการลบพนักงานคนนี้?')) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-800">พนักงาน</div>
        <select
          value={filterAgency}
          onChange={e => setFilterAgency(e.target.value)}
          className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:border-orange-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="all">🏢 ทุกหน่วยงาน ({employees.length})</option>
          <option value="ems">🏥 หมอ ({employees.filter(e => e.agency === 'ems').length})</option>
          <option value="police">👮 ตำรวจ ({employees.filter(e => e.agency === 'police').length})</option>
          <option value="council">🏛️ สภา ({employees.filter(e => e.agency === 'council').length})</option>
          <option value="admin">⚙️ แอดมิน ({employees.filter(e => e.agency === 'admin').length})</option>
        </select>
      </div>
      
      {!ownerUnlocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ <strong>ต้องปลดล็อกเจ้าของระบบ</strong> (Sidebar) เพื่อเพิ่ม/ลบพนักงาน
        </div>
      )}

      <Card title="เพิ่มพนักงาน">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-slate-500">ชื่อพนักงาน <span className="text-rose-500">*</span></label>
            <input 
              value={form.name} 
              onChange={e=>setForm({...form, name:e.target.value})} 
              placeholder="เช่น สมชาย ใจดี"
              disabled={!ownerUnlocked}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed" 
            />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-slate-500">หน่วยงาน</label>
            <select 
              value={form.agency} 
              onChange={e=>setForm({...form, agency:e.target.value})} 
              disabled={!ownerUnlocked}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {AGENCIES.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">PIN <span className="text-rose-500">*</span></label>
            <input 
              type="text"
              value={form.pin} 
              onChange={e=>setForm({...form, pin:e.target.value})} 
              placeholder="4 หลัก"
              maxLength="6"
              disabled={!ownerUnlocked}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed" 
            />
          </div>
          <div className="md:col-span-3">
            <button 
              onClick={addEmployee} 
              disabled={!ownerUnlocked}
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
            >
              เพิ่มพนักงาน
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">* PIN ใช้สำหรับยืนยันตัวตนเมื่อเข้างาน/ออกงาน</div>
      </Card>

      <Card title={`รายชื่อพนักงาน (${filteredEmployees.length} คน${filterAgency !== 'all' ? ` - ${agencyLabel(filterAgency)}` : ''})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">#</th>
                <th className="py-2">ชื่อ</th>
                <th className="py-2">หน่วยงาน</th>
                <th className="py-2">สถานะ</th>
                {ownerUnlocked && <th className="py-2">PIN</th>}
                {ownerUnlocked && <th className="py-2">การทำงาน</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.length ? filteredEmployees.map((e, idx) => (
                <tr key={e.id}>
                  <td className="py-2 text-slate-500">{idx + 1}</td>
                  <td className="py-2 font-medium">{e.name}</td>
                  <td className="py-2">{agencyLabel(e.agency)}</td>
                  <td className="py-2">
                    <Pill tone={e.status === 'active' ? 'good' : 'neutral'}>
                      {e.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Pill>
                  </td>
                  {ownerUnlocked && (
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-mono font-semibold text-orange-700">
                        🔑 {e.pin}
                      </span>
                    </td>
                  )}
                  {ownerUnlocked && (
                    <td className="py-2">
                      <button 
                        onClick={()=>removeEmployee(e.id)}
                        className="rounded-md bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500 transition-all"
                      >
                        ลบ
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td className="py-4 text-center text-slate-500" colSpan={ownerUnlocked ? 6 : 4}>
                    {filterAgency === 'all' 
                      ? 'ไม่มีพนักงานในระบบ' 
                      : `ไม่มีพนักงานในหน่วยงาน ${agencyLabel(filterAgency)}`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ScheduleSection({ selectedAgency, setSelectedAgency, now, adminRoster, setAdminRoster }){
  const day = todayKey(now);
  const [viewDate, setViewDate] = useState(new Date());

  // ฟอร์มเพิ่มรายชื่อแอดมินต่อวัน
  const [form, setForm] = useState({ dow: day, name: "", start: "09:00", end: "17:00" });
  function addAdminEntry(){
    if (!form.name.trim()) return;
    setAdminRoster(prev => {
      const list = prev[form.dow] ? [...prev[form.dow]] : [];
      list.push({ name: form.name.trim(), start: form.start, end: form.end });
      return { ...prev, [form.dow]: list };
    });
    setForm(f => ({ ...f, name: "" }));
  }
  function removeAdminEntry(dow, idx){
    setAdminRoster(prev => {
      const list = [...(prev[dow]||[])];
      list.splice(idx,1); return { ...prev, [dow]: list };
    });
  }

  const weekDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date(viewDate);
    startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
    for(let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [viewDate]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">ตารางกะ</div>
      
      <Card title="เลือกช่วงเวลา">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">เลือกสัปดาห์</label>
            <input 
              type="date" 
              value={viewDate.toISOString().split('T')[0]} 
              onChange={e=>setViewDate(new Date(e.target.value))}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">หน่วยงาน</label>
            <select value={selectedAgency} onChange={e=>setSelectedAgency(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              {AGENCIES.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          สัปดาห์: {weekDates[0].toLocaleDateString('th-TH')} - {weekDates[6].toLocaleDateString('th-TH')}
        </div>
      </Card>

      {/* เทมเพลตรายสัปดาห์ของหน่วยงาน */}
      <Card title="เทมเพลตรายสัปดาห์ (หน่วยงาน)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5,6].map(d => (
            <div key={d} className={classNames("rounded-lg border p-3", d===day?"border-orange-300 bg-orange-50":"border-slate-200 bg-white") }>
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">{TH_DAYS[d]}</div>
              <ul className="text-sm text-slate-700">
                {(SHIFT_TEMPLATES[selectedAgency]?.[d]||[]).length? (
                  SHIFT_TEMPLATES[selectedAgency][d].map((s,i)=>(<li key={i}>• {s.start} - {s.end==="00:00"?"24:00":s.end}</li>))
                ):(<li className="text-slate-400">—</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* เฉพาะแอดมิน: ระบุชื่อ + เวลาเป็นรายสัปดาห์ */}
      {selectedAgency==='admin' && (
        <Card title="ตารางแอดมินรายสัปดาห์ (ระบุชื่อ + เวลา)">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">วัน</label>
                <select value={form.dow} onChange={e=>setForm({...form, dow:Number(e.target.value)})} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  {[0,1,2,3,4,5,6].map(d=> <option key={d} value={d}>{TH_DAYS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">ชื่อแอดมิน</label>
                <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="เช่น แอดมินเอ" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">เริ่ม</label>
                  <input type="time" value={form.start} onChange={e=>setForm({...form, start:e.target.value})} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">ถึง</label>
                  <input type="time" value={form.end} onChange={e=>setForm({...form, end:e.target.value})} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={addAdminEntry} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-500">เพิ่มในสัปดาห์</button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[0,1,2,3,4,5,6].map(d => (
                  <div key={d} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-sm font-medium text-slate-800">{TH_DAYS[d]}</div>
                    <ul className="space-y-2 text-sm">
                      {(adminRoster[d]||[]).length? (adminRoster[d].map((e,i)=> (
                        <li key={i} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                          <div>
                            <div className="font-medium text-slate-800">{e.name}</div>
                            <div className="text-slate-600">{e.start} - {e.end}</div>
                          </div>
                          <button onClick={()=>removeAdminEntry(d,i)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500">ลบ</button>
                        </li>
                      ))): (<li className="text-slate-400">— ไม่มีรายการ —</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function AttendanceSheetSection({ logs, ownerUnlocked }){
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const filteredLogs = useMemo(() => {
    let filtered = logs;
    if(dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      filtered = filtered.filter(l => l.clockInAt >= from);
    }
    if(dateTo) {
      const to = new Date(dateTo);
      to.setHours(23,59,59,999);
      filtered = filtered.filter(l => l.clockInAt <= to);
    }
    return filtered;
  }, [logs, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">ประวัติลงเวลา</div>
      
      <Card title="ตัวกรองวันที่">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="mb-1 block text-xs text-slate-500">จากวันที่</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e=>setDateFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">ถึงวันที่</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e=>setDateTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <button 
              onClick={()=>{setDateFrom("");setDateTo("");}}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          แสดง {filteredLogs.length} รายการจากทั้งหมด {logs.length} รายการ
        </div>
      </Card>

      <Card title="บันทึกทั้งหมด">
        {!ownerUnlocked && <div className="mb-3 text-slate-500">(ซ่อน — ต้องปลดล็อกเจ้าของระบบเพื่อดูข้อมูลจริง)</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">ชื่อ</th><th className="py-2">หน่วยงาน</th><th className="py-2">เข้างาน</th><th className="py-2">ออกงาน</th><th className="py-2">นาที</th><th className="py-2">สถานะ</th><th className="py-2">หลักฐาน</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {ownerUnlocked ? (
                filteredLogs.length? filteredLogs.map(l=> (
                  <tr key={l.id}>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2">{agencyLabel(l.agency)}</td>
                    <td className="py-2 font-mono">{l.clockInAt.toLocaleString('th-TH')}</td>
                    <td className="py-2 font-mono">{l.clockOutAt.toLocaleString('th-TH')}</td>
                    <td className="py-2 font-mono">{l.minutes}</td>
                    <td className="py-2">{l.late? <Pill tone="bad">มาสาย</Pill> : <Pill tone="good">ตรงเวลา</Pill>}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {l.clockInProof && (
                          <a href={l.clockInProof} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-200">
                            📸 เข้า
                          </a>
                        )}
                        {l.clockOutProof && (
                          <a href={l.clockOutProof} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200">
                            📸 ออก
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )): (<tr><td className="py-4 text-slate-500" colSpan={7}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>)
              ) : (
                <tr><td className="py-4 text-slate-500" colSpan={7}>ถูกล็อก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ClockInSection({ now, selectedAgency, setSelectedAgency, displayName, setDisplayName, activeLog, handleClockIn, employees }){
  const activeEmployees = employees.filter(e => e.status === 'active');
  const [pin, setPin] = useState("");
  const [showPinError, setShowPinError] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  function processImageFile(file) {
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) {
      alert('⚠️ ขนาดไฟล์ใหญ่เกิน 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleImageUpload(e){
    const file = e.target.files[0];
    processImageFile(file);
  }

  function handlePaste(e){
    const items = e.clipboardData?.items;
    if(!items) return;
    
    for(let i = 0; i < items.length; i++) {
      if(items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processImageFile(file);
        e.preventDefault();
        break;
      }
    }
  }

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  function handleClockInWithPin(){
    if(!displayName || displayName.trim() === "") {
      alert('⚠️ กรุณาเลือกพนักงานก่อน');
      return;
    }
    const emp = employees.find(e => e.name.trim() === displayName.trim());
    if(!emp) {
      alert(`⚠️ ไม่พบพนักงาน "${displayName}" ในระบบ\nกรุณาตรวจสอบว่าได้เพิ่มพนักงานแล้วหรือไม่`);
      console.error('Cannot find employee:', displayName, 'in', employees);
      return;
    }
    if(!pin || pin.trim() === "") {
      alert('⚠️ กรุณากรอก PIN');
      return;
    }
    if(pin !== emp.pin) {
      setShowPinError(true);
      setTimeout(() => setShowPinError(false), 3000);
      return;
    }
    if(!proofImage) {
      alert('⚠️ กรุณาอัปโหลดรูปหลักฐานการเข้าเซิฟเวอร์');
      return;
    }
    handleClockIn(proofImage);
    setPin("");
    setProofImage(null);
    setProofPreview(null);
    setShowPinError(false);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="text-xl font-semibold text-slate-800">เข้างาน</div>
        
        {activeEmployees.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ <strong>ยังไม่มีพนักงานในระบบ</strong><br/>
            กรุณาให้เจ้าของระบบเพิ่มพนักงานที่หน้า "พนักงาน" ก่อน
          </div>
        )}

        <Card title="ข้อมูลผู้ใช้">
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-slate-500 text-xs">เลือกพนักงาน <span className="text-rose-500">*</span></label>
              <select 
                value={displayName} 
                onChange={e=>{
                  const emp = employees.find(emp => emp.name === e.target.value);
                  setDisplayName(e.target.value);
                  if(emp) setSelectedAgency(emp.agency);
                  setPin("");
                  setShowPinError(false);
                }}
                disabled={activeEmployees.length === 0 || activeLog}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {activeEmployees.length ? activeEmployees.map(e => (
                  <option key={e.id} value={e.name}>{e.name} ({agencyLabel(e.agency)})</option>
                )) : <option value="">ไม่มีพนักงาน</option>}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-slate-500 text-xs">หน่วยงาน</label>
              <input 
                value={agencyLabel(selectedAgency)} 
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" 
              />
            </div>
            <div className="text-xs text-slate-500">เวลาปัจจุบัน: <span className="font-mono text-slate-800">{now.toLocaleTimeString()}</span></div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="บันทึกเวลาเข้างาน">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-4xl font-semibold text-slate-800">{activeLog? "เข้างานแล้ว" : "พร้อมเข้างาน"}</div>
            <div className="text-sm text-slate-500">{displayName} • {agencyLabel(selectedAgency)}</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-2xl text-slate-800">{now.toLocaleTimeString()}</div>
            {activeLog && (
              <div className="text-xs text-emerald-600 font-medium">เริ่มเข้างาน: <span className="font-mono">{activeLog.clockInAt.toLocaleTimeString()}</span></div>
            )}
            
            {!activeLog && (
              <div className="w-full max-w-md space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 text-center">
                    🔒 ยืนยันตัวตน - กรอก PIN
                  </label>
                  <input 
                    type="text"
                    value={pin}
                    onChange={e => {
                      setPin(e.target.value);
                      setShowPinError(false);
                    }}
                    onKeyPress={e => e.key === 'Enter' && handleClockInWithPin()}
                    placeholder="กรอก PIN"
                    maxLength="6"
                    disabled={activeEmployees.length === 0}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-mono tracking-widest disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  {showPinError && (
                    <div className="mt-2 text-sm text-rose-600 text-center">
                      ❌ PIN ไม่ถูกต้อง
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 text-center">
                    📸 หลักฐานการเข้าเซิฟเวอร์ <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={activeEmployees.length === 0}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {proofPreview && (
                    <div className="mt-3 relative">
                      <img src={proofPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setProofImage(null);
                          setProofPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-2 hover:bg-rose-700 shadow-lg transition-all"
                        title="ลบรูป"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-500 text-center">
                    รองรับ: JPG, PNG, GIF (สูงสุด 5MB)<br />
                    💡 Tip: กด Ctrl + V เพื่อวางรูป Screenshot โดยตรง
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2">
              <button 
                onClick={handleClockInWithPin} 
                disabled={activeEmployees.length === 0 || activeLog || !pin || !proofImage}
                className="rounded-xl bg-emerald-600 px-8 py-4 text-lg text-white hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {activeLog ? "เข้างานแล้ว ✓" : "เข้างาน"}
              </button>
            </div>
            {activeLog && (
              <div className="mt-2 text-sm text-amber-600">
                ⚠️ กรุณาไปที่หน้า "ออกงาน" เพื่อบันทึกเวลาออกงาน
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ClockOutSection({ now, selectedAgency, setSelectedAgency, displayName, setDisplayName, activeLog, handleClockOut, employees }){
  const activeEmployees = employees.filter(e => e.status === 'active');
  const [pin, setPin] = useState("");
  const [showPinError, setShowPinError] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  function processImageFile(file) {
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) {
      alert('⚠️ ขนาดไฟล์ใหญ่เกิน 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleImageUpload(e){
    const file = e.target.files[0];
    processImageFile(file);
  }

  function handlePaste(e){
    const items = e.clipboardData?.items;
    if(!items) return;
    
    for(let i = 0; i < items.length; i++) {
      if(items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processImageFile(file);
        e.preventDefault();
        break;
      }
    }
  }

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  function handleClockOutWithPin(){
    if(!displayName || displayName.trim() === "") {
      alert('⚠️ กรุณาเลือกพนักงานก่อน');
      return;
    }
    const emp = employees.find(e => e.name.trim() === displayName.trim());
    if(!emp) {
      alert(`⚠️ ไม่พบพนักงาน "${displayName}" ในระบบ\nกรุณาตรวจสอบว่าได้เพิ่มพนักงานแล้วหรือไม่`);
      console.error('Cannot find employee:', displayName, 'in', employees);
      return;
    }
    if(!pin || pin.trim() === "") {
      alert('⚠️ กรุณากรอก PIN');
      return;
    }
    if(pin !== emp.pin) {
      setShowPinError(true);
      setTimeout(() => setShowPinError(false), 3000);
      return;
    }
    if(!proofImage) {
      alert('⚠️ กรุณาอัปโหลดรูปหลักฐานการออกเซิฟเวอร์');
      return;
    }
    handleClockOut(proofImage);
    setPin("");
    setProofImage(null);
    setProofPreview(null);
    setShowPinError(false);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="text-xl font-semibold text-slate-800">ออกงาน</div>
        
        {activeEmployees.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ <strong>ยังไม่มีพนักงานในระบบ</strong><br/>
            กรุณาให้เจ้าของระบบเพิ่มพนักงานที่หน้า "พนักงาน" ก่อน
          </div>
        )}

        <Card title="ข้อมูลผู้ใช้">
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-slate-500 text-xs">เลือกพนักงาน <span className="text-rose-500">*</span></label>
              <select 
                value={displayName} 
                onChange={e=>{
                  const emp = employees.find(emp => emp.name === e.target.value);
                  setDisplayName(e.target.value);
                  if(emp) setSelectedAgency(emp.agency);
                  setPin("");
                  setShowPinError(false);
                }}
                disabled={activeEmployees.length === 0}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {activeEmployees.length ? activeEmployees.map(e => (
                  <option key={e.id} value={e.name}>{e.name} ({agencyLabel(e.agency)})</option>
                )) : <option value="">ไม่มีพนักงาน</option>}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-slate-500 text-xs">หน่วยงาน</label>
              <input 
                value={agencyLabel(selectedAgency)} 
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" 
              />
            </div>
            <div className="text-xs text-slate-500">เวลาปัจจุบัน: <span className="font-mono text-slate-800">{now.toLocaleTimeString()}</span></div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="บันทึกเวลาออกงาน">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-4xl font-semibold text-slate-800">{activeLog? "กำลังทำงานอยู่" : "ยังไม่ได้เข้างาน"}</div>
            <div className="text-sm text-slate-500">{displayName} • {agencyLabel(selectedAgency)}</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-2xl text-slate-800">{now.toLocaleTimeString()}</div>
            {activeLog && (
              <div className="text-xs text-slate-500">เริ่มเข้างาน: <span className="font-mono text-slate-800">{activeLog.clockInAt.toLocaleTimeString()}</span></div>
            )}
            
            {activeLog && (
              <div className="w-full max-w-md space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 text-center">
                    🔒 ยืนยันตัวตน - กรอก PIN
                  </label>
                  <input 
                    type="text"
                    value={pin}
                    onChange={e => {
                      setPin(e.target.value);
                      setShowPinError(false);
                    }}
                    onKeyPress={e => e.key === 'Enter' && handleClockOutWithPin()}
                    placeholder="กรอก PIN"
                    maxLength="6"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-mono tracking-widest focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  {showPinError && (
                    <div className="mt-2 text-sm text-rose-600 text-center">
                      ❌ PIN ไม่ถูกต้อง
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 text-center">
                    📸 หลักฐานการออกเซิฟเวอร์ <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                  />
                  {proofPreview && (
                    <div className="mt-3 relative">
                      <img src={proofPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setProofImage(null);
                          setProofPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-2 hover:bg-rose-700 shadow-lg transition-all"
                        title="ลบรูป"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-500 text-center">
                    รองรับ: JPG, PNG, GIF (สูงสุด 5MB)<br />
                    💡 Tip: กด Ctrl + V เพื่อวางรูป Screenshot โดยตรง
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2">
              <button 
                onClick={handleClockOutWithPin}
                disabled={!activeLog || !pin || !proofImage}
                className="rounded-xl bg-rose-600 px-8 py-4 text-lg text-white hover:bg-rose-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                ออกงาน
              </button>
            </div>
            {!activeLog && (
              <div className="mt-2 text-sm text-amber-600">
                ⚠️ กรุณาเข้างานก่อนที่หน้า "เข้างาน"
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LateSection({ logs, ownerUnlocked }){
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const filteredLateLogs = useMemo(() => {
    let filtered = logs.filter(l=>l.late);
    if(dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      filtered = filtered.filter(l => l.clockInAt >= from);
    }
    if(dateTo) {
      const to = new Date(dateTo);
      to.setHours(23,59,59,999);
      filtered = filtered.filter(l => l.clockInAt <= to);
    }
    return filtered;
  }, [logs, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">มาสาย</div>
      
      <Card title="ตัวกรองวันที่">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="mb-1 block text-xs text-slate-500">จากวันที่</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e=>setDateFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">ถึงวันที่</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e=>setDateTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <button 
              onClick={()=>{setDateFrom("");setDateTo("");}}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          แสดง {filteredLateLogs.length} รายการมาสาย
        </div>
      </Card>

      <Card title="รายการมาสาย">
        {!ownerUnlocked && <div className="mb-3 text-slate-500">(ซ่อน — ต้องปลดล็อกเจ้าของระบบ)</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">ชื่อ</th><th className="py-2">หน่วยงาน</th><th className="py-2">เวลาเข้างาน</th><th className="py-2">นาทีรวม</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {ownerUnlocked ? (
                filteredLateLogs.length? filteredLateLogs.map(l=> (
                  <tr key={l.id}>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2">{agencyLabel(l.agency)}</td>
                    <td className="py-2 font-mono">{l.clockInAt.toLocaleString('th-TH')}</td>
                    <td className="py-2 font-mono">{l.minutes}</td>
                  </tr>
                )): (<tr><td className="py-4 text-slate-500" colSpan={4}>ไม่มีผู้มาสายในช่วงเวลานี้</td></tr>)
              ) : (
                <tr><td className="py-4 text-slate-500" colSpan={4}>ถูกล็อก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LeaveSection({ ownerUnlocked, selectedAgency, setSelectedAgency, displayName, leaveForm, setLeaveForm, submitLeave, leaveRequests, approveLeave }){
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const filteredLeaves = useMemo(() => {
    let filtered = leaveRequests;
    if(filterMonth) {
      const [year, month] = filterMonth.split('-');
      filtered = filtered.filter(r => {
        const leaveDate = new Date(r.from);
        return leaveDate.getFullYear() === parseInt(year) && (leaveDate.getMonth() + 1) === parseInt(month);
      });
    }
    if(filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    return filtered;
  }, [leaveRequests, filterMonth, filterStatus]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="text-xl font-semibold text-slate-800">การลา</div>
        <Card title="ยื่นคำขอลา">
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-500">ชื่อที่แสดง</label>
              <input value={displayName} readOnly className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">หน่วยงาน</label>
              <select value={selectedAgency} onChange={e=>setSelectedAgency(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                {AGENCIES.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">ตั้งแต่</label>
                <input type="date" value={leaveForm.from} onChange={e=>setLeaveForm({...leaveForm, from:e.target.value})} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">ถึง</label>
                <input type="date" value={leaveForm.to} onChange={e=>setLeaveForm({...leaveForm, to:e.target.value})} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">เหตุผล</label>
              <textarea value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm, reason:e.target.value})} className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2" />
            </div>
            <div className="flex justify-end"><button onClick={submitLeave} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-500">ส่งคำขอลา</button></div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <Card title="ตัวกรอง">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-end">
            <div>
              <label className="mb-1 block text-xs text-slate-500">เดือน/ปี</label>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={e=>setFilterMonth(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">สถานะ</label>
              <select 
                value={filterStatus} 
                onChange={e=>setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">ทั้งหมด</option>
                <option value="รออนุมัติ">รออนุมัติ</option>
                <option value="อนุมัติ">อนุมัติ</option>
                <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
              </select>
            </div>
            <div>
              <button 
                onClick={()=>{setFilterMonth("");setFilterStatus("all");}}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            แสดง {filteredLeaves.length} รายการจากทั้งหมด {leaveRequests.length} รายการ
          </div>
        </Card>

        <Card title="คำขอลาทั้งหมด">
          {!ownerUnlocked && <div className="mb-3 text-slate-500">(ซ่อน — ต้องปลดล็อกเจ้าของระบบเพื่ออนุมัติ)</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500"><tr><th className="py-2">ชื่อ</th><th className="py-2">หน่วยงาน</th><th className="py-2">ช่วงเวลา</th><th className="py-2">เหตุผล</th><th className="py-2">สถานะ</th><th className="py-2">การทำงาน</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeaves.length? filteredLeaves.map(r=> (
                  <tr key={r.id}>
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">{agencyLabel(r.agency)}</td>
                    <td className="py-2 font-mono">{r.from} → {r.to}</td>
                    <td className="py-2">{r.reason}</td>
                    <td className="py-2">{r.status==='รออนุมัติ'? <Pill tone="warn">รออนุมัติ</Pill> : r.status==='อนุมัติ'? <Pill tone="good">อนุมัติ</Pill> : <Pill tone="bad">ไม่อนุมัติ</Pill>}</td>
                    <td className="py-2">
                      {ownerUnlocked ? (
                        <div className="flex gap-2">
                          <button onClick={()=>approveLeave(r.id,true)} className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500">อนุมัติ</button>
                          <button onClick={()=>approveLeave(r.id,false)} className="rounded-md bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500">ไม่อนุมัติ</button>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                )) : (
                  <tr><td className="py-4 text-slate-500" colSpan={6}>ไม่มีคำขอในช่วงเวลานี้</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OvertimeSection({ logs, ownerUnlocked }){
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const filteredOT = useMemo(() => {
    let filtered = logs.filter(l => l.minutes > 8*60);
    if(dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      filtered = filtered.filter(l => l.clockInAt >= from);
    }
    if(dateTo) {
      const to = new Date(dateTo);
      to.setHours(23,59,59,999);
      filtered = filtered.filter(l => l.clockInAt <= to);
    }
    return filtered;
  }, [logs, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">ล่วงเวลา</div>
      
      <Card title="ตัวกรองวันที่">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="mb-1 block text-xs text-slate-500">จากวันที่</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e=>setDateFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">ถึงวันที่</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e=>setDateTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <button 
              onClick={()=>{setDateFrom("");setDateTo("");}}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          แสดง {filteredOT.length} รายการล่วงเวลา (ทำงานเกิน 8 ชม.)
        </div>
      </Card>

      <Card title="เซสชันเกิน 8 ชั่วโมง">
        {!ownerUnlocked && <div className="mb-3 text-slate-500">(ซ่อน — ต้องปลดล็อกเจ้าของระบบ)</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">ชื่อ</th><th className="py-2">หน่วยงาน</th><th className="py-2">เข้างาน</th><th className="py-2">ออกงาน</th><th className="py-2">นาที</th><th className="py-2">ชั่วโมง</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {ownerUnlocked ? (
                filteredOT.length? filteredOT.map(l => (
                  <tr key={l.id}>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2">{agencyLabel(l.agency)}</td>
                    <td className="py-2 font-mono">{l.clockInAt.toLocaleString('th-TH')}</td>
                    <td className="py-2 font-mono">{l.clockOutAt.toLocaleString('th-TH')}</td>
                    <td className="py-2 font-mono">{l.minutes}</td>
                    <td className="py-2 font-mono font-semibold text-orange-600">{(l.minutes/60).toFixed(1)} ชม.</td>
                  </tr>
                )) : (
                  <tr><td className="py-4 text-slate-500" colSpan={6}>ไม่พบล่วงเวลาในช่วงเวลานี้</td></tr>
                )
              ) : (
                <tr><td className="py-4 text-slate-500" colSpan={6}>ถูกล็อก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

