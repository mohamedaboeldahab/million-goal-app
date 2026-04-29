import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
            if (user) {
                if(splash) splash.style.display = 'none';
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                document.getElementById('userEmail').innerText = user.email;
                this.loadPage('home');
            } else {
                // بدلاً من الدخول الإجباري الذي قد يُعلق، نظهر زر دخول في السبلش
                if(splash) {
                    splash.innerHTML += `
                        <button onclick="engine.login()" class="mt-10 bg-white text-slate-900 px-8 py-3 rounded-2xl font-black shadow-2xl flex items-center gap-3 active:scale-95 transition-all">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                            تسجيل دخول القروش
                        </button>
                    `;
                }
            }
        });
    },

    async login() {
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            alert("خطأ في تسجيل الدخول، تأكد من إعدادات الـ Firebase Domains");
        }
    },

    async logout() {
        if(confirm("هل تريد تسجيل الخروج من مجتمع القروش؟")) {
            await signOut(auth);
            location.reload();
        }
    },

    async loadPage(pageName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="text-center py-20"><div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div></div>';

        try {
            const response = await fetch(`${pageName}.html`);
            if(!response.ok) throw new Error();
            const html = await response.text();
            content.innerHTML = html;
            
            if (pageName === 'home') this.listenToPosts();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-gray-400 font-bold">الصفحة قيد التحديث... قريباً</div>`;
        }
    },

    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => `
                <div class="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-gray-50">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${doc.data().authorPhoto}" class="w-10 h-10 rounded-xl border-2 border-sky-50">
                        <div>
                           <h4 class="font-black text-slate-800 text-sm">${doc.data().authorName}</h4>
                           <p class="text-[10px] text-gray-400">منذ قليل</p>
                        </div>
                    </div>
                    <p class="text-slate-700 text-sm leading-relaxed font-medium">${doc.data().content}</p>
                </div>
            `).join('');
        });
    },

    async addPost() {
        const input = document.getElementById('postInput');
        if(!input || !input.value.trim()) return;

        await addDoc(collection(db, "posts"), {
            content: input.value,
            authorName: auth.currentUser.displayName,
            authorPhoto: auth.currentUser.photoURL,
            createdAt: serverTimestamp()
        });
        input.value = '';
    }
};

window.engine.init();
