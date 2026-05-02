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
                    const photo = (profile.photoURL || user.photoURL || '') + '?sz=48';
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
        img.src = (profile.photoURL || auth.currentUser.photoURL || '') + '?sz=50';
    },

    async deleteExpiredBites() { /* unchanged */ },
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

    activateCharCounter() { /* unchanged */ },
    async handleVote(postId, type) { /* unchanged */ },

    async addPost() { /* unchanged */ },

    getActiveBites() { /* unchanged */ },

    renderStories() {
        const row = document.getElementById('storiesRow');
        if (!row) return;
        this._activeBites = this.getActiveBites();
        if (this._activeBites.length === 0) {
            row.innerHTML = '';
            return;
        }
        row.innerHTML = this._activeBites.map((bite, index) => `
            <div class="flex flex-col items-center gap-1 flex-shrink-0" data-story-index="${index}" style="cursor:pointer">
                <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 p-0.5 shadow-md">
                    <img src="${bite.data.authorPhoto}" class="w-full h-full rounded-full object-cover border-2 border-white" loading="lazy">
                </div>
                <span class="text-[10px] font-bold text-gray-700 text-center truncate w-16">${bite.data.authorName}</span>
            </div>
        `).join('');
        // لا نحتاج لأي ربط هنا؛ المستمع في index.html يتولى الأمر
    },

    closeStory() {
        const player = document.getElementById('storyPlayer');
        if (player) player.classList.remove('active');
    },

    openStoryPlayer(index) {
        this._activeBites = this.getActiveBites();
        if (this._activeBites.length === 0 || index < 0 || index >= this._activeBites.length) return;
        this._storyIndex = index;
        const player = document.getElementById('storyPlayer');
        if (player) {
            player.classList.add('active');
            this.showCurrentStory();
        }
    },

    showCurrentStory() {
        const player = document.getElementById('storyPlayer');
        if (!player || !player.classList.contains('active')) return;
        if (this._storyIndex < 0 || this._storyIndex >= this._activeBites.length) { this.closeStory(); return; }
        const bite = this._activeBites[this._storyIndex];
        const content = document.getElementById('storyContent');
        if (content) content.innerHTML = `
            <img src="${bite.data.authorPhoto}" class="w-20 h-20 rounded-full border-2 border-white/50 mb-4" loading="lazy">
            <h3 class="font-bold text-xl">${bite.data.authorName}</h3>
            <p class="text-sm mt-2 text-center max-w-xs">${bite.data.content}</p>`;
    },

    nextStory() { /* unchanged */ },
    prevStory() { /* unchanged */ },

    listenToPosts() { /* unchanged */ },
    renderVisiblePosts() { /* unchanged */ },
    listenToComments(postId) { /* unchanged */ },
    loadMoreComments(postId) { /* unchanged */ },
    listenToProfilePosts(containerId) { /* unchanged */ },
    postHTML(postId, p) { /* unchanged */ },
    activateProfile() { /* unchanged */ },
    showToast(message) { /* unchanged */ },
    async getOrCreateUserProfile() { /* unchanged */ },
    async updateUserProfile(updates) { /* unchanged */ },
    async addComment(postId) { /* unchanged */ }
};

window.engine.init();
