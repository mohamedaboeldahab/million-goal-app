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
        onAuthStateChanged(auth, async (user) => {
            const splash = document.getElementById('splash');
            if (user) {
                if(splash) splash.style.display = 'none';
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                this.loadPage('home');
            } else {
                this.login();
            }
        });
    },

    async login() {
        await signInWithPopup(auth, provider);
    },
// --- وظيفة حفظ الأصول ---
async saveAsset() {
    const name = document.getElementById('assetName').value;
    const val = parseFloat(document.getElementById('assetValue').value);
    if(!name || !val) return;

    await addDoc(collection(db, `users/${auth.currentUser.uid}/assets`), {
        name, val, createdAt: serverTimestamp()
    });
    
    document.getElementById('assetName').value = '';
    document.getElementById('assetValue').value = '';
    alert("تمت إضافة الأصل للمحفظة!");
},

// --- وظيفة الدردشة مع المستشار (تنبيه: تحتاج ربط API حقيقي لاحقاً) ---
askAI() {
    const input = document.getElementById('aiInput');
    const chatBox = document.getElementById('chatBox');
    if(!input.value.trim()) return;

    // إضافة رسالة المستخدم
    chatBox.innerHTML += `
        <div class="bg-sky-500 p-4 rounded-2xl rounded-tl-none text-white shadow-sm text-sm max-w-[80%]">
            ${input.value}
        </div>
    `;
    
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // رد وهمي حالياً
    setTimeout(() => {
        chatBox.innerHTML += `
            <div class="bg-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm text-slate-700 max-w-[80%] ml-auto border">
                أنا هنا لتحليل طلبك.. تذكر أن القرش الذكي يضع ماله في أصول تدر دخلاً سلبياً!
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);
}
    async loadPage(pageName) {
        // تحديث حالة الأزرار في النافبار
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if(link.dataset.page === pageName) link.classList.add('active');
        });

        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-spinner animate-spin text-2xl text-sky-500"></i></div>';

        try {
            const response = await fetch(`${pageName}.html`);
            const html = await response.text();
            content.innerHTML = html;
            
            // استدعاء الوظائف الخاصة بكل صفحة
            if (pageName === 'home') this.listenToPosts();
            if (pageName === 'roadmap') this.renderRoadmap();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-gray-400 font-bold">الصفحة قيد التطوير</div>`;
        }
    },

    // --- نظام المنشورات ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => `
                <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                    <div class="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500">
                        <img src="${doc.data().authorPhoto}" class="w-6 h-6 rounded-full">
                        <span>${doc.data().authorName}</span>
                    </div>
                    <p class="text-slate-800 text-sm leading-relaxed">${doc.data().content}</p>
                </div>
            `).join('');
        });
    }
};

window.onload = () => engine.init();
