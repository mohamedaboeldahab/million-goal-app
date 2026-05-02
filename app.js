<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>أكاديمية Shark UP</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { font-family: 'Tajawal', sans-serif; background: #f0f2f5; margin: 0; }
    .tab-btn.active { background: #0ea5e9; color: white; }
    .course-card { transition: all 0.2s ease; }
    .course-card:active { transform: scale(0.98); }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .hashtag-btn { transition: all 0.2s; }
    .hashtag-btn.active { background: #0ea5e9; color: white; }
  </style>
</head>
<body class="bg-gray-50 h-full overflow-y-auto">
  
  <div id="academy-app" class="max-w-2xl mx-auto px-4 pt-6 pb-20 space-y-6">
    <!-- رأس الصفحة -->
    <div class="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
      <h2 class="text-2xl font-black mb-2">📚 أكاديمية Shark UP</h2>
      <p class="opacity-90 text-sm">دورات احترافية في المال، الأعمال، والتسويق – انشر كورسك أو اشترِ المعرفة</p>
      <div class="mt-3 text-xs bg-white/20 rounded-full px-3 py-1 inline-block" id="courseCount">تحميل...</div>
    </div>

    <!-- شريط الهاشتاجات -->
    <div class="flex flex-wrap gap-2" id="hashtagFilters">
      <button data-tag="all" class="hashtag-btn bg-sky-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow active">الكل</button>
      <button data-tag="بيزنس" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#بيزنس</button>
      <button data-tag="استثمار" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#استثمار</button>
      <button data-tag="مشاريع" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#مشاريع</button>
      <button data-tag="تسويق" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#تسويق</button>
      <button data-tag="عملات_رقمية" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#عملات_رقمية</button>
      <button data-tag="ريادة_أعمال" class="hashtag-btn bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold">#ريادة_أعمال</button>
    </div>

    <!-- زر إضافة كورس (للبائعين) -->
    <div id="sellerPanel" class="hidden">
      <button onclick="window.academy.openAddModal()" class="w-full bg-sky-500 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-sky-600 transition flex items-center justify-center gap-2">
        <i class="fa-solid fa-plus-circle"></i> إضافة كورس جديد
      </button>
    </div>

    <!-- حاوية الكورسات -->
    <div id="coursesGrid" class="grid gap-4"></div>

    <!-- أيقونة وضع البائع (أسفل اليمين) -->
    <button id="toggleSellerBtn" onclick="window.academy.toggleSeller()" class="fixed bottom-24 right-4 z-30 w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-600 text-xl shadow-lg hover:bg-gray-300 transition" title="وضع البائع">
      <i class="fa-solid fa-store"></i>
    </button>
  </div>

  <!-- مودال إضافة كورس (يتضمن إضافة أجزاء) -->
  <div id="addCourseModal" class="modal">
    <div class="bg-white w-full max-w-md rounded-3xl p-6 mx-4 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
      <h3 class="text-xl font-black text-gray-800">🎥 أضف كورسك للبيع</h3>
      <input id="courseTitle" class="w-full bg-gray-100 rounded-xl p-3 text-sm border" placeholder="عنوان الكورس">
      <input id="courseInstructor" class="w-full bg-gray-100 rounded-xl p-3 text-sm border" placeholder="اسم المدرّب">
      <textarea id="courseDesc" rows="2" class="w-full bg-gray-100 rounded-xl p-3 text-sm border" placeholder="وصف مختصر"></textarea>
      <input id="coursePrice" type="number" class="w-full bg-gray-100 rounded-xl p-3 text-sm border" placeholder="السعر (0 للمجاني)" min="0" step="0.01" value="0">
      <input id="courseHashtags" class="w-full bg-gray-100 rounded-xl p-3 text-sm border" placeholder="هاشتاجات (مثال: بيزنس,تسويق)">
      
      <!-- قسم الأجزاء -->
      <div class="border-t pt-3">
        <h4 class="font-bold text-gray-700 mb-2">📖 أجزاء الكورس</h4>
        <div id="modulesContainer" class="space-y-2"></div>
        <button onclick="window.academy.addModuleField()" class="text-sky-500 text-sm font-bold mt-2"><i class="fa-solid fa-plus"></i> إضافة جزء</button>
      </div>

      <div class="flex gap-2 justify-end">
        <button onclick="window.academy.closeAddModal()" class="px-5 py-2 bg-gray-200 rounded-xl font-semibold">إلغاء</button>
        <button id="publishCourseBtn" onclick="window.academy.publishCourse()" class="px-5 py-2 bg-sky-500 text-white rounded-xl font-semibold shadow">نشر الكورس</button>
      </div>
    </div>
  </div>

  <!-- مودال عرض تفاصيل الكورس والأجزاء -->
  <div id="courseDetailModal" class="modal">
    <div class="bg-white w-full max-w-md rounded-3xl p-6 mx-4 shadow-2xl max-h-[80vh] overflow-y-auto space-y-4">
      <div id="courseDetailContent"></div>
      <button onclick="document.getElementById('courseDetailModal').classList.remove('active')" class="w-full bg-gray-200 py-2 rounded-xl font-bold mt-3">إغلاق</button>
    </div>
  </div>

  <script type="module">
    // ========== إعداد Firebase (يستخدم نفس config التطبيق) ==========
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
    import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
    import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyB_2ms4K8EPbag7uab9gbDy8eePY6xwpxc",
      authDomain: "millionaireapp-be931.firebaseapp.com",
      projectId: "millionaireapp-be931",
      storageBucket: "millionaireapp-be931.firebasestorage.app",
      messagingSenderId: "325577904362",
      appId: "1:325577904362:web:8d85d4547bf22b1d8f4793"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    // اجعلها متاحة عالمياً لبقية الأكواد
    window.db = db;
    window.auth = auth;

    // ========== إدارة الأكاديمية ==========
    const academy = {
      courses: [],
      currentFilter: 'all',
      sellerMode: false,
      courseCollection: 'academy_courses',
      purchasesCollection: 'academy_purchases',

      async init() {
        await this.loadCourses();
        this.renderHashtagButtons();
        this.toggleSellerUI(false);
        document.getElementById('toggleSellerBtn').addEventListener('click', () => this.toggleSeller());
        document.getElementById('addCourseModal').addEventListener('click', (e) => {
          if (e.target === document.getElementById('addCourseModal')) this.closeAddModal();
        });
        document.getElementById('courseDetailModal').addEventListener('click', (e) => {
          if (e.target === document.getElementById('courseDetailModal')) document.getElementById('courseDetailModal').classList.remove('active');
        });
        this.addModuleField(); // حقل جزء واحد افتراضي
      },

      async loadCourses() {
        try {
          const q = query(collection(db, this.courseCollection), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          this.courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          this.renderCourses();
          document.getElementById('courseCount').textContent = `${this.courses.length} كورس`;
        } catch (e) {
          document.getElementById('courseCount').textContent = 'خطأ في التحميل';
          console.error(e);
        }
      },

      renderCourses() {
        const grid = document.getElementById('coursesGrid');
        if (!grid) return;
        let filtered = this.courses;
        if (this.currentFilter !== 'all') {
          filtered = this.courses.filter(c => c.hashtags && c.hashtags.some(t => t.toLowerCase().includes(this.currentFilter.toLowerCase())));
        }
        if (filtered.length === 0) {
          grid.innerHTML = '<div class="text-center text-gray-400 py-10"><i class="fa-solid fa-book-open text-4xl mb-2"></i><p>لا توجد كورسات هنا</p></div>';
          return;
        }
        grid.innerHTML = filtered.map(course => this.courseCard(course)).join('');
        
        // إضافة مستمعين لأزرار الشراء والتفاصيل
        filtered.forEach(course => {
          const buyBtn = document.getElementById(`buy-${course.id}`);
          if (buyBtn) buyBtn.addEventListener('click', () => this.buyCourse(course.id));
          const detailBtn = document.getElementById(`detail-${course.id}`);
          if (detailBtn) detailBtn.addEventListener('click', () => this.showCourseDetail(course.id));
        });
      },

      courseCard(course) {
        const modulesCount = (course.modules || []).length;
        return `
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition course-card">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-gray-800">${course.title}</h3>
              <span class="text-sm font-bold text-sky-600">${course.price > 0 ? '$' + course.price : 'مجاني'}</span>
            </div>
            <p class="text-xs text-gray-500 line-clamp-2 mb-2">${course.desc || ''}</p>
            <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <i class="fa-solid fa-user"></i> ${course.instructor || 'مجهول'}
              <span class="mx-1">•</span>
              <i class="fa-solid fa-layer-group"></i> ${modulesCount} أجزاء
            </div>
            <div class="flex flex-wrap gap-1 mb-3">
              ${(course.hashtags || []).map(t => `<span class="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full text-xs font-bold">#${t}</span>`).join('')}
            </div>
            <div class="flex gap-2">
              <button id="buy-${course.id}" class="flex-1 bg-sky-500 text-white py-2 rounded-xl text-sm font-bold shadow hover:bg-sky-600 transition">شراء</button>
              <button id="detail-${course.id}" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>`;
      },

      async buyCourse(courseId) {
        if (!auth.currentUser) { alert('يجب تسجيل الدخول أولاً'); return; }
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        if (course.price > 0) {
          if (!confirm(`تأكيد شراء "${course.title}" بسعر $${course.price}؟`)) return;
        }
        // محاكاة الدفع – في الواقع ستضيف بوابة دفع
        const purchaseRef = collection(db, this.purchasesCollection);
        await addDoc(purchaseRef, {
          userId: auth.currentUser.uid,
          courseId: course.id,
          courseTitle: course.title,
          purchasedAt: new Date(),
          price: course.price
        });
        alert(`تم شراء "${course.title}" بنجاح ✅`);
        // يمكن الانتقال إلى محتوى الكورس
      },

      showCourseDetail(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        const modal = document.getElementById('courseDetailModal');
        const content = document.getElementById('courseDetailContent');
        const modules = course.modules || [];
        content.innerHTML = `
          <h3 class="text-xl font-black text-gray-800 mb-2">${course.title}</h3>
          <p class="text-sm text-gray-600 mb-3">${course.desc || ''}</p>
          <div class="text-xs text-gray-400 mb-4">المدرب: ${course.instructor || 'مجهول'} • ${modules.length} أجزاء • السعر: ${course.price > 0 ? '$' + course.price : 'مجاني'}</div>
          <div class="space-y-3">
            ${modules.map((m, i) => `
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <h4 class="font-bold text-sm text-gray-700">الجزء ${i+1}: ${m.title}</h4>
                <p class="text-xs text-gray-500 mt-1">${m.content || 'لا يوجد وصف'}</p>
              </div>`).join('')}
          </div>
          <button onclick="window.academy.buyCourse('${course.id}')" class="w-full bg-sky-500 text-white py-2 rounded-xl font-bold mt-4 shadow hover:bg-sky-600 transition">${course.price > 0 ? 'شراء الكورس' : 'الانضمام مجاناً'}</button>
        `;
        modal.classList.add('active');
      },

      // ========== إدارة إضافة الكورسات ==========
      openAddModal() {
        document.getElementById('addCourseModal').classList.add('active');
        // إعادة ضبط الحقول
        ['courseTitle','courseInstructor','courseDesc','coursePrice','courseHashtags'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('modulesContainer').innerHTML = '';
        this.addModuleField();
      },
      closeAddModal() {
        document.getElementById('addCourseModal').classList.remove('active');
      },

      addModuleField() {
        const container = document.getElementById('modulesContainer');
        const index = container.children.length;
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-start';
        div.innerHTML = `
          <div class="flex-1 flex gap-2">
            <input placeholder="عنوان الجزء" class="module-title flex-1 bg-gray-100 rounded-lg p-2 text-xs border" data-index="${index}">
            <input placeholder="وصف مختصر" class="module-content flex-1 bg-gray-100 rounded-lg p-2 text-xs border" data-index="${index}">
          </div>
          <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-lg"><i class="fa-solid fa-times"></i></button>
        `;
        container.appendChild(div);
      },

      async publishCourse() {
        if (!auth.currentUser) { alert('يجب تسجيل الدخول'); return; }
        const title = document.getElementById('courseTitle').value.trim();
        if (!title) { alert('العنوان مطلوب'); return; }
        const instructor = document.getElementById('courseInstructor').value.trim() || auth.currentUser.displayName || 'مجهول';
        const desc = document.getElementById('courseDesc').value.trim();
        const price = parseFloat(document.getElementById('coursePrice').value) || 0;
        const hashtagsRaw = document.getElementById('courseHashtags').value;
        const hashtags = hashtagsRaw ? hashtagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

        // جمع الأجزاء
        const modules = [];
        document.querySelectorAll('#modulesContainer .flex').forEach(row => {
          const titleEl = row.querySelector('.module-title');
          const contentEl = row.querySelector('.module-content');
          if (titleEl && titleEl.value.trim()) {
            modules.push({
              title: titleEl.value.trim(),
              content: contentEl ? contentEl.value.trim() : ''
            });
          }
        });

        try {
          await addDoc(collection(db, this.courseCollection), {
            title,
            instructor,
            desc,
            price,
            hashtags,
            modules,
            authorId: auth.currentUser.uid,
            createdAt: new Date()
          });
          this.closeAddModal();
          await this.loadCourses();
          alert('تم نشر الكورس بنجاح 🎉');
        } catch (e) {
          alert('فشل النشر: ' + e.message);
        }
      },

      // ========== وضع البائع ==========
      toggleSeller() {
        this.sellerMode = !this.sellerMode;
        this.toggleSellerUI(this.sellerMode);
      },
      toggleSellerUI(show) {
        const panel = document.getElementById('sellerPanel');
        const btn = document.getElementById('toggleSellerBtn');
        if (show) {
          panel.classList.remove('hidden');
          btn.classList.add('bg-sky-500','text-white');
          btn.classList.remove('bg-gray-200','text-gray-600');
          btn.innerHTML = '<i class="fa-solid fa-store-alt"></i>';
        } else {
          panel.classList.add('hidden');
          btn.classList.remove('bg-sky-500','text-white');
          btn.classList.add('bg-gray-200','text-gray-600');
          btn.innerHTML = '<i class="fa-solid fa-store"></i>';
        }
      },

      // ========== فلترة الهاشتاجات ==========
      renderHashtagButtons() {
        const buttons = document.querySelectorAll('.hashtag-btn');
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            this.currentFilter = btn.dataset.tag;
            buttons.forEach(b => b.classList.remove('active', 'bg-sky-500', 'text-white'));
            buttons.forEach(b => b.classList.add('bg-gray-200', 'text-gray-700'));
            btn.classList.add('active', 'bg-sky-500', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            this.renderCourses();
          });
        });
      }
    };

    // ========== بدء التشغيل ==========
    window.academy = academy;
    academy.init();
  </script>
</body>
</html>
