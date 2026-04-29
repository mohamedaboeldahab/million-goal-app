import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = { /* بياناتك هنا */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.engine = {
    init() {
        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            if (user) {
                if(splash) splash.style.display = 'none';
                document.getElementById('main-nav').classList.remove('hidden');
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                this.loadPage('home');
            } else { this.login(); }
        });
    },

    async login() { await signInWithPopup(auth, provider); },
    async logout() { await signOut(auth); location.reload(); },

    async loadPage(pageName) {
        const content = document.getElementById('app-content');
        try {
            const response = await fetch(`${pageName}.html`);
            content.innerHTML = await response.text();
            if (pageName === 'home') this.listenToPosts();
        } catch (e) { content.innerHTML = "قريباً..."; }
    },

    // --- نظام التصويت المطور ---
    async handleVote(postId, type) {
        const postRef = doc(db, "posts", postId);
        const userId = auth.currentUser.uid;
        const postSnap = await getDoc(postRef);
        const data = postSnap.data();

        // التأكد أن المستخدم لم يصوت من قبل
        if (data.voters && data.voters.includes(userId)) {
            alert("لقد قمت بالتصويت مسبقاً على هذا المشروع");
            return;
        }

        if (type === 'support') {
            await updateDoc(postRef, { 
                supportCount: increment(1), 
                voters: arrayUnion(userId) 
            });
        } else {
            await updateDoc(postRef, { 
                opposeCount: increment(1), 
                voters: arrayUnion(userId) 
            });
        }
    },

    // --- عرض المنشورات وتصميم أزرار التقييم ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="bg-white rounded-[2rem] p-6 mb-6 shadow-sm border border-slate-50 animate-fade-in">
                    <div class="flex items-center gap-2 mb-4">
                        <img src="${p.authorPhoto}" class="w-8 h-8 rounded-full border">
                        <span class="text-xs font-black text-slate-500">${p.authorName}</span>
                    </div>
                    <p class="text-slate-800 text-sm font-bold leading-relaxed mb-6">${p.content}</p>
                    
                    <div class="flex gap-2 border-t pt-4">
                        <button onclick="engine.handleVote('${doc.id}', 'support')" class="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all">
                            <i class="fa-solid fa-thumbs-up"></i> أؤيد (${p.supportCount || 0})
                        </button>
                        <button onclick="engine.handleVote('${doc.id}', 'oppose')" class="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-all">
                            <i class="fa-solid fa-thumbs-down"></i> لا أؤيد (${p.opposeCount || 0})
                        </button>
                    </div>

                    <div class="mt-4 pt-4 border-t border-dashed">
                        <div class="flex gap-2">
                            <input type="text" id="comm_${doc.id}" placeholder="اكتب تعليقك هنا..." class="flex-1 bg-slate-50 border-none rounded-lg p-2 text-xs outline-none">
                            <button onclick="engine.addComment('${doc.id}')" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold">رد</button>
                        </div>
                        <div id="list_${doc.id}" class="mt-3 space-y-2 max-h-32 overflow-y-auto">
                            </div>
                    </div>
                </div>`;
            }).join('');
            
            // جلب التعليقات لكل بوست
            snapshot.docs.forEach(d => this.listenToComments(d.id));
        });
    },

    async addComment(postId) {
        const input = document.getElementById(`comm_${postId}`);
        if (!input.value.trim()) return;
        await addDoc(collection(db, `posts/${postId}/comments`), {
            text: input.value,
            userName: auth.currentUser.displayName,
            createdAt: serverTimestamp()
        });
        input.value = '';
    },

    listenToComments(postId) {
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snap) => {
            const list = document.getElementById(`list_${postId}`);
            if (list) {
                list.innerHTML = snap.docs.map(d => `
                    <div class="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span class="font-black text-sky-600 ml-1">${d.data().userName}:</span>
                        <span class="text-slate-600">${d.data().text}</span>
                    </div>
                `).join('');
            }
        });
    }
};

window.engine.init();
