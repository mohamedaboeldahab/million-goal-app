import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = { /* بياناتك هنا */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.engine = {
    async init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                document.getElementById('splash').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('splash').style.display = 'none';
                    document.getElementById('main-nav').classList.remove('hidden');
                }, 500);
                
                document.getElementById('userBtn').innerHTML = `<img src="${user.photoURL}">`;
                this.loadPage('home'); // تحميل صفحة البداية
            } else {
                this.login();
            }
        });
    },

    async login() {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    },

    // --- نظام تحميل الصفحات المنفصلة ---
    async loadPage(pageName) {
        const content = document.getElementById('app-content');
        try {
            const response = await fetch(`${pageName}.html`);
            const html = await response.text();
            content.innerHTML = html;
            
            // تهيئة وظائف الصفحة بعد تحميلها
            if (pageName === 'home') this.listenToPosts();
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-gray-400">فشل تحميل الصفحة</div>`;
        }
    },

    // --- المنشورات والتعليقات ---
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;
            feed.innerHTML = snapshot.docs.map(doc => `
                <div class="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
                    <p class="mb-3">${doc.data().content}</p>
                    <div class="flex justify-between border-t pt-2">
                        <button class="text-gray-500 text-xs font-bold">❤️ ${doc.data().likes?.length || 0}</button>
                        <button onclick="engine.openComments('${doc.id}')" class="text-gray-500 text-xs font-bold">💬 ${doc.data().commentsCount || 0} تعليق</button>
                    </div>
                </div>
            `).join('');
        });
    },

    async addComment(postId) {
        const text = document.getElementById('commentInput').value.trim();
        if (!text) return;

        try {
            // 1. إضافة التعليق
            await addDoc(collection(db, `posts/${postId}/comments`), {
                text,
                userName: auth.currentUser.displayName,
                createdAt: serverTimestamp()
            });

            // 2. زيادة العداد يدوياً في Firestore لضمان التزامن
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, {
                commentsCount: increment(1)
            });

            document.getElementById('commentInput').value = '';
            console.log("Comment Added & Count Incremented");
        } catch (e) {
            alert("خطأ في التعليق: " + e.message);
        }
    }
};

window.onload = () => engine.init();
