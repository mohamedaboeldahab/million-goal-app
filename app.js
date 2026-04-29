import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
        console.log("Checking Auth...");
        onAuthStateChanged(auth, async (user) => {
            const splash = document.getElementById('splash');
            if (user) {
                console.log("User Logged In:", user.displayName);
                // إخفاء شاشة التحميل
                if(splash) splash.style.display = 'none';
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                
                // تحميل الصفحة الرئيسية فوراً
                this.loadPage('home');
            } else {
                console.log("No User Found, showing login...");
                // لو مفيش مستخدم، شيل اللودر وخليه يضغط دخول
                if(splash) {
                    splash.innerHTML = `
                        <div class="w-20 h-20 bg-sky-500 rounded-3xl flex items-center justify-center mb-6 rotate-12 shadow-xl">
                            <i class="fa-solid fa-fish-fins text-4xl text-white"></i>
                        </div>
                        <h1 class="text-white text-2xl font-black mb-8">SHARK HUB</h1>
                        <button onclick="engine.login()" class="bg-white text-slate-900 px-8 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3">
                             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                             دخول القروش
                        </button>
                    `;
                }
            }
        });
    },

    async login() {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
            alert("تأكد من إضافة الدومين في Firebase: " + error.message);
        }
    },

    async loadPage(pageName) {
        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-spinner animate-spin text-3xl text-sky-500"></i></div>';
        
        try {
            const response = await fetch(`${pageName}.html`);
            if(!response.ok) throw new Error("Page not found");
            const html = await response.text();
            content.innerHTML = html;
            
            if (pageName === 'home') this.listenToPosts();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-gray-500 font-bold">عفواً، الصفحة تحت الإنشاء أو غير موجودة</div>`;
        }
    },

    // --- المنشورات ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${p.authorPhoto}" class="w-8 h-8 rounded-full border">
                        <span class="font-bold text-sm text-slate-700">${p.authorName}</span>
                    </div>
                    <p class="text-slate-800 text-sm mb-4">${p.content}</p>
                    <div class="flex gap-4 border-t pt-3">
                        <button class="text-gray-400 text-xs font-bold flex items-center gap-1">
                            <i class="fa-solid fa-heart"></i> ${p.likes?.length || 0}
                        </button>
                        <button onclick="engine.openComments('${doc.id}')" class="text-gray-400 text-xs font-bold flex items-center gap-1">
                            <i class="fa-solid fa-comment"></i> ${p.commentsCount || 0} تعليق
                        </button>
                    </div>
                </div>`;
            }).join('');
        });
    },

    async addPost() {
        const text = document.getElementById('postInput').value.trim();
        if (!text) return;
        await addDoc(collection(db, "posts"), {
            content: text,
            authorName: auth.currentUser.displayName,
            authorPhoto: auth.currentUser.photoURL,
            authorId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            likes: [],
            commentsCount: 0 // مهم جداً عشان الـ Increment يشتغل
        });
        document.getElementById('postInput').value = '';
    }
};

window.onload = () => engine.init();
