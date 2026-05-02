// 1. تهيئة Firebase باستخدام الإعدادات الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyB_2ms4K8EPbag7uab9gbDy8eePY6xwpxc",
    authDomain: "millionaireapp-be931.firebaseapp.com",
    projectId: "millionaireapp-be931",
    storageBucket: "millionaireapp-be931.firebasestorage.app",
    messagingSenderId: "325577904362",
    appId: "1:325577904362:web:8d85d4547bf22b1d8f4793"
};

// التأكد من عدم تهيئة التطبيق أكثر من مرة
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// 2. كائن الأكاديمية الرئيسي
window.academy = {
    currentTab: 'courses',
    filter: 'all',
    courses: [],
    articles: [],
    tags: ['بيزنس', 'استثمار', 'تسويق', 'برمجة', 'عملات_رقمية'],

    // تشغيل الأكاديمية
    init() {
        console.log("Academy system starting...");
        this.renderTagFilters();
        this.loadData();
    },

    // جلب البيانات من Firestore
    async loadData() {
        try {
            // جلب الكورسات
            const cSnap = await db.collection("academy_courses").orderBy("createdAt", "desc").get();
            this.courses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // جلب المقالات
            const aSnap = await db.collection("academy_articles").orderBy("createdAt", "desc").get();
            this.articles = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            this.updateCounters();
            this.renderContent();
        } catch (e) {
            console.error("Firebase Error:", e);
            document.getElementById('contentGrid').innerHTML = `<div class="text-center py-10 text-red-400 text-xs">فشل تحميل البيانات. تأكد من إعدادات Firestore</div>`;
        }
    },

    // تحديث الأرقام في الهيدر
    updateCounters() {
        if (document.getElementById('coursesCount')) 
            document.getElementById('coursesCount').innerText = `${this.courses.length} كورس`;
        if (document.getElementById('articlesCount')) 
            document.getElementById('articlesCount').innerText = `${this.articles.length} مقال`;
    },

    // عرض الفلاتر (Hashtags)
    renderTagFilters() {
        const container = document.getElementById('filterHashtags');
        if (!container) return;
        
        let html = `<button onclick="academy.setFilter('all')" class="${this.filter === 'all' ? 'bg-sky-500 text-white' : 'bg-white text-gray-500 border'} px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all">الكل</button>`;
        
        html += this.tags.map(t => `
            <button onclick="academy.setFilter('${t}')" class="${this.filter === t ? 'bg-sky-500 text-white' : 'bg-white text-gray-500 border'} px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all">#${t}</button>
        `).join('');
        
        container.innerHTML = html;
    },

    setFilter(tag) {
        this.filter = tag;
        this.renderTagFilters();
        this.renderContent();
    },

    // عرض المحتوى بناءً على القسم المختار والفلتر
    renderContent() {
        const grid = document.getElementById('contentGrid');
        if (!grid) return;

        let items = this.currentTab === 'courses' ? this.courses : this.articles;
        
        if (this.filter !== 'all') {
            items = items.filter(i => (i.hashtags || []).includes(this.filter));
        }

        if (items.length === 0) {
            grid.innerHTML = `<div class="text-center py-20 text-gray-400 text-sm">لا يوجد محتوى متاح حالياً</div>`;
            return;
        }

        grid.innerHTML = items.map(item => this.currentTab === 'courses' ? this.courseCard(item) : this.articleCard(item)).join('');
    },

    // تصميم كارت الكورس
    courseCard(c) {
        return `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 animate-fade-in">
            <div class="flex justify-between items-center">
                <span class="text-[9px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded font-bold">كورس</span>
                <span class="text-green-500 text-[10px] font-bold">مجاني</span>
            </div>
            <h3 class="font-bold text-gray-800 text-sm">${c.title}</h3>
            <p class="text-[11px] text-gray-500 line-clamp-2">${c.desc || ''}</p>
            <button onclick="academy.viewCourse('${c.id}')" class="w-full bg-sky-500 text-white py-2 rounded-xl text-xs font-bold mt-2 hover:bg-sky-600 transition-colors">عرض التفاصيل</button>
        </div>`;
    },

    // تصميم كارت المقال
    articleCard(a) {
        return `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 animate-fade-in">
             <div class="flex justify-between items-center">
                <span class="text-[9px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-bold">مقال</span>
            </div>
            <h3 class="font-bold text-gray-800 text-sm">${a.title}</h3>
            <p class="text-[11px] text-gray-500 line-clamp-3">${a.content || ''}</p>
            <button onclick="academy.viewArticle('${a.id}')" class="text-sky-600 text-xs font-bold mt-2 flex items-center gap-1">اقرأ المزيد <i class="fa-solid fa-arrow-left text-[10px]"></i></button>
        </div>`;
    },

    // فتح تفاصيل الكورس
    viewCourse(id) {
        const c = this.courses.find(x => x.id === id);
        if (!c) return;
        
        const viewer = document.getElementById('viewerContent');
        viewer.innerHTML = `
            <div class="space-y-4">
                <h2 class="text-lg font-black text-gray-800">${c.title}</h2>
                <p class="text-xs text-gray-500 leading-relaxed">${c.desc || ''}</p>
                <div class="h-px bg-gray-100 my-4"></div>
                <h4 class="font-bold text-sm mb-4 text-sky-600">قائمة الدروس:</h4>
                <div class="space-y-3">
                    ${(c.modules || []).map((m, i) => `
                        <div class="bg-gray-50 p-4 rounded-xl border-r-4 border-sky-500">
                            <h4 class="font-bold text-xs">الحلقة ${i + 1}: ${m.title}</h4>
                            <p class="text-[11px] text-gray-600 mt-2 leading-relaxed">${m.content}</p>
                        </div>
                    `).join('')}
                </div>
                <button onclick="academy.closeModal('viewerModal')" class="w-full mt-6 py-3 bg-gray-100 rounded-2xl font-bold text-sm text-gray-600">إغلاق النافذة</button>
            </div>
        `;
        this.openModal('viewerModal');
    },

    // تبديل الأقسام
    switchTab(tab) {
        this.currentTab = tab;
        const btnCourses = document.getElementById('tabCourses');
        const btnArticles = document.getElementById('tabArticles');
        
        if (tab === 'courses') {
            btnCourses.classList.add('active');
            btnArticles.classList.remove('active');
        } else {
            btnArticles.classList.add('active');
            btnCourses.classList.remove('active');
        }
        this.renderContent();
    },

    // إضافة سطر درس جديد في المودال
    addModuleRow() {
        const container = document.getElementById('modulesContainer');
        const div = document.createElement('div');
        div.className = 'module-row space-y-2 bg-gray-50 p-3 rounded-xl relative border border-gray-100';
        div.innerHTML = `
            <input class="m-t w-full bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none" placeholder="عنوان الدرس (مثال: المقدمة)">
            <textarea class="m-c w-full bg-white border border-gray-200 p-2 rounded-lg text-[11px] outline-none" rows="2" placeholder="محتوى الدرس أو رابط الفيديو"></textarea>
            <button onclick="this.parentElement.remove()" class="absolute -top-2 -left-2 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] shadow-lg">✕</button>
        `;
        container.appendChild(div);
    },

    // نشر الكورس الجديد لـ Firestore
    async publishCourse() {
        const title = document.getElementById('courseTitle').value;
        const desc = document.getElementById('courseDesc').value;
        
        if (!title) return alert("يرجى إدخال عنوان الكورس");

        const modules = [];
        document.querySelectorAll('.module-row').forEach(row => {
            const mTitle = row.querySelector('.m-t').value;
            const mContent = row.querySelector('.m-c').value;
            if (mTitle) modules.push({ title: mTitle, content: mContent });
        });

        try {
            await db.collection("academy_courses").add({
                title,
                desc,
                modules,
                hashtags: this.getSelectedTags('courseHashtags'),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.closeModal('courseModal');
            this.loadData(); // إعادة تحميل البيانات
            alert("تم نشر الكورس بنجاح!");
        } catch (e) {
            alert("حدث خطأ أثناء النشر: " + e.message);
        }
    },

    // دوال مساعدة للمودال
    openModal(id) {
        document.getElementById(id).classList.add('active');
        if (id === 'courseModal') {
            this.renderTagSelection('courseHashtags');
            document.getElementById('modulesContainer').innerHTML = ''; // تنظيف القائمة
            this.addModuleRow(); // إضافة أول سطر تلقائياً
        }
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    toggleSellerMode() {
        const panel = document.getElementById('sellerPanel');
        const btn = document.getElementById('toggleSellerBtn');
        panel.classList.toggle('hidden');
        btn.classList.toggle('bg-sky-500');
        btn.classList.toggle('text-white');
    },

    renderTagSelection(cid) {
        document.getElementById(cid).innerHTML = this.tags.map(t => `
            <button onclick="this.classList.toggle('selected'); this.classList.toggle('bg-sky-500'); this.classList.toggle('text-white'); this.classList.toggle('text-gray-400')" 
            class="border border-gray-200 px-3 py-1 rounded-full text-[10px] text-gray-400 transition-all" data-tag="${t}">#${t}</button>
        `).join('');
    },

    getSelectedTags(cid) {
        return Array.from(document.getElementById(cid).querySelectorAll('.selected')).map(b => b.dataset.tag);
    }
};

// تشغيل النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.academy.init();
});
