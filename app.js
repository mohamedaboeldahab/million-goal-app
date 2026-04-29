import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    increment,
    arrayUnion,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
window.auth = auth;   // جعل auth متاحًا عالميًا
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.engine = {
    async init() {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (e) {
            console.error("Persistence error", e);
        }

        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            const nav = document.getElementById('main-nav');

            if (user) {
                console.log("Welcome Shark:", user.displayName);
                if (splash) splash.style.display = 'none';
                if (nav) nav.classList.remove('hidden');

                const userBtn = document.getElementById('userBtn');
                if (userBtn) userBtn.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-2xl">`;

                this.loadPage('home');
            } else {
                console.log("No Shark detected.");
                if (nav) nav.classList.add('hidden');
                this.showLoginUI();
            }
        });
    },

    showLoginUI() {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.display = 'flex';
            splash.innerHTML = `
                <div class="w-20 h-20 bg-sky-500 rounded-[2rem] flex items-center justify-center mb-6 rotate-12 shadow-2xl">
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
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("حدث خطأ في الدخول، تأكد من السماح بالنوافذ المنبثقة (Popups)");
        }
    },

    async logout() {
        if (confirm("هل تريد مغادرة المحيط؟")) {
            await signOut(auth);
            location.reload();
        }
    },

async loadPage(pageName) {
    const content = document.getElementById('app-content');
    if (!content) return;

    // تمييز الزر النشط في الـ Nav
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === pageName);
    });

    content.innerHTML = '<div class="flex justify-center py-20"><div class="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const response = await fetch(`${pageName}.html`);
        const html = await response.text();
        content.innerHTML = html;

        // ✅ تشغيل السكريبتات المضمنة في الصفحة المحملة
        const scripts = content.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.textContent = oldScript.textContent;
            oldScript.replaceWith(newScript);
        });

        // ميزات صفحة Home
        if (pageName === 'home') {
            this.listenToPosts();
            this.activateCharCounter();
        }

        // تحديث الروابط النشطة (من الدالة العامة في index.html)
        if (typeof setActiveNavLink === 'function') {
            setActiveNavLink(pageName);
        }

    } catch (e) {
        content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`;
    }
},

    // --- عداد الأحرف الخاص بحقل الإدخال ---
    activateCharCounter() {
        const input = document.getElementById('postInput');
        const countSpan = document.getElementById('charCount');
        if (!input || !countSpan) return;

        const max = parseInt(input.getAttribute('maxlength')) || 300;

        const update = () => {
            const current = input.value.length;
            countSpan.textContent = `${current}/${max} حرف`;
            // تغيير اللون عند الاقتراب من الحد الأقصى
            countSpan.className = current >= max - 30
                ? 'text-xs text-red-500 font-bold'
                : 'text-xs text-gray-400 font-medium';
        };

        input.addEventListener('input', update);
        update(); // عرض العدد الأولي

        // تعديل دالة الإرسال لتحديث العداد بعد النشر
        const originalAddPost = this.addPost.bind(this);
        this.addPost = async function () {
            await originalAddPost();
            // بعد إفراغ الحقل في addPost الأصلية، نُحدّث العداد
            update();
        };
    },

    // --- نظام التصويت والتعليقات ---
    async handleVote(postId, type) {
        const postRef = doc(db, "posts", postId);
        const userId = auth.currentUser.uid;
        const postSnap = await getDoc(postRef);
        const data = postSnap.data();

        if (data.voters && data.voters.includes(userId)) {
            alert("صوتك وصل بالفعل!");
            return;
        }

        const updateData = { voters: arrayUnion(userId) };
        updateData[type === 'support' ? 'supportCount' : 'opposeCount'] = increment(1);
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
                <div class="bg-white rounded-[2rem] p-6 mb-5 shadow-sm border border-slate-50">
                    <div class="flex items-center gap-2 mb-3">
                        <img src="${p.authorPhoto}" class="w-6 h-6 rounded-full border">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">${p.authorName}</span>
                    </div>
                    <p class="text-slate-800 text-sm font-bold mb-5">${p.content}</p>
                    <div class="flex gap-2">
                        <button onclick="engine.handleVote('${doc.id}', 'support')" class="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-[10px] transition-all active:scale-95">أؤيد (${p.supportCount || 0})</button>
                        <button onclick="engine.handleVote('${doc.id}', 'oppose')" class="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-[10px] transition-all active:scale-95">لا أؤيد (${p.opposeCount || 0})</button>
                    </div>
                    <div class="mt-4 pt-4 border-t border-dashed border-slate-100">
                        <div class="flex gap-2 mb-2">
                            <input type="text" id="comm_${doc.id}" placeholder="ردك.." class="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-[10px] outline-none">
                            <button onclick="engine.addComment('${doc.id}')" class="bg-slate-900 text-white px-4 rounded-lg text-[10px] font-black">رد</button>
                        </div>
                        <div id="list_${doc.id}" class="space-y-1"></div>
                    </div>
                </div>`;
            }).join('');
            snapshot.docs.forEach(d => this.listenToComments(d.id));
        });
    },

    async addPost() {
        const input = document.getElementById('postInput');
        if (!input?.value.trim()) return;
        await addDoc(collection(db, "posts"), {
            content: input.value,
            authorName: auth.currentUser.displayName,
            authorPhoto: auth.currentUser.photoURL,
            supportCount: 0,
            opposeCount: 0,
            voters: [],
            createdAt: serverTimestamp()
        });
        input.value = '';
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
                    <div class="text-[9px] bg-slate-50 p-2 rounded-lg">
                        <b class="text-sky-600">${d.data().userName}:</b> ${d.data().text}
                    </div>
                `).join('');
            }
        });
    }
};

// تشغيل المحرك
engine.init();
