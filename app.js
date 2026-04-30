import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, updateDoc, doc, setDoc,
    onSnapshot, query, orderBy, where, serverTimestamp, increment,
    arrayUnion, getDoc
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
window.auth = auth;
const db = getFirestore(app);
window.db = db;
const provider = new GoogleAuthProvider();

window.engine = {
    _allComments: {},
    _allPosts: [],
    _visibleCount: 10,           // عدد المنشورات المعروضة حاليًا
    _currentSnapUnsubscribe: null, // لإلغاء الاشتراك عند الحاجة

    async init() {
        try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.error("Persistence error", e); }

        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            const nav = document.getElementById('main-nav');
            if (user) {
                if (splash) splash.style.display = 'none';
                if (nav) nav.classList.remove('hidden');
                const userBtn = document.getElementById('userBtn');
                this.getOrCreateUserProfile().then(profile => {
                    const photo = profile.photoURL || user.photoURL;
                    if (userBtn) userBtn.innerHTML = `<img src="${photo}" class="w-full h-full object-cover rounded-2xl">`;
                });
                this.loadPage('home');
            } else {
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
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20"> دخول القروش
                </button>`;
        }
    },

    async login() {
        try { await signInWithPopup(auth, provider); } catch (error) { alert("حدث خطأ في الدخول"); }
    },

    async logout() {
        if (confirm("هل تريد مغادرة المحيط؟")) { await signOut(auth); location.reload(); }
    },

    async loadPage(pageName) {
        const content = document.getElementById('app-content');
        if (!content) return;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === pageName));
        content.innerHTML = '<div class="flex justify-center py-20"><div class="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>';
        try {
            const response = await fetch(`${pageName}.html`);
            const html = await response.text();
            content.innerHTML = html;
            const scripts = content.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                oldScript.replaceWith(newScript);
            });
            if (pageName === 'home') {
                this.listenToPosts();
                this.activateCharCounter();
            }
            if (typeof setActiveNavLink === 'function') setActiveNavLink(pageName);
        } catch (e) { content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`; }
    },

    activateCharCounter() {
        const input = document.getElementById('postInput');
        const countSpan = document.getElementById('charCount');
        if (!input || !countSpan) return;
        const max = parseInt(input.getAttribute('maxlength')) || 600;
        const update = () => {
            const current = input.value.length;
            countSpan.textContent = `${current}/${max} حرف`;
            countSpan.className = current >= max - 30 ? 'text-xs text-red-500 font-bold' : 'text-xs text-gray-400 font-medium';
        };
        input.addEventListener('input', update);
        update();
    },

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

    // ---------- المنشورات مع تحميل تدريجي ----------
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        // إلغاء أي اشتراك سابق
        if (this._currentSnapUnsubscribe) this._currentSnapUnsubscribe();

        this._currentSnapUnsubscribe = onSnapshot(q, (snapshot) => {
            // تخزين جميع المنشورات
            this._allPosts = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            // إعادة تعيين العداد الظاهر إذا كان أكبر من العدد الكلي
            if (this._visibleCount > this._allPosts.length) {
                this._visibleCount = this._allPosts.length;
            }
            this.renderVisiblePosts();
        });
    },

    renderVisiblePosts() {
        const feed = document.getElementById('feedList');
        if (!feed) return;

        const postsToShow = this._allPosts.slice(0, this._visibleCount);
        feed.innerHTML = postsToShow.map(({ id, data: p }) => {
            const postId = id;
            return `
            <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div class="flex items-center gap-3 mb-3">
                    <img src="${p.authorPhoto}" class="w-10 h-10 rounded-full border border-sky-200 object-cover">
                    <div>
                        <span class="font-extrabold text-gray-800 text-sm">${p.authorName}</span>
                        <div class="text-xs text-gray-400">${new Date(p.createdAt?.toDate()).toLocaleString('ar-EG')}</div>
                    </div>
                </div>
                <p class="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">${p.content}</p>
                <div class="flex gap-2 mb-3">
                    <button onclick="engine.handleVote('${postId}', 'support')" class="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-2 rounded-lg shadow text-xs">
                        🦈 أؤيد <span class="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">${p.supportCount || 0}</span>
                    </button>
                    <button onclick="engine.handleVote('${postId}', 'oppose')" class="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-2 rounded-lg shadow text-xs">
                        🐟 لا أؤيد <span class="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">${p.opposeCount || 0}</span>
                    </button>
                </div>
                <div class="border-t border-gray-100 pt-3">
                    <div id="comments_list_${postId}" class="space-y-2 mb-2"></div>
                    <button id="load_more_btn_${postId}" style="display:none;" onclick="engine.loadMoreComments('${postId}')" class="text-sky-600 text-xs font-bold hover:underline w-full text-center py-1">عرض كل التعليقات</button>
                    <div class="flex gap-2 mt-2">
                        <input type="text" id="comm_${postId}" placeholder="أضف تعليقاً..." class="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs border border-gray-200 outline-none focus:ring-1 focus:ring-sky-400">
                        <button onclick="engine.addComment('${postId}')" class="bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // إزالة زر التحميل القديم إن وجد
        const oldBtn = document.getElementById('loadMorePostsBtn');
        if (oldBtn) oldBtn.remove();

        // زر "تحميل المزيد من المنشورات"
        if (this._allPosts.length > this._visibleCount) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.id = 'loadMorePostsBtn';
            loadMoreBtn.className = 'text-center mt-4 mb-8';
            const remaining = this._allPosts.length - this._visibleCount;
            loadMoreBtn.innerHTML = `<button class="bg-sky-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow hover:bg-sky-600 active:scale-95 transition">
                تحميل المزيد (${remaining} منشور)
            </button>`;
            loadMoreBtn.onclick = () => {
                this._visibleCount = Math.min(this._visibleCount + 10, this._allPosts.length);
                this.renderVisiblePosts();
            };
            feed.parentNode.appendChild(loadMoreBtn);
        }

        // تفعيل مستمعات التعليقات للمنشورات الظاهرة
        postsToShow.forEach(({ id }) => this.listenToComments(id));
    },

    // ---------- التعليقات (أول ٣) ----------
    listenToComments(postId) {
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snap) => {
            const allComments = snap.docs.map(d => d.data());
            this._allComments[postId] = allComments;
            const list = document.getElementById(`comments_list_${postId}`);
            const loadBtn = document.getElementById(`load_more_btn_${postId}`);
            if (!list) return;
            const visible = allComments.slice(0, 3);
            list.innerHTML = visible.map(c => `<div class="bg-gray-50 p-2 rounded-lg text-xs"><b class="text-sky-600">${c.userName}:</b> ${c.text}</div>`).join('');
            if (allComments.length > 3 && loadBtn) {
                loadBtn.style.display = 'block';
                loadBtn.textContent = `عرض كل التعليقات (${allComments.length})`;
            } else if (loadBtn) loadBtn.style.display = 'none';
        });
    },

    loadMoreComments(postId) {
        const list = document.getElementById(`comments_list_${postId}`);
        const loadBtn = document.getElementById(`load_more_btn_${postId}`);
        const all = this._allComments[postId] || [];
        if (!list || !loadBtn) return;
        list.innerHTML = all.map(c => `<div class="bg-gray-50 p-2 rounded-lg text-xs"><b class="text-sky-600">${c.userName}:</b> ${c.text}</div>`).join('');
        loadBtn.style.display = 'none';
    },

    listenToUserPosts(containerId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const q = query(collection(db, "posts"), where("authorId", "==", userId), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `<div class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
                    <p class="text-gray-800 text-sm font-bold mb-2">${p.content}</p>
                    <span class="text-xs text-gray-400">🕒 ${new Date(p.createdAt?.toDate()).toLocaleString('ar-EG')}</span>
                </div>`;
            }).join('') || '<p class="text-gray-400 text-sm">لا توجد منشورات بعد</p>';
        });
    },

    async getOrCreateUserProfile() {
        const uid = auth.currentUser.uid;
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
        const defaultProfile = {
            displayName: auth.currentUser.displayName || '',
            photoURL: auth.currentUser.photoURL || '',
            bio: '',
            createdAt: serverTimestamp()
        };
        await setDoc(ref, defaultProfile);
        return defaultProfile;
    },

    async updateUserProfile(updates) {
        const uid = auth.currentUser.uid;
        const ref = doc(db, "users", uid);
        await updateDoc(ref, updates);
        if (updates.photoURL) {
            const userBtn = document.getElementById('userBtn');
            if (userBtn) {
                userBtn.innerHTML = `<img src="${updates.photoURL}" class="w-full h-full object-cover rounded-2xl">`;
            }
        }
    },

    async addPost() {
        const input = document.getElementById('postInput');
        if (!input?.value.trim()) return;
        const profile = await this.getOrCreateUserProfile();
        const displayName = profile.displayName || auth.currentUser.displayName;
        const photoURL = profile.photoURL || auth.currentUser.photoURL;
        await addDoc(collection(db, "posts"), {
            content: input.value,
            authorName: displayName,
            authorPhoto: photoURL,
            authorId: auth.currentUser.uid,
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
    }
};

engine.init();
