import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, updateDoc, doc, setDoc,
    onSnapshot, query, orderBy, where, serverTimestamp, increment,
    arrayUnion, getDoc, deleteDoc, getDocs
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
    _currentPostType: 'post',
    _activeBites: [],
    _storyIndex: 0,
    _storyTimer: null,

    async init() {
        try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.error("Persistence error", e); }
// إصلاح مشكلة اللمس على الهاتف: تفويض حدث الضغط لشريط الستوريز
// اكتشاف نوع الحدث (لمس للموبايل أو ضغط للكمبيوتر)
    const clickEvent = 'ontouchstart' in window ? 'touchend' : 'click';

    document.addEventListener(clickEvent, (e) => {
        const storyElement = e.target.closest('[data-story-index]');
        if (storyElement) {
            // منع المتصفح من تنفيذ "الضغط" و "اللمس" معاً
            if (e.cancelable) e.preventDefault(); 
            
            const index = parseInt(storyElement.getAttribute('data-story-index'));
            console.log("Opening story index:", index); // للتأكد في Console الموبايل
            this.openStoryPlayer(index);
        }
    }, { passive: false }); // ضروري جداً لعمل preventDefault على الموبايل

    setInterval(() => this.deleteExpiredBites(), 600000);
    this.deleteExpiredBites();
        setInterval(() => this.deleteExpiredBites(), 600000);
        this.deleteExpiredBites();

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

    async login() { try { await signInWithPopup(auth, provider); } catch (error) { alert("حدث خطأ في الدخول"); } },
    async logout() { if (confirm("هل تريد مغادرة المحيط؟")) { await signOut(auth); location.reload(); } },

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
                setTimeout(() => {
                    this.listenToPosts();
                    this.activateCharCounter();
                    this.updateTypeButtons();
                    this.updateCreatorAvatar();
                }, 50);
            } else if (pageName === 'profile') {
                setTimeout(() => {
                    this.listenToProfilePosts('userPostsContainer');
                    this.activateProfile();
                }, 50);
            }
            if (typeof setActiveNavLink === 'function') setActiveNavLink(pageName);
        } catch (e) { content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`; }
    },

    async updateCreatorAvatar() {
        const img = document.getElementById('creatorAvatar');
        if (!img || !auth.currentUser) return;
        const profile = await this.getOrCreateUserProfile();
        img.src = profile.photoURL || auth.currentUser.photoURL || '';
    },

    async deleteExpiredBites() {
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const q = query(collection(db, "posts"), where("type", "==", "bite"), where("createdAt", "<=", cutoff));
            const snap = await getDocs(q);
            snap.forEach(async (docSnap) => { await deleteDoc(doc(db, "posts", docSnap.id)); });
        } catch (e) { console.warn("Expired bites cleanup error", e); }
    },

    setPostType(type) { this._currentPostType = type; this.updateTypeButtons(); },

    updateTypeButtons() {
        const postBtn = document.getElementById('typePostBtn');
        const biteBtn = document.getElementById('typeBiteBtn');
        if (!postBtn || !biteBtn) return;
        postBtn.className = this._currentPostType === 'post' ? 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow' : 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
        biteBtn.className = this._currentPostType === 'bite' ? 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow' : 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
    },

    activateCharCounter() {
        const input = document.getElementById('postInput');
        const countSpan = document.getElementById('charCount');
        if (!input || !countSpan) return;
        const max = parseInt(input.getAttribute('maxlength')) || 600;
        input.addEventListener('input', () => {
            const current = input.value.length;
            countSpan.textContent = `${current}/${max} حرف`;
            countSpan.className = current >= max - 30 ? 'text-xs text-red-500 font-bold' : 'text-xs text-gray-400 font-medium';
        });
    },

    async handleVote(postId, type) {
        const postRef = doc(db, "posts", postId);
        const userId = auth.currentUser.uid;
        const postSnap = await getDoc(postRef);
        const data = postSnap.data();
        if (data.voters && data.voters.includes(userId)) { alert("صوتك وصل بالفعل!"); return; }
        const updateData = { voters: arrayUnion(userId) };
        updateData[type === 'support' ? 'supportCount' : 'opposeCount'] = increment(1);
        await updateDoc(postRef, updateData);
    },

    async addPost() {
        const input = document.getElementById('postInput');
        if (!input?.value.trim()) return;
        const profile = await this.getOrCreateUserProfile();
        const displayName = profile.displayName || auth.currentUser.displayName;
        const photoURL = profile.photoURL || auth.currentUser.photoURL;
        await addDoc(collection(db, "posts"), {
            content: input.value, authorName: displayName, authorPhoto: photoURL,
            authorId: auth.currentUser.uid, supportCount: 0, opposeCount: 0, voters: [],
            createdAt: serverTimestamp(), type: this._currentPostType
        });
        input.value = '';
        this.renderStories();
    },

    getActiveBites() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return this._allPosts.filter(p => {
            if (p.data.type !== 'bite') return false;
            const t = p.data.createdAt;
            if (!t) return true;
            const time = t.toDate ? t.toDate().getTime() : t.seconds ? t.seconds * 1000 : 0;
            return time > cutoff;
        });
    },

renderStories() {
    const row = document.getElementById('storiesRow');
    if (!row) return;
    this._activeBites = this.getActiveBites();
    
    row.innerHTML = this._activeBites.map((bite, index) => `
    <div class="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer select-none touch-manipulation" 
         data-story-index="${index}">
        <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 p-0.5 shadow-md pointer-events-none">
            <img src="${bite.data.authorPhoto}" class="w-full h-full rounded-full object-cover border-2 border-white">
        </div>
        <span class="text-[10px] font-bold text-gray-700 text-center leading-tight max-w-[64px] truncate pointer-events-none">
            ${bite.data.authorName}
        </span>
    </div>
`).join('');
},

// دالة فتح مشغل القصص الثابت
closeStory() {
    const player = document.getElementById('storyPlayer');
    if (player) {
        player.style.setProperty('display', 'none', 'important');
        player.classList.add('hidden');
    }
},

openStoryPlayer(startIndex = 0) {
    this._activeBites = this.getActiveBites();
    if (this._activeBites.length === 0) return;

    this._storyIndex = startIndex;
    const player = document.getElementById('storyPlayer');
    if (player) {
        // إجبار المتصفح على إظهار العنصر فوق كل شيء
        player.classList.remove('hidden');
        player.style.setProperty('display', 'flex', 'important');
        this.showCurrentStory();
    }
},
    showCurrentStory() {
        const player = document.getElementById('storyPlayer');
        if (!player || player.classList.contains('hidden')) return;
        if (this._storyIndex < 0 || this._storyIndex >= this._activeBites.length) {
            player.classList.add('hidden');
            return;
        }
        const bite = this._activeBites[this._storyIndex];
        const content = document.getElementById('storyContent');
        if (content) {
            content.innerHTML = `
                <img src="${bite.data.authorPhoto}" class="w-20 h-20 rounded-full border-2 border-white/50 mb-4">
                <h3 class="font-bold text-xl">${bite.data.authorName}</h3>
                <p class="text-sm mt-2 text-center max-w-xs">${bite.data.content}</p>
            `;
        }
    },

    nextStory() {
        if (this._storyIndex < this._activeBites.length - 1) {
            this._storyIndex++;
            this.showCurrentStory();
        } else {
            document.getElementById('storyPlayer').classList.add('hidden');
        }
    },

    prevStory() {
        if (this._storyIndex > 0) {
            this._storyIndex--;
            this.showCurrentStory();
        }
    },

    // ---------- المنشورات ----------
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        this._currentSnapUnsubscribe = onSnapshot(q, (snapshot) => {
            this._allPosts = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            if (this._visibleCount > this._allPosts.length) {
                this._visibleCount = this._allPosts.length;
            }
            this.renderVisiblePosts();
            this.renderStories();
        });
    },

    renderVisiblePosts() {
        const feed = document.getElementById('feedList');
        if (!feed) return;
        const normalPosts = this._allPosts.filter(p => p.data.type !== 'bite');
        const postsToShow = normalPosts.slice(0, this._visibleCount);

        feed.innerHTML = postsToShow.map(({ id, data: p }) => {
            const postId = id;
            let dateStr = '';
            try { dateStr = p.createdAt?.toDate().toLocaleString('ar-EG'); } catch(e) { dateStr = '---'; }

            return `
            <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div class="flex items-center gap-3 mb-3">
                    <img src="${p.authorPhoto}" class="w-10 h-10 rounded-full border border-sky-200 object-cover">
                    <div>
                        <span class="font-extrabold text-gray-800 text-sm">${p.authorName}</span>
                        <div class="text-xs text-gray-400">${dateStr}</div>
                    </div>
                </div>
                <p class="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">${p.content}</p>
                <div class="flex gap-2 mb-3">
                    <button onclick="engine.handleVote('${postId}', 'support')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🦈</span> أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.supportCount || 0}</span></button>
                    <button onclick="engine.handleVote('${postId}', 'oppose')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🐟</span> لا أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.opposeCount || 0}</span></button>
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

    listenToComments(postId) {
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => d.data());
            this._allComments[postId] = all;
            const list = document.getElementById(`comments_list_${postId}`);
            const btn = document.getElementById(`load_more_btn_${postId}`);
            if (!list) return;
            list.innerHTML = all.slice(0, 3).map(c => `<div class="bg-gray-50 p-2 rounded-lg text-xs"><b class="text-sky-600">${c.userName}:</b> ${c.text}</div>`).join('');
            btn.style.display = all.length > 3 ? 'block' : 'none';
            if (all.length > 3) btn.textContent = `عرض كل التعليقات (${all.length})`;
        });
    },

    loadMoreComments(postId) {
        const all = this._allComments[postId] || [];
        const list = document.getElementById(`comments_list_${postId}`);
        const btn = document.getElementById(`load_more_btn_${postId}`);
        if (!list || !btn) return;
        list.innerHTML = all.map(c => `<div class="bg-gray-50 p-2 rounded-lg text-xs"><b class="text-sky-600">${c.userName}:</b> ${c.text}</div>`).join('');
        btn.style.display = 'none';
    },

    // ========== صفحة البروفايل ==========
    listenToProfilePosts(containerId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const q = query(collection(db, "posts"), where("authorId", "==", userId), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (snapshot.empty) { container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">لا توجد منشورات بعد</p>'; return; }
            container.innerHTML = snapshot.docs.map(doc => this.postHTML(doc.id, doc.data())).join('');
            snapshot.docs.forEach(d => this.listenToComments(d.id));
        });
    },

    postHTML(postId, p) {
        let dateStr = '';
        try { dateStr = p.createdAt?.toDate().toLocaleString('ar-EG'); } catch(e) { dateStr = '---'; }
        return `
        <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <div class="flex items-center gap-3 mb-3">
                <img src="${p.authorPhoto}" class="w-10 h-10 rounded-full border border-sky-200 object-cover">
                <div>
                    <span class="font-extrabold text-gray-800 text-sm">${p.authorName}</span>
                    <div class="text-xs text-gray-400">${dateStr}</div>
                </div>
            </div>
            <p class="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">${p.content}</p>
            <div class="flex gap-2 mb-3">
                <button onclick="engine.handleVote('${postId}', 'support')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🦈</span> أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.supportCount || 0}</span></button>
                <button onclick="engine.handleVote('${postId}', 'oppose')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🐟</span> لا أؤيد <span class="bg-white/40 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.opposeCount || 0}</span></button>
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
    },

    activateProfile() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active','bg-gray-100'); b.classList.add('text-gray-500'); });
                btn.classList.add('active','bg-gray-100');
                btn.classList.remove('text-gray-500');
                const target = btn.dataset.tab;
                document.getElementById('tab-posts').classList.toggle('hidden', target !== 'posts');
                document.getElementById('tab-about').classList.toggle('hidden', target !== 'about');
            });
        });

        const avatarImg = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const bioEl = document.getElementById('profileBio');
        const aboutEl = document.getElementById('aboutBio');

        if (avatarImg && nameEl) {
            this.getOrCreateUserProfile().then(profile => {
                const u = auth.currentUser;
                avatarImg.src = profile.photoURL || u.photoURL || '';
                nameEl.textContent = profile.displayName || u.displayName || 'مستخدم';
                const bio = profile.bio || '🦈 مؤسس في Shark Hub';
                if (bioEl) bioEl.textContent = bio;
                if (aboutEl) aboutEl.textContent = bio;
                if (emailEl) emailEl.textContent = u.email || '';
            });
        }

        const editBtn = document.getElementById('editProfileBtn');
        const saveBtn = document.getElementById('saveProfileBtn');
        if (editBtn && saveBtn) {
            editBtn.onclick = () => {
                if (nameEl) { nameEl.contentEditable = 'true'; nameEl.classList.add('bg-yellow-50','px-2','rounded','outline-none'); }
                if (bioEl) { bioEl.contentEditable = 'true'; bioEl.classList.add('bg-yellow-50','px-2','rounded','outline-none'); }
                editBtn.classList.add('hidden'); saveBtn.classList.remove('hidden');
            };
            saveBtn.onclick = async () => {
                if (nameEl) { nameEl.contentEditable = 'false'; nameEl.classList.remove('bg-yellow-50','px-2','rounded','outline-none'); }
                if (bioEl) { bioEl.contentEditable = 'false'; bioEl.classList.remove('bg-yellow-50','px-2','rounded','outline-none'); }
                editBtn.classList.remove('hidden'); saveBtn.classList.add('hidden');
                const n = nameEl ? nameEl.textContent.trim() : '';
                const b = bioEl ? bioEl.textContent.trim() : '';
                let ok = false;
                try { await this.updateUserProfile({ displayName: n, bio: b }); ok = true; if (aboutEl) aboutEl.textContent = b; } catch(e) {}
                this.showToast(ok ? 'تم حفظ البيانات ☁️' : 'تم حفظ البيانات محلياً ⚠️');
            };
        }

        document.getElementById('avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarFileInput').click());
        document.getElementById('avatarFileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                const dataUrl = reader.result;
                if (avatarImg) avatarImg.src = dataUrl;
                let ok = false;
                try { await this.updateUserProfile({ photoURL: dataUrl }); ok = true; } catch(e) {}
                this.showToast(ok ? 'تم تغيير الصورة وحفظها ☁️' : 'تم تغيير الصورة (محلياً) ⚠️');
            };
            reader.readAsDataURL(file);
        });
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg animate-pulse';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    async getOrCreateUserProfile() {
        const uid = auth.currentUser.uid;
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
        const defaultProfile = { displayName: auth.currentUser.displayName || '', photoURL: auth.currentUser.photoURL || '', bio: '', createdAt: serverTimestamp() };
        await setDoc(ref, defaultProfile);
        return defaultProfile;
    },

    async updateUserProfile(updates) {
        const uid = auth.currentUser.uid;
        await updateDoc(doc(db, "users", uid), updates);
        const userBtn = document.getElementById('userBtn');
        if (updates.photoURL && userBtn) userBtn.innerHTML = `<img src="${updates.photoURL}" class="w-full h-full object-cover rounded-2xl">`;
    },

    async addComment(postId) {
        const input = document.getElementById(`comm_${postId}`);
        if (!input?.value.trim()) return;
        await addDoc(collection(db, `posts/${postId}/comments`), { text: input.value, userName: auth.currentUser.displayName, createdAt: serverTimestamp() });
        input.value = '';
    }
};

engine.init();
