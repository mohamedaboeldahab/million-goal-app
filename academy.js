// academy.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_2ms4K8EPbag7uab9gbDy8eePY6xwpxc",
  authDomain: "millionaireapp-be931.firebaseapp.com",
  projectId: "millionaireapp-be931",
  storageBucket: "millionaireapp-be931.firebasestorage.app",
  messagingSenderId: "325577904362",
  appId: "1:325577904362:web:8d85d4547bf22b1d8f4793"
};

// تهيئة Firebase (مرة واحدة)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // ربما تمت تهيئته بالفعل عبر التطبيق الرئيسي
  console.warn("Firebase already initialized, reusing existing app.");
  app = firebase.getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

const academy = {
  currentTab: 'courses',
  currentFilter: 'all',
  sellerMode: false,
  courses: [],
  articles: [],
  allHashtags: ['بيزنس', 'استثمار', 'مشاريع', 'تسويق', 'عملات_رقمية', 'ريادة_أعمال'],

  async loadData() {
    try {
      const courseSnap = await getDocs(query(collection(db, "academy_courses"), orderBy("createdAt", "desc")));
      this.courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const articleSnap = await getDocs(query(collection(db, "academy_articles"), orderBy("createdAt", "desc")));
      this.articles = articleSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      this.renderContent();
      this.updateCounters();
      this.createFilterHashtags();
    } catch (e) {
      console.error(e);
      alert('تعذر تحميل البيانات');
    }
  },

  updateCounters() {
    document.getElementById('coursesCount').textContent = this.courses.length + ' كورس';
    document.getElementById('articlesCount').textContent = this.articles.length + ' مقال';
  },

  renderContent() {
    const grid = document.getElementById('contentGrid');
    if (!grid) return;

    let data = this.currentTab === 'courses' ? this.courses : this.articles;
    if (this.currentFilter !== 'all') {
      data = data.filter(item => (item.hashtags || []).includes(this.currentFilter));
    }

    if (data.length === 0) {
      grid.innerHTML = `<div class="text-center text-gray-400 py-10"><i class="fa-solid fa-book-open text-4xl mb-2"></i><p>لا توجد ${this.currentTab === 'courses' ? 'كورسات' : 'مقالات'} هنا</p></div>`;
      return;
    }

    grid.innerHTML = data.map(item => this.cardContent(item)).join('');

    data.forEach(item => {
      document.getElementById(`detail-${item.id}`)?.addEventListener('click', () => this.showDetail(item.id));
      if (this.currentTab === 'courses') {
        document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => this.enrollFreeCourse(item.id));
      }
    });
  },

  cardContent(item) {
    if (this.currentTab === 'courses') return this.courseCard(item);
    return this.articleCard(item);
  },

  courseCard(course) {
    const modules = (course.modules || []).length;
    return `
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-item">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-gray-800">${course.title}</h3>
          <span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">مجاني</span>
        </div>
        <p class="text-xs text-gray-500 line-clamp-2 mb-2">${course.desc || ''}</p>
        <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <i class="fa-solid fa-user"></i> ${course.instructor || 'مجهول'}
          <span class="mx-1">•</span>
          <i class="fa-solid fa-layer-group"></i> ${modules} أجزاء
        </div>
        <div class="flex flex-wrap gap-1 mb-3">
          ${(course.hashtags || []).map(t => `<span class="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full text-xs font-bold">#${t}</span>`).join('')}
        </div>
        <div class="flex gap-2">
          <button id="buy-${course.id}" class="flex-1 bg-sky-500 text-white py-2 rounded-xl text-sm font-bold shadow">انضم مجاناً</button>
          <button id="detail-${course.id}" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold"><i class="fa-solid fa-eye"></i></button>
        </div>
      </div>`;
  },

  articleCard(article) {
    const excerpt = (article.content || '').substring(0, 100) + '...';
    return `
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-item">
        <div class="flex items-center gap-2 mb-2">
          <img src="${article.authorPhoto || 'data:image/svg+xml,...'}" class="w-8 h-8 rounded-full border border-gray-200 object-cover">
          <span class="text-xs font-semibold text-gray-700">${article.authorName || 'مستخدم'}</span>
        </div>
        <h3 class="font-bold text-gray-800 mb-1">${article.title}</h3>
        <p class="text-xs text-gray-500 line-clamp-2 mb-2">${excerpt}</p>
        <div class="flex flex-wrap gap-1 mb-3">
          ${(article.hashtags || []).map(t => `<span class="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-xs font-bold">#${t}</span>`).join('')}
        </div>
        <div class="flex justify-end">
          <button id="detail-${article.id}" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold"><i class="fa-solid fa-eye"></i> اقرأ</button>
        </div>
      </div>`;
  },

  showDetail(id) {
    const data = this.currentTab === 'courses' ? this.courses.find(c => c.id === id) : this.articles.find(a => a.id === id);
    if (!data) return;
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    modal.style.display = 'flex';
    if (this.currentTab === 'courses') {
      const modules = data.modules || [];
      content.innerHTML = `
        <h3 class="text-xl font-black text-gray-800 mb-2">${data.title}</h3>
        <p class="text-sm text-gray-600 mb-3">${data.desc || ''}</p>
        <div class="text-xs text-gray-400 mb-4">المدرب: ${data.instructor || 'مجهول'} • ${modules.length} أجزاء</div>
        <div class="space-y-3">
          ${modules.map((m, i) => `<div class="bg-gray-50 rounded-xl p-3 border"><h4 class="font-bold text-sm">الجزء ${i+1}: ${m.title}</h4><p class="text-xs text-gray-500 mt-1">${m.content || ''}</p></div>`).join('')}
        </div>
        <button id="enrollFreeBtn" class="w-full bg-sky-500 text-white py-2 rounded-xl font-bold mt-4">انضم مجاناً</button>
      `;
      document.getElementById('enrollFreeBtn').addEventListener('click', () => this.enrollFreeCourse(data.id));
    } else {
      content.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
          <img src="${data.authorPhoto || ''}" class="w-10 h-10 rounded-full border">
          <span class="font-bold text-gray-700">${data.authorName || 'مستخدم'}</span>
        </div>
        <h3 class="text-xl font-black text-gray-800 mb-3">${data.title}</h3>
        <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${data.content}</div>
        <div class="flex flex-wrap gap-1 mt-4">
          ${(data.hashtags || []).map(t => `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">#${t}</span>`).join('')}
        </div>
      `;
    }
  },

  async enrollFreeCourse(courseId) {
    if (!auth.currentUser) { alert("سجل الدخول أولاً"); return; }
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return;
    try {
      await addDoc(collection(db, "academy_purchases"), {
        userId: auth.currentUser.uid,
        courseId: course.id,
        courseTitle: course.title,
        price: 0,
        purchasedAt: serverTimestamp()
      });
      alert(`🎉 تم انضمامك إلى "${course.title}" بنجاح`);
    } catch (e) {
      alert('فشل التسجيل: ' + e.message);
    }
  },

  createHashtagSelector(containerId, selectedTags = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    this.allHashtags.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hashtag-select px-3 py-1 rounded-full text-xs font-bold border ${selectedTags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-100 text-gray-600 border-gray-200'}`;
      btn.textContent = '#' + tag;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.toggle('bg-sky-500');
        btn.classList.toggle('text-white');
        btn.classList.toggle('border-sky-500');
        btn.classList.toggle('bg-gray-100');
        btn.classList.toggle('text-gray-600');
        btn.classList.toggle('border-gray-200');
      });
      container.appendChild(btn);
    });
  },

  getSelectedHashtags(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.hashtag-select.bg-sky-500')).map(b => b.dataset.tag);
  },

  createFilterHashtags() {
    const container = document.getElementById('filterHashtags');
    if (!container) return;
    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'hashtag-btn bg-sky-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow active';
    allBtn.dataset.tag = 'all';
    allBtn.textContent = 'الكل';
    allBtn.addEventListener('click', () => this.filterByHashtag('all'));
    container.appendChild(allBtn);
    this.allHashtags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold';
      btn.dataset.tag = tag;
      btn.textContent = '#' + tag;
      btn.addEventListener('click', () => this.filterByHashtag(tag));
      container.appendChild(btn);
    });
  },

  filterByHashtag(tag) {
    this.currentFilter = tag;
    document.querySelectorAll('#filterHashtags .hashtag-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tag === tag);
      btn.classList.toggle('bg-sky-500', btn.dataset.tag === tag);
      btn.classList.toggle('text-white', btn.dataset.tag === tag);
      btn.classList.toggle('bg-gray-200', btn.dataset.tag !== tag);
      btn.classList.toggle('text-gray-700', btn.dataset.tag !== tag);
    });
    this.renderContent();
  },

  // دوال عامة
  switchTab(tab) {
    this.currentTab = tab;
    document.getElementById('tabCourses').classList.toggle('active', tab === 'courses');
    document.getElementById('tabArticles').classList.toggle('active', tab === 'articles');
    this.renderContent();
  },

  toggleSellerMode() {
    this.sellerMode = !this.sellerMode;
    document.getElementById('sellerPanel').classList.toggle('hidden', !this.sellerMode);
    const btn = document.getElementById('toggleSellerBtn');
    if (this.sellerMode) {
      btn.classList.add('bg-sky-500','text-white');
      btn.classList.remove('bg-gray-200','text-gray-600');
      btn.innerHTML = '<i class="fa-solid fa-store-alt"></i>';
    } else {
      btn.classList.remove('bg-sky-500','text-white');
      btn.classList.add('bg-gray-200','text-gray-600');
      btn.innerHTML = '<i class="fa-solid fa-store"></i>';
    }
  },

  openAddCourseModal() {
    document.getElementById('courseModal').style.display = 'flex';
    document.getElementById('courseTitle').value = '';
    document.getElementById('courseInstructor').value = '';
    document.getElementById('courseDesc').value = '';
    document.getElementById('courseModulesContainer').innerHTML = '';
    this.createHashtagSelector('courseHashtagSelection', []);
    this.addCourseModuleField();
  },

  closeModal(id) {
    document.getElementById(id).style.display = 'none';
  },

  addCourseModuleField() {
    const container = document.getElementById('courseModulesContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-start';
    div.innerHTML = `
      <div class="flex-1 flex gap-2">
        <input placeholder="عنوان الجزء" class="module-title flex-1 bg-gray-100 rounded-lg p-2 text-xs border">
        <input placeholder="وصف مختصر" class="module-content flex-1 bg-gray-100 rounded-lg p-2 text-xs border">
      </div>
      <button onclick="this.parentElement.remove()" class="text-red-400">✕</button>`;
    container.appendChild(div);
  },

  async publishCourse() {
    if (!auth.currentUser) { alert("سجل الدخول"); return; }
    const title = document.getElementById('courseTitle').value.trim();
    if (!title) { alert("العنوان مطلوب"); return; }
    const instructor = document.getElementById('courseInstructor').value.trim() || auth.currentUser.displayName || 'مجهول';
    const desc = document.getElementById('courseDesc').value.trim();
    const hashtags = this.getSelectedHashtags('courseHashtagSelection');
    const modules = [];
    document.querySelectorAll('#courseModulesContainer > div').forEach(row => {
      const titleEl = row.querySelector('.module-title');
      const contentEl = row.querySelector('.module-content');
      if (titleEl?.value.trim()) {
        modules.push({ title: titleEl.value.trim(), content: contentEl?.value.trim() || '' });
      }
    });
    try {
      await addDoc(collection(db, "academy_courses"), {
        title, instructor, desc, price: 0, hashtags, modules,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      this.closeModal('courseModal');
      this.loadData();
    } catch (e) { alert('فشل النشر: ' + e.message); }
  },

  openAddArticleModal() {
    document.getElementById('articleModal').style.display = 'flex';
    document.getElementById('articleTitle').value = '';
    document.getElementById('articleContent').value = '';
    this.createHashtagSelector('articleHashtagSelection', []);
  },

  async publishArticle() {
    if (!auth.currentUser) { alert("سجل الدخول"); return; }
    const title = document.getElementById('articleTitle').value.trim();
    if (!title) { alert("العنوان مطلوب"); return; }
    const content = document.getElementById('articleContent').value.trim();
    const hashtags = this.getSelectedHashtags('articleHashtagSelection');
    const user = auth.currentUser;
    try {
      await addDoc(collection(db, "academy_articles"), {
        title, content, hashtags,
        authorId: user.uid,
        authorName: user.displayName || 'مستخدم',
        authorPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });
      this.closeModal('articleModal');
      this.loadData();
    } catch (e) { alert('فشل النشر: ' + e.message); }
  }
};

// تعريض الدوال عبر window.academy
window.academy = academy;
// ربط الاختصارات المباشرة
window.switchTab = (t) => academy.switchTab(t);
window.toggleSellerMode = () => academy.toggleSellerMode();
window.filterByHashtag = (t) => academy.filterByHashtag(t);
window.openAddCourseModal = () => academy.openAddCourseModal();
window.closeModal = (id) => academy.closeModal(id);
window.addCourseModuleField = () => academy.addCourseModuleField();
window.publishCourse = () => academy.publishCourse();
window.openAddArticleModal = () => academy.openAddArticleModal();
window.publishArticle = () => academy.publishArticle();

// بدء التحميل عند جهوز الصفحة
academy.loadData();
