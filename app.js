import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
    init() {
        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            const authActions = document.getElementById('authActions');
            if (user) {
                if(splash) splash.style.display = 'none';
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                document.getElementById('userEmail').innerText = user.email;
                this.loadPage('home');
            } else {
                if(authActions) {
                    authActions.innerHTML = `
                        <button onclick="engine.login()" class="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 hover:scale-105 transition-all">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                            دخول القروش
                        </button>
                    `;
                }
            }
        });
    },

    async login() { await signInWithPopup(auth, provider); },
    async logout() { if(confirm("هل ستغادر المحيط؟")) { await signOut(auth); location.reload(); } },

    async loadPage(pageName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="text-center py-20"><div class="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>';

        try {
            const response = await fetch(`${pageName}.html`);
            const html = await response.text();
            content.innerHTML = html;
            
            if (pageName === 'home') this.listenToPosts();
            if (pageName === 'roadmap') this.renderRoadmap();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-slate-400 font-bold">الصفحة قيد التطوير في Shark Labs</div>`;
        }
    },

    // --- المنشورات والتصويت ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="bg-white rounded-[2rem] p-6 mb-6 shadow-sm border border-gray-50 flex gap-4 animate-fade-in">
                    <div class="flex flex-col items-center gap-2 bg-slate-50 rounded-2xl p-2 h-fit min-w-[45px]">
                        <button onclick="engine.handleVote('${doc.id}', 1)" class="text-slate-300 hover:text-sky-500 transition-colors"><i class="fa-solid fa-circle-chevron-up text-xl"></i></button>
                        <span class="font-black text-slate-700 text-sm">${p.points || 0}</span>
                        <button onclick="engine.handleVote('${doc.id}', -1)" class="text-slate-300 hover:text-red-400 transition-colors"><i class="fa-solid fa-circle-chevron-down text-xl"></i></button>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-3">
                            <img src="${p.authorPhoto}" class="w-6 h-6 rounded-lg border">
                            <span class="font-bold text-[11px] text-slate-400 underline">${p.authorName}</span>
                        </div>
                        <p class="text-slate-800 text-sm font-medium leading-relaxed mb-4">${p.content}</p>
                        <button onclick="engine.openComments('${doc.id}')" class="text-sky-600 text-[11px] font-black bg-sky-50 px-4 py-2 rounded-full hover:bg-sky-100 transition-all">
                            <i class="fa-solid fa-comments ml-1"></i> ${p.commentsCount || 0} تعليق
                        </button>
                    </div>
                </div>`;
            }).join('');
        });
    },

    async addPost() {
        const input = document.getElementById('postInput');
        if(!input.value.trim()) return;
        await addDoc(collection(db, "posts"), {
            content: input.value,
            authorName: auth.currentUser.displayName,
            authorPhoto: auth.currentUser.photoURL,
            points: 0,
            commentsCount: 0,
            createdAt: serverTimestamp()
        });
        input.value = '';
    },

    async handleVote(postId, val) {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { points: increment(val) });
    },

    // --- الخريطة ---
    renderRoadmap() {
        const container = document.getElementById('roadmapSteps');
        if(!container) return;
        const steps = [
            {t: "تحديد الفكرة", p: 0},
            {t: "بناء النموذج الأولي", p: 100},
            {t: "جذب أول مستثمر", p: 1000},
            {t: "التوسع الإقليمي", p: 10000}
        ];
        container.innerHTML = steps.map(s => `
            <div class="flex items-center gap-6 mb-10 group">
                <div class="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-300 group-hover:text-sky-500 transition-all border-2 border-transparent group-hover:border-sky-500">
                    <i class="fa-solid fa-trophy"></i>
                </div>
                <div>
                    <h4 class="font-black text-slate-800 text-sm">${s.t}</h4>
                    <p class="text-[10px] text-slate-400">تحتاج ${s.p} نقطة دعم</p>
                </div>
            </div>
        `).join('');
    }
};

window.engine.init();
