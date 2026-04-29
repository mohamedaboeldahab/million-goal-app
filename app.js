import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
            if (user) {
                document.getElementById('authModal').classList.add('hidden');
                document.getElementById('userAvatar').src = user.photoURL;
                document.getElementById('userInfo').innerHTML = `<span class="text-[10px] font-bold">${user.displayName.split(' ')[0]}</span><img src="${user.photoURL}" class="w-8 h-8 rounded-full border">`;
                this.listenToPosts();
                this.renderRoadmap();
            } else {
                document.getElementById('authModal').classList.remove('hidden');
            }
        });
    },

    async login() { await signInWithPopup(auth, provider); },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + pageId).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active', 'text-sky-600');
            btn.classList.add('text-gray-400');
            if(btn.dataset.page === pageId) { btn.classList.add('active', 'text-sky-600'); btn.classList.remove('text-gray-400'); }
        });
    },

    // --- المنشورات ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
        onSnapshot(q, (snapshot) => {
            document.getElementById('feedList').innerHTML = snapshot.docs.map(doc => this.renderPost(doc.id, doc.data())).join('');
        });
    },

    renderPost(id, post) {
        const isLiked = post.likes?.includes(auth.currentUser?.uid);
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4">
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${post.authorPhoto}" class="w-10 h-10 rounded-full">
                        <div>
                            <h4 class="font-bold text-sm text-slate-800">${post.authorName}</h4>
                            <p class="text-[10px] text-gray-400">${post.createdAt?.toDate().toLocaleDateString('ar-EG')}</p>
                        </div>
                    </div>
                    <p class="text-gray-700 text-sm leading-relaxed">${post.content}</p>
                </div>
                <div class="px-4 py-2 flex items-center justify-between border-t text-gray-400 text-xs">
                    <span>${post.likes?.length || 0} إعجاب</span>
                    <span>${post.commentsCount || 0} تعليق</span>
                </div>
                <div class="flex border-t p-1">
                    <button onclick="engine.toggleLike('${id}', ${isLiked})" class="flex-1 py-2 flex items-center justify-center gap-2 font-bold ${isLiked ? 'text-red-500' : 'text-gray-500'}">
                        <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> لايك
                    </button>
                    <button onclick="engine.openComments('${id}')" class="flex-1 py-2 flex items-center justify-center gap-2 font-bold text-gray-500">
                        <i class="fa-regular fa-comment"></i> تعليق
                    </button>
                </div>
            </div>
        `;
    },

    async addPost() {
        const content = document.getElementById('postInput').value.trim();
        if (!content || !auth.currentUser) return;
        await addDoc(collection(db, "posts"), {
            content,
            authorName: auth.currentUser.displayName,
            authorPhoto: auth.currentUser.photoURL,
            authorId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            likes: [],
            commentsCount: 0
        });
        document.getElementById('postInput').value = '';
        document.getElementById('postCreator').classList.add('hidden');
    },

    async toggleLike(postId, isLiked) {
        await updateDoc(doc(db, "posts", postId), {
            likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
        });
    },

    // --- التعليقات (مع زيادة العداد) ---
    async openComments(postId) {
        this.currentPostId = postId;
        document.getElementById('commentSheet').classList.add('open');
        document.getElementById('commentSheetOverlay').classList.remove('hidden');
        
        onSnapshot(query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc")), (snap) => {
            document.getElementById('commentsContainer').innerHTML = snap.docs.map(d => `
                <div class="flex gap-3">
                    <img src="${d.data().userPhoto}" class="w-8 h-8 rounded-full">
                    <div class="bg-gray-100 p-3 rounded-2xl flex-1">
                        <h5 class="text-[11px] font-bold text-slate-800">${d.data().userName}</h5>
                        <p class="text-sm text-gray-600">${d.data().text}</p>
                    </div>
                </div>
            `).join('');
        });
        document.getElementById('sendCommentBtn').onclick = () => this.addComment(postId);
    },

    async addComment(postId) {
        const text = document.getElementById('commentInput').value.trim();
        if(!text) return;
        await addDoc(collection(db, `posts/${postId}/comments`), {
            text, userName: auth.currentUser.displayName, userPhoto: auth.currentUser.photoURL, createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });
        document.getElementById('commentInput').value = '';
    },

    closeComments() {
        document.getElementById('commentSheet').classList.remove('open');
        document.getElementById('commentSheetOverlay').classList.add('hidden');
    },

    renderRoadmap() {
        const board = document.getElementById('gameBoard');
        let html = '';
        for(let i=1; i<=25; i++) {
            html += `<div class="aspect-square rounded-lg border flex items-center justify-center text-[10px] bg-white text-gray-300">
                <i class="fa-solid fa-lock"></i>
            </div>`;
        }
        board.innerHTML = html;
    }
};

window.onload = () => engine.init();
