// @ts-nocheck
import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, orderBy, 
  serverTimestamp, doc, updateDoc, deleteDoc, where, setDoc, 
  arrayUnion, arrayRemove, getDocs 
} from 'firebase/firestore';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage'; // ✅ เพิ่ม Storage
import { 
  Users, Briefcase, Plus, Save, Trash2, Edit2, AlertTriangle, MapPin, 
  ChevronLeft, Home, X, CheckCircle2, XCircle, Settings, Building2, 
  Wrench, Phone, MessageSquare, GraduationCap, Calendar, PieChart, 
  FileText, UserPlus, PlusCircle, TrendingUp, Activity, Clock, 
  UserCheck, Smartphone, Send, Check, LogIn, BookOpen, UploadCloud, 
  Image as ImageIcon, File, CreditCard, User
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
const storage = getStorage(app); // ✅ Init Storage

// --- Default Data ---
const DEFAULT_SKILLS = ["ขับรถ", "แม่บ้าน", "ยกของ", "ช่างไฟ", "ทำอาหาร", "เสิร์ฟ", "พนักงานขาย", "IT Support", "แปลภาษา", "ดูแลผู้สูงอายุ", "PC", "MC"];
const DEFAULT_COMPANIES = ["CP All", "Central Group", "ThaiBev", "True Corp", "SCG", "PTT", "Big C", "Lotus's"];
const EDUCATION_LEVELS = ["ต่ำกว่า ม.6", "ม.6", "ปวช.", "ปวส. / อนุปริญญา", "ปริญญาตรี", "ปริญญาโท หรือสูงกว่า"];

// --- Helpers ---
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
};

// ✅ ฟังก์ชันอัปโหลดไฟล์
const uploadFileToStorage = async (file, folder = 'uploads') => {
  if (!file) return null;
  try {
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Upload failed:", error);
    alert("อัปโหลดไม่สำเร็จ: กรุณาตรวจสอบว่าเปิดใช้งาน Firebase Storage แล้ว");
    return null;
  }
};

// --- Components ---
const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    open: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    blacklisted: "bg-rose-100 text-rose-700 border-rose-200"
  };
  const label = { active: "พร้อมทำงาน", open: "เปิดรับสมัคร", pending: "รอสัมภาษณ์", inactive: "ไม่ว่าง", closed: "ปิดรับสมัคร", blacklisted: "Blacklist" };
  const icons = { active: <CheckCircle2 size={10} />, open: <CheckCircle2 size={10} />, pending: <Clock size={10} />, blacklisted: <XCircle size={10} /> };

  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${styles[status] || styles.inactive} flex items-center justify-center w-full min-w-[80px] gap-1 shadow-sm`}>
      {icons[status] || <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
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
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">{Icon && <Icon size={18} className="mr-2 text-indigo-600"/>} {title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-1"><X size={16}/></button>
        </div>
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex gap-2">
            <input className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="ระบุชื่อรายการใหม่..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700">เพิ่ม</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
          {items.length === 0 ? <div className="text-center text-slate-400 py-8 text-sm">ไม่มีรายการ</div> : (
            <div className="space-y-2 p-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-200 shadow-sm rounded-xl group hover:border-indigo-300 transition-all">
                  <span className="text-slate-700 text-sm font-medium">{item}</span>
                  <button onClick={() => onDelete(item)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AppIcon = ({ icon: Icon, label, color, badge, onClick }) => (
  <button onClick={onClick} className={`relative w-full aspect-[5/4] ${color} rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group overflow-hidden flex flex-col items-center justify-center`}>
    <Icon size={160} className="absolute -right-8 -bottom-8 text-white/10 group-hover:rotate-12 transition-transform duration-500 pointer-events-none" />
    <div className="bg-white/20 p-4 rounded-3xl mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 shadow-inner">
       <Icon size={48} className="text-white drop-shadow-md" />
    </div>
    <span className="text-white font-bold text-lg md:text-xl tracking-wide drop-shadow-sm px-2 relative z-10">{label}</span>
    {badge > 0 && <div className="absolute top-4 right-4 bg-white text-red-600 text-sm md:text-base font-extrabold px-3 py-1 rounded-full shadow-lg min-w-[2rem] z-20 animate-pulse border-2 border-red-100">{badge > 99 ? '99+' : badge}</div>}
  </button>
);

// --- Sub-Views ---

const DashboardView = ({ workers, jobs }) => {
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const pendingWorkers = workers.filter(w => w.status === 'pending').length;
  const openJobs = jobs.filter(j => j.status === 'open').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3"><Users size={24}/></div>
             <div className="text-3xl font-bold text-slate-800 mb-1">{workers.length}</div>
             <div className="text-sm text-slate-500">ฐานข้อมูลทั้งหมด</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
             {pendingWorkers > 0 && <div className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full m-3 animate-ping"></div>}
             <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3"><UserPlus size={24}/></div>
             <div className="text-3xl font-bold text-orange-600 mb-1">{pendingWorkers}</div>
             <div className="text-sm text-slate-500">รอตรวจสอบ (Line OA)</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3"><CheckCircle2 size={24}/></div>
             <div className="text-3xl font-bold text-emerald-600 mb-1">{activeWorkers}</div>
             <div className="text-sm text-slate-500">พร้อมทำงาน</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3"><Briefcase size={24}/></div>
             <div className="text-3xl font-bold text-indigo-600 mb-1">{openJobs}</div>
             <div className="text-sm text-slate-500">งานเปิดรับสมัคร</div>
          </div>
       </div>
    </div>
  );
};

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
                 <tr><td className="p-3 font-medium">ตำแหน่งงานที่เปิดรับ</td><td className="p-3">{jobs.length} ตำแหน่ง</td><td className="p-3 text-right text-green-600">ปกติ</td></tr>
                 <tr><td className="p-3 font-medium">พนักงานติด Blacklist</td><td className="p-3">{workers.filter(w => w.status === 'blacklisted').length} คน</td><td className="p-3 text-right text-red-500">ต้องตรวจสอบ</td></tr>
              </tbody>
           </table>
        </div>
     </div>
  </div>
);

// --- Registration View (LIFF) ---
const RegistrationView = () => {
  // ✅ เพิ่มฟิลด์ใหม่: idCard, address, experience, refPerson, training, photo, documents
  const [formData, setFormData] = useState({ 
    name: '', phone: '', education: '', skills: [], 
    idCard: '', address: '', experience: '', 
    refName: '', refPhone: '', training: '',
    photoUrl: '', docUrls: [],
    lineUserId: '', lineDisplayName: '', linePictureUrl: ''
  });
  
  const [liffState, setLiffState] = useState({ isInit: false, isLoggedIn: false, profile: null, error: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [skillsList, setSkillsList] = useState(DEFAULT_SKILLS);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let unsubConfig = () => {};
    const authUnsub = onAuthStateChanged(auth, (user) => {
       if (user) {
          unsubConfig = onSnapshot(doc(db, 'system_settings', 'config'), (doc) => {
             if (doc.exists() && doc.data().skills) setSkillsList(doc.data().skills);
          });
       } else {
          signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
       }
    });

    const initLiff = async () => {
      try {
        await liff.init({ liffId: MY_LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          const q = query(collection(db, 'users'), where('lineUserId', '==', profile.userId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) { setIsAlreadyRegistered(true); }

          setFormData(prev => ({
            ...prev, lineUserId: profile.userId, lineDisplayName: profile.displayName, linePictureUrl: profile.pictureUrl, name: prev.name || profile.displayName
          }));
          setLiffState({ isInit: true, isLoggedIn: true, profile, error: null });
        } else {
          setLiffState({ isInit: true, isLoggedIn: false, profile: null, error: null });
        }
      } catch (err) {
        setLiffState(prev => ({ ...prev, isInit: true, error: err.message }));
      }
    };
    initLiff();
    return () => { authUnsub(); unsubConfig(); };
  }, []);

  const handleLogin = () => liff.login(); 

  const handleFileUpload = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    
    if (type === 'photo') {
      const url = await uploadFileToStorage(files[0], 'profiles');
      if (url) setFormData(prev => ({ ...prev, photoUrl: url }));
    } else if (type === 'doc') {
      // Allow multiple docs
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFileToStorage(files[i], 'documents');
        if (url) newUrls.push(url);
      }
      setFormData(prev => ({ ...prev, docUrls: [...prev.docUrls, ...newUrls] }));
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.idCard) return alert('กรุณากรอกข้อมูลสำคัญให้ครบ (ชื่อ, เบอร์, เลขบัตร)');
    if (!liffState.isLoggedIn) { alert('กรุณาเข้าสู่ระบบ LINE'); liff.login(); return; }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users'), {
        ...formData, role: 'worker', source: 'line', status: 'pending', 
        registeredAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      if (liff.isInClient()) liff.closeWindow(); else setIsSuccess(true);
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev, skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
    }));
  };

  if (!liffState.isInit) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">กำลังโหลดระบบรับสมัคร...</div>;

  if (isAlreadyRegistered) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-lg relative"><UserCheck size={48} className="text-yellow-600" /></div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">ท่านลงทะเบียนแล้ว</h2>
      <button onClick={() => liff.closeWindow()} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold mt-4">ปิดหน้าต่าง</button>
    </div>
  );

  if (isSuccess) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg"><Check size={48} className="text-green-600" /></div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">ลงทะเบียนสำเร็จ!</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden my-4 relative">
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-6 text-center relative overflow-hidden">
           <div className="relative z-10"><h1 className="text-2xl font-bold text-white mb-1">ใบสมัครงาน</h1><p className="text-yellow-100 text-sm">EASTERN LABOUR RECRUITMENT</p></div>
           {liffState.isLoggedIn && liffState.profile && <div className="absolute top-4 right-4 z-20"><img src={liffState.profile.pictureUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm"/></div>}
        </div>
        
        {!liffState.isLoggedIn ? (
           <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"><Smartphone size={40} className="text-green-600"/></div>
              <div><h3 className="text-lg font-bold text-slate-800">ยืนยันตัวตนผ่าน LINE</h3><button onClick={handleLogin} className="mt-4 w-full bg-[#06C755] text-white py-3 rounded-xl font-bold">เข้าสู่ระบบด้วย LINE</button></div>
           </div>
        ) : (
           <form onSubmit={handleSubmit} className="p-6 space-y-5 animate-slide-up">
             
             {/* ส่วนที่ 1: ข้อมูลส่วนตัว */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center"><User size={18} className="mr-2 text-indigo-600"/> ข้อมูลส่วนตัว</h3>
                <div><label className="text-sm font-bold block mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input className="w-full border p-3 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                <div><label className="text-sm font-bold block mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label><input className="w-full border p-3 rounded-xl" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/></div>
                <div><label className="text-sm font-bold block mb-1">เลขบัตรประชาชน <span className="text-red-500">*</span></label><input className="w-full border p-3 rounded-xl" maxLength={13} placeholder="13 หลัก" value={formData.idCard} onChange={e => setFormData({...formData, idCard: e.target.value})}/></div>
                <div><label className="text-sm font-bold block mb-1">ที่อยู่ปัจจุบัน</label><textarea className="w-full border p-3 rounded-xl" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}/></div>
             </div>

             {/* ส่วนที่ 2: การศึกษาและงาน */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center"><Briefcase size={18} className="mr-2 text-orange-600"/> การทำงาน & ทักษะ</h3>
                <div>
                  <label className="text-sm font-bold block mb-2">วุฒิการศึกษา</label>
                  <div className="grid grid-cols-2 gap-2">
                     {EDUCATION_LEVELS.map(edu => (<button type="button" key={edu} onClick={() => setFormData({...formData, education: edu})} className={`px-2 py-2 rounded-lg text-xs border ${formData.education === edu ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-slate-200'}`}>{edu}</button>))}
                  </div>
                </div>
                <div><label className="text-sm font-bold block mb-1">ประสบการณ์ทำงาน</label><textarea className="w-full border p-3 rounded-xl" placeholder="ระบุตำแหน่งและบริษัทที่เคยทำ..." rows={3} value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}/></div>
                <div><label className="text-sm font-bold block mb-1">หลักสูตรฝึกอบรม</label><textarea className="w-full border p-3 rounded-xl" placeholder="เช่น การขับรถโฟล์คลิฟท์, ความปลอดภัย..." rows={2} value={formData.training} onChange={e => setFormData({...formData, training: e.target.value})}/></div>
                <div><label className="text-sm font-bold block mb-2">ทักษะ</label><div className="flex flex-wrap gap-2">{skillsList.map(skill => (<button type="button" key={skill} onClick={() => toggleSkill(skill)} className={`px-3 py-1 text-xs rounded-full border ${formData.skills.includes(skill) ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white'}`}>{skill}</button>))}</div></div>
             </div>

             {/* ส่วนที่ 3: บุคคลอ้างอิง */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center"><Users size={18} className="mr-2 text-green-600"/> บุคคลอ้างอิง</h3>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-xs font-bold block mb-1">ชื่อบุคคลอ้างอิง</label><input className="w-full border p-2 rounded-lg text-sm" value={formData.refName} onChange={e => setFormData({...formData, refName: e.target.value})}/></div>
                   <div><label className="text-xs font-bold block mb-1">เบอร์โทร</label><input className="w-full border p-2 rounded-lg text-sm" type="tel" value={formData.refPhone} onChange={e => setFormData({...formData, refPhone: e.target.value})}/></div>
                </div>
             </div>

             {/* ส่วนที่ 4: เอกสารและรูปภาพ */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center"><UploadCloud size={18} className="mr-2 text-blue-600"/> แนบเอกสาร</h3>
                
                {/* รูปถ่าย */}
                <div>
                   <label className="text-sm font-bold block mb-2">รูปถ่ายหน้าตรง</label>
                   <div className="flex items-center gap-4">
                      {formData.photoUrl && <img src={formData.photoUrl} className="w-16 h-16 rounded object-cover border"/>}
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center text-sm">
                         <ImageIcon size={16} className="mr-2"/> {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} disabled={uploading}/>
                      </label>
                   </div>
                </div>

                {/* เอกสารอื่นๆ */}
                <div>
                   <label className="text-sm font-bold block mb-2">เอกสารเพิ่มเติม (สำเนาบัตร/ทะเบียนบ้าน)</label>
                   <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 transition-all bg-slate-50">
                      <UploadCloud size={24} className="mb-2 text-slate-400"/>
                      <span className="text-xs">{uploading ? 'กำลังอัปโหลด...' : 'แตะเพื่ออัปโหลดไฟล์'}</span>
                      <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, 'doc')} disabled={uploading}/>
                   </label>
                   {formData.docUrls.length > 0 && (
                     <div className="mt-2 space-y-1">
                        {formData.docUrls.map((url, idx) => (
                           <div key={idx} className="flex items-center text-xs text-blue-600 bg-blue-50 p-2 rounded"><File size={12} className="mr-2"/> เอกสารแนบ {idx + 1}</div>
                        ))}
                     </div>
                   )}
                </div>
             </div>

             <button type="submit" disabled={isSubmitting || uploading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center">{isSubmitting ? <Clock className="animate-spin mr-2"/> : <Send className="mr-2" size={20}/>} ส่งใบสมัคร</button>
           </form>
        )}
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400">Power by EASTERN LABOUR System</div>
      </div>
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
  
  // ✅ เพิ่มฟิลด์ใหม่ใน State ของ Admin Form
  const [workerForm, setWorkerForm] = useState({ 
    name: '', phone: '', lineId: '', lineDisplayName: '', source: 'office', 
    skills: [], education: '', status: 'active',
    idCard: '', address: '', experience: '', refName: '', refPhone: '', training: '', photoUrl: '', docUrls: []
  });
  const [jobForm, setJobForm] = useState({ title: '', companyName: '', description: '', location: '', wage: '', requiredSkills: [], status: 'open' });
  const [uploading, setUploading] = useState(false);

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

  const handleFileUploadAdmin = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    if (type === 'photo') {
      const url = await uploadFileToStorage(files[0], 'profiles');
      if (url) setWorkerForm(prev => ({ ...prev, photoUrl: url }));
    } else if (type === 'doc') {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFileToStorage(files[i], 'documents');
        if (url) newUrls.push(url);
      }
      setWorkerForm(prev => ({ ...prev, docUrls: [...(prev.docUrls || []), ...newUrls] }));
    }
    setUploading(false);
  };

  const handleSaveWorker = async () => {
    try {
      const payload = { ...workerForm, role: 'worker', updatedAt: serverTimestamp() };
      if (editingId) await updateDoc(doc(db, 'users', editingId), payload);
      else await addDoc(collection(db, 'users'), { ...payload, registeredAt: serverTimestamp(), source: 'office' });
      goBack();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleSaveJob = async () => {
    try {
      const payload = { ...jobForm, employerId: 'admin', updatedAt: serverTimestamp() };
      if (editingId) await updateDoc(doc(db, 'jobs', editingId), payload);
      else await addDoc(collection(db, 'jobs'), { ...payload, createdAt: serverTimestamp() });
      goBack();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleDelete = async (coll, id) => { if (confirm('ยืนยันลบ?')) await deleteDoc(doc(db, coll, id)); };
  const handleAddConfig = async (type, item) => updateDoc(doc(db, 'system_settings', 'config'), { [type]: arrayUnion(item) });
  const handleDelConfig = async (type, item) => updateDoc(doc(db, 'system_settings', 'config'), { [type]: arrayRemove(item) });

  const goBack = () => {
    setEditingId(null);
    setWorkerForm({ name: '', phone: '', lineId: '', lineDisplayName: '', source: 'office', skills: [], education: '', status: 'active', idCard: '', address: '', experience: '', refName: '', refPhone: '', training: '', photoUrl: '', docUrls: [] });
    setJobForm({ title: '', companyName: '', description: '', location: '', wage: '', requiredSkills: [], status: 'open' });
    if (currentView === 'recruitment' && editingId) setCurrentView('recruitment');
    else if ((currentView === 'worker-form' || currentView === 'job-form') && editingId) setCurrentView(currentView === 'worker-form' ? 'workers-list' : 'jobs-list');
    else setCurrentView('home');
    setEditingId(null);
  };

  const startEdit = (item, type) => {
    setEditingId(item.id);
    if (type === 'worker') { setWorkerForm(item); setCurrentView('worker-form'); } 
    else { setJobForm(item); setCurrentView('job-form'); }
  };

  const toggleArrayItem = (item, type, field) => {
    const target = type === 'worker' ? workerForm : jobForm;
    const setTarget = type === 'worker' ? setWorkerForm : setJobForm;
    setTarget({ ...target, [field]: target[field].includes(item) ? target[field].filter(s => s !== item) : [...target[field], item] });
  };

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
                <AppIcon icon={Users} label="ฐานข้อมูลพนักงาน" color="bg-gradient-to-br from-blue-500 to-blue-600" badge={workers.filter(w => w.status === 'active').length} onClick={() => setCurrentView('workers-list')} />
                <AppIcon icon={Building2} label="ฐานข้อมูลบริษัท" color="bg-gradient-to-br from-indigo-500 to-indigo-600" badge={jobs.length} onClick={() => setCurrentView('jobs-list')} />
                <AppIcon icon={PieChart} label="Dashboard" color="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => setCurrentView('dashboard')} />
                <AppIcon icon={UserPlus} label="พนักงานใหม่" color="bg-gradient-to-br from-emerald-500 to-emerald-600" badge={pendingWorkers.length} onClick={() => setCurrentView('recruitment')} />
                <AppIcon icon={PlusCircle} label="งานใหม่" color="bg-gradient-to-br from-orange-500 to-orange-600" onClick={() => setCurrentView('job-form')} />
                <AppIcon icon={FileText} label="รายงาน" color="bg-gradient-to-br from-slate-600 to-slate-700" onClick={() => setCurrentView('reports')} />
             </div>
             {/* ❌ เอาลิงก์ Test Line OA ออกตามคำขอ */}
          </div>
        )}

        {currentView === 'dashboard' && <DashboardView workers={workers} jobs={jobs} />}
        {currentView === 'reports' && <ReportsView workers={workers} jobs={jobs} />}

        {currentView === 'recruitment' && (
           <div className="p-6 w-full space-y-6"> {/* ✅ เปลี่ยนจาก max-w-6xl เป็น w-full เพื่อขยายเต็มจอ */}
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div><h3 className="text-xl font-bold text-slate-800 flex items-center"><Smartphone size={24} className="mr-2 text-green-600"/> ใบสมัครจาก Line OA</h3><p className="text-slate-500 text-sm mt-1">รายการรอตรวจสอบ ({pendingWorkers.length})</p></div>
                 <div className="flex gap-2">
                    <button onClick={() => setCurrentView('worker-form')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center"><UserPlus size={18} className="mr-2"/> ลงทะเบียน Walk-in</button>
                 </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                       <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                          <tr>
                             <th className="p-4">ช่องทาง</th>
                             <th className="p-4">ชื่อ</th>
                             <th className="p-4">เบอร์โทร</th>
                             <th className="p-4">วุฒิ</th> {/* ✅ เพิ่มคอลัมน์วุฒิ */}
                             <th className="p-4">ทักษะ</th>
                             <th className="p-4 text-right">ดำเนินการ</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {pendingWorkers.map(w => (
                             <tr key={w.id} className="hover:bg-orange-50/30 transition-colors">
                                <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700"><Smartphone size={10} className="mr-1"/> Line OA</span></td>
                                <td className="p-4 font-bold text-slate-800">{w.name}</td>
                                <td className="p-4 font-mono">{w.phone}</td>
                                <td className="p-4">{w.education || '-'}</td> {/* ✅ แสดงวุฒิ */}
                                <td className="p-4"><div className="flex gap-1 flex-wrap max-w-[200px]">{w.skills?.slice(0,3).map(s => <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500">{s}</span>)}</div></td>
                                <td className="p-4 text-right">
                                   <div className="flex justify-end gap-2">
                                     <button onClick={() => startEdit(w, 'worker')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center"><UserCheck size={14} className="mr-1"/> ตรวจสอบ</button>
                                     <button onClick={() => handleDelete('users', w.id)} className="bg-white border border-rose-200 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 flex items-center"><Trash2 size={14}/></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                          {pendingWorkers.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400">ไม่พบรายการใหม่</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}

        {currentView === 'workers-list' && (
            <div className="p-6">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-4">ชื่อ</th><th className="p-4">เบอร์โทร</th><th className="p-4">วุฒิ</th><th className="p-4">สถานะ</th><th className="p-4 text-right">จัดการ</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">
                        {workers.filter(w=>w.status!=='pending').map(w => (
                           <tr key={w.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{w.name}</td><td className="p-4">{w.phone}</td><td className="p-4">{w.education||'-'}</td><td className="p-4"><StatusBadge status={w.status}/></td><td className="p-4 text-right flex justify-end gap-2"><button onClick={()=>startEdit(w,'worker')}><Edit2 size={16}/></button><button onClick={()=>handleDelete('users', w.id)}><Trash2 size={16}/></button></td></tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
        )}
        
        {currentView === 'jobs-list' && (
            <div className="p-6">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-4">ชื่องาน</th><th className="p-4">บริษัท</th><th className="p-4">ค่าจ้าง</th><th className="p-4 text-right">จัดการ</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">
                        {jobs.map(j => (
                           <tr key={j.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{j.title}</td><td className="p-4">{j.companyName}</td><td className="p-4 text-green-600 font-bold">{j.wage}</td><td className="p-4 text-right flex justify-end gap-2"><button onClick={()=>startEdit(j,'job')}><Edit2 size={16}/></button><button onClick={()=>handleDelete('jobs', j.id)}><Trash2 size={16}/></button></td></tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
        )}

        {(currentView === 'worker-form' || currentView === 'job-form') && (
           <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                 {currentView === 'worker-form' ? (
                    <>
                      <div className="flex items-center gap-4 border-b pb-4">
                         {workerForm.photoUrl ? <img src={workerForm.photoUrl} className="w-20 h-20 rounded object-cover border"/> : <div className="w-20 h-20 rounded bg-slate-100 flex items-center justify-center text-slate-400"><User size={32}/></div>}
                         <div>
                            <label className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-100">{uploading ? '...' : 'เปลี่ยนรูป'} <input type="file" className="hidden" accept="image/*" onChange={e=>handleFileUploadAdmin(e,'photo')} disabled={uploading}/></label>
                         </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                         <div><label className="text-sm font-bold block mb-1">ชื่อ-นามสกุล</label><input className="w-full border p-2 rounded" value={workerForm.name} onChange={e=>setWorkerForm({...workerForm, name: e.target.value})}/></div>
                         <div><label className="text-sm font-bold block mb-1">เบอร์โทร</label><input className="w-full border p-2 rounded" value={workerForm.phone} onChange={e=>setWorkerForm({...workerForm, phone: e.target.value})}/></div>
                         <div><label className="text-sm font-bold block mb-1">เลขบัตร ปชช.</label><input className="w-full border p-2 rounded" value={workerForm.idCard} onChange={e=>setWorkerForm({...workerForm, idCard: e.target.value})}/></div>
                         <div><label className="text-sm font-bold block mb-1">สถานะ</label><select className="w-full border p-2 rounded" value={workerForm.status} onChange={e=>setWorkerForm({...workerForm, status: e.target.value})}><option value="pending">รอตรวจสอบ</option><option value="active">พร้อมทำงาน</option><option value="inactive">ไม่ว่าง</option><option value="blacklisted">Blacklist</option></select></div>
                         
                         <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">ที่อยู่</label><textarea className="w-full border p-2 rounded" rows={2} value={workerForm.address} onChange={e=>setWorkerForm({...workerForm, address: e.target.value})}/></div>
                         
                         <div>
                            <label className="text-sm font-bold block mb-1">วุฒิการศึกษา</label>
                            <select className="w-full border p-2 rounded" value={workerForm.education} onChange={e=>setWorkerForm({...workerForm, education: e.target.value})}>
                               <option value="">เลือกวุฒิ</option>
                               {EDUCATION_LEVELS.map(edu => <option key={edu} value={edu}>{edu}</option>)}
                            </select>
                         </div>
                         <div><label className="text-sm font-bold block mb-1">หลักสูตรฝึกอบรม</label><input className="w-full border p-2 rounded" value={workerForm.training} onChange={e=>setWorkerForm({...workerForm, training: e.target.value})}/></div>
                         
                         <div className="md:col-span-2"><label className="text-sm font-bold block mb-1">ประสบการณ์ทำงาน</label><textarea className="w-full border p-2 rounded" rows={3} value={workerForm.experience} onChange={e=>setWorkerForm({...workerForm, experience: e.target.value})}/></div>

                         <div className="md:col-span-2 border p-4 rounded-xl bg-slate-50">
                            <h4 className="font-bold text-sm mb-2 text-slate-700">บุคคลอ้างอิง</h4>
                            <div className="grid grid-cols-2 gap-4">
                               <input className="border p-2 rounded" placeholder="ชื่อ" value={workerForm.refName} onChange={e=>setWorkerForm({...workerForm, refName: e.target.value})}/>
                               <input className="border p-2 rounded" placeholder="เบอร์โทร" value={workerForm.refPhone} onChange={e=>setWorkerForm({...workerForm, refPhone: e.target.value})}/>
                            </div>
                         </div>
                         
                         <div className="md:col-span-2">
                            <label className="text-sm font-bold block mb-2">ทักษะ</label>
                            <div className="flex flex-wrap gap-2">{skillsList.map(s=><button key={s} onClick={()=>toggleArrayItem(s,'worker','skills')} className={`px-2 py-1 rounded border ${workerForm.skills.includes(s)?'bg-indigo-600 text-white':'bg-white'}`}>{s}</button>)}</div>
                         </div>

                         <div className="md:col-span-2 border-t pt-4">
                            <label className="text-sm font-bold block mb-2">เอกสารแนบ</label>
                            <div className="space-y-2">
                               {workerForm.docUrls && workerForm.docUrls.map((url, i) => (
                                 <div key={i} className="flex items-center text-sm text-blue-600 bg-blue-50 p-2 rounded"><File size={14} className="mr-2"/> <a href={url} target="_blank" className="underline hover:text-blue-800">เอกสาร {i+1}</a></div>
                               ))}
                               <label className="inline-flex items-center px-4 py-2 bg-slate-200 rounded text-sm font-bold cursor-pointer hover:bg-slate-300"><UploadCloud size={16} className="mr-2"/> อัปโหลดเพิ่ม <input type="file" multiple className="hidden" onChange={e=>handleFileUploadAdmin(e,'doc')} disabled={uploading}/></label>
                            </div>
                         </div>
                      </div>
                    </>
                 ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                       <input className="border p-2 rounded" placeholder="ชื่องาน" value={jobForm.title} onChange={e=>setJobForm({...jobForm, title: e.target.value})}/>
                       <input className="border p-2 rounded" placeholder="บริษัท" value={jobForm.companyName} onChange={e=>setJobForm({...jobForm, companyName: e.target.value})}/>
                       <input className="border p-2 rounded" placeholder="ค่าจ้าง" value={jobForm.wage} onChange={e=>setJobForm({...jobForm, wage: e.target.value})}/>
                    </div>
                 )}
                 <div className="flex justify-end pt-4"><button onClick={currentView==='worker-form'?handleSaveWorker:handleSaveJob} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">บันทึก</button></div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

// ==========================================
// Main App Component
// ==========================================
export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isLineApp = /Line/i.test(navigator.userAgent);
    if (mode === 'register' || isLineApp) {
      setIsAdminMode(false);
    }
  }, []);

  return isAdminMode ? <AdminDashboard /> : <RegistrationView />;
}