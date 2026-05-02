// academy.js – أكاديمية Shark UP (كورسات + مقالات)
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

// تهيئة Firebase (مرة واحدة فقط)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // قد يكون مهيأ بالفعل من التطبيق الرئيسي – نستخدم الموجود
  app = firebase.getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

// ========== الحالة العامة ==========
let currentTab = 'courses';
let currentFilter = 'all';
let sellerMode = false;
let courses = [];
let articles = [];
const allHashtags = ['بيزنس', 'استثمار', 'مشاريع', 'تسويق', 'عملات_رقمية', 'ريادة_أعمال'];

// ========== دوال العرض ==========
async function loadData() {
  try {
    const courseSnap = await getDocs(query(collection(db, "academy_courses"), orderBy("createdAt", "desc")));
    courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const articleSnap = await getDocs(query(collection(db, "academy_articles"), orderBy("createdAt", "desc")));
    articles = articleSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderContent();
    updateCounters();
  } catch (e) {
    console.error(e);
    alert('تعذر تحميل البيانات');
  }
}

function updateCounters() {
  document.getElementById('coursesCount').textContent = courses.length + ' كورس';
  document.getElementById('articlesCount').textContent = articles.length + ' مقال';
}

function renderContent() {
  const grid = document.getElementById('contentGrid');
  if (!grid) return;

  let data = currentTab === 'courses' ? courses : articles;
  if (currentFilter !== 'all') {
    data = data.filter(item => (item.hashtags || []).includes(currentFilter));
  }

  if (data.length === 0) {
    grid.innerHTML = `<div class="text-center text-gray-400 py-10"><i class="fa-solid fa-book-open text-4xl mb-2"></i><p>لا توجد ${currentTab === 'courses' ? 'كورسات' : 'مقالات'} هنا</p></div>`;
    return;
  }

  grid.innerHTML = data.map(item => {
    if (currentTab === 'courses') return courseCard(item);
    return articleCard(item);
  }).join('');

  data.forEach(item => {
    document.getElementById(`detail-${item.id}`)?.addEventListener('click', () => showDetail(item.id));
    if (currentTab === 'courses') {
      document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => enrollFreeCourse(item.id));
    }
  });
}

function courseCard(course) {
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
}

function articleCard(article) {
  const excerpt = (article.content || '').substring(0, 100) + '...';
  return `
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-item">
      <div class="flex items-center gap-2 mb-2">
        <img src="${article.authorPhoto || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23e2e8f0%22/%3E%3Ctext x=%2250%22 y=%2267%22 font-size=%2260%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22%3E🦈%3C/text%3E%3C/svg%3E'}" class="w-8 h-8 rounded-full border border-gray-200 object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23e2e8f0%22/%3E%3Ctext x=%2250%22 y=%2267%22 font-size=%2260%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22%3E🦈%3C/text%3E%3C/svg%3E'">
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
}

// ========== تفاصيل ==========
function showDetail(id) {
  const data = currentTab === 'courses' ? courses.find(c => c.id === id) : articles.find(a => a.id === id);
  if (!data) return;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');

  if (currentTab === 'courses') {
    const modules = data.modules || [];
    content.innerHTML = `
      <h3 class="text-xl font-black text-gray-800 mb-2">${data.title}</h3>
      <p class="text-sm text-gray-600 mb-3">${data.desc || ''}</p>
      <div class="text-xs text-gray-400 mb-4">المدرب: ${data.instructor || 'مجهول'} • ${modules.length} أجزاء</div>
      <div class="space-y-3">
        ${modules.map((m, i) => `
          <div class="bg-gray-50 rounded-xl p-3 border">
            <h4 class="font-bold text-sm">الجزء ${i + 1}: ${m.title}</h4>
            <p class="text-xs text-gray-500 mt-1">${m.content || ''}</p>
          </div>`).join('')}
      </div>
      <button id="enrollFreeBtn" class="w-full bg-sky-500 text-white py-2 rounded-xl font-bold mt-4">انضم مجاناً</button>
    `;
    document.getElementById('enrollFreeBtn').addEventListener('click', () => enrollFreeCourse(data.id));
  } else {
    content.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <img src="${data.authorPhoto || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23e2e8f0%22/%3E%3Ctext x=%2250%22 y=%2267%22 font-size=%2260%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22%3E🦈%3C/text%3E%3C/svg%3E'}" class="w-10 h-10 rounded-full border">
        <span class="font-bold text-gray-700">${data.authorName || 'مستخدم'}</span>
      </div>
      <h3 class="text-xl font-black text-gray-800 mb-3">${data.title}</h3>
      <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${data.content}</div>
      <div class="flex flex-wrap gap-1 mt-4">
        ${(data.hashtags || []).map(t => `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">#${t}</span>`).join('')}
      </div>
    `;
  }
  modal.classList.add('active');
}

// ========== انضمام مجاني ==========
async function enrollFreeCourse(courseId) {
  if (!auth.currentUser) { alert("سجل الدخول أولاً"); return; }
  const course = courses.find(c => c.id === courseId);
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
}

// ========== دوال النشر ==========
function createHashtagSelector(containerId, selectedTags = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  allHashtags.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hashtag-select px-3 py-1 rounded-full text-xs font-bold border ${selectedTags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-100 text-gray-600 border-gray-200'}`;
    btn.textContent = '#' + tag;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      this.classList.toggle('bg-sky-500');
      this.classList.toggle('text-white');
      this.classList.toggle('border-sky-500');
      this.classList.toggle('bg-gray-100');
      this.classList.toggle('text-gray-600');
      this.classList.toggle('border-gray-200');
    });
    container.appendChild(btn);
  });
}

function getSelectedHashtags(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const selected = [];
  container.querySelectorAll('.hashtag-select.bg-sky-500').forEach(btn => selected.push(btn.dataset.tag));
  return selected;
}

window.openAddCourseModal = () => {
  document.getElementById('courseModal').classList.add('active');
  document.getElementById('courseTitle').value = '';
  document.getElementById('courseInstructor').value = '';
  document.getElementById('courseDesc').value = '';
  document.getElementById('courseModulesContainer').innerHTML = '';
  createHashtagSelector('courseHashtagSelection', []);
  addCourseModuleField();
};

window.closeModal = (id) => {
  document.getElementById(id).classList.remove('active');
};

window.addCourseModuleField = () => {
  const container = document.getElementById('courseModulesContainer');
  const div = document.createElement('div');
  div.className = 'flex gap-2 items-start';
  div.innerHTML = `
    <div class="flex-1 flex gap-2">
      <input placeholder="عنوان الجزء" class="module-title flex-1 bg-gray-100 rounded-lg p-2 text-xs border">
      <input placeholder="وصف مختصر" class="module-content flex-1 bg-gray-100 rounded-lg p-2 text-xs border">
    </div>
    <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600">✕</button>`;
  container.appendChild(div);
};

window.publishCourse = async () => {
  if (!auth.currentUser) { alert("سجل الدخول"); return; }
  const title = document.getElementById('courseTitle').value.trim();
  if (!title) { alert("العنوان مطلوب"); return; }
  const instructor = document.getElementById('courseInstructor').value.trim() || auth.currentUser.displayName || 'مجهول';
  const desc = document.getElementById('courseDesc').value.trim();
  const hashtags = getSelectedHashtags('courseHashtagSelection');
  const modules = [];
  document.querySelectorAll('#courseModulesContainer > div').forEach(row => {
    const titleEl = row.querySelector('.module-title');
    const contentEl = row.querySelector('.module-content');
    const moduleTitle = titleEl?.value.trim();
    if (moduleTitle) {
      modules.push({ title: moduleTitle, content: contentEl?.value.trim() || '' });
    }
  });

  try {
    await addDoc(collection(db, "academy_courses"), {
      title,
      instructor,
      desc,
      price: 0,
      hashtags,
      modules,
      authorId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    closeModal('courseModal');
    loadData();
  } catch (e) {
    alert('فشل النشر: ' + e.message);
  }
};

window.openAddArticleModal = () => {
  document.getElementById('articleModal').classList.add('active');
  document.getElementById('articleTitle').value = '';
  document.getElementById('articleContent').value = '';
  createHashtagSelector('articleHashtagSelection', []);
};

window.publishArticle = async () => {
  if (!auth.currentUser) { alert("سجل الدخول"); return; }
  const title = document.getElementById('articleTitle').value.trim();
  if (!title) { alert("العنوان مطلوب"); return; }
  const content = document.getElementById('articleContent').value.trim();
  const hashtags = getSelectedHashtags('articleHashtagSelection');

  try {
    const user = auth.currentUser;
    const authorName = user.displayName || 'مستخدم';
    const authorPhoto = user.photoURL || '';

    await addDoc(collection(db, "academy_articles"), {
      title,
      content,
      hashtags,
      authorId: user.uid,
      authorName,
      authorPhoto,
      createdAt: serverTimestamp()
    });
    closeModal('articleModal');
    loadData();
  } catch (e) {
    alert('فشل النشر: ' + e.message);
  }
};

// ========== التبويبات والفلترة ==========
window.switchTab = (tab) => {
  currentTab = tab;
  document.getElementById('tabCourses').classList.toggle('active', tab === 'courses');
  document.getElementById('tabArticles').classList.toggle('active', tab === 'articles');
  renderContent();
};

window.filterByHashtag = (tag) => {
  currentFilter = tag;
  document.querySelectorAll('#filterHashtags .hashtag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === tag);
    btn.classList.toggle('bg-sky-500', btn.dataset.tag === tag);
    btn.classList.toggle('text-white', btn.dataset.tag === tag);
    btn.classList.toggle('bg-gray-200', btn.dataset.tag !== tag);
    btn.classList.toggle('text-gray-700', btn.dataset.tag !== tag);
  });
  renderContent();
};

window.toggleSellerMode = () => {
  sellerMode = !sellerMode;
  document.getElementById('sellerPanel').classList.toggle('hidden', !sellerMode);
  const btn = document.getElementById('toggleSellerBtn');
  if (sellerMode) {
    btn.classList.add('bg-sky-500', 'text-white');
    btn.classList.remove('bg-gray-200', 'text-gray-600');
    btn.innerHTML = '<i class="fa-solid fa-store-alt"></i>';
  } else {
    btn.classList.remove('bg-sky-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-600');
    btn.innerHTML = '<i class="fa-solid fa-store"></i>';
  }
};

// ========== تهيئة الأحداث ==========
document.querySelectorAll('#filterHashtags .hashtag-btn').forEach(btn => {
  btn.addEventListener('click', () => filterByHashtag(btn.dataset.tag));
});

document.getElementById('courseModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal('courseModal');
});
document.getElementById('articleModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal('articleModal');
});
document.getElementById('detailModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal('detailModal');
});

// بدء التشغيل
loadData();
