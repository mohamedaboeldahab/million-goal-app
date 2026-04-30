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
    _visibleCount: 10,
    _currentSnapUnsubscribe: null,
    _currentPostType: 'post',     // 'post' أو 'bite'

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
                this.updateTypeButtons();
            }
            if (typeof setActiveNavLink === 'function') setActiveNavLink(pageName);
        } catch (e) { content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`; }
    },

    // ---------- اختيار نوع المنشور ----------
    setPostType(type) {
        this._currentPostType = type;
        this.updateTypeButtons();
    },

    updateTypeButtons() {
        const postBtn = document.getElementById('typePostBtn');
        const biteBtn = document.getElementById('typeBiteBtn');
        if (!postBtn || !biteBtn) return;
        if (this._currentPostType === 'post') {
            postBtn.className = 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow';
            biteBtn.className = 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
        } else {
            biteBtn.className = 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow';
            postBtn.className = 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
        }
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

    // ---------- نشر المنشور (بوست أو عضّة) ----------
    async addPost() {
        const input = document.getElementById('postInput');
        if (!input?.value.trim()) return;
        const profile = await this.getOrCreateUserProfile();
        const displayName = profile.displayName || auth.currentUser.displayName;
        const photoURL = profile.photoURL || auth.currentUser.photoURL;

        const postData = {
            content: input.value,
            authorName: displayName,
            authorPhoto: photoURL,
            authorId: auth.currentUser.uid,
            supportCount: 0,
            opposeCount: 0,
            voters: [],
            createdAt: serverTimestamp(),
            type: this._currentPostType  // 'post' أو 'bite'
        };

        await addDoc(collection(db, "posts"), postData);
        input.value = '';
    },

    // ---------- عرض الستوريز (عضّات) ----------
    renderStories() {
        const row = document.getElementById('storiesRow');
        if (!row) return;

        const bites = this._allPosts.filter(p => p.data.type === 'bite');
        if (bites.length === 0) {
            row.innerHTML = '';
            return;
        }

        row.innerHTML = bites.map(({ id, data: b }) => `
            <div class="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onclick="engine.openStory('${id}')">
                <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 p-0.5 shadow-md">
                    <img src="${b.authorPhoto}" class="w-full h-full rounded-full object-cover border-2 border-white">
                </div>
                <span class="text-[10px] font-bold text-gray-700 text-center leading-tight max-w-[64px] truncate">${b.authorName}</span>
            </div>
        `).join('');
    },

    openStory(postId) {
        const bite = this._allPosts.find(p => p.id === postId);
        if (!bite) return;

        // عرض الستوري في مودال بسيط
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-sm w-full relative">
                <button class="absolute top-3 right-3 text-gray-500 text-2xl" onclick="this.parentElement.parentElement.remove()">&times;</button>
                <div class="flex items-center gap-3 mb-4">
                    <img src="${bite.data.authorPhoto}" class="w-12 h-12 rounded-full border">
                    <span class="font-extrabold text-gray-800">${bite.data.authorName}</span>
                </div>
                <p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">${bite.data.content}</p>
                <div class="text-xs text-gray-400 mt-4">${new Date(bite.data.createdAt?.toDate()).toLocaleString('ar-EG')}</div>
            </div>
        `;
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    },

    // ---------- المنشورات مع تحميل تدريجي ----------
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        if (this._currentSnapUnsubscribe) this._currentSnapUnsubscribe();

        this._currentSnapUnsubscribe = onSnapshot(q, (snapshot) => {
            this._allPosts = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            if (this._visibleCount > this._allPosts.length) {
                this._visibleCount = this._allPosts.length;
            }
            this.renderVisiblePosts();
            this.renderStories();   // <-- تحديث شريط الستوريز
        });
    },

    renderVisiblePosts() {
        const feed = document.getElementById('feedList');
        if (!feed) return;

        // عرض البوستات العادية فقط (نوع 'post')
        const normalPosts = this._allPosts.filter(p => p.data.type !== 'bite');
        const postsToShow = normalPosts.slice(0, this._visibleCount);

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
                    <button onclick="engine.handleVote('${postId}', 'support')" 
                        class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-2 rounded-xl shadow text-sm">
                        <span class="text-base">🦈</span> أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.supportCount || 0}</span>
                    </button>
                    <button onclick="engine.handleVote('${postId}', 'oppose')" 
                        class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-2 rounded-xl shadow text-sm">
                        <span class="text-base">🐟</span> لا أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.opposeCount || 0}</span>
                    </button>
                </div>
                <div class="border-t border-gray-100 pt-3">
                    <div id="comments_list_${postId}" class="space-y-2 mb-2"></div>
                    <button id="load_more_btn_${postId}" style="display:none;" 
                        onclick="engine.loadMoreComments('${postId}')" 
                        class="text-sky-600 text-xs font-bold hover:underline w-full text-center py-1">عرض كل التعليقات</button>
                    <div class="flex gap-2 mt-2">
                        <input type="text" id="comm_${postId}" placeholder="أضف تعليقاً..." 
                            class="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs border border-gray-200 outline-none focus:ring-1 focus:ring-sky-400">
                        <button onclick="engine.addComment('${postId}')" 
                            class="bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // زر تحميل المزيد (للبوستات العادية فقط)
        const oldBtn = document.getElementById('loadMorePostsBtn');
        if (oldBtn) oldBtn.remove();

        if (normalPosts.length > this._visibleCount) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.id = 'loadMorePostsBtn';
            loadMoreBtn.className = 'text-center mt-4 mb-8';
            const remaining = normalPosts.length - this._visibleCount;
            loadMoreBtn.innerHTML = `<button class="bg-sky-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow hover:bg-sky-600 active:scale-95 transition">
                تحميل المزيد (${remaining} منشور)
            </button>`;
            loadMoreBtn.onclick = () => {
                this._visibleCount = Math.min(this._visibleCount + 10, normalPosts.length);
                this.renderVisiblePosts();
            };
            feed.parentNode.appendChild(loadMoreBtn);
        }

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
