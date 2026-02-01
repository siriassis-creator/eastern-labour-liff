// @ts-nocheck
import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, orderBy, 
  serverTimestamp, doc, updateDoc, deleteDoc, where, setDoc, 
  arrayUnion, arrayRemove, getDocs, getDoc 
} from 'firebase/firestore';
import { 
  Users, Briefcase, Plus, Save, Trash2, Edit2, AlertTriangle, MapPin, 
  ChevronLeft, Home, X, CheckCircle2, XCircle, Settings, Building2, 
  Wrench, Phone, MessageSquare, GraduationCap, Calendar, PieChart, 
  FileText, UserPlus, PlusCircle, TrendingUp, Activity, Clock, 
  UserCheck, Smartphone, Send, Check, LogIn, BookOpen, User,
  DollarSign, Map, File, ChevronRight, Star, Search, Hand, Timer,
  History, Award, ThumbsUp, XOctagon, Navigation, Flag
} from 'lucide-react';

// --- ⚠️ ใส่รหัส LIFF ID ของคุณตรงนี้ ---
const MY_LIFF_ID = "2008980414-aaHkCCCk"; 

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAMgICfRxXC9CmHrsMUCjPgzTCLsZMKKHc",
  authDomain: "manpower-de277.firebaseapp.com",
  projectId: "manpower-de277",
  storageBucket: "manpower-de277.firebasestorage.app",
  messagingSenderId: "594930395546",
  appId: "1:594930395546:web:c1b7595bc9fefaebf8f223",
  measurementId: "G-0LG8HEFTJ6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Default Data ---
const DEFAULT_SKILLS = ["ขับรถ", "แม่บ้าน", "ยกของ", "ช่างไฟ", "ทำอาหาร", "เสิร์ฟ", "พนักงานขาย", "IT Support", "แปลภาษา", "ดูแลผู้สูงอายุ", "PC", "MC"];
const DEFAULT_COMPANIES = ["CP All", "Central Group", "ThaiBev", "True Corp", "SCG", "PTT", "Big C", "Lotus's"];
const EDUCATION_LEVELS = ["ต่ำกว่า ม.6", "ม.6", "ปวช.", "ปวส. / อนุปริญญา", "ปริญญาตรี", "ปริญญาโท หรือสูงกว่า"];

const EDU_RANK = { "ต่ำกว่า ม.6": 0, "ม.6": 1, "ปวช.": 2, "ปวส. / อนุปริญญา": 3, "ปริญญาตรี": 4, "ปริญญาโท หรือสูงกว่า": 5 };

// --- Helpers ---
const formatDateThai = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTimeThai = (isoString) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' });
};

const formatDateTimeThai = (isoString) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
}

const calculateMatchScore = (worker, job) => {
  let totalCriteria = 0;
  let passedCriteria = 0;
  
  if (worker.status !== 'active') return 0;

  if (job.requiredEducation) {
     totalCriteria += 2;
     const jobRank = EDU_RANK[job.requiredEducation] || 0;
     const workerRank = EDU_RANK[worker.education] || 0;
     if (workerRank >= jobRank) passedCriteria += 2;
  }
  if (job.requiredSkills && job.requiredSkills.length > 0) {
     totalCriteria += job.requiredSkills.length;
     const workerSkills = worker.skills || [];
     const matchedSkillsCount = job.requiredSkills.filter(skill => workerSkills.includes(skill)).length;
     passedCriteria += matchedSkillsCount;
  }
  if (totalCriteria === 0) return 100;
  return Math.round((passedCriteria / totalCriteria) * 100);
};

// --- Components ---
const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    open: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    closed: "bg-slate-100 text-slate-500 border-slate-200", 
    blacklisted: "bg-rose-100 text-rose-700 border-rose-200",
    waiting_confirm: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-gray-100 text-gray-600 border-gray-300"
  };
  const label = { 
      active: "พร้อมทำงาน", 
      open: "เปิดรับสมัคร", 
      pending: "รอสัมภาษณ์", 
      inactive: "ไม่ว่าง", 
      closed: "ปิดรับสมัคร", 
      blacklisted: "Blacklist", 
      waiting_confirm: "รอพนักงานยืนยัน",
      completed: "จบงานแล้ว"
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${styles[status] || styles.inactive} flex items-center justify-center w-full min-w-[80px] gap-1 shadow-sm`}>
      {label[status] || status}
    </span>
  );
};

const ConfigModal = ({ title, items, onAdd, onDelete, onClose, icon: Icon }) => {
  const [newItem, setNewItem] = useState("");
  const handleAdd = () => { if (newItem.trim()) { onAdd(newItem.trim()); setNewItem(""); } };
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center">{Icon && <Icon size={18} className="mr-2 text-indigo-600"/>} {title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-1"><X size={16}/></button></div>
        <div className="p-4 border-b border-slate-100 bg-white"><div className="flex gap-2"><input className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm" placeholder="ระบุชื่อรายการใหม่..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700">เพิ่ม</button></div></div>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">{items.length === 0 ? <div className="text-center text-slate-400 py-8 text-sm">ไม่มีรายการ</div> : (<div className="space-y-2 p-2">{items.map((item, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-200 shadow-sm rounded-xl"><span className="text-slate-700 text-sm font-medium">{item}</span><button onClick={() => onDelete(item)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button></div>))}</div>)}</div>
      </div>
    </div>
  );
};

const AppIcon = ({ icon: Icon, label, color, badge, onClick }) => (
  <button onClick={onClick} className={`relative w-full aspect-[5/4] ${color} rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group overflow-hidden flex flex-col items-center justify-center`}>
    <Icon size={160} className="absolute -right-8 -bottom-8 text-white/10 group-hover:rotate-12 transition-transform duration-500 pointer-events-none" />
    <div className="bg-white/20 p-4 rounded-3xl mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 shadow-inner"><Icon size={48} className="text-white drop-shadow-md" /></div>
    <span className="text-white font-bold text-lg md:text-xl tracking-wide drop-shadow-sm px-2 relative z-10">{label}</span>
    {badge > 0 && <div className="absolute top-4 right-4 bg-white text-red-600 text-sm md:text-base font-extrabold px-3 py-1 rounded-full shadow-lg min-w-[2rem] z-20 animate-pulse border-2 border-red-100">{badge > 99 ? '99+' : badge}</div>}
  </button>
);

const WorkerProfileModal = ({ worker, onClose }) => {
  if (!worker) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="bg-slate-900 text-white p-6 relative">
             <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"><X size={20}/></button>
             <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-slate-700">
                   {worker.linePictureUrl ? <img src={worker.linePictureUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><User size={32}/></div>}
                </div>
                <div>
                   <h2 className="text-xl font-bold">{worker.name}</h2>
                   <div className="flex items-center gap-2 text-slate-300 text-sm mt-1"><Phone size={14}/> {worker.phone}</div>
                   <div className="mt-2 inline-block"><StatusBadge status={worker.status}/></div>
                </div>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-700 border-b pb-2 flex items-center"><UserCheck size={18} className="mr-2 text-indigo-500"/> ข้อมูลส่วนตัว</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div><div className="text-slate-400 text-xs">วุฒิการศึกษา</div><div className="font-medium">{worker.education || '-'}</div></div>
                   <div><div className="text-slate-400 text-xs">เลขบัตร ปชช.</div><div className="font-medium">{worker.idCard || '-'}</div></div>
                   <div className="col-span-2"><div className="text-slate-400 text-xs">ที่อยู่</div><div className="font-medium">{worker.address || '-'}</div></div>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center"><Award size={18} className="mr-2 text-orange-500"/> ทักษะ & ประสบการณ์</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                   {worker.skills?.map(s => <span key={s} className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs border border-orange-100">{s}</span>)}
                </div>
                <div className="text-sm">
                   <div className="text-slate-400 text-xs mb-1">ประสบการณ์ทำงานเดิม</div>
                   <div className="p-3 bg-slate-50 rounded-lg text-slate-600">{worker.experience || '-'}</div>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center"><History size={18} className="mr-2 text-green-600"/> ประวัติการทำงานกับเรา</h3>
                {worker.workHistory && worker.workHistory.length > 0 ? (
                   <div className="space-y-3">
                      {worker.workHistory.slice().reverse().map((history, idx) => (
                         <div key={idx} className="flex gap-3 text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex flex-col items-center justify-center bg-white border border-slate-200 w-12 h-12 rounded-lg shrink-0">
                               <div className="text-xs text-slate-400">ทำ</div>
                               <div className="font-bold text-indigo-600">{history.duration}</div>
                               <div className="text-[10px] text-slate-400">วัน</div>
                            </div>
                            <div className="flex-1">
                               <div className="font-bold text-slate-800">{history.jobTitle}</div>
                               <div className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={10}/> {history.companyName}</div>
                               <div className="text-[10px] text-slate-400 mt-1">{history.period}</div>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="text-center py-6 text-slate-400 text-sm">ยังไม่มีประวัติการรับงาน</div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

// --- Registration View ---
const RegistrationView = () => {
  const [formData, setFormData] = useState({ 
    name: '', phone: '', education: '', skills: [], 
    idCard: '', address: '', experience: '', refName: '', refPhone: '', 
    training: '', lineUserId: '', lineDisplayName: '', linePictureUrl: '' 
  });
  const [liffState, setLiffState] = useState({ isInit: false, isLoggedIn: false });
  const [liffError, setLiffError] = useState(null);
  const [skillsList, setSkillsList] = useState(DEFAULT_SKILLS);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: MY_LIFF_ID });
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          const q = query(collection(db, 'users'), where('lineUserId', '==', p.userId));
          const snap = await getDocs(q);
          if(!snap.empty) {
             setIsAlreadyRegistered(true);
             return;
          }
          setFormData(f => ({...f, lineUserId: p.userId, lineDisplayName: p.displayName, linePictureUrl: p.pictureUrl, name: p.displayName}));
          setLiffState({ isInit: true, isLoggedIn: true });
        } else {
           liff.login();
        }
      } catch (e) { 
        console.error('LIFF Init Error:', e);
        setLiffError(e.message);
      }
    };
    initLiff();
    const unsub = onSnapshot(doc(db, 'system_settings', 'config'), d => { 
        if(d.exists() && d.data().skills) setSkillsList(d.data().skills); 
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
     if(!formData.name || !formData.phone) return alert('กรุณากรอกชื่อและเบอร์โทร');
     try {
        await addDoc(collection(db, 'users'), { ...formData, role: 'worker', status: 'pending', registeredAt: serverTimestamp(), source: 'line_oa' });
        alert('ลงทะเบียนสำเร็จ! เจ้าหน้าที่จะตรวจสอบข้อมูลและติดต่อกลับ');
        if (liff.isInClient()) {
            liff.closeWindow();
        }
     } catch(e) {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + e.message);
     }
  };

  const toggleSkill = (s) => {
     setFormData(prev => ({
        ...prev,
        skills: prev.skills.includes(s) ? prev.skills.filter(x => x !== s) : [...prev.skills, s]
     }));
  };

  if(isAlreadyRegistered) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center">
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">คุณลงทะเบียนแล้ว</h2>
              <p className="text-slate-500">ข้อมูลของคุณอยู่ในระบบเรียบร้อยแล้ว<br/>รอการติดต่อกลับจากเจ้าหน้าที่</p>
           </div>
        </div>
     );
  }

  if (liffError) return <div className="p-10 text-center text-red-500">Error: {liffError}</div>;
  if (!liffState.isLoggedIn) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Activity className="animate-spin mr-2"/> กำลังเชื่อมต่อ LINE...</div>;

  return (
     <div className="min-h-screen bg-slate-100 py-10 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
           <div className="bg-slate-900 text-white p-6 text-center">
              <h1 className="text-2xl font-bold">ลงทะเบียนสมัครงาน</h1>
              <p className="text-slate-400 text-sm mt-1">กรอกข้อมูลเพื่อเริ่มรับงานกับเรา</p>
           </div>
           <div className="p-6 space-y-4">
              <div className="flex items-center justify-center mb-6">
                 {formData.linePictureUrl ? <img src={formData.linePictureUrl} className="w-20 h-20 rounded-full border-4 border-slate-100 shadow-sm"/> : <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center"><User size={32} className="text-slate-400"/></div>}
              </div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล</label><input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์</label><input className="w-full border p-3 rounded-xl bg-slate-50" type="tel" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">เลขบัตรประชาชน</label><input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.idCard} onChange={e=>setFormData({...formData,idCard:e.target.value})}/></div>
              <div>
                 <label className="text-sm font-bold text-slate-700 block mb-1">วุฒิการศึกษา</label>
                 <select className="w-full border p-3 rounded-xl bg-slate-50" value={formData.education} onChange={e=>setFormData({...formData,education:e.target.value})}>
                    <option value="">-- เลือกวุฒิ --</option>
                    {EDUCATION_LEVELS.map(e=><option key={e} value={e}>{e}</option>)}
                 </select>
              </div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">ที่อยู่ปัจจุบัน</label><textarea className="w-full border p-3 rounded-xl bg-slate-50" rows={2} value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
              <div>
                 <label className="text-sm font-bold text-slate-700 block mb-2">ทักษะความสามารถ</label>
                 <div className="flex flex-wrap gap-2">
                    {skillsList.map(s => (
                       <button key={s} onClick={()=>toggleSkill(s)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${formData.skills.includes(s) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>
                          {s}
                       </button>
                    ))}
                 </div>
              </div>
              <button onClick={handleSubmit} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg mt-4 flex items-center justify-center">
                 <Save size={20} className="mr-2"/> ยืนยันข้อมูล
              </button>
           </div>
        </div>
     </div>
  );
};

// --- Dashboard View (Admin) ---
const DashboardView = ({ workers, jobs, onJobClick, onViewWorker, onAssignWorker, onUpdateStatus }) => {
  const activeJobs = jobs.filter(j => {
     if (j.status !== 'open') return false;
     if (j.endDate && new Date(j.endDate) < new Date().setHours(0,0,0,0)) return false;
     return true;
  });

  const jobsWithMatch = activeJobs.map(job => {
     const matches = workers
        .map(w => ({ ...w, score: calculateMatchScore(w, job) }))
        .filter(w => w.score > 0)
        .sort((a, b) => b.score - a.score);
     return { ...job, matches };
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
       {/* Summary Cards */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-bold text-slate-800 mb-1">{workers.length}</div>
             <div className="text-xs text-slate-500">ฐานข้อมูลทั้งหมด</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-bold text-emerald-600 mb-1">{workers.filter(w=>w.status==='active').length}</div>
             <div className="text-xs text-slate-500">พร้อมทำงาน</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-bold text-indigo-600 mb-1">{activeJobs.length}</div>
             <div className="text-xs text-slate-500">งานเปิดรับสมัคร</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-bold text-orange-600 mb-1">{workers.filter(w=>w.status==='pending').length}</div>
             <div className="text-xs text-slate-500">รอตรวจสอบ</div>
          </div>
       </div>

       {/* Job Matching Section */}
       <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Star className="mr-2 text-yellow-500" fill="currentColor"/> จับคู่งานอัตโนมัติ (Job Matching)</h2>
          
          {jobsWithMatch.length === 0 ? (
             <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                ไม่มีงานที่เปิดรับสมัครในขณะนี้
             </div>
          ) : (
             <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {jobsWithMatch.map(job => (
                   <div key={job.id} 
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
                        onClick={() => onJobClick(job)} 
                   >
                      <div className="p-5 flex-1">
                         <div className="flex justify-between items-start mb-2">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                               รับ {job.headcount} อัตรา
                            </span>
                            <span className="text-[10px] text-slate-400">
                               หมดเขต: {formatDateThai(job.endDate)}
                            </span>
                         </div>
                         <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{job.title}</h3>
                         <div className="text-sm text-slate-500 mb-3 flex items-center"><Building2 size={14} className="mr-1"/> {job.companyName}</div>
                         
                         <div className="flex items-center justify-between mt-4 bg-slate-50 p-3 rounded-xl">
                            <div className="flex items-center text-sm font-bold text-slate-700">
                               <Users size={18} className="mr-2 text-indigo-600"/>
                               {job.matches.length} คน (Match)
                            </div>
                            <div className="text-xs text-indigo-600 font-bold flex items-center">
                               ดูรายชื่อ <ChevronRight size={14}/>
                            </div>
                         </div>
                         {/* แสดงยอดจอง */}
                         {job.interestedCandidates?.length > 0 && (
                            <div className="mt-2 text-xs text-orange-600 font-bold flex items-center">
                               <Hand size={12} className="mr-1"/> มีคนกดสนใจแล้ว {job.interestedCandidates.length} คน
                            </div>
                         )}
                      </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
};

// --- ReportsView ---
const ReportsView = ({ workers, jobs }) => (
  <div className="p-6 max-w-5xl mx-auto">
     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
           <h3 className="font-bold text-lg text-slate-800 flex items-center"><FileText size={20} className="mr-2 text-indigo-600"/> รายงานสรุปข้อมูล</h3>
        </div>
        <div className="p-6">
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 rounded-l-lg">หัวข้อรายงาน</th><th className="p-3">จำนวนรายการ</th><th className="p-3 rounded-r-lg text-right">สถานะ</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                 <tr><td className="p-3 font-medium">พนักงานในระบบทั้งหมด</td><td className="p-3">{workers.length} คน</td><td className="p-3 text-right text-green-600">ปกติ</td></tr>
                 <tr><td className="p-3 font-medium">ตำแหน่งงานทั้งหมด</td><td className="p-3">{jobs.length} ตำแหน่ง</td><td className="p-3 text-right text-green-600">ปกติ</td></tr>
                 <tr><td className="p-3 font-medium">พนักงานติด Blacklist</td><td className="p-3">{workers.filter(w => w.status === 'blacklisted').length} คน</td><td className="p-3 text-right text-red-500">ต้องตรวจสอบ</td></tr>
              </tbody>
           </table>
        </div>
     </div>
  </div>
);

// --- MyJobsView (Updated: Complete Job Button + Theme) ---
const MyJobsView = ({ onRedirectRegister }) => {
   const [loading, setLoading] = useState(true);
   const [user, setUser] = useState(null);
   const [assignedJobs, setAssignedJobs] = useState([]);

   useEffect(() => {
      let unsubUser = () => {};
      
      const init = async () => {
         try {
            await liff.init({ liffId: MY_LIFF_ID });
            if (!liff.isLoggedIn()) { liff.login(); return; }
            
            const profile = await liff.getProfile();
            const q = query(collection(db, 'users'), where('lineUserId', '==', profile.userId));
            const snap = await getDocs(q);
            
            if (snap.empty) { onRedirectRegister(); return; }
            
            const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setUser(userData);

            unsubUser = onSnapshot(doc(db, 'users', userData.id), async (docSnap) => {
               if (docSnap.exists()) {
                  const data = docSnap.data();
                  if (data.assignedJob) {
                     const jobRef = await getDoc(doc(db, 'jobs', data.assignedJob.jobId));
                     if (jobRef.exists()) {
                        setAssignedJobs([{ ...jobRef.data(), id: jobRef.id, assignStatus: data.assignedJob.status }]);
                     }
                  } else {
                     setAssignedJobs([]);
                  }
               }
               setLoading(false);
            });

         } catch (e) { console.error(e); setLoading(false); }
      };
      init();
      return () => unsubUser();
   }, []);

   const handleResponse = async (status, job) => {
      if (!user) return;
      try {
         // Update user assigned job status
         await updateDoc(doc(db, 'users', user.id), {
            'assignedJob.status': status,
            'assignedJob.updatedAt': new Date().toISOString()
         });

         if (status === 'accepted') {
            if (liff.isInClient()) liff.sendMessages([{ type: "text", text: `✅ ยืนยันรับงาน: ${job.title}\nวันที่: ${formatDateThai(job.startDate)}` }]);
            alert("ยืนยันรับงานเรียบร้อย");
         } else if (status === 'completed') {
            if (liff.isInClient()) liff.sendMessages([{ type: "text", text: `🏁 จบงานเรียบร้อย: ${job.title}` }]);
            alert("บันทึกจบงานเรียบร้อย ขอบคุณครับ");
         } else if (status === 'rejected') {
            await updateDoc(doc(db, 'users', user.id), { assignedJob: null });
            alert("ปฏิเสธงานเรียบร้อย");
         }
      } catch (e) { alert("Error: " + e.message); }
   };

   if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Activity className="animate-spin mr-2"/> กำลังโหลดงานของคุณ...</div>;

   return (
      <div className="min-h-screen bg-slate-100 pb-10">
         <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
            <h1 className="text-xl font-bold flex items-center"><Briefcase className="mr-2 text-yellow-400"/> งานของฉัน (My Jobs)</h1>
            <div className="text-xs text-slate-400 mt-1">รายการงานที่ได้รับมอบหมาย</div>
         </div>

         <div className="p-4 space-y-4">
            {assignedJobs.length === 0 ? (
               <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed"><Search size={48} className="mx-auto mb-2 opacity-50"/><p>ยังไม่มีงานที่ได้รับมอบหมาย</p></div>
            ) : (
               assignedJobs.map(job => {
                  const isAccepted = job.assignStatus === 'accepted';
                  const isCompleted = job.assignStatus === 'completed';
                  
                  // Theme Logic: Completed = Gray, Accepted = Green, Waiting = Indigo
                  const headerColor = isCompleted ? 'bg-slate-500' : (isAccepted ? 'bg-green-600' : 'bg-indigo-600');
                  const headerText = isCompleted ? 'JOB COMPLETED' : (isAccepted ? 'CONFIRMED' : 'JOB OFFER');

                  return (
                    <div key={job.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden border ${isCompleted ? 'border-slate-300 grayscale' : 'border-slate-200'}`}>
                        <div className={`p-4 text-white flex justify-between items-center ${headerColor}`}>
                            <div className="font-bold text-lg">{headerText}</div>
                            <div className="bg-white/20 px-2 py-1 rounded text-xs font-mono">ID: {job.id.slice(0,6)}</div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="text-center pb-4 border-b border-dashed border-slate-300">
                                <h2 className="text-2xl font-bold text-slate-800 mb-1">{job.title}</h2>
                                <div className="text-slate-500 font-medium flex items-center justify-center"><Building2 size={16} className="mr-2"/> {job.companyName}</div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                <Calendar className="text-indigo-500 shrink-0 mt-0.5" size={20}/>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Date & Time</div>
                                    <div className="text-slate-800 font-medium">{formatDateThai(job.startDate)} - {formatDateThai(job.endDate)}</div>
                                </div>
                                </div>
                                <div className="flex items-start gap-3">
                                <DollarSign className="text-green-600 shrink-0 mt-0.5" size={20}/>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Wage</div>
                                    <div className="text-slate-800 font-medium">{job.wage} บาท / วัน</div>
                                </div>
                                </div>
                                <div className="flex items-start gap-3">
                                <MapPin className="text-red-500 shrink-0 mt-0.5" size={20}/>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Location</div>
                                    <div className="text-slate-800 font-medium mb-1">{job.address}</div>
                                    {job.locationUrl && (
                                        <a href={job.locationUrl} target="_blank" className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold inline-flex items-center hover:bg-blue-100">
                                            <Navigation size={12} className="mr-1"/> แผนที่นำทาง
                                        </a>
                                    )}
                                </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-2">
                                {job.assignStatus === 'waiting_confirm' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleResponse('rejected', job)} className="py-3 rounded-xl border border-slate-300 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-50">
                                        <XOctagon size={18} className="mr-2"/> ปฏิเสธ
                                    </button>
                                    <button onClick={() => handleResponse('accepted', job)} className="py-3 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center hover:bg-green-700 shadow-lg">
                                        <ThumbsUp size={18} className="mr-2"/> ตอบรับงาน
                                    </button>
                                </div>
                                )}
                                
                                {isAccepted && (
                                    <div className="space-y-3">
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                            <CheckCircle2 size={32} className="text-green-600 mx-auto mb-2"/>
                                            <div className="font-bold text-green-800">กำลังปฏิบัติงาน</div>
                                            <div className="text-xs text-green-600">กดปุ่มด้านล่างเมื่อทำงานเสร็จสิ้น</div>
                                        </div>
                                        <button onClick={() => { if(confirm('ยืนยันว่าทำงานเสร็จแล้ว?')) handleResponse('completed', job) }} className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-900 shadow-lg">
                                            <Flag size={18} className="mr-2"/> แจ้งจบงาน (Finish Job)
                                        </button>
                                    </div>
                                )}

                                {isCompleted && (
                                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center">
                                        <Award size={32} className="text-slate-500 mx-auto mb-2"/>
                                        <div className="font-bold text-slate-700">งานเสร็จสิ้นแล้ว</div>
                                        <div className="text-xs text-slate-500">ขอบคุณสำหรับการทำงานครับ</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                  );
               })
            )}
         </div>
      </div>
   );
}

// ... ClientJobSearchNew ...
const ClientJobSearchNew = ({ onRedirectRegister }) => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    let unsubJobs = () => {};
    const init = async () => {
      try {
        await liff.init({ liffId: MY_LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        const profile = await liff.getProfile();
        const qUser = query(collection(db, 'users'), where('lineUserId', '==', profile.userId));
        const userSnap = await getDocs(qUser);
        if (userSnap.empty) { onRedirectRegister(); return; }
        const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() };
        setCurrentUser(userData);
        const qJobs = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        unsubJobs = onSnapshot(qJobs, (snapshot) => {
           const jobsData = snapshot.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(j => j.status === 'open' && (!j.endDate || new Date(j.endDate) >= new Date().setHours(0,0,0,0)))
              .map(job => ({ ...job, score: calculateMatchScore(userData, job) }))
              .filter(job => job.score > 0)
              .sort((a, b) => b.score - a.score);
           setMatchedJobs(jobsData);
           setLoading(false);
        });
      } catch (err) { console.error(err); alert("เกิดข้อผิดพลาด"); setLoading(false); }
    };
    init();
    return () => unsubJobs();
  }, []);

  const handleApplyJob = async (job) => {
    if (!currentUser) return;
    if (confirm(`ยืนยันการลงชื่อสนใจงาน "${job.title}"\nเจ้าหน้าที่จะติดต่อกลับตามลำดับคิวครับ`)) {
       setApplyingId(job.id);
       try {
          const jobRef = doc(db, 'jobs', job.id);
          const applicantData = { workerId: currentUser.id, name: currentUser.name, phone: currentUser.phone, linePictureUrl: currentUser.linePictureUrl || '', appliedAt: new Date().toISOString() };
          await updateDoc(jobRef, { interestedCandidates: arrayUnion(applicantData) });
          alert("ลงชื่อเรียบร้อย! กรุณารอการติดต่อกลับ");
          setSelectedJob(null);
       } catch (error) { alert("เกิดข้อผิดพลาด: " + error.message); }
       setApplyingId(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Activity className="animate-spin mr-2"/> กำลังค้นหางาน...</div>;

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
       <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
          <div className="flex justify-between items-center mb-2">
             <h1 className="text-xl font-bold flex items-center"><Briefcase className="mr-2 text-yellow-400"/> งานที่เหมาะกับคุณ</h1>
             {currentUser && <div className="flex items-center gap-2"><div className="text-right"><div className="text-xs text-slate-400">สวัสดี</div><div className="text-sm font-bold">{currentUser.name}</div></div><img src={currentUser.linePictureUrl} className="w-10 h-10 rounded-full border-2 border-white"/></div>}
          </div>
       </div>
       <div className="p-4 space-y-4">
          {matchedJobs.length === 0 ? (
             <div className="text-center py-10 text-slate-400"><Search size={48} className="mx-auto mb-2 opacity-50"/><p>ยังไม่มีงานที่ตรงกับคุณในขณะนี้</p></div>
          ) : (
             matchedJobs.map(job => {
                const appliedCount = job.interestedCandidates?.length || 0;
                const isApplied = job.interestedCandidates?.some(c => c.workerId === currentUser.id);
                return (
                  <div key={job.id} onClick={() => setSelectedJob(job)} className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform duration-200 relative">
                     <div className={`h-2 ${job.score >= 80 ? 'bg-green-500' : job.score >= 50 ? 'bg-yellow-500' : 'bg-orange-500'}`} style={{width: `${job.score}%`}}></div>
                     <div className="p-5">
                        <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-slate-800 line-clamp-1">{job.title}</h3><span className={`text-xs font-bold px-2 py-1 rounded-lg ${job.score >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{job.score}% ตรงใจ</span></div>
                        <div className="text-slate-500 text-sm mb-3 flex items-center gap-1"><Building2 size={14}/> {job.companyName}</div>
                        <div className="flex flex-wrap gap-2 mb-4">
                           <span className="bg-slate-50 border px-2 py-1 rounded text-xs text-slate-600 flex items-center"><DollarSign size={12} className="mr-1"/> {job.wage} บ./วัน</span>
                           <span className={`border px-2 py-1 rounded text-xs flex items-center font-bold ${appliedCount >= parseInt(job.headcount) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}><Users size={12} className="mr-1"/> จองแล้ว {appliedCount} / รับ {job.headcount}</span>
                        </div>
                        {isApplied ? <div className="w-full bg-green-100 text-green-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center border border-green-200"><CheckCircle2 size={16} className="mr-2"/> ลงชื่อแล้ว</div> : <button className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center">ดูรายละเอียด</button>}
                     </div>
                  </div>
                );
             })
          )}
       </div>
       {selectedJob && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto sm:rounded-2xl rounded-t-3xl flex flex-col overflow-hidden animate-slide-up">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg text-slate-800">รายละเอียดงาน</h3><button onClick={() => setSelectedJob(null)} className="bg-slate-200 p-2 rounded-full text-slate-600"><X size={20}/></button></div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                   <div><div className="text-2xl font-bold text-slate-800 mb-1">{selectedJob.title}</div><div className="text-slate-500 font-medium flex items-center"><Building2 size={16} className="mr-2"/> {selectedJob.companyName}</div></div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center"><div className="text-xs text-green-600 mb-1">รายได้/วัน</div><div className="font-bold text-green-700 text-lg">{selectedJob.wage}</div></div>
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center"><div className="text-xs text-orange-600 mb-1">ลงชื่อแล้ว</div><div className="font-bold text-orange-700 text-lg">{selectedJob.interestedCandidates?.length || 0} / {selectedJob.headcount}</div></div>
                   </div>
                   <div className="space-y-3">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><h4 className="font-bold text-sm mb-2 flex items-center text-slate-700"><Calendar size={16} className="mr-2 text-indigo-500"/> ระยะเวลางาน</h4><div className="text-sm text-slate-600">{formatDateThai(selectedJob.startDate)} - {formatDateThai(selectedJob.endDate)}</div></div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><h4 className="font-bold text-sm mb-2 flex items-center text-slate-700"><MapPin size={16} className="mr-2 text-red-500"/> สถานที่ปฏิบัติงาน</h4><div className="text-sm text-slate-600 mb-2">{selectedJob.address || '-'}</div>{selectedJob.locationUrl && (<a href={selectedJob.locationUrl} target="_blank" className="text-xs bg-white border border-slate-300 px-3 py-2 rounded-lg inline-flex items-center hover:bg-slate-100 text-slate-700 font-bold"><Map size={14} className="mr-1"/> เปิดแผนที่นำทาง</a>)}</div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><h4 className="font-bold text-sm mb-2 flex items-center text-slate-700"><CheckCircle2 size={16} className="mr-2 text-green-500"/> คุณสมบัติ</h4><ul className="text-sm text-slate-600 space-y-1 list-disc pl-5"><li>วุฒิ: {selectedJob.requiredEducation || 'ไม่ระบุ'}</li>{selectedJob.requiredSkills?.map(s => <li key={s}>{s}</li>)}</ul></div>
                      {selectedJob.note && <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><h4 className="font-bold text-sm mb-2 text-slate-700">รายละเอียดเพิ่มเติม</h4><div className="text-sm text-slate-600">{selectedJob.note}</div></div>}
                   </div>
                </div>
                <div className="p-5 border-t bg-white">
                   {selectedJob.interestedCandidates?.some(c => c.workerId === currentUser.id) ? (
                      <button disabled className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-lg flex items-center justify-center cursor-not-allowed"><Check size={20} className="mr-2"/> คุณลงชื่อสนใจงานนี้แล้ว</button>
                   ) : (
                      <button onClick={() => handleApplyJob(selectedJob)} disabled={applyingId === selectedJob.id} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center">{applyingId === selectedJob.id ? <Activity className="animate-spin mr-2"/> : <Hand size={20} className="mr-2"/>} กดสนใจงานนี้</button>
                   )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

// --- Admin Dashboard (Core Logic) ---
const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState('home');
  const [editingId, setEditingId] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [configModalType, setConfigModalType] = useState(null);
  const [permissionError, setPermissionError] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState(null); 
  const [matchTab, setMatchTab] = useState('interested'); 
  const [viewingWorker, setViewingWorker] = useState(null);
  
  const [workerForm, setWorkerForm] = useState({ 
    name: '', phone: '', lineId: '', lineDisplayName: '', linePictureUrl: '', source: 'office', 
    skills: [], education: '', status: 'active',
    idCard: '', address: '', experience: '', refName: '', refPhone: '', training: ''
  });
  
  const [jobForm, setJobForm] = useState({ 
    title: '', companyName: '', address: '', locationUrl: '',
    headcount: '', startDate: '', endDate: '', wage: '', note: '',
    requiredSkills: [], requiredEducation: '', status: 'open' 
  });

  useEffect(() => {
    let unsubWorkers = () => {};
    let unsubJobs = () => {};
    let unsubConfig = () => {};

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPermissionError(false);
        unsubWorkers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'worker')), 
          (snap) => {
             const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
             data.sort((a, b) => (b.registeredAt?.seconds || 0) - (a.registeredAt?.seconds || 0));
             setWorkers(data);
          }, 
          (err) => { if(err.code === 'permission-denied') setPermissionError(true); }
        );
        unsubJobs = onSnapshot(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')), (snap) => setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        unsubConfig = onSnapshot(doc(db, 'system_settings', 'config'), (doc) => {
          if (doc.exists()) { setSkillsList(doc.data().skills || DEFAULT_SKILLS); setCompaniesList(doc.data().companies || DEFAULT_COMPANIES); } 
          else { setDoc(doc(db, 'system_settings', 'config'), { skills: DEFAULT_SKILLS, companies: DEFAULT_COMPANIES }); }
        });
      } else {
        signInAnonymously(auth).catch(err => console.error("Login failed:", err));
      }
    });
    return () => { authUnsub(); unsubWorkers(); unsubJobs(); unsubConfig(); };
  }, []);

  const handleSaveWorker = async () => { try { const payload = { ...workerForm, role: 'worker', updatedAt: serverTimestamp() }; if (editingId) await updateDoc(doc(db, 'users', editingId), payload); else await addDoc(collection(db, 'users'), { ...payload, registeredAt: serverTimestamp(), source: 'office' }); goBack(); } catch (e) { alert('Error: ' + e.message); } };
  const handleSaveJob = async () => { try { const payload = { ...jobForm, employerId: 'admin', updatedAt: serverTimestamp() }; if (editingId) await updateDoc(doc(db, 'jobs', editingId), payload); else await addDoc(collection(db, 'jobs'), { ...payload, createdAt: serverTimestamp() }); goBack(); } catch (e) { alert('Error: ' + e.message); } };
  const handleDelete = async (coll, id) => { if (confirm('ยืนยันลบ?')) await deleteDoc(doc(db, coll, id)); };
  const handleAddConfig = async (type, item) => updateDoc(doc(db, 'system_settings', 'config'), { [type]: arrayUnion(item) });
  const handleDelConfig = async (type, item) => updateDoc(doc(db, 'system_settings', 'config'), { [type]: arrayRemove(item) });

  const handleAssignWorker = async (worker, job) => {
    if (!confirm(`ยืนยันการจ่ายงาน "${job.title}" ให้กับคุณ ${worker.name}?\nผู้สมัครจะต้องกด 'ตอบรับ' ใน Line OA อีกครั้ง`)) return;
    try {
       await updateDoc(doc(db, 'users', worker.id), {
          assignedJob: {
             jobId: job.id,
             status: 'waiting_confirm', 
             assignedAt: new Date().toISOString()
          }
       });
       alert(`จ่ายงานสำเร็จ!`);
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  };

  const handleUpdateStatus = async (workerId, newStatus) => {
      if(!confirm('ยืนยันการอัปเดตสถานะ?')) return;
      try {
          await updateDoc(doc(db, 'users', workerId), { 'assignedJob.status': newStatus });
      } catch(e) { alert('Error: ' + e.message); }
  };

  const goBack = () => {
    setEditingId(null);
    setWorkerForm({ name: '', phone: '', lineId: '', lineDisplayName: '', linePictureUrl: '', source: 'office', skills: [], education: '', status: 'active', idCard: '', address: '', experience: '', refName: '', refPhone: '', training: '' });
    setJobForm({ title: '', companyName: '', address: '', locationUrl: '', headcount: '', startDate: '', endDate: '', wage: '', note: '', requiredSkills: [], requiredEducation: '', status: 'open' });
    if (currentView === 'recruitment' && editingId) setCurrentView('recruitment');
    else if ((currentView === 'worker-form' || currentView === 'job-form') && editingId) setCurrentView(currentView === 'worker-form' ? 'workers-list' : 'jobs-list');
    else setCurrentView('home');
    setEditingId(null);
  };

  const startEdit = (item, type) => { setEditingId(item.id); if (type === 'worker') { setWorkerForm(item); setCurrentView('worker-form'); } else { setJobForm(item); setCurrentView('job-form'); } };
  const toggleArrayItem = (item, type, field) => { const target = type === 'worker' ? workerForm : jobForm; const setTarget = type === 'worker' ? setWorkerForm : setJobForm; setTarget({ ...target, [field]: target[field].includes(item) ? target[field].filter(s => s !== item) : [...target[field], item] }); };
  const pendingWorkers = workers.filter(w => w.status === 'pending');

  if (permissionError) return <div className="min-h-screen flex items-center justify-center p-4 text-center"><AlertTriangle size={32} className="mx-auto mb-4 text-red-500"/>Access Denied (Check Firestore Rules)</div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 relative">
      {configModalType === 'skills' && <ConfigModal title="จัดการทักษะ" items={skillsList} icon={Wrench} onAdd={i => handleAddConfig('skills', i)} onDelete={i => handleDelConfig('skills', i)} onClose={() => setConfigModalType(null)} />}
      {configModalType === 'companies' && <ConfigModal title="จัดการบริษัท" items={companiesList} icon={Building2} onAdd={i => handleAddConfig('companies', i)} onDelete={i => handleDelConfig('companies', i)} onClose={() => setConfigModalType(null)} />}

      {currentView !== 'home' && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm animate-slide-down">
           <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 flex items-center gap-2 font-medium"><ChevronLeft size={20} /><span className="hidden md:inline">กลับ</span></button>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <h2 className="text-lg font-bold text-slate-800">{currentView === 'recruitment' ? 'รับสมัครพนักงานใหม่' : 'จัดการข้อมูล'}</h2>
           </div>
           <div className="flex gap-2">
             {currentView === 'workers-list' && <><button onClick={() => setConfigModalType('skills')} className="hidden md:flex bg-slate-50 border px-3 py-2 rounded text-sm items-center"><Wrench size={14} className="mr-2"/> ทักษะ</button><button onClick={() => setConfigModalType('companies')} className="hidden md:flex bg-slate-50 border px-3 py-2 rounded text-sm items-center"><Building2 size={14} className="mr-2"/> บริษัท</button></>}
             {currentView === 'jobs-list' && <button onClick={() => setCurrentView('job-form')} className="bg-orange-600 text-white px-3 py-2 rounded font-bold text-sm flex items-center"><PlusCircle size={16} className="mr-2"/> เพิ่มงาน</button>}
           </div>
        </div>
      )}

      <main className="w-full">
        {currentView === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-100">
             <div className="mb-10 text-center animate-fade-in-up flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-800 bg-clip-text text-transparent drop-shadow-sm">EASTERN LABOUR</h1>
                <p className="text-slate-500 font-medium">ระบบจัดการฐานข้อมูลและทรัพยากรบุคคล</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl w-full animate-fade-in-up delay-100">
                <AppIcon icon={Users} label="1. ฐานข้อมูลพนักงาน" color="bg-gradient-to-br from-blue-500 to-blue-600" badge={workers.filter(w => w.status === 'active').length} onClick={() => setCurrentView('workers-list')} />
                <AppIcon icon={Building2} label="2. ฐานข้อมูลบริษัท" color="bg-gradient-to-br from-indigo-500 to-indigo-600" badge={jobs.length} onClick={() => setCurrentView('jobs-list')} />
                <AppIcon icon={PieChart} label="3. Dashboard" color="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => setCurrentView('dashboard')} />
                <AppIcon icon={UserPlus} label="4. พนักงานใหม่" color="bg-gradient-to-br from-emerald-500 to-emerald-600" badge={pendingWorkers.length} onClick={() => setCurrentView('recruitment')} />
                <AppIcon icon={PlusCircle} label="5. งานใหม่" color="bg-gradient-to-br from-orange-500 to-orange-600" onClick={() => setCurrentView('job-form')} />
                <AppIcon icon={FileText} label="6. รายงาน" color="bg-gradient-to-br from-slate-600 to-slate-700" onClick={() => setCurrentView('reports')} />
             </div>
          </div>
        )}

        {/* ✅ Dashboard & Modals */}
        {currentView === 'dashboard' && <DashboardView workers={workers} jobs={jobs} onJobClick={setSelectedJob} onViewWorker={setViewingWorker} onAssignWorker={handleAssignWorker} />}
        {currentView === 'reports' && <ReportsView workers={workers} jobs={jobs} />}
        
        {viewingWorker && <WorkerProfileModal worker={viewingWorker} onClose={() => setViewingWorker(null)} />}

        {currentView === 'recruitment' && (
           <div className="p-6 w-full space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div><h3 className="text-xl font-bold text-slate-800 flex items-center"><Smartphone size={24} className="mr-2 text-green-600"/> ใบสมัครจาก Line OA</h3><p className="text-slate-500 text-sm mt-1">รายการรอตรวจสอบ ({pendingWorkers.length})</p></div><div className="flex gap-2"><button onClick={() => setCurrentView('worker-form')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center"><UserPlus size={18} className="mr-2"/> ลงทะเบียน Walk-in</button></div></div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th className="p-4">ช่องทาง / LINE</th><th className="p-4">ชื่อ</th><th className="p-4">เบอร์โทร</th><th className="p-4">วุฒิ</th><th className="p-4">ทักษะ</th><th className="p-4 text-right">ดำเนินการ</th></tr></thead><tbody className="divide-y divide-slate-100">{pendingWorkers.map(w => (<tr key={w.id} className="hover:bg-orange-50/30 transition-colors"><td className="p-4"><div className="flex flex-col gap-1"><span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 w-fit"><Smartphone size={10} className="mr-1"/> Line OA</span>{w.lineDisplayName && (<div className="flex items-center gap-1.5 text-xs text-slate-500">{w.linePictureUrl ? <img src={w.linePictureUrl} className="w-5 h-5 rounded-full border"/> : <User size={14}/>}{w.lineDisplayName}</div>)}</div></td><td className="p-4 font-bold text-slate-800 cursor-pointer hover:text-indigo-600 hover:underline" onClick={()=>setViewingWorker(w)}>{w.name}</td><td className="p-4 font-mono">{w.phone}</td><td className="p-4">{w.education || '-'}</td><td className="p-4"><div className="flex gap-1 flex-wrap max-w-[200px]">{w.skills?.slice(0,3).map(s => <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500">{s}</span>)}</div></td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(w, 'worker')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center"><UserCheck size={14} className="mr-1"/> ตรวจสอบ</button><button onClick={() => handleDelete('users', w.id)} className="bg-white border border-rose-200 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 flex items-center"><Trash2 size={14}/></button></div></td></tr>))}{pendingWorkers.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400">ไม่พบรายการใหม่</td></tr>}</tbody></table></div></div>
           </div>
        )}
        {currentView === 'workers-list' && (
            <div className="p-6"><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-4">LINE Profile</th><th className="p-4">ชื่อ</th><th className="p-4">เบอร์โทร</th><th className="p-4">วุฒิ</th><th className="p-4">สถานะ</th><th className="p-4 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{workers.filter(w=>w.status!=='pending').map(w => (<tr key={w.id} className="hover:bg-slate-50"><td className="p-4">{w.lineDisplayName ? (<div className="flex items-center gap-2">{w.linePictureUrl ? <img src={w.linePictureUrl} className="w-8 h-8 rounded-full border"/> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User size={16}/></div>}<div className="text-xs font-medium text-slate-600">{w.lineDisplayName}</div></div>) : <span className="text-xs text-slate-400">-</span>}</td><td className="p-4 font-bold cursor-pointer hover:text-indigo-600 hover:underline" onClick={()=>setViewingWorker(w)}>{w.name}</td><td className="p-4">{w.phone}</td><td className="p-4">{w.education||'-'}</td><td className="p-4"><StatusBadge status={w.status}/></td><td className="p-4 text-right flex justify-end gap-2"><button onClick={()=>startEdit(w,'worker')}><Edit2 size={16}/></button><button onClick={()=>handleDelete('users', w.id)}><Trash2 size={16}/></button></td></tr>))}</tbody></table></div></div>
        )}
        {currentView === 'jobs-list' && (
            <div className="p-6"><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-4">ชื่องาน</th><th className="p-4">บริษัท</th><th className="p-4">ระยะเวลา</th><th className="p-4">คน</th><th className="p-4">สถานะ</th><th className="p-4 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{jobs.map(j => {const isExpired = j.endDate && new Date(j.endDate) < new Date().setHours(0,0,0,0);const displayStatus = isExpired ? 'closed' : j.status;return (<tr key={j.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{j.title}</td><td className="p-4"><div className="font-medium text-slate-800">{j.companyName}</div>{j.address && <div className="text-xs text-slate-400 truncate max-w-[200px]">{j.address}</div>}</td><td className="p-4 text-xs text-slate-600"><div>เริ่ม: {formatDateThai(j.startDate)}</div><div>สิ้นสุด: {formatDateThai(j.endDate)}</div></td><td className="p-4 text-slate-600"><Users size={14} className="inline mr-1"/>{j.headcount || '-'}</td><td className="p-4"><StatusBadge status={displayStatus}/></td><td className="p-4 text-right flex justify-end gap-2"><button onClick={()=>startEdit(j,'job')}><Edit2 size={16}/></button><button onClick={()=>handleDelete('jobs', j.id)}><Trash2 size={16}/></button></td></tr>);})}</tbody></table></div></div>
        )}
        {(currentView === 'worker-form' || currentView === 'job-form') && (
           <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                 {currentView === 'worker-form' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="flex items-center gap-4 border-b pb-4 md:col-span-2">
                          {workerForm.lineDisplayName ? (
                             <div className="flex items-center gap-3 bg-green-50 p-3 rounded-xl border border-green-100 w-full">
                                {workerForm.linePictureUrl ? <img src={workerForm.linePictureUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-sm"/> : <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-green-700"><User size={24}/></div>}
                                <div>
                                   <div className="text-xs text-green-600 font-bold uppercase tracking-wider">Connected LINE Account</div>
                                   <div className="font-bold text-slate-800">{workerForm.lineDisplayName}</div>
                                </div>
                             </div>
                          ) : <div className="p-3 bg-slate-50 rounded-xl w-full text-slate-400 text-sm flex items-center"><User size={20} className="mr-2"/> ไม่ได้เชื่อมต่อ LINE</div>}
                       </div>
                       
                       <div><label className="text-sm font-bold block mb-1">ชื่อ-นามสกุล</label><input className="w-full border p-2 rounded" value={workerForm.name} onChange={e=>setWorkerForm({...workerForm, name: e.target.value})}/></div>
                       <div><label className="text-sm font-bold block mb-1">เบอร์โทร</label><input className="w-full border p-2 rounded" value={workerForm.phone} onChange={e=>setWorkerForm({...workerForm, phone: e.target.value})}/></div>
                       <div><label className="text-sm font-bold block mb-1">เลขบัตร ปชช.</label><input className="w-full border p-2 rounded" value={workerForm.idCard} onChange={e=>setWorkerForm({...workerForm, idCard: e.target.value})}/></div>
                       <div><label className="text-sm font-bold block mb-1">สถานะ</label><select className="w-full border p-2 rounded" value={workerForm.status} onChange={e=>setWorkerForm({...workerForm, status: e.target.value})}><option value="pending">รอตรวจสอบ</option><option value="active">พร้อมทำงาน</option><option value="inactive">ไม่ว่าง</option><option value="blacklisted">Blacklist</option></select></div>
                       <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">ที่อยู่</label><textarea className="w-full border p-2 rounded" rows={2} value={workerForm.address} onChange={e=>setWorkerForm({...workerForm, address: e.target.value})}/></div>
                       <div>
                          <label className="text-sm font-bold block mb-1">วุฒิการศึกษา</label>
                          <select className="w-full border p-2 rounded" value={workerForm.education} onChange={e=>setWorkerForm({...workerForm, education: e.target.value})}><option value="">เลือกวุฒิ</option>{EDUCATION_LEVELS.map(edu => <option key={edu} value={edu}>{edu}</option>)}</select>
                       </div>
                       <div><label className="text-sm font-bold block mb-1">หลักสูตรฝึกอบรม</label><input className="w-full border p-2 rounded" value={workerForm.training} onChange={e=>setWorkerForm({...workerForm, training: e.target.value})}/></div>
                       <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">ประสบการณ์ทำงาน</label><textarea className="w-full border p-2 rounded" rows={3} value={workerForm.experience} onChange={e=>setWorkerForm({...workerForm, experience: e.target.value})}/></div>
                       <div className="md:col-span-2 border p-4 rounded-xl bg-slate-50">
                          <h4 className="font-bold text-sm mb-2 text-slate-700">บุคคลอ้างอิง</h4>
                          <div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="ชื่อ" value={workerForm.refName} onChange={e=>setWorkerForm({...workerForm, refName: e.target.value})}/><input className="border p-2 rounded" placeholder="เบอร์โทร" value={workerForm.refPhone} onChange={e=>setWorkerForm({...workerForm, refPhone: e.target.value})}/></div>
                       </div>
                       <div className="md:col-span-2"><label className="text-sm font-bold block mb-2">ทักษะ</label><div className="flex flex-wrap gap-2">{skillsList.map(s=><button key={s} onClick={()=>toggleArrayItem(s,'worker','skills')} className={`px-2 py-1 rounded border ${workerForm.skills.includes(s)?'bg-indigo-600 text-white':'bg-white'}`}>{s}</button>)}</div></div>
                    </div>
                 ) : (
                    <div className="space-y-6">
                       <div className="grid md:grid-cols-2 gap-6">
                          <h3 className="md:col-span-2 font-bold text-slate-700 border-b pb-2 flex items-center"><Building2 size={18} className="mr-2 text-indigo-600"/> ข้อมูลบริษัท</h3>
                          <div><label className="text-sm font-bold block mb-1">ชื่อบริษัท</label><input className="w-full border p-2 rounded" placeholder="ระบุชื่อบริษัทลูกค้า" value={jobForm.companyName} onChange={e=>setJobForm({...jobForm, companyName: e.target.value})}/></div>
                          <div><label className="text-sm font-bold block mb-1">Google Map / Location</label><input className="w-full border p-2 rounded" placeholder="แปะลิงก์ Google Map" value={jobForm.locationUrl} onChange={e=>setJobForm({...jobForm, locationUrl: e.target.value})}/></div>
                          <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">ที่อยู่บริษัท</label><textarea className="w-full border p-2 rounded" rows={2} placeholder="ที่อยู่สถานที่ทำงาน..." value={jobForm.address} onChange={e=>setJobForm({...jobForm, address: e.target.value})}/></div>
                       </div>
                       <div className="grid md:grid-cols-2 gap-6">
                          <h3 className="md:col-span-2 font-bold text-slate-700 border-b pb-2 flex items-center"><Briefcase size={18} className="mr-2 text-orange-600"/> รายละเอียดงาน</h3>
                          <div><label className="text-sm font-bold block mb-1">ชื่องาน / ตำแหน่ง</label><input className="w-full border p-2 rounded" placeholder="เช่น พนักงานฝ่ายผลิต" value={jobForm.title} onChange={e=>setJobForm({...jobForm, title: e.target.value})}/></div>
                          <div><label className="text-sm font-bold block mb-1">รายได้ต่อวัน (บาท)</label><input className="w-full border p-2 rounded" placeholder="เช่น 450" value={jobForm.wage} onChange={e=>setJobForm({...jobForm, wage: e.target.value})}/></div>
                          <div><label className="text-sm font-bold block mb-1">จำนวนที่ต้องการ (คน)</label><input className="w-full border p-2 rounded" type="number" placeholder="เช่น 5" value={jobForm.headcount} onChange={e=>setJobForm({...jobForm, headcount: e.target.value})}/></div>
                          <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                             <div><label className="text-sm font-bold block mb-1 text-orange-700">วันที่เริ่มงาน</label><input type="date" className="w-full border p-2 rounded" value={jobForm.startDate} onChange={e=>setJobForm({...jobForm, startDate: e.target.value})}/></div>
                             <div><label className="text-sm font-bold block mb-1 text-orange-700">วันที่สิ้นสุด</label><input type="date" className="w-full border p-2 rounded" value={jobForm.endDate} onChange={e=>setJobForm({...jobForm, endDate: e.target.value})}/></div>
                          </div>
                          <div className="md:col-span-2"><label className="text-sm font-bold block mb-1 flex items-center"><GraduationCap size={16} className="mr-1"/> วุฒิที่ต้องการ (ขั้นต่ำ)</label><select className="w-full border p-2 rounded bg-indigo-50 border-indigo-200" value={jobForm.requiredEducation} onChange={e=>setJobForm({...jobForm, requiredEducation: e.target.value})}><option value="">-- ไม่จำกัดวุฒิ --</option>{EDUCATION_LEVELS.map(edu => <option key={edu} value={edu}>{edu}</option>)}</select></div>
                          <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">หมายเหตุ / อื่นๆ</label><textarea className="w-full border p-2 rounded" rows={3} placeholder="รายละเอียดเพิ่มเติม..." value={jobForm.note} onChange={e=>setJobForm({...jobForm, note: e.target.value})}/></div>
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 flex items-center"><Wrench size={18} className="mr-2 text-green-600"/> ทักษะที่ต้องการ</h3>
                          <div className="flex flex-wrap gap-2">{skillsList.map(s => (<button key={s} onClick={()=>toggleArrayItem(s,'job','requiredSkills')} className={`px-3 py-1.5 rounded border transition-all ${jobForm.requiredSkills.includes(s)?'bg-orange-600 text-white font-bold shadow-sm':'bg-white text-slate-600 hover:bg-slate-50'}`}>{s}</button>))}</div>
                       </div>
                    </div>
                 )}
                 <div className="flex justify-end pt-4"><button onClick={currentView==='worker-form'?handleSaveWorker:handleSaveJob} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">บันทึก</button></div>
              </div>
           </div>
        )}
      </main>

      {/* ✅ MODAL: Admin Dashboard Detail (Matched Candidates) */}
      {selectedJob && (
         <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                  <div>
                     <h2 className="text-xl font-bold text-slate-800">{selectedJob.title}</h2>
                     <p className="text-slate-500 text-sm flex items-center gap-2 mt-1"><Building2 size={14}/> {selectedJob.companyName} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> <Users size={14}/> รับ {selectedJob.headcount} อัตรา</p>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-2 transition-colors"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  <div className="grid lg:grid-cols-3 gap-6 h-full">
                     <div className="lg:col-span-1 space-y-4">
                        {/* Job Info Left Side */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">สถานะงาน</h4>
                           <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-500">ยอดจอง (Interested)</span><span className="text-xl font-bold text-orange-600">{selectedJob.interestedCandidates?.length || 0} คน</span></div>
                           <div className="w-full bg-slate-100 rounded-full h-2 mb-1"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(((selectedJob.interestedCandidates?.length||0) / selectedJob.headcount)*100, 100)}%` }}></div></div>
                           <div className="text-xs text-right text-slate-400">เป้าหมาย: {selectedJob.headcount} คน</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-700 mb-3 border-b pb-2">รายละเอียด</h4><div className="space-y-3 text-sm"><div><div className="text-xs text-slate-400">ค่าจ้าง</div><div className="font-medium text-green-600">{selectedJob.wage} บาท/วัน</div></div><div><div className="text-xs text-slate-400">ระยะเวลา</div><div className="font-medium text-slate-800">{formatDateThai(selectedJob.startDate)} - {formatDateThai(selectedJob.endDate)}</div></div><div><div className="text-xs text-slate-400">ทักษะ</div><div className="flex flex-wrap gap-1 mt-1">{selectedJob.requiredSkills?.map(s=><span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px]">{s}</span>)}</div></div></div></div>
                     </div>

                     <div className="lg:col-span-2 flex flex-col">
                        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                           <button onClick={()=>setMatchTab('interested')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${matchTab==='interested' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Hand size={16} className="mr-2"/> คนที่สนใจ ({selectedJob.interestedCandidates?.length || 0})</button>
                           <button onClick={()=>setMatchTab('auto')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${matchTab==='auto' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Star size={16} className="mr-2"/> ระบบแนะนำ ({selectedJob.matches.length})</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                           {matchTab === 'interested' ? (
                              (selectedJob.interestedCandidates && selectedJob.interestedCandidates.length > 0) ? (
                                 selectedJob.interestedCandidates
                                    .sort((a,b) => new Date(a.appliedAt) - new Date(b.appliedAt))
                                    .map((candidate, idx) => {
                                       const fullWorker = workers.find(w => w.id === candidate.workerId) || candidate;
                                       
                                       // Check if this worker is assigned to THIS job
                                       const assignedData = fullWorker.assignedJob;
                                       const isAssignedToThisJob = assignedData?.jobId === selectedJob.id;
                                       const jobStatus = isAssignedToThisJob ? assignedData.status : null;

                                       return (
                                          <div key={idx} className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-all group ${isAssignedToThisJob ? 'border-green-300 bg-green-50/50' : 'border-slate-200'}`}>
                                             <div className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded-full text-sm shrink-0">#{idx+1}</div>
                                             <div className="flex-1 cursor-pointer" onClick={() => setViewingWorker(fullWorker)}>
                                                <div className="font-bold text-slate-800 hover:text-indigo-600 hover:underline">{candidate.name}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-2"><Timer size={12}/> กดเมื่อ: {formatDateTimeThai(candidate.appliedAt)}</div>
                                             </div>
                                             
                                             {/* ✅ Admin Action Buttons */}
                                             {isAssignedToThisJob ? (
                                                 <div className="flex flex-col items-end gap-1">
                                                     <StatusBadge status={jobStatus} />
                                                     {jobStatus === 'accepted' && (
                                                         <button onClick={() => handleUpdateStatus(fullWorker.id, 'completed')} className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded flex items-center hover:bg-black"><Flag size={10} className="mr-1"/> กดจบงาน</button>
                                                     )}
                                                 </div>
                                             ) : (
                                                 <button onClick={() => handleAssignWorker(fullWorker, selectedJob)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center shadow-sm"><CheckCircle2 size={14} className="mr-2"/> จ่ายงาน</button>
                                             )}
                                             
                                             <a href={`tel:${candidate.phone}`} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center"><Phone size={14} className="mr-2"/> โทร</a>
                                          </div>
                                       )
                                    })
                              ) : <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed"><Hand size={32} className="mx-auto mb-2 opacity-50"/>ยังไม่มีคนกดสนใจงานนี้</div>
                           ) : (
                              selectedJob.matches.length > 0 ? (
                                 selectedJob.matches.map((worker) => {
                                    // Check status for matches too
                                    const assignedData = worker.assignedJob;
                                    const isAssignedToThisJob = assignedData?.jobId === selectedJob.id;
                                    const jobStatus = isAssignedToThisJob ? assignedData.status : null;

                                    return (
                                        <div key={worker.id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-all ${isAssignedToThisJob ? 'border-green-300 bg-green-50/50' : 'border-slate-200'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 shrink-0 ${worker.score >= 80 ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>{worker.score}%</div>
                                            <div className="flex-1 cursor-pointer" onClick={() => setViewingWorker(worker)}>
                                                <div className="font-bold text-slate-800 hover:text-indigo-600 hover:underline">{worker.name}</div>
                                                <div className="text-xs text-slate-500">{worker.education} • {worker.skills?.join(', ')}</div>
                                            </div>
                                            
                                            {/* ✅ Admin Action Buttons */}
                                            {isAssignedToThisJob ? (
                                                 <div className="flex flex-col items-end gap-1">
                                                     <StatusBadge status={jobStatus} />
                                                     {jobStatus === 'accepted' && (
                                                         <button onClick={() => handleUpdateStatus(worker.id, 'completed')} className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded flex items-center hover:bg-black"><Flag size={10} className="mr-1"/> กดจบงาน</button>
                                                     )}
                                                 </div>
                                             ) : (
                                                 <button onClick={() => handleAssignWorker(worker, selectedJob)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center shadow-sm"><CheckCircle2 size={14} className="mr-2"/> จ่ายงาน</button>
                                             )}

                                            <a href={`tel:${worker.phone}`} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center"><Phone size={14} className="mr-2"/> โทร</a>
                                        </div>
                                    );
                                 })
                              ) : <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed"><Star size={32} className="mx-auto mb-2 opacity-50"/>ไม่มีคนที่ตรงเงื่อนไข</div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// ==========================================
// ✅ MAIN APP: GLOBAL AUTH HANDLING
// ==========================================
export default function App() {
  const [viewMode, setViewMode] = useState('admin');
  const [authReady, setAuthReady] = useState(false); // New state to block rendering until auth is done

  useEffect(() => {
    // 1. Handle URL Params
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isLineApp = /Line/i.test(navigator.userAgent);

    if (mode === 'register') setViewMode('register');
    else if (mode === 'jobs') setViewMode('jobs');
    else if (mode === 'myjobs') setViewMode('myjobs');
    else if (isLineApp) setViewMode('register');
    else setViewMode('admin');

    // 2. Handle Firebase Auth Globally
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setAuthReady(true); // User is logged in, ready to render
        } else {
            // No user, force anonymous login
            signInAnonymously(auth).catch((error) => {
                console.error("Auth Failed:", error);
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ (Auth Error)");
            });
        }
    });

    return () => unsubscribe();
  }, []);

  // 3. Show Loading Screen until Firebase Auth is ready
  if (!authReady) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
              <Activity className="animate-spin mb-2" size={32}/>
              <div>กำลังเข้าสู่ระบบ...</div>
          </div>
      );
  }

  return (
    <>
      {viewMode === 'admin' && <AdminDashboard />}
      {viewMode === 'register' && <RegistrationView />}
      {viewMode === 'jobs' && <ClientJobSearchNew onRedirectRegister={() => setViewMode('register')} />}
      {viewMode === 'myjobs' && <MyJobsView onRedirectRegister={() => setViewMode('register')} />}
    </>
  );
}