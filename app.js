import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
    // ضع بياناتك هنا
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
                document.getElementById('userInfo').innerHTML = `<img src="${user.photoURL}" class="w-8 h-8 rounded-full">`;
                this.listenToPosts();
                this.loadUserData();
            } else {
                document.getElementById('authModal').classList.remove('hidden');
            }
        });
    },

    async login() {
        await signInWithPopup(auth, provider);
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + pageId).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.replace('text-[#0ea5e9]', 'text-gray-400');
            if(btn.dataset.page === pageId) btn.classList.replace('text-gray-400', 'text-[#0ea5e9]');
        });
    },

    // --- المجتمع ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
        onSnapshot(q, (snapshot) => {
            const list = document.getElementById('feedList');
            list.innerHTML = snapshot.docs.map(doc => this.renderPost(doc.id, doc.data())).join('');
        });
    },

    renderPost(id, post) {
        const isLiked = post.likes?.includes(auth.currentUser.uid);
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="flex items-center gap-3 mb-3">
                    <img src="${post.authorPhoto}" class="w-10 h-10 rounded-full">
                    <div>
                        <h4 class="font-bold text-sm">${post.authorName}</h4>
                        <p class="text-[10px] text-gray-400">${post.createdAt?.toDate().toLocaleDateString('ar-EG')}</p>
                    </div>
                </div>
                <p class="text-gray-700 mb-4">${post.content}</p>
                <div class="flex gap-4 border-t pt-3">
                    <button onclick="engine.toggleLike('${id}', ${isLiked})" class="flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-400'}">
                        <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
                        <span class="text-xs font-bold">${post.likes?.length || 0}</span>
                    </button>
                    <button onclick="engine.openComments('${id}')" class="flex items-center gap-2 text-gray-400">
                        <i class="fa-regular fa-comment"></i>
                        <span class="text-xs font-bold">${post.commentsCount || 0}</span>
                    </button>
                </div>
            </div>
        `;
    },

    async addPost() {
        const content = document.getElementById('postInput').value;
        if (!content.trim()) return;
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
    },

    async toggleLike(postId, isLiked) {
        const ref = doc(db, "posts", postId);
        await updateDoc(ref, {
            likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
        });
    },

    // --- التعليقات ---
    openComments(postId) {
        document.getElementById('commentSheet').classList.add('open');
        document.getElementById('commentSheetOverlay').classList.remove('hidden');
        this.currentPostId = postId;
        
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snapshot) => {
            document.getElementById('commentsContainer').innerHTML = snapshot.docs.map(d => `
                <div class="flex gap-3 mb-4">
                    <img src="${d.data().userPhoto}" class="w-8 h-8 rounded-full">
                    <div class="bg-gray-50 p-3 rounded-2xl flex-1">
                        <b class="text-xs block mb-1">${d.data().userName}</b>
                        <p class="text-sm text-gray-600">${d.data().text}</p>
                    </div>
                </div>
            `).join('');
        });

        document.getElementById('sendCommentBtn').onclick = () => this.addComment(postId);
    },

    async addComment(postId) {
        const text = document.getElementById('commentInput').value;
        if(!text.trim()) return;
        await addDoc(collection(db, `posts/${postId}/comments`), {
            text,
            userName: auth.currentUser.displayName,
            userPhoto: auth.currentUser.photoURL,
            createdAt: serverTimestamp()
        });
        document.getElementById('commentInput').value = '';
    },

    closeComments() {
        document.getElementById('commentSheet').classList.remove('open');
        document.getElementById('commentSheetOverlay').classList.add('hidden');
    }
};

window.onload = () => engine.init();
