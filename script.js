let appData = {
    cash: 0,            // بدأنا من صفر
    assets: [],
    monthly: 1000,
    rate: 18,
    posts: [],
    milestonesReached: []
};

const engine = {
    init() {
        const saved = localStorage.getItem('millionaire_engine_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
        }
        if (!appData.posts) appData.posts = [];
        if (!appData.milestonesReached) appData.milestonesReached = [];
        this.sync();
        this.nav('home');
    },

    sync() {
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        // تحديث واجهة الثروة في صفحة الأصول
        const totalEl = document.getElementById('totalValAssets');
        if (totalEl) totalEl.innerText = Math.floor(total).toLocaleString();

        const cashEl = document.getElementById('cashDisplay');
        if (cashEl) cashEl.innerText = Math.floor(appData.cash).toLocaleString() + ' ج.م';

        // كشف المراحل (نسب الإنجاز التقليدية)
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

        localStorage.setItem('millionaire_engine_data', JSON.stringify(appData));
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');

        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + pageId).classList.add('active');
    },

    // ----- تعديل الرصيد النقدي -----
    adjustCash() {
        const input = document.getElementById('cashAdjustInput');
        const amount = parseFloat(input.value);
        if (isNaN(amount)) return;
        const newCash = appData.cash + amount;
        if (newCash < 0) {
            alert('الرصيد لا يمكن أن يكون سالباً');
            return;
        }
        appData.cash = newCash;
        input.value = '';
        this.sync();
    },

    // ----- المنشورات -----
    addPost(text = null) {
        const input = document.getElementById('postInput');
        const content = text || (input ? input.value.trim() : '');
        if (!content) return;

        const post = {
            id: Date.now(),
            content: content,
            date: new Date().toLocaleString('ar-EG', { hour12: true })
        };
        appData.posts.unshift(post);
        if (input) input.value = '';
        this.sync();
    },

    renderFeed() {
        const container = document.getElementById('feedList');
        if (!container) return;

        if (appData.posts.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center; color:#65676b">لا توجد تحديثات بعد. ابدأ بنشر أول فرصة!</div>`;
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

    // ----- الخريطة: 100 مرحلة من 500 إلى 1,000,000 -----
    renderRoadmap(total) {
        const container = document.getElementById('roadmapList');
        if (!container) return;

        const stages = 100;
        const start = 500;
        const end = 1000000;
        const step = (end - start) / (stages - 1);

        let html = '';
        for (let i = 0; i < stages; i++) {
            const target = Math.round(start + i * step);
            const pct = ((i + 1) / stages * 100).toFixed(0);
            html += `
                <div class="step-item ${total >= target ? 'completed' : ''}">
                    <div class="step-circle"></div>
                    <div class="card" style="flex:1; margin-bottom:0; padding:8px">
                        <b>مرحلة ${i + 1} (${pct}%)</b> - ${target.toLocaleString()} ج.م
                    </div>
                </div>`;
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
    },

    // ----- المستشار الذكي -----
    sendMessage() {
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        if (!msg) return;

        this.addChatMessage(msg, 'user');
        input.value = '';

        // رد ذكي بعد تفكير
        setTimeout(() => {
            const reply = this.generateReply(msg);
            this.addChatMessage(reply, 'ai');
        }, 800);
    },

    generateReply(userMsg) {
        const msg = userMsg.toLowerCase();
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        // تفاصيل الأصول
        const assetList = appData.assets.map(a => `${a.name} (${a.val.toLocaleString()} ج.م)`).join('، ') || 'لا توجد أصول';

        // حساب المدة للمليون
        let temp = total;
        let months = 0;
        const monthlyRate = (appData.rate / 100) / 12;
        while (temp < 1000000 && months < 600) {
            temp = (temp + appData.monthly) * (1 + monthlyRate);
            months++;
        }
        const years = Math.floor(months / 12);
        const remainMonths = months % 12;

        // الردود الذكية
        if (msg.includes('كم') && (msg.includes('ثروت') || msg.includes('فلوس') || msg.includes('رصيد'))) {
            return `إجمالي ثروتك حالياً ${Math.floor(total).toLocaleString()} ج.م، منها نقد ${Math.floor(appData.cash).toLocaleString()} وأصول ${Math.floor(assetsTotal).toLocaleString()}.`;
        }
        if (msg.includes('أصول') || msg.includes('محفظة')) {
            if (appData.assets.length === 0) return 'ليس لديك أي أصول حالياً. أضف بعض الأصول من صفحة الأصول.';
            return `أصولك الحالية: ${assetList}.`;
        }
        if (msg.includes('متى') || msg.includes('متي') || msg.includes('زمن') || msg.includes('مليون')) {
            if (total >= 1000000) return 'أنت فعلاً مليونير! استثمر ثروتك بحكمة.';
            return `بمعدل ادخار ${appData.monthly} ج.م شهرياً وعائد سنوي ${appData.rate}%، ستحتاج حوالي ${years} سنة و ${remainMonths} شهر للوصول للمليون.`;
        }
        if (msg.includes('نصيحة') || msg.includes('أفضل') || msg.includes('استثمار')) {
            return 'نصيحتي: نوع استثماراتك بين أسهم وعقارات وذهب. لا تضع كل البيض في سلة واحدة. وراقب السوق باستمرار.';
        }
        if (msg.includes('مخاطر') || msg.includes('خسارة')) {
            return 'لتقليل المخاطر، اجعل جزءاً كبيراً في أصول آمنة مثل الودائع البنكية، والباقي موزع على استثمارات مختلفة.';
        }
        if (msg.includes('شكراً') || msg.includes('شكرا') || msg.includes('thanks')) {
            return 'العفو يا غالي، أنا دايمًا في خدمتك. اسألني في أي وقت.';
        }
        if (msg.includes('سلام') || msg.includes('باي') || msg.includes('مع السلامة')) {
            return 'مع السلامة! حافظ على خطتك واستثمر بحكمة.';
        }

        // رد عام
        const generic = [
            'فكرة جيدة! دعنا نتعمق في التفاصيل.',
            'حالياً السوق يظهر فرصاً، خاصة في الأصول ذات العائد المرتفع.',
            'أرى أنك تسير على الطريق الصحيح. استمر!',
            'أقترح أن تزيد ادخارك الشهري لو أمكن.',
            'هل تريد أن نخطط لتنويع محفظتك؟',
            `لديك حالياً ${Math.floor(total).toLocaleString()} ج.م، ومتوقع أن تصبح مليونيراً في ${years} سنوات لو حافظت على نفس الوتيرة.`,
        ];
        return generic[Math.floor(Math.random() * generic.length)];
    },

    addChatMessage(text, sender) {
        const box = document.getElementById('chatBox');
        if (!box) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${sender}`;
        msgDiv.innerText = text;
        box.appendChild(msgDiv);
        box.scrollTop = box.scrollHeight;
    }
};

window.onload = () => engine.init();
