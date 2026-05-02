import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, updateDoc, doc, setDoc,
    onSnapshot, query, orderBy, where, serverTimestamp, increment,
    arrayUnion, getDoc, deleteDoc, getDocs, arrayRemove
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

// صورة افتراضية جميلة على شكل قرش عند عدم وجود صورة
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e2e8f0"/><text x="50" y="67" font-size="60" text-anchor="middle" fill="%2394a3b8">🦈</text></svg>';

// معالجة روابط الصور لجعلها بحجم مناسب ودعم الصور المفقودة
function fixPhotoUrl(url) {
    if (!url) return DEFAULT_AVATAR;
    if (url.startsWith('data:')) return url;
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
        return url.replace(/=s[0-9]+(-c)?/, '=s50-c').replace(/=s[0-9]+/, '=s50');
    }
    if (url.includes('?sz=')) return url;
    return url + (url.includes('?') ? '&' : '?') + 'sz=50';
}

window.engine = {
    _allComments: {},
    _allPosts: [],
    _visibleCount: 10,
    _currentSnapUnsubscribe: null,
    _currentPostType: 'post',
    _activeBites: [],
    _storyIndex: 0,
    _observer: null,

    async init() {
        try { await setPersistence(auth, browserLocalPersistence); } catch (e) {}
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
                    const photo = fixPhotoUrl(profile.photoURL || user.photoURL);
                    if (userBtn) userBtn.innerHTML = `<img src="${photo}" class="w-full h-full object-cover rounded-2xl" loading="lazy">`;
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
            content.querySelectorAll('script').forEach(oldScript => {
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
                    this.watchStoriesContainer();
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
        img.src = fixPhotoUrl(profile.photoURL || auth.currentUser.photoURL);
    },

    async deleteExpiredBites() {
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const q = query(collection(db, "posts"), where("type", "==", "bite"), where("createdAt", "<=", cutoff));
            const snap = await getDocs(q);
            snap.forEach(async (docSnap) => { await deleteDoc(doc(db, "posts", docSnap.id)); });
        } catch (e) {}
    },

    setPostType(type) { this._currentPostType = type; this.updateTypeButtons(); },

    updateTypeButtons() {
        const postBtn = document.getElementById('typePostBtn');
        const biteBtn = document.getElementById('typeBiteBtn');
        if (!postBtn || !biteBtn) return;
        postBtn.className = this._currentPostType === 'post'
            ? 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow'
            : 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
        biteBtn.className = this._currentPostType === 'bite'
            ? 'flex-1 py-2 rounded-lg font-bold text-sm bg-sky-500 text-white shadow'
            : 'flex-1 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-600 shadow';
    },

    activateCharCounter() {
        const input = document.getElementById('postInput');
        const countSpan = document.getElementById('charCount');
        if (!input || !countSpan) return;
        const max = parseInt(input.getAttribute('maxlength')) || 600;
        input.addEventListener('input', () => {
            const len = input.value.length;
            countSpan.textContent = `${len}/${max} حرف`;
            countSpan.className = len >= max - 30 ? 'text-xs text-red-500 font-bold' : 'text-xs text-gray-400 font-medium';
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
        const photoURL = fixPhotoUrl(profile.photoURL || auth.currentUser.photoURL);
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
        if (this._currentPostType === 'bite') {
            postData.views = [];
            postData.likedBy = [];
        }
        await addDoc(collection(db, "posts"), postData);
        input.value = '';
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
        row.innerHTML = '';
        if (this._activeBites.length === 0) return;
        row.innerHTML = this._activeBites.map((bite, index) => {
            const img = fixPhotoUrl(bite.data.authorPhoto);
            const viewed = this.isStoryViewed(bite);
            return `
            <div class="flex flex-col items-center gap-1 flex-shrink-0 story-item" data-story-index="${index}" style="cursor:pointer; touch-action: manipulation;">
                <div class="w-16 h-16 rounded-full p-0.5 ${viewed ? 'bg-gray-300' : 'bg-gradient-to-tr from-sky-400 to-blue-500'}">
                    <div class="w-full h-full rounded-full bg-white p-0.5">
                        <img src="${img}" class="w-full h-full rounded-full object-cover" loading="lazy">
                    </div>
                </div>
                <span class="text-[10px] font-bold text-gray-700 text-center truncate w-16">${bite.data.authorName || 'مستخدم'}</span>
            </div>`;
        }).join('');
    },

    isStoryViewed(bite) {
        const userId = auth.currentUser?.uid;
        if (!userId) return false;
        const views = bite.data.views || [];
        return views.includes(userId);
    },

    watchStoriesContainer() {
        const row = document.getElementById('storiesRow');
        if (!row || this._observer) return;
        this._observer = new MutationObserver(() => {
            document.querySelectorAll('.story-item').forEach(story => {
                if (story.dataset.bound === 'true') return;
                story.dataset.bound = 'true';
                const index = parseInt(story.getAttribute('data-story-index'));
                if (isNaN(index)) return;
                const handler = (e) => {
                    e.preventDefault();
                    engine.openStoryPlayer(index);
                };
                story.addEventListener('pointerdown', handler);
                story.addEventListener('click', handler);
            });
        });
        this._observer.observe(row, { childList: true, subtree: true });
    },

    async recordView(postId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        const data = snap.data();
        if (data && data.type === 'bite') {
            const views = data.views || [];
            if (!views.includes(userId)) {
                await updateDoc(postRef, { views: arrayUnion(userId) });
            }
        }
    },

    async toggleLike(postId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        const data = snap.data();
        if (data && data.type === 'bite') {
            const likedBy = data.likedBy || [];
            if (likedBy.includes(userId)) {
                await updateDoc(postRef, { likedBy: arrayRemove(userId) });
            } else {
                await updateDoc(postRef, { likedBy: arrayUnion(userId) });
            }
        }
    },

    closeStory() {
        document.getElementById('storyPlayer')?.classList.remove('active');
    },

    openStoryPlayer(index) {
        this._activeBites = this.getActiveBites();
        if (!this._activeBites.length || index < 0 || index >= this._activeBites.length) return;
        this._storyIndex = index;
        const player = document.getElementById('storyPlayer');
        if (player) {
            player.classList.add('active');
            this.showCurrentStory();
        }
    },

    showCurrentStory() {
        const player = document.getElementById('storyPlayer');
        if (!player?.classList.contains('active')) return;
        if (this._storyIndex < 0 || this._storyIndex >= this._activeBites.length) {
            this.closeStory();
            return;
        }
        const bite = this._activeBites[this._storyIndex];
        const img = fixPhotoUrl(bite.data.authorPhoto);

        const storyImage = document.getElementById('storyImage');
        const storyAuthor = document.getElementById('storyAuthor');
        const storyText = document.getElementById('storyText');
        if (storyImage) storyImage.src = img;
        if (storyAuthor) storyAuthor.textContent = bite.data.authorName || 'مستخدم';
        if (storyText) storyText.textContent = bite.data.content;

        const views = (bite.data.views || []).length;
        const likedBy = bite.data.likedBy || [];
        const likes = likedBy.length;
        const userId = auth.currentUser?.uid;
        const isLiked = userId && likedBy.includes(userId);

        const viewsCount = document.getElementById('viewsCount');
        if (viewsCount) viewsCount.innerHTML = `<i class="fa-regular fa-eye"></i> ${views} · <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart text-${isLiked ? 'red-500' : 'gray-500'}"></i> ${likes}`;

        const likeBtn = document.getElementById('likeStoryBtn');
        if (likeBtn) {
            likeBtn.innerHTML = isLiked ? '<i class="fa-solid fa-heart text-red-500 text-2xl"></i>' : '<i class="fa-regular fa-heart text-2xl"></i>';
            likeBtn.onclick = async () => {
                await this.toggleLike(bite.id);
                const newLiked = !isLiked;
                likeBtn.innerHTML = newLiked ? '<i class="fa-solid fa-heart text-red-500 text-2xl"></i>' : '<i class="fa-regular fa-heart text-2xl"></i>';
                if (viewsCount) viewsCount.innerHTML = `<i class="fa-regular fa-eye"></i> ${views} · <i class="fa-${newLiked ? 'solid' : 'regular'} fa-heart text-${newLiked ? 'red-500' : 'gray-500'}"></i> ${newLiked ? likes + 1 : likes - 1}`;
            };
        }

        this.recordView(bite.id);
    },

    nextStory() {
        if (this._storyIndex < this._activeBites.length - 1) {
            this._storyIndex++;
            this.showCurrentStory();
        } else {
            this.closeStory();
        }
    },

    prevStory() {
        if (this._storyIndex > 0) {
            this._storyIndex--;
            this.showCurrentStory();
        }
    },

    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        this._currentSnapUnsubscribe = onSnapshot(q, (snapshot) => {
            this._allPosts = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            if (this._visibleCount > this._allPosts.length) this._visibleCount = this._allPosts.length;
            this.renderVisiblePosts();
            this.renderStories();
        }, error => {
            console.error("Firestore error:", error);
            // عرض رسالة للمستخدم إذا فشل التحميل
            const feed = document.getElementById('feedList');
            if (feed) feed.innerHTML = '<p class="text-center text-red-500">تعذر تحميل المنشورات. تأكد من قواعد الأمان في Firestore.</p>';
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
            try { dateStr = p.createdAt?.toDate().toLocaleString('ar-EG'); } catch (e) { dateStr = '---'; }
            const img = fixPhotoUrl(p.authorPhoto);
            return `
            <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div class="flex items-center gap-3 mb-3">
                    <img src="${img}" class="w-10 h-10 rounded-full border border-sky-200 object-cover" loading="lazy">
                    <div>
                        <span class="font-extrabold text-gray-800 text-sm">${p.authorName || 'مستخدم'}</span>
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
            loadMoreBtn.innerHTML = `<button class="bg-sky-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow hover:bg-sky-600 active:scale-95 transition">تحميل المزيد (${remaining} منشور)</button>`;
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
        }, error => {
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<p class="text-center text-red-500">تعذر تحميل المنشورات</p>';
        });
    },

    postHTML(postId, p) {
        let dateStr = '';
        try { dateStr = p.createdAt?.toDate().toLocaleString('ar-EG'); } catch (e) { dateStr = '---'; }
        const img = fixPhotoUrl(p.authorPhoto);
        return `
        <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <div class="flex items-center gap-3 mb-3">
                <img src="${img}" class="w-10 h-10 rounded-full border border-sky-200 object-cover" loading="lazy">
                <div>
                    <span class="font-extrabold text-gray-800 text-sm">${p.authorName || 'مستخدم'}</span>
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
                avatarImg.src = fixPhotoUrl(profile.photoURL || u.photoURL);
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
            editBtn.addEventListener('click', () => {
                if (nameEl) { nameEl.contentEditable = 'true'; nameEl.classList.add('bg-yellow-50','px-2','rounded','outline-none'); }
                if (bioEl) { bioEl.contentEditable = 'true'; bioEl.classList.add('bg-yellow-50','px-2','rounded','outline-none'); }
                editBtn.classList.add('hidden'); saveBtn.classList.remove('hidden');
            });
            saveBtn.addEventListener('click', async () => {
                if (nameEl) { nameEl.contentEditable = 'false'; nameEl.classList.remove('bg-yellow-50','px-2','rounded','outline-none'); }
                if (bioEl) { bioEl.contentEditable = 'false'; bioEl.classList.remove('bg-yellow-50','px-2','rounded','outline-none'); }
                editBtn.classList.remove('hidden'); saveBtn.classList.add('hidden');
                const n = nameEl ? nameEl.textContent.trim() : '';
                const b = bioEl ? bioEl.textContent.trim() : '';
                let ok = false;
                try { await this.updateUserProfile({ displayName: n, bio: b }); ok = true; if (aboutEl) aboutEl.textContent = b; } catch(e) {}
                this.showToast(ok ? 'تم حفظ البيانات ☁️' : 'تم حفظ البيانات محلياً ⚠️');
            });
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
        await updateDoc(doc(db, "users", uid), updates);
        const userBtn = document.getElementById('userBtn');
        if (updates.photoURL && userBtn) userBtn.innerHTML = `<img src="${fixPhotoUrl(updates.photoURL)}" class="w-full h-full object-cover rounded-2xl" loading="lazy">`;
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

window.engine.init();
