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

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e2e8f0'/%3E%3Ctext x='50' y='67' font-size='60' text-anchor='middle' fill='%2394a3b8'%3E🦈%3C/text%3E%3C/svg%3E";

function fixPhotoUrl(url) {
    if (!url) return DEFAULT_AVATAR;
    if (url.startsWith('data:')) return url;
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
        return url.replace(/=s[0-9]+(-c)?/, '=s50-c').replace(/=s[0-9]+/, '=s50');
    }
    if (url.includes('?sz=')) return url;
    return url + (url.includes('?') ? '&' : '?') + 'sz=50';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const bgGradients = {
    gradient1: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    gradient2: 'linear-gradient(135deg, #4b0000, #000000)',
    gradient3: 'linear-gradient(135deg, #141e30, #243b55)',
    gradient4: 'linear-gradient(135deg, #134e5e, #71b280)',
    gradient5: 'linear-gradient(135deg, #2c3e50, #bdc3c7)',
    gradient6: 'linear-gradient(135deg, #200122, #6f0000)',
    gradient7: 'linear-gradient(135deg, #232526, #414345)',
    gradient8: 'linear-gradient(135deg, #2c3e50, #000000)',
    gradient9: 'linear-gradient(135deg, #061161, #781717)',
    gradient10: 'linear-gradient(135deg, #1f1c2c, #928dab)'
};

window.engine = {
    _allComments: {},
    _allPosts: [],
    _visibleCount: 10,
    _currentSnapUnsubscribe: null,
    _currentPostType: 'post',
    _activeBites: [],
    _storyIndex: 0,
    _observer: null,
    _currentBg: null,

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
                    if (userBtn) userBtn.innerHTML = `<img src="${photo}" class="w-9 h-9 rounded-full object-cover">`;
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
                <h1 class="text-white text-2xl font-black mb-10 tracking-widest uppercase">Shark Up</h1>
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
        
        if (pageName === 'home') {
            sessionStorage.removeItem('viewingProfileUID');
        }
        
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

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
                    this.renderBgPicker();
                    this.watchStoriesContainer();
                }, 50);
            } else if (pageName === 'profile') {
                setTimeout(() => {
                    this.listenToProfilePosts('userPostsContainer');
                    this.activateProfile();
                }, 150);
            }
            if (typeof setActiveNavLink === 'function') setActiveNavLink(pageName);
        } catch (e) { 
            content.innerHTML = `<div class="text-center py-20 text-slate-400">قريباً..</div>`; 
        }
    },

    async sendFriendRequest(toUserId) {
        const fromUserId = auth.currentUser.uid;
        if (!fromUserId || !toUserId || fromUserId === toUserId) {
            this.showToast('لا يمكن إرسال طلب صداقة');
            return;
        }

        const existingQuery = query(
            collection(db, "friend_requests"),
            where("fromUserId", "==", fromUserId),
            where("toUserId", "==", toUserId),
            where("status", "==", "pending")
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
            this.showToast('تم إرسال طلب صداقة بالفعل');
            return;
        }

        const friendshipCheck = await this.checkFriendship(fromUserId, toUserId);
        if (friendshipCheck) {
            this.showToast('أنتما أصدقاء بالفعل');
            return;
        }

        try {
            const profile = await this.getOrCreateUserProfile();
            await addDoc(collection(db, "friend_requests"), {
                fromUserId,
                toUserId,
                fromUserName: profile.displayName || auth.currentUser.displayName,
                fromPhotoURL: profile.photoURL || auth.currentUser.photoURL,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            this.showToast('تم إرسال طلب الصداقة ✅');
        } catch (e) {
            this.showToast('فشل إرسال الطلب ⚠️');
        }
    },

    async checkFriendship(user1, user2) {
        const q1 = query(collection(db, "friendships"), where("user1", "==", user1), where("user2", "==", user2));
        const q2 = query(collection(db, "friendships"), where("user1", "==", user2), where("user2", "==", user1));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        return !snap1.empty || !snap2.empty;
    },

    openChat(receiverId, receiverName) {
        console.log('فتح الشات مع:', receiverId, receiverName);
        
        if (!receiverId || !receiverName) {
            this.showToast('❌ حدث خطأ في فتح المحادثة');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" style="direction: rtl;">
                <div class="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-4 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <i class="fa-regular fa-comment-dots"></i>
                        <h3 class="font-bold">محادثة مع ${receiverName}</h3>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="text-white text-2xl hover:opacity-80">&times;</button>
                </div>
                <div id="chatMessagesContainer" class="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50"></div>
                <div class="p-4 border-t bg-white flex gap-2">
                    <input type="text" id="chatInput" placeholder="اكتب رسالتك..." class="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:border-sky-500 text-sm">
                    <button id="sendMessageBtn" class="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-xl font-bold transition">
                        <i class="fa-regular fa-paper-plane"></i> إرسال
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.loadChatMessages(receiverId, modal.querySelector('#chatMessagesContainer'));
        
        const sendBtn = modal.querySelector('#sendMessageBtn');
        const input = modal.querySelector('#chatInput');
        
        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) {
                this.showToast('✏️ اكتب رسالة أولاً');
                return;
            }
            this.sendMessageDirect(receiverId, receiverName, text);
            input.value = '';
            setTimeout(() => input.focus(), 100);
        };
        
        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => { 
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        };
        
        setTimeout(() => input.focus(), 300);
    },
// تحديث إحصائيات المستخدم
async updateProfileStats(uid = null) {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) return;
    
    try {
        // عدد المنشورات
        const postsQuery = query(collection(db, "posts"), where("authorId", "==", userId));
        const postsSnap = await getDocs(postsQuery);
        const postsCount = document.getElementById('postsCount');
        if (postsCount) postsCount.textContent = postsSnap.size;
        
        // عدد الأصدقاء
        const q1 = query(collection(db, "friendships"), where("user1", "==", userId));
        const q2 = query(collection(db, "friendships"), where("user2", "==", userId));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const friendsCount = document.getElementById('friendsCount');
        if (friendsCount) friendsCount.textContent = snap1.size + snap2.size;
        
        console.log(`الاحصائيات - منشورات: ${postsSnap.size}, أصدقاء: ${snap1.size + snap2.size}`);
    } catch (error) {
        console.error("خطأ في تحديث الإحصائيات:", error);
    }
},

// تحديث تاريخ الانضمام
updateJoinDate() {
    const joinDateSpan = document.getElementById('joinDate');
    if (joinDateSpan && auth.currentUser?.metadata?.creationTime) {
        const date = new Date(auth.currentUser.metadata.creationTime);
        joinDateSpan.textContent = date.toLocaleDateString('ar-EG');
    }
},
    async sendMessageDirect(receiverId, receiverName, messageText) {
        const senderId = auth.currentUser.uid;
        try {
            const messageData = {
                senderId: senderId,
                receiverId: receiverId,
                text: messageText,
                senderName: auth.currentUser.displayName || 'مستخدم',
                senderPhoto: auth.currentUser.photoURL || '',
                createdAt: serverTimestamp(),
                read: false
            };
            await addDoc(collection(db, "messages"), messageData);
            this.showToast('✅ تم الإرسال');
        } catch (e) {
            console.error('خطأ في الإرسال:', e);
            this.showToast('❌ فشل الإرسال: ' + e.message);
        }
    },

    loadChatMessages(receiverId, container) {
        if (!container) return;
        const senderId = auth.currentUser.uid;
        
        const q1 = query(
            collection(db, "messages"),
            where("senderId", "==", senderId),
            where("receiverId", "==", receiverId),
            orderBy("createdAt", "asc")
        );
        
        const q2 = query(
            collection(db, "messages"),
            where("senderId", "==", receiverId),
            where("receiverId", "==", senderId),
            orderBy("createdAt", "asc")
        );
        
        container.innerHTML = '<div class="text-center text-gray-400 py-10"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل الرسائل...</div>';
        
        const allMessages = [];
        
        const onUpdate = () => {
            allMessages.sort((a, b) => {
                const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
                const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
                return timeA - timeB;
            });
            
            if (allMessages.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-10">✨ لا توجد رسائل بعد<br><span class="text-xs">ابدأ المحادثة الآن</span></div>';
                return;
            }
            
            container.innerHTML = '';
            let lastDate = null;
            
            allMessages.forEach(msg => {
                const isMe = msg.senderId === senderId;
                const msgDate = msg.createdAt?.toDate();
                
                if (msgDate) {
                    const today = new Date();
                    const isToday = msgDate.toDateString() === today.toDateString();
                    const dateStr = isToday ? 'اليوم' : msgDate.toLocaleDateString('ar-EG');
                    
                    if (lastDate !== dateStr) {
                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'text-center my-2';
                        dateDiv.innerHTML = `<span class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">${dateStr}</span>`;
                        container.appendChild(dateDiv);
                        lastDate = dateStr;
                    }
                }
                
                const div = document.createElement('div');
                div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`;
                div.innerHTML = `
                    <div class="max-w-[75%] ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'} rounded-2xl px-4 py-2 shadow-sm">
                        ${!isMe ? `<div class="text-xs text-sky-600 font-bold mb-1">${escapeHtml(msg.senderName) || 'مستخدم'}</div>` : ''}
                        <p class="text-sm break-words">${escapeHtml(msg.text)}</p>
                        <div class="text-xs ${isMe ? 'text-sky-100' : 'text-gray-400'} text-left mt-1">
                            ${msg.createdAt?.toDate()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || ''}
                            ${isMe ? ' ✓' : ''}
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        
        onSnapshot(q1, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    allMessages.push(change.doc.data());
                }
            });
            onUpdate();
        });
        
        onSnapshot(q2, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    allMessages.push(change.doc.data());
                }
            });
            onUpdate();
        });
    },

    async acceptFriendRequest(requestId, fromUserId) {
        const currentUserId = auth.currentUser.uid;
        try {
            await updateDoc(doc(db, "friend_requests", requestId), { 
                status: 'accepted',
                updatedAt: serverTimestamp()
            });
            
            const existingCheck = await this.checkFriendship(currentUserId, fromUserId);
            if (!existingCheck) {
                await addDoc(collection(db, "friendships"), {
                    user1: currentUserId,
                    user2: fromUserId,
                    createdAt: serverTimestamp()
                });
            }
            
            this.showToast('🎉 تم قبول الصداقة');
            
            if (document.getElementById('friendsList')) {
                this.loadFriendsData();
            }
            
            this.updateProfileFriendButton(fromUserId);
            
        } catch (e) {
            console.error(e);
            this.showToast('⚠️ فشل قبول الطلب');
        }
    },

    async rejectFriendRequest(requestId) {
        try {
            await updateDoc(doc(db, "friend_requests", requestId), { 
                status: 'rejected',
                updatedAt: serverTimestamp()
            });
            this.showToast('تم رفض الطلب');
            
            const reqElement = document.querySelector(`button[onclick*="rejectFriendRequest('${requestId}')"]`)?.closest('.flex');
            if (reqElement) reqElement.remove();
        } catch (e) {
            this.showToast('⚠️ فشل رفض الطلب');
        }
    },

    async sendMessage(receiverId, receiverName) {
        this.openChat(receiverId, receiverName);
    },

    // ==================== محفظة الأصول ====================
    async loadAssets(containerId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const q = query(collection(db, "assets"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const container = document.getElementById(containerId);
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">محفظتك فارغة. أضف أصولك الآن!</div>`;
            this.updateTotalBalance();
            return;
        }

        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let html = '';
        docs.forEach(asset => {
            const categoryIcons = {
                'fixed_income': { icon: '🏦', color: 'from-blue-500 to-blue-700', label: 'دخل ثابت' },
                'stocks': { icon: '📈', color: 'from-emerald-500 to-emerald-700', label: 'أسهم' },
                'real_estate': { icon: '🏠', color: 'from-amber-500 to-amber-700', label: 'عقار' },
                'gold': { icon: '🥇', color: 'from-yellow-500 to-yellow-700', label: 'ذهب' },
                'crypto': { icon: '₿', color: 'from-orange-500 to-orange-700', label: 'عملات رقمية' },
                'marketing': { icon: '📢', color: 'from-purple-500 to-purple-700', label: 'تسويق' },
                'business': { icon: '💼', color: 'from-indigo-500 to-indigo-700', label: 'مشروع' },
                'other': { icon: '📦', color: 'from-gray-500 to-gray-700', label: 'أخرى' }
            };
            const cat = categoryIcons[asset.category] || categoryIcons['other'];

            html += `
            <div class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow">
                    ${cat.icon}
                </div>
                <div class="flex-1">
                    <h4 class="font-extrabold text-gray-800 text-sm">${asset.name}</h4>
                    <span class="text-xs text-gray-400">${cat.label}</span>
                </div>
                <div class="text-right">
                    <div class="font-black text-sky-600">${Number(asset.value).toLocaleString()} ج.م</div>
                    <button onclick="engine.deleteAsset('${asset.id}')" class="text-red-400 text-xs mt-1 hover:underline">حذف</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
        this.updateTotalBalance();
    },

    async saveAsset() {
        const name = document.getElementById('assetName').value.trim();
        const value = parseFloat(document.getElementById('assetValue').value);
        const category = document.getElementById('assetCategory').value;

        if (!name || isNaN(value) || value <= 0) {
            alert('يرجى إدخال اسم وقيمة صحيحة');
            return;
        }

        const userId = auth.currentUser.uid;
        try {
            await addDoc(collection(db, "assets"), {
                userId,
                name,
                value,
                category,
                createdAt: serverTimestamp()
            });
            document.getElementById('assetName').value = '';
            document.getElementById('assetValue').value = '';
            this.loadAssets('assetsContainer');
        } catch (error) {
            this.showToast('❌ حدث خطأ أثناء الحفظ');
        }
    },

    async deleteAsset(assetId) {
        if (confirm('هل أنت متأكد من حذف هذا الأصل؟')) {
            await deleteDoc(doc(db, "assets", assetId));
            this.loadAssets('assetsContainer');
        }
    },

    async updateTotalBalance() {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const q = query(collection(db, "assets"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
            total += Number(doc.data().value) || 0;
        });
        const el = document.getElementById('totalBalance');
        if (el) el.innerText = total.toLocaleString();
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

    renderBgPicker() {
        const container = document.getElementById('bgPickerContainer');
        if (!container) return;
        container.innerHTML = '';
        Object.entries(bgGradients).forEach(([name, gradient]) => {
            const circle = document.createElement('div');
            circle.className = `w-8 h-8 rounded-full cursor-pointer border-2 ${this._currentBg === name ? 'border-sky-500 scale-110' : 'border-transparent'}`;
            circle.style.background = gradient;
            circle.dataset.bg = name;
            circle.addEventListener('click', () => this.setBg(name));
            container.appendChild(circle);
        });
        const clearBtn = document.createElement('div');
        clearBtn.className = 'w-8 h-8 rounded-full cursor-pointer border-2 border-gray-300 flex items-center justify-center text-xs text-gray-500';
        clearBtn.innerHTML = '✕';
        clearBtn.addEventListener('click', () => this.setBg(null));
        container.appendChild(clearBtn);
    },

    setBg(name) {
        this._currentBg = name;
        document.querySelectorAll('#bgPickerContainer div').forEach(el => {
            if (el.dataset.bg === name) {
                el.classList.add('border-sky-500', 'scale-110');
            } else {
                el.classList.remove('border-sky-500', 'scale-110');
            }
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
        if (this._currentPostType === 'post' && this._currentBg) {
            postData.backgroundColor = this._currentBg;
        }
        if (this._currentPostType === 'bite') {
            postData.views = [];
            postData.likedBy = [];
        }
        try {
            await addDoc(collection(db, "posts"), postData);
            input.value = '';
            this._currentBg = null;
            this.renderBgPicker();
        } catch (error) {
            this.showToast('❌ فشل النشر: ' + error.message);
        }
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
        if (!row) return;

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        let startX = 0, startY = 0, moved = false;

        this._observer = new MutationObserver(() => {
            document.querySelectorAll('.story-item').forEach(story => {
                if (story.dataset.bound === 'true') return;
                story.dataset.bound = 'true';
                const index = parseInt(story.getAttribute('data-story-index'));
                if (isNaN(index)) return;

                story.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    moved = false;
                }, { passive: true });

                story.addEventListener('touchmove', (e) => {
                    const dx = Math.abs(e.touches[0].clientX - startX);
                    const dy = Math.abs(e.touches[0].clientY - startY);
                    if (dx > 5 || dy > 5) moved = true;
                }, { passive: true });

                story.addEventListener('touchend', (e) => {
                    if (!moved) {
                        e.preventDefault();
                        engine.openStoryPlayer(index);
                    }
                });

                story.addEventListener('click', (e) => {
                    if (!moved) engine.openStoryPlayer(index);
                });
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
            const feed = document.getElementById('feedList');
            if (feed) feed.innerHTML = '<p class="text-center text-red-500">تعذر تحميل المنشورات</p>';
        });
    },

    renderVisiblePosts() {
        const feed = document.getElementById('feedList');
        if (!feed) return;
        const normalPosts = this._allPosts.filter(p => p.data.type !== 'bite');
        const postsToShow = normalPosts.slice(0, this._visibleCount);
        feed.innerHTML = postsToShow.map(({ id, data: p }) => this.postHTML(id, p)).join('') || '<p class="text-gray-400 text-center py-8">لا توجد منشورات بعد</p>';

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

    postHTML(postId, p) {
        let dateStr = '';
        try { dateStr = p.createdAt?.toDate().toLocaleString('ar-EG'); } catch (e) { dateStr = '---'; }
        const img = fixPhotoUrl(p.authorPhoto);
        const bg = p.backgroundColor ? bgGradients[p.backgroundColor] : null;

        let html = `
        <div class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <div class="flex items-center gap-3 mb-3 cursor-pointer" onclick="engine.viewUserProfile('${p.authorId}')">
                <img src="${img}" class="w-10 h-10 rounded-full border border-sky-200 object-cover" loading="lazy" onerror="this.src='${DEFAULT_AVATAR}'">
                <div>
                    <span class="font-extrabold text-gray-800 text-sm">${p.authorName || 'مستخدم'}</span>
                    <div class="text-xs text-gray-400">${dateStr}</div>
                </div>
            </div>`;

        if (bg) {
            html += `
            <div style="background: ${bg}; border-radius: 16px; padding: 16px; margin-bottom: 16px;">
                <p class="text-white text-sm leading-relaxed whitespace-pre-wrap" style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${p.content}</p>
            </div>`;
        } else {
            html += `
            <p class="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap break-words overflow-hidden w-full max-w-full">${p.content}</p>`;
        }

        html += `
            <div class="flex gap-2 mb-3">
                <button onclick="engine.handleVote('${postId}', 'support')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🦈</span> أؤيد <span class="bg-white/20 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.supportCount || 0}</span></button>
                <button onclick="engine.handleVote('${postId}', 'oppose')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-2 rounded-xl shadow text-sm"><span class="text-base">🐟</span> لا أؤيد <span class="bg-white/20 px-2 py-0.5 rounded-full text-sm font-extrabold">${p.opposeCount || 0}</span></button>
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

        return html;
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
        const targetUID = sessionStorage.getItem('viewingProfileUID') || auth.currentUser?.uid;
        if (!targetUID) return;

        const q = query(collection(db, "posts"), where("authorId", "==", targetUID));
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">لا توجد منشورات بعد</p>';
                return;
            }

            const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            docs.sort((a, b) => {
                const timeA = a.data.createdAt?.toDate?.()?.getTime?.() || 0;
                const timeB = b.data.createdAt?.toDate?.()?.getTime?.() || 0;
                return timeB - timeA;
            });

            container.innerHTML = docs.map(doc => this.postHTML(doc.id, doc.data)).join('');
            docs.forEach(doc => this.listenToComments(doc.id));
        }, error => {
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<p class="text-center text-red-500">تعذر تحميل المنشورات</p>';
        });
    },

    async activateProfile() {
        // الحصول على الـ UID المستهدف
        let targetUID = sessionStorage.getItem('viewingProfileUID');
        const currentUID = auth.currentUser?.uid;
           const fromNavBar = !window._lastProfileClick || window._lastProfileClick === 'navbar';
    
    if (fromNavBar) {
        // إذا جاء من شريط التنقل، نمسح التخزين تماماً
        sessionStorage.removeItem('viewingProfileUID');
    }
        // إذا كان targetUID موجود ويساوي المستخدم الحالي، نمسحه
        if (targetUID === currentUID) {
            sessionStorage.removeItem('viewingProfileUID');
            targetUID = null;
        }
        
        // إذا لا يوجد targetUID، نعرض بروفايل المستخدم الحالي
        const isOwnProfile = !targetUID || targetUID === currentUID;
        const finalUID = isOwnProfile ? currentUID : targetUID;
        
        // إظهار/إخفاء تبويب الأصدقاء
        const friendsTab = document.getElementById('friendsTabBtn');
        if (friendsTab) {
            friendsTab.classList.toggle('hidden', !isOwnProfile);
        }

        // جلب بيانات المستخدم
        let profile = {};
        if (!isOwnProfile) {
            const ref = doc(db, "users", finalUID);
            const snap = await getDoc(ref);
            profile = snap.exists() ? snap.data() : {};
        } else {
            profile = await this.getOrCreateUserProfile();
        }

        // تعيين عنوان الصفحة
        if (isOwnProfile) {
            document.title = "ملفي الشخصي - Shark Up";
        } else {
            document.title = `${profile.displayName || 'مستخدم'} - Shark Up`;
        }

        // إعداد التبويبات
        this.setupProfileTabs();

        const avatarImg = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const bioEl = document.getElementById('profileBio');
        const aboutEl = document.getElementById('aboutBio');
        const actionsContainer = document.getElementById('profileActions');
        if (!actionsContainer) return;

        if (avatarImg && nameEl) {
            avatarImg.src = fixPhotoUrl(profile.photoURL || '');
            nameEl.textContent = profile.displayName || 'مستخدم';
            const bio = profile.bio || '🦈 عضو في Shark Up';
            if (bioEl) bioEl.textContent = bio;
            if (aboutEl) aboutEl.textContent = bio;
        }

        actionsContainer.innerHTML = '';
        
        if (!isOwnProfile) {
            // أزرار لبروفايل شخص آخر
            const msgBtn = document.createElement('button');
            msgBtn.className = 'bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg text-sm';
            msgBtn.innerHTML = '<i class="fa-solid fa-message ml-1"></i> إرسال رسالة';
            msgBtn.onclick = () => this.sendMessage(finalUID, profile.displayName || 'مستخدم');
            actionsContainer.appendChild(msgBtn);

            const isFriend = await this.checkFriendship(finalUID, currentUID);
            const hasPending = await this.hasPendingRequest(finalUID);
            
            const friendBtn = document.createElement('button');
            friendBtn.className = 'friend-action-btn ' + (isFriend ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-800') + ' font-bold py-2 px-4 rounded-lg text-sm';
            
            if (isFriend) {
                friendBtn.innerHTML = '<i class="fa-solid fa-user-check ml-1"></i> أصدقاء';
                friendBtn.onclick = () => this.showToast('أنتما أصدقاء بالفعل 🎉');
            } else if (hasPending) {
                friendBtn.innerHTML = '<i class="fa-solid fa-hourglass-half ml-1"></i> طلب مرسل';
                friendBtn.onclick = () => this.showToast('طلب صداقة قيد الانتظار ⏳');
            } else {
                friendBtn.innerHTML = '<i class="fa-solid fa-user-plus ml-1"></i> إضافة صديق';
                friendBtn.onclick = () => this.sendFriendRequest(finalUID);
            }
            actionsContainer.appendChild(friendBtn);

            if (emailEl) emailEl.textContent = '';

            // إضافة زر العودة للملف الشخصي
            const backBtn = document.createElement('button');
            backBtn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm';
            backBtn.innerHTML = '<i class="fa-solid fa-arrow-right ml-1"></i> ملفي الشخصي';
            backBtn.onclick = () => {
                sessionStorage.removeItem('viewingProfileUID');
                this.loadPage('profile');
            };
            actionsContainer.appendChild(backBtn);

        } else {
            // أزرار للملف الشخصي الخاص
            const editBtn = document.createElement('button');
            editBtn.id = 'editProfileBtn';
            editBtn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm';
            editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل';
            actionsContainer.appendChild(editBtn);

            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveProfileBtn';
            saveBtn.className = 'bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg text-sm hidden';
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> حفظ';
            actionsContainer.appendChild(saveBtn);

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'bg-white border border-red-200 text-red-500 hover:bg-red-50 font-bold py-2 px-4 rounded-lg text-sm';
            logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> خروج';
            logoutBtn.onclick = () => this.logout();
            actionsContainer.appendChild(logoutBtn);
            
            if (emailEl) emailEl.textContent = auth.currentUser.email || '';

            editBtn.addEventListener('click', () => {
                if (nameEl) { 
                    nameEl.contentEditable = 'true'; 
                    nameEl.classList.add('bg-yellow-50', 'px-2', 'rounded', 'outline-none'); 
                }
                if (bioEl) { 
                    bioEl.contentEditable = 'true'; 
                    bioEl.classList.add('bg-yellow-50', 'px-2', 'rounded', 'outline-none'); 
                }
                editBtn.classList.add('hidden'); 
                saveBtn.classList.remove('hidden');
            });
            
            saveBtn.addEventListener('click', async () => {
                if (nameEl) { 
                    nameEl.contentEditable = 'false'; 
                    nameEl.classList.remove('bg-yellow-50', 'px-2', 'rounded', 'outline-none'); 
                }
                if (bioEl) { 
                    bioEl.contentEditable = 'false'; 
                    bioEl.classList.remove('bg-yellow-50', 'px-2', 'rounded', 'outline-none'); 
                }
                editBtn.classList.remove('hidden'); 
                saveBtn.classList.add('hidden');
                const n = nameEl ? nameEl.textContent.trim() : '';
                const b = bioEl ? bioEl.textContent.trim() : '';
                try {
                    await this.updateUserProfile({ displayName: n, bio: b });
                    if (aboutEl) aboutEl.textContent = b;
                    this.showToast('تم حفظ البيانات ☁️');
                } catch(e) { 
                    this.showToast('فشل الحفظ ⚠️'); 
                }
            });

            // رفع الصورة
            document.getElementById('avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarFileInput').click());
            document.getElementById('avatarFileInput')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxSize = 200;
                        let width = img.width, height = img.height;
                        if (width > height) {
                            if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                        } else {
                            if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                        }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                        if (avatarImg) avatarImg.src = compressedDataUrl;
                        this.updateUserProfile({ photoURL: compressedDataUrl })
                            .then(() => this.showToast('تم تغيير الصورة وحفظها ☁️'))
                            .catch(() => this.showToast('تعذر حفظ الصورة ⚠️'));
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
        
        if (isOwnProfile) {
            this.loadFriendsData();
        }
    },

    setupProfileTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.removeEventListener('click', this.handleTabClick);
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => { 
                    b.classList.remove('active', 'bg-gray-100', 'text-sky-600');
                    b.classList.add('text-gray-500');
                });
                e.currentTarget.classList.add('active', 'bg-gray-100', 'text-sky-600');
                
                document.getElementById('tab-posts').classList.toggle('hidden', target !== 'posts');
                document.getElementById('tab-about').classList.toggle('hidden', target !== 'about');
                document.getElementById('tab-friends').classList.toggle('hidden', target !== 'friends');
                
                if (target === 'friends') {
                    this.loadFriendsData();
                }
            });
        });
    },

    async loadFriendsData() {
        const userId = auth.currentUser.uid;
        if (!userId) return;

        const requestsQuery = query(
            collection(db, "friend_requests"),
            where("toUserId", "==", userId),
            where("status", "==", "pending")
        );
        const requestsSnap = await getDocs(requestsQuery);
        const requestsContainer = document.getElementById('friendRequestsList');
        if (requestsContainer) {
            requestsContainer.innerHTML = '';
            if (requestsSnap.empty) {
                requestsContainer.innerHTML = '<p class="text-gray-400 text-sm text-center">✨ لا توجد طلبات صداقة</p>';
            } else {
                for (const doc of requestsSnap.docs) {
                    const data = doc.data();
                    const div = document.createElement('div');
                    div.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-xl';
                    div.innerHTML = `
                        <div class="flex items-center gap-3 flex-1 cursor-pointer" onclick="engine.viewUserProfile('${data.fromUserId}')">
                            <img src="${fixPhotoUrl(data.fromPhotoURL)}" class="w-10 h-10 rounded-full object-cover" onerror="this.src='${DEFAULT_AVATAR}'">
                            <div>
                                <span class="font-bold text-gray-800 text-sm block">${data.fromUserName || 'مستخدم'}</span>
                                <span class="text-xs text-gray-400">يريد إضافتك كصديق</span>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="event.stopPropagation(); engine.acceptFriendRequest('${doc.id}', '${data.fromUserId}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition">
                                قبول
                            </button>
                            <button onclick="event.stopPropagation(); engine.rejectFriendRequest('${doc.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition">
                                رفض
                            </button>
                        </div>
                    `;
                    requestsContainer.appendChild(div);
                }
            }
        }

        const q1 = query(collection(db, "friendships"), where("user1", "==", userId));
        const q2 = query(collection(db, "friendships"), where("user2", "==", userId));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const friendsContainer = document.getElementById('friendsList');
        if (friendsContainer) {
            friendsContainer.innerHTML = '';
            const friends = [];
            snap1.forEach(d => friends.push({ userId: d.data().user2, docId: d.id }));
            snap2.forEach(d => friends.push({ userId: d.data().user1, docId: d.id }));
            
            if (friends.length === 0) {
                friendsContainer.innerHTML = '<p class="text-gray-400 text-sm text-center">💙 لا يوجد أصدقاء بعد</p>';
            } else {
                for (let friend of friends) {
                    const friendSnap = await getDoc(doc(db, "users", friend.userId));
                    if (friendSnap.exists()) {
                        const friendData = friendSnap.data();
                        const div = document.createElement('div');
                        div.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-xl';
                        div.innerHTML = `
                            <div class="flex items-center gap-3 flex-1 cursor-pointer" onclick="engine.viewUserProfile('${friend.userId}')">
                                <img src="${fixPhotoUrl(friendData.photoURL)}" class="w-10 h-10 rounded-full object-cover" onerror="this.src='${DEFAULT_AVATAR}'">
                                <div>
                                    <span class="font-bold text-gray-800 text-sm block">${friendData.displayName || 'مستخدم'}</span>
                                    <span class="text-xs text-green-600">✓ صديق</span>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="event.stopPropagation(); engine.openChat('${friend.userId}', '${friendData.displayName}')" class="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                    <i class="fa-regular fa-comment"></i> رسالة
                                </button>
                                <button onclick="event.stopPropagation(); engine.removeFriend('${friend.userId}', '${friend.docId}')" class="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                    <i class="fa-solid fa-user-minus"></i> إلغاء
                                </button>
                            </div>
                        `;
                        friendsContainer.appendChild(div);
                    }
                }
            }
        }
    },

    async removeFriend(friendId, friendshipDocId) {
        if (!confirm('هل أنت متأكد من إلغاء الصداقة؟')) return;
        
        try {
            await deleteDoc(doc(db, "friendships", friendshipDocId));
            
            const q1 = query(
                collection(db, "friend_requests"),
                where("fromUserId", "==", auth.currentUser.uid),
                where("toUserId", "==", friendId)
            );
            const q2 = query(
                collection(db, "friend_requests"),
                where("fromUserId", "==", friendId),
                where("toUserId", "==", auth.currentUser.uid)
            );
            
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            for (const doc of [...snap1.docs, ...snap2.docs]) {
                await deleteDoc(doc.ref);
            }
            
            this.showToast('🗑️ تم إلغاء الصداقة');
            
            if (document.getElementById('friendsList')) {
                this.loadFriendsData();
            }
            
            this.updateProfileFriendButton(friendId);
        } catch (e) {
            console.error(e);
            this.showToast('⚠️ فشل إلغاء الصداقة');
        }
    },

    async updateProfileFriendButton(userId) {
        const profileActions = document.getElementById('profileActions');
        if (!profileActions) return;
        
        const isFriend = await this.checkFriendship(auth.currentUser.uid, userId);
        const friendBtn = profileActions.querySelector('.friend-action-btn');
        
        if (friendBtn) {
            if (isFriend) {
                friendBtn.innerHTML = '<i class="fa-solid fa-user-check ml-1"></i> أصدقاء';
                friendBtn.className = 'bg-green-100 hover:bg-green-200 text-green-700 font-bold py-2 px-4 rounded-lg text-sm friend-action-btn';
                friendBtn.onclick = () => this.showToast('أنتما أصدقاء بالفعل 🎉');
            } else {
                friendBtn.innerHTML = '<i class="fa-solid fa-user-plus ml-1"></i> إضافة صديق';
                friendBtn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm friend-action-btn';
                friendBtn.onclick = () => this.sendFriendRequest(userId);
            }
        }
    },

    async hasPendingRequest(toUserId) {
        const fromUserId = auth.currentUser.uid;
        const q = query(
            collection(db, "friend_requests"),
            where("fromUserId", "==", fromUserId),
            where("toUserId", "==", toUserId),
            where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    viewUserProfile(uid) {
        if (uid === auth.currentUser?.uid) {
            sessionStorage.removeItem('viewingProfileUID');
            this.loadPage('profile');
        } else {
            sessionStorage.setItem('viewingProfileUID', uid);
            this.loadPage('profile');
        }
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg';
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
        const ref = doc(db, "users", uid);
        await setDoc(ref, updates, { merge: true });
        const userBtn = document.getElementById('userBtn');
        if (updates.photoURL && userBtn) {
            userBtn.innerHTML = `<img src="${fixPhotoUrl(updates.photoURL)}" class="w-9 h-9 rounded-full object-cover">`;
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

window.__firestore_helpers = { collection, query, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, where, limit, startAfter, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove, increment };


window.engine.init();
