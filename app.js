import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    getRedirectResult, 
    onAuthStateChanged, 
    signOut,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyB_2ms4K8EPbag7uab9gbDy8eePY6xwpxc",
    authDomain: "millionaireapp-be931.firebaseapp.com",
    projectId: "millionaireapp-be931",
    storageBucket: "millionaireapp-be931.firebasestorage.app",
    messagingSenderId: "325577904362",
    appId: "1:325577904362:web:8d85d4547bf22b1d8f4793"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.engine = {
    async init() {
        // 1. ضبط الثبات (Persistence) لضمان بقاء المستخدم مسجلاً حتى بعد إغلاق المتصفح
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            console.error("Persistence Error:", error);
        }

        // 2. معالجة نتيجة الـ Redirect عند العودة من صفحة جوجل
        try {
            const result = await getRedirectResult(auth);
            if (result?.user) {
                console.log("تم تسجيل الدخول بنجاح بعد العودة");
            }
        } catch (error) {
            console.error("Auth Redirect Error:", error);
        }

        // 3. مراقبة حالة تسجيل الدخول (هذا هو المحرك الرئيسي)
        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            const mainNav = document.getElementById('main-nav');
            
            if (user) {
                // مستخدم مسجل
                if(splash) splash.style.display = 'none';
                if(mainNav) mainNav.classList.remove('hidden');
                
                const userBtn = document.getElementById('userBtn');
                if(userBtn) userBtn.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                
                // تحميل الصفحة الرئيسية فقط إذا كنا لا نزال في شاشة البداية
                this.loadPage('home');
            } else {
                // لا يوجد مستخدم - إظهار شاشة الدخول
                if(mainNav) mainNav.classList.add('hidden');
                this.renderLoginUI();
            }
        });
    },

    renderLoginUI() {
        const splash = document.getElementById('splash');
        if(splash) {
            splash.style.display = 'flex';
            splash.innerHTML = `
                <div class="w-20 h-20 bg-sky-500 rounded-[2rem] flex items-center justify-center mb-6 rotate-12 shadow-2xl animate-bounce">
                    <i class="fa-solid fa-fish-fins text-4xl text-white"></i>
                </div>
                <h1 class="text-white text-2xl font-black mb-10 tracking-widest uppercase">Shark Hub</h1>
                <button onclick="engine.login()" class="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 active:scale-95 transition-all">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                    دخول القروش
                </button>
            `;
        }
    },

    async login() {
        // حفظ الحالة قبل الانتقال لتجنب الدوائر المفرغة
        await signInWithRedirect(auth, provider);
    },

    async logout() {
        if(confirm("هل تريد مغادرة المحيط؟")) {
            await signOut(auth);
            location.reload();
        }
    },

    // ... باقي الدوال (loadPage, handleVote, addPost, إلخ) كما هي في كودك السابق ...
    async loadPage(pageName) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === pageName));
        const content = document.getElementById('app-content');
        if(!content) return;
        
        content.innerHTML = '<div class="text-center py-20"><div class="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>';

        try {
            const response = await fetch(`${pageName}.html`);
            const html = await response.text();
            content.innerHTML = html;
            if (pageName === 'home') this.listenToPosts();
            if (pageName === 'roadmap') this.renderRoadmap();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-slate-400 font-bold">قريباً في Shark Hub</div>`;
        }
    },

    async handleVote(postId, type) {
        const postRef = doc(db, "posts", postId);
        const userId = auth.currentUser.uid;
        const postSnap = await getDoc(postRef);
        const data = postSnap.data();

        if (data.voters && data.voters.includes(userId)) {
            alert("لقد شاركت برأيك مسبقاً");
            return;
        }

        const updateData = { voters: arrayUnion(userId) };
        if (type === 'support') updateData.supportCount = increment(1);
        else updateData.opposeCount = increment(1);

        await updateDoc(postRef, updateData);
    },

    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="bg-white rounded-[2.5rem] p-6 mb-6 shadow-sm border border-slate-50">
                    <div class="flex items-center gap-2 mb-4">
                        <img src="${p.authorPhoto}" class="w-7 h-7 rounded-full border">
                        <span class="text-[11px] font-black text-slate-400">${p.authorName}</span>
                    </div>
                    <p class="text-slate-800 text-sm font-bold leading-relaxed mb-6">${p.content}</p>
                    <div class="flex gap-2 border-t border-slate-50 pt-4">
                        <button onclick="engine.handleVote('${doc.id}', 'support')" class="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all">أؤيد (${p.supportCount || 0})</button>
                        <button onclick="engine.handleVote('${doc.id}', 'oppose')" class="flex-1 bg-rose-50 text-rose-600 py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all">لا أؤيد (${p.opposeCount || 0})</button>
                    </div>
                    <div class="mt-4 pt-4 border-t border-dashed border-slate-100">
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="comm_${doc.id}" placeholder="اكتب ردك..." class="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-xs outline-none">
                            <button onclick="engine.addComment('${doc.id}')" class="bg-slate-900 text-white px-4 rounded-xl text-xs font-black">رد</button>
                        </div>
                        <div id="list_${doc.id}" class="space-y-2"></div>
                    </div>
                </div>`;
            }).join('');
            snapshot.docs.forEach(d => this.listenToComments(d.id));
        });
    },

    async addComment(postId) {
        const input = document.getElementById(`comm_${postId}`);
        if (!input?.value.trim()) return;
        await addDoc(collection(db, `posts/${postId}/comments`), {
            text: input.value,
            userName: auth.currentUser.displayName,
            createdAt: serverTimestamp()
        });
        input.value = '';
    },

    listenToComments(postId) {
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snap) => {
            const list = document.getElementById(`list_${postId}`);
            if (list) {
                list.innerHTML = snap.docs.map(d => `
                    <div class="text-[10px] bg-slate-50/50 p-2 rounded-lg">
                        <span class="font-black text-sky-600">${d.data().userName}:</span> ${d.data().text}
                    </div>
                `).join('');
            }
        });
    }
};

window.engine.init();
