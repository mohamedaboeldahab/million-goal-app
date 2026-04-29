let appData = {
    cash: 7613,
    assets: [],
    monthly: 1000,
    rate: 18,
    posts: [],           // منشورات الأعمال
    milestonesReached: [] // النسب المئوية اللي تم تحقيقها
};

const engine = {
    init() {
        const saved = localStorage.getItem('millionaire_engine_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
        }
        // تأكد من وجود المصفوفات
        if (!appData.posts) appData.posts = [];
        if (!appData.milestonesReached) appData.milestonesReached = [];
        this.sync();
        this.nav('home');
    },

    sync() {
        // حساب الإجمالي
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        // تحديث واجهة الثروة
        if (document.getElementById('totalVal'))
            document.getElementById('totalVal').innerText = Math.floor(total).toLocaleString();

        // كشف المراحل الجديدة (كل 10%)
        for (let pct = 10; pct <= 100; pct += 10) {
            const target = 10000 * pct; // 10% = 100,000
            if (total >= target && !appData.milestonesReached.includes(pct)) {
                appData.milestonesReached.push(pct);
                this.addPost(`🎉 وصلت إلى ${pct}% من حلم المليون! استمر يا بطل.`);
            }
        }

        this.renderFeed();
        this.renderAssets();
        this.renderRoadmap(total);
        this.calculate();

        // حفظ البيانات
        localStorage.setItem('millionaire_engine_data', JSON.stringify(appData));
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');

        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + pageId).classList.add('active');
    },

    // ----- المنشورات (Business Feed) -----
    addPost(text = null) {
        const input = document.getElementById('postInput');
        const content = text || (input ? input.value.trim() : '');
        if (!content) return;

        const post = {
            id: Date.now(),
            content: content,
            date: new Date().toLocaleString('ar-EG', { hour12: true })
        };
        appData.posts.unshift(post); // الأحدث في الأعلى
        if (input) input.value = '';
        this.sync();
    },

    renderFeed() {
        const container = document.getElementById('feedList');
        if (!container) return;

        if (appData.posts.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center; color:#65676b">
                    لا توجد تحديثات بعد. ابدأ بنشر أول فرصة!
                </div>`;
            return;
        }

        container.innerHTML = appData.posts.map(p => `
            <div class="post-card">
                <div class="post-header">
                    <i class="fa-solid fa-circle-user" style="font-size:40px; color:#0ea5e9"></i>
                    <div>
                        <b style="font-size:14px">أنت</b>
                        <br><small style="color:#65676b">${p.date}</small>
                    </div>
                </div>
                <div class="post-body">${p.content}</div>
                <div class="post-actions">
                    <button class="action-btn"><i class="fa-regular fa-thumbs-up"></i> أعجبني</button>
                    <button class="action-btn"><i class="fa-regular fa-comment"></i> تعليق</button>
                    <button class="action-btn"><i class="fa-regular fa-share-from-square"></i> مشاركة</button>
                </div>
            </div>
        `).join('');
    },

    // ----- إدارة الأصول -----
    addAsset(name, val, rate) {
        if (!name || !val) return;
        appData.assets.push({ name, val: parseFloat(val), rate: parseFloat(rate) });
        // منشور تلقائي
        this.addPost(`📈 أصل جديد: ${name} بقيمة ${parseFloat(val).toLocaleString()} ج.م (عائد ${rate}%)`);
        this.sync();
    },

    renderAssets() {
        const container = document.getElementById('assetsList');
        if (!container) return;
        container.innerHTML = appData.assets.map((a, i) => `
            <div class="card" style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div><b style="font-size:14px">${a.name}</b><br><small>${a.rate}% سنوي</small></div>
                <div style="text-align:left">
                    <b class="text-brand">${a.val.toLocaleString()}</b><br>
                    <button onclick="engine.deleteAsset(${i})" style="color:red; font-size:10px">حذف</button>
                </div>
            </div>
        `).join('');
    },

    deleteAsset(i) {
        appData.assets.splice(i, 1);
        this.sync();
    },

    // ----- الخريطة -----
    renderRoadmap(total) {
        const container = document.getElementById('roadmapList');
        if (!container) return;
        let html = '';
        const step = 100000; // كل 100 ألف
        for (let target = step; target <= 1000000; target += step) {
            const pct = Math.round((target / 1000000) * 100);
            if (total >= target - 50000) { // عرض إذا قريب
                html += `
                <div class="step-item ${total >= target ? 'completed' : ''}">
                    <div class="step-circle"></div>
                    <div class="card" style="flex:1; margin-bottom:0; padding:10px">
                        <b>${pct}%</b> - ${target.toLocaleString()} ج.م
                    </div>
                </div>`;
            }
        }
        container.innerHTML = html;
    },

    // ----- الحاسبة -----
    calculate() {
        let temp = appData.cash + appData.assets.reduce((s, a) => s + a.val, 0);
        let months = 0;
        const monthlyRate = (appData.rate / 100) / 12;

        while (temp < 1000000 && months < 600) {
            temp = (temp + appData.monthly) * (1 + monthlyRate);
            months++;
        }
        const res = document.getElementById('calcRes');
        if (res) res.innerText = `تحقيق المليون خلال: ${Math.floor(months/12)} سنة و ${months%12} شهر`;
    }
};

window.onload = () => engine.init();
