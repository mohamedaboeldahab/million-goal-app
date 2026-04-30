import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    doc,
    setDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    serverTimestamp,
    increment,
    arrayUnion,
    getDoc
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

    async init() {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (e) {
            console.error("Persistence error", e);
        }

        onAuthStateChanged(auth, (user) => {
            const splash = document.getElementById('splash');
            const nav = document.getElementById('main-nav');

            if (user) {
                console.log("Welcome Shark:", user.displayName);
                if (splash) splash.style.display = 'none';
                if (nav) nav.classList.remove('hidden');

                const userBtn = document.getElementById('userBtn');
                // ✅ تحميل الصورة من Firestore أو الاحتياط
                this.getOrCreateUserProfile().then(profile => {
                    const photo = profile.photoURL || user.photoURL;
                    if (userBtn) {
                        userBtn.innerHTML = `<img src="${photo}" class="w-full h-full object-cover rounded-2xl">`;
                    }
                }).catch(() => {
                    if (userBtn) {
                        userBtn.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-2xl">`;
                    }
                });

                this.loadPage('home');
            } else {
                console.log("No Shark detected.");
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
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                    دخول القروش
                </button>
            `;
        }
    },

    async login() {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("حدث خطأ في الدخول، تأكد من السماح بالنوافذ المنبثقة (Popups)");
        }
    },

    async logout() {
        if (confirm("هل تريد مغادرة المحيط؟")) {
            await signOut(auth);
            location.reload();
        }
    },

    async loadPage(pageName) {
        const content = document.getElementById('app-content');
        if (!content) return;

        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.page === pageName);
        });

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

            if (typeof setActiveNavLink === 'function') {
                setActiveNavLink(pageName);
            }
        } catch (e) {
            content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`;
        }
    },

    activateCharCounter() {
        const input = document.getElementById('postInput');
        const countSpan = document.getElementById('charCount');
        if (!input || !countSpan) return;

        const max = parseInt(input.getAttribute('maxlength')) || 300;

        const update = () => {
            const current = input.value.length;
            countSpan.textContent = `${current}/${max} حرف`;
            countSpan.className = current >= max - 30
                ? 'text-xs text-red-500 font-bold'
                : 'text-xs text-gray-400 font-medium';
        };

        input.addEventListener('input', update);
        update();

        const originalAddPost = this.addPost.bind(this);
        this.addPost = async function () {
            await originalAddPost();
            update();
        };
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

    // ---------- المنشورات (نسخة كبيرة وواضحة) ----------
    listenToPosts() {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feed = document.getElementById('feedList');
            if (!feed) return;

            feed.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                const postId = doc.id;
                return `
                <div class="bg-white rounded-3xl p-6 mb-8 shadow-md border border-gray-100 hover:shadow-2xl transition-shadow">
                    <!-- رأس المنشور -->
                    <div class="flex items-center gap-4 mb-6">
                        <img src="${p.authorPhoto}" class="w-16 h-16 rounded-full border-4 border-sky-200 object-cover shadow-sm">
                        <div>
                            <span class="font-extrabold text-gray-800 text-xl block leading-tight">${p.authorName}</span>
                            <div class="text-base text-gray-400 font-medium mt-0.5">${new Date(p.createdAt?.toDate()).toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                    <!-- محتوى المنشور -->
                    <p class="text-gray-700 text-lg leading-loose mb-8 whitespace-pre-wrap font-medium">${p.content}</p>
                    <!-- أزرار التصويت -->
                    <div class="flex gap-5 mb-6">
                        <button onclick="engine.handleVote('${postId}', 'support')" 
                            class="flex-1 flex items-center justify-center gap-4 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition text-xl">
                            🦈 <span class="text-2xl">أؤيد</span> <span class="bg-white/30 px-4 py-1.5 rounded-full text-2xl font-black">${p.supportCount || 0}</span>
                        </button>
                        <button onclick="engine.handleVote('${postId}', 'oppose')" 
                            class="flex-1 flex items-center justify-center gap-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition text-xl">
                            🐟 <span class="text-2xl">لا أؤيد</span> <span class="bg-white/30 px-4 py-1.5 rounded-full text-2xl font-black">${p.opposeCount || 0}</span>
                        </button>
                    </div>
                    <!-- قسم التعليقات -->
                    <div class="border-t-2 border-gray-100 pt-6">
                        <div id="comments_list_${postId}" class="space-y-4 mb-4"></div>
                        <button id="load_more_btn_${postId}" 
                            style="display: none;" 
                            onclick="engine.loadMoreComments('${postId}')" 
                            class="text-sky-600 text-sm font-bold hover:underline w-full text-center py-2">
                            عرض كل التعليقات
                        </button>
                        <div class="flex gap-3 mt-3">
                            <input type="text" id="comm_${postId}" placeholder="أضف تعليقاً..." 
                                class="flex-1 bg-gray-100 rounded-2xl px-5 py-4 text-base border border-gray-200 outline-none focus:ring-2 focus:ring-sky-400 transition placeholder:text-gray-400">
                            <button onclick="engine.addComment('${postId}')" 
                                class="bg-sky-500 text-white px-6 py-4 rounded-2xl text-base font-bold hover:bg-sky-600 active:scale-95 transition shadow-md">
                                <i class="fa-solid fa-paper-plane text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');
            snapshot.docs.forEach(d => this.listenToComments(d.id));
        });
    },

    // ---------- التعليقات مع عرض أول ٣ فقط ----------
    listenToComments(postId) {
        const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
        onSnapshot(q, (snap) => {
            const allComments = snap.docs.map(d => d.data());
            this._allComments[postId] = allComments;

            const list = document.getElementById(`comments_list_${postId}`);
            const loadBtn = document.getElementById(`load_more_btn_${postId}`);
            if (!list) return;

            // عرض أول ٣ تعليقات فقط
            const visible = allComments.slice(0, 3);
            list.innerHTML = visible.map(c => `
                <div class="bg-gray-50 p-4 rounded-2xl text-base font-medium">
                    <b class="text-sky-600 font-extrabold">${c.userName}:</b> ${c.text}
                </div>
            `).join('');

            // زر "عرض المزيد" إذا وجد أكثر من ٣ تعليقات
            if (allComments.length > 3 && loadBtn) {
                loadBtn.style.display = 'block';
                loadBtn.textContent = `عرض كل التعليقات (${allComments.length})`;
            } else if (loadBtn) {
                loadBtn.style.display = 'none';
            }
        });
    },

    // ---------- تحميل جميع التعليقات عند الضغط على "عرض المزيد" ----------
    loadMoreComments(postId) {
        const list = document.getElementById(`comments_list_${postId}`);
        const loadBtn = document.getElementById(`load_more_btn_${postId}`);
        const all = this._allComments[postId] || [];
        if (!list || !loadBtn) return;

        list.innerHTML = all.map(c => `
            <div class="bg-gray-50 p-4 rounded-2xl text-base font-medium">
                <b class="text-sky-600 font-extrabold">${c.userName}:</b> ${c.text}
            </div>
        `).join('');
        loadBtn.style.display = 'none';
    },

    listenToUserPosts(containerId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const q = query(
            collection(db, "posts"),
            where("authorId", "==", userId),
            orderBy("createdAt", "desc")
        );
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
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

        // تحديث صورة الشريط العلوي فوراً بعد الحفظ
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
