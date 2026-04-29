// ========== إعداد Firebase (Modular SDK) ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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

// ========== البيانات الأساسية ==========
let appData = {
    cash: 0,
    assets: [],
    posts: [],
    milestonesReached: [],
    transactions: []
};

// جعل الكائن متاح عالمياً للـ HTML
window.engine = {
    async init() {
        // مراقبة حالة تسجيل الدخول
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                document.getElementById('authNotice').classList.add('hidden');
                document.getElementById('userProfile').innerHTML = `
                    <img src="${user.photoURL}" class="w-8 h-8 rounded-full border border-sky-500">
                    <span class="text-xs font-bold">${user.displayName.split(' ')[0]}</span>
                `;
                
                // تحميل البيانات من Firestore
                const userRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists()) {
                    appData = docSnap.data();
                } else {
                    // مستخدم جديد، نرفع البيانات الافتراضية
                    await setDoc(userRef, appData);
                }
            } else {
                // لو مش مسجل، نستخدم الـ LocalStorage كاحتياطي
                const saved = localStorage.getItem('millionaire_data');
                if (saved) appData = JSON.parse(saved);
            }
            this.sync();
        });

        this.nav('home');
    },

    async login() {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            alert("خطأ في تسجيل الدخول: " + error.message);
        }
    },

    async sync() {
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        document.getElementById('totalValAssets').innerText = Math.floor(total).toLocaleString();
        document.getElementById('cashDisplay').innerText = Math.floor(appData.cash).toLocaleString() + ' ج.م';

        // حساب المحطات
        for (let pct = 10; pct <= 100; pct += 10) {
            const target = 10000 * pct;
            if (total >= target && !appData.milestonesReached.includes(pct)) {
                appData.milestonesReached.push(pct);
                this.addPost(`🎉 وصلت إلى ${pct}% من حلم المليون!`);
            }
        }

        this.renderFeed();
        this.renderAssets();
        this.renderRoadmap(total);
        this.recalc();

        // حفظ محلي
        localStorage.setItem('millionaire_data', JSON.stringify(appData));

        // حفظ سحابي لو مسجل
        if (auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, appData);
        }
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.remove('text-[#0ea5e9]');
            t.classList.add('text-gray-500');
        });
        document.getElementById('tab-' + pageId).classList.remove('text-gray-500');
        document.getElementById('tab-' + pageId).classList.add('text-[#0ea5e9]');
    },

    adjustCash() {
        const amount = parseFloat(document.getElementById('cashAmount').value);
        const type = document.getElementById('cashType').value;
        const desc = document.getElementById('cashDesc').value.trim() || 'معاملة';
        if (isNaN(amount)) return;
        if (type === 'expense' && appData.cash - amount < 0) { alert('الرصيد لا يكفي'); return; }

        appData.cash += (type === 'income' ? amount : -amount);
        appData.transactions.push({ type, amount, desc, date: new Date().toLocaleString('ar-EG') });
        document.getElementById('cashAmount').value = '';
        this.sync();
    },

    addPost(text = null) {
        const input = document.getElementById('postInput');
        const content = text || (input?.value.trim());
        if (!content) return;
        appData.posts.unshift({ id: Date.now(), content, date: new Date().toLocaleString('ar-EG') });
        if (input) input.value = '';
        this.sync();
    },

    renderFeed() {
        const c = document.getElementById('feedList');
        if (!c) return;
        c.innerHTML = appData.posts.length === 0 ? '<div class="text-center text-gray-400 py-10">لا توجد تحديثات</div>' :
            appData.posts.map(p => `
                <div class="bg-white rounded-lg shadow mb-3 overflow-hidden border border-gray-200">
                    <div class="flex items-center gap-2 p-3">
                        <i class="fa-solid fa-circle-user text-2xl text-gray-300"></i>
                        <div><b class="text-sm">تحديث ثروة</b><br><small class="text-gray-400">${p.date}</small></div>
                    </div>
                    <div class="px-4 pb-3 font-bold text-gray-700">${p.content}</div>
                </div>
            `).join('');
    },

    addAsset() {
        const name = document.getElementById('aName').value.trim();
        const val = parseFloat(document.getElementById('aVal').value);
        const rate = parseFloat(document.getElementById('aRate').value);
        if (!name || isNaN(val)) return;
        appData.assets.push({ name, val, rate });
        this.addPost(`📈 أصل جديد: ${name} بقيمة ${val.toLocaleString()} ج.م`);
        this.sync();
    },

    renderAssets() {
        const c = document.getElementById('assetsList');
        if (!c) return;
        c.innerHTML = appData.assets.map((a, i) => `
            <div class="bg-white rounded-lg shadow p-3 flex justify-between items-center mb-2 border-r-4 border-sky-500">
                <div><b class="text-sm">${a.name}</b><br><small class="text-gray-400">${a.rate}% سنوي</small></div>
                <div class="text-left">
                    <b class="text-[#0ea5e9]">${a.val.toLocaleString()}</b><br>
                    <button onclick="engine.deleteAsset(${i})" class="text-red-400 text-[10px] font-bold">إزالة</button>
                </div>
            </div>
        `).join('');
    },

    deleteAsset(i) { appData.assets.splice(i, 1); this.sync(); },

    renderRoadmap(total) {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        const stages = 100, start = 500, end = 1_000_000;
        const step = (end - start) / (stages - 1);
        let html = '';
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const idx = (row % 2 === 0) ? row * 10 + col : row * 10 + (9 - col);
                const amount = Math.round(start + step * idx);
                const comp = total >= amount ? 'completed bg-sky-500 text-white border-sky-600' : 'bg-gray-50 text-gray-300';
                html += `<div class="w-full aspect-square border rounded flex flex-col items-center justify-center text-[8px] font-bold ${comp}">
                    <span>${idx+1}</span><span class="scale-75">${(amount/1000).toFixed(0)}k</span>
                </div>`;
            }
        }
        board.className = "grid grid-cols-10 gap-1";
        board.innerHTML = html;
    },

    recalc() {
        const monthly = parseFloat(document.getElementById('calcMonthly')?.value) || 0;
        let cash = appData.cash, assets = appData.assets.map(a => ({ ...a })), months = 0;
        while (months < 600) {
            assets.forEach(a => a.val *= (1 + a.rate / 100 / 12));
            cash += monthly;
            if (cash + assets.reduce((s, a) => s + a.val, 0) >= 1_000_000) break;
            months++;
        }
        document.getElementById('calcRes').innerText = months >= 600 ? 'أكثر من 50 سنة' : `المليون خلال: ${Math.floor(months/12)} سنة و ${months%12} شهر`;
    },

    sendMessage() {
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        if (!msg) return;
        this.addChatMessage(msg, 'user');
        input.value = '';
        setTimeout(() => this.addChatMessage("تحليلي المالي يقول أنك تسير بشكل جيد، استمر في زيادة أصولك!", 'ai'), 800);
    },

    addChatMessage(text, sender) {
        const box = document.getElementById('chatBox');
        const div = document.createElement('div');
        div.className = `max-w-[80%] p-3 rounded-xl font-bold text-sm ${sender === 'ai' ? 'bg-gray-100 self-start' : 'bg-sky-500 text-white self-end'}`;
        div.innerText = text;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }
};

// بدء المحرك عند تحميل الصفحة
engine.init();
