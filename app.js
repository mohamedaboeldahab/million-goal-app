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
    _dynamicPlayer: null,

    async init() {
        try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.error("Persistence error", e); }

        // تنظيف العضّات القديمة كل 10 دقائق
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
                this.updateCreatorAvatar();
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

    // ---------- حذف العضّات الأقدم من 24 ساعة ----------
    async deleteExpiredBites() {
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const q = query(collection(db, "posts"), where("type", "==", "bite"), where("createdAt", "<=", cutoff));
            const snap = await getDocs(q);
            snap.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "posts", docSnap.id));
            });
        } catch (e) { console.warn("Expired bites cleanup error", e); }
    },

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
            type: this._currentPostType
        };

        await addDoc(collection(db, "posts"), postData);
        input.value = '';
    },

    // ---------- الإصلاح: العضّات تظهر فوراً ----------
    getActiveBites() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return this._allPosts.filter(p => {
            if (p.data.type !== 'bite') return false;
            const t = p.data.createdAt;
            // إذا كان الطابع الزمني فارغاً (لم يكتمل بعد) فهي حديثة النشر – أظهرها
            if (!t) return true;
            const time = t.toDate ? t.toDate().getTime() : t.seconds ? t.seconds * 1000 : 0;
            return time > cutoff;
        });
    },

    // ---------- شريط الستوريز ----------
    renderStories() {
        const row = document.getElementById('storiesRow');
        if (!row) return;

        this._activeBites = this.getActiveBites();
        if (this._activeBites.length === 0) {
            row.innerHTML = '';
            return;
        }

        row.innerHTML = this._activeBites.map((bite, index) => `
            <div class="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onclick="engine.openStoryPlayer(${index})">
                <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 p-0.5 shadow-md">
                    <img src="${bite.data.authorPhoto}" class="w-full h-full rounded-full object-cover border-2 border-white">
                </div>
                <span class="text-[10px] font-bold text-gray-700 text-center leading-tight max-w-[64px] truncate">${bite.data.authorName}</span>
            </div>
        `).join('');
    },

    // ---------- مشغل القصص الديناميكي ----------
    openStoryPlayer(startIndex = 0) {
        this._activeBites = this.getActiveBites();
        if (this._activeBites.length === 0) return;

        this._storyIndex = startIndex;

        if (this._dynamicPlayer) this._dynamicPlayer.remove();

        const player = document.createElement('div');
        player.id = 'dynamicStoryPlayer';
        player.className = 'fixed inset-0 z-50 flex flex-col';
        player.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)';

        const progressBars = document.createElement('div');
        progressBars.className = 'absolute top-4 left-4 right-4 flex gap-1 z-10';
        progressBars.id = 'progressBars';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 text-white text-3xl z-10 hover:scale-110 transition';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.closeStoryPlayer();

        const content = document.createElement('div');
        content.className = 'flex-1 flex items-center justify-center p-4';
        content.id = 'storyContent';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'absolute left-4 top-1/2 -translate-y-1/2 text-white text-2xl bg-white/20 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.onclick = () => this.prevStory();

        const nextBtn = document.createElement('button');
        nextBtn.className = 'absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl bg-white/20 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.onclick = () => this.nextStory();

        player.appendChild(progressBars);
        player.appendChild(closeBtn);
        player.appendChild(content);
        player.appendChild(prevBtn);
        player.appendChild(nextBtn);

        document.body.appendChild(player);
        this._dynamicPlayer = player;

        this.showCurrentStory();
    },

    showCurrentStory() {
        if (!this._dynamicPlayer) return;
        if (this._storyIndex < 0 || this._storyIndex >= this._activeBites.length) {
            this.closeStoryPlayer();
            return;
        }

        const bite = this._activeBites[this._storyIndex];
        const content = document.getElementById('storyContent');
        const progressBars = document.getElementById('progressBars');

        content.innerHTML = `
            <div class="text-white text-center max-w-md">
                <img src="${bite.data.authorPhoto}" class="w-16 h-16 rounded-full border-2 border-white/40 mb-3 mx-auto shadow-lg">
                <p class="font-bold text-lg">${bite.data.authorName}</p>
                <p class="text-sm mt-2 leading-relaxed text-white/90">${bite.data.content}</p>
            </div>
        `;

        progressBars.innerHTML = this._activeBites.map((_, i) => `
            <div class="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div class="h-full bg-white rounded-full transition-all duration-[5000ms] ease-linear ${i === this._storyIndex ? 'w-full' : i < this._storyIndex ? 'w-full' : 'w-0'}" id="bar-${i}"></div>
            </div>
        `).join('');

        if (this._storyTimer) clearTimeout(this._storyTimer);

        const bar = document.getElementById(`bar-${this._storyIndex}`);
        if (bar) bar.style.transition = 'width 5s linear';
        setTimeout(() => {
            if (bar) bar.classList.add('w-full');
        }, 50);

        this._storyTimer = setTimeout(() => {
            this.nextStory();
        }, 5000);
    },

    nextStory() {
        if (this._storyIndex < this._activeBites.length - 1) {
            this._storyIndex++;
            this.showCurrentStory();
        } else {
            this.closeStoryPlayer();
        }
    },

    prevStory() {
        if (this._storyIndex > 0) {
            this._storyIndex--;
            this.showCurrentStory();
        }
    },

    closeStoryPlayer() {
        if (this._dynamicPlayer) {
            this._dynamicPlayer.remove();
            this._dynamicPlayer = null;
        }
        if (this._storyTimer) clearTimeout(this._storyTimer);
    },

    // ---------- المنشورات العادية ----------
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        if (this._currentSnapUnsubscribe) this._currentSnapUnsubscribe();

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
            try {
                const date = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt.seconds * 1000)) : new Date();
                dateStr = date.toLocaleString('ar-EG');
            } catch (e) { dateStr = '---'; }

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
