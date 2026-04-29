let appData = {
    cash: 0,
    assets: [],    // { name, val, rate }
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

    // ----- تحديث الواجهة بالكامل -----
    sync() {
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        // تحديث الثروة في صفحة الأصول
        document.getElementById('totalValAssets').innerText = Math.floor(total).toLocaleString();
        document.getElementById('cashDisplay').innerText = Math.floor(appData.cash).toLocaleString() + ' ج.م';

        // كشف المراحل (نسب الإنجاز التقليدية)
        for (let pct = 10; pct <= 100; pct += 10) {
            const target = 10000 * pct; // 100,000 لكل 10%
            if (total >= target && !appData.milestonesReached.includes(pct)) {
                appData.milestonesReached.push(pct);
                this.addPost(`🎉 وصلت إلى ${pct}% من حلم المليون! استمر يا بطل.`);
            }
        }

        this.renderFeed();
        this.renderAssets();
        this.renderRoadmap(total);
        this.recalc();

        localStorage.setItem('millionaire_engine_data', JSON.stringify(appData));
    },

    // ----- التنقل بين الصفحات -----
    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        const page = document.getElementById('page-' + pageId);
        page.classList.remove('hidden');

        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + pageId).classList.add('active');
    },

    // ----- إدارة الرصيد النقدي -----
    adjustCash(sign) {
        const input = document.getElementById('cashAdjustInput');
        const amount = parseFloat(input.value);
        if (isNaN(amount)) return;

        const change = amount * sign;
        const newCash = appData.cash + change;
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

        appData.posts.unshift({
            id: Date.now(),
            content: content,
            date: new Date().toLocaleString('ar-EG', { hour12: true })
        });
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
                    <div><b>أنت</b><br><small style="color:#65676b">${p.date}</small></div>
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

    // ----- إدارة الأصول (بنسبة مخصصة) -----
    addAsset() {
        const name = document.getElementById('aName').value.trim();
        const val = parseFloat(document.getElementById('aVal').value);
        const rate = parseFloat(document.getElementById('aRate').value);
        if (!name || isNaN(val) || isNaN(rate)) return;
        appData.assets.push({ name, val, rate });
        document.getElementById('aName').value = '';
        document.getElementById('aVal').value = '';
        document.getElementById('aRate').value = '20';
        this.addPost(`📈 أصل جديد: ${name} بقيمة ${val.toLocaleString()} ج.م (عائد ${rate}%)`);
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

    // ----- الخريطة (شكل سنيك باث 10×10) -----
    renderRoadmap(total) {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        const stages = 100;
        const start = 500;
        const end = 1000000;
        const step = (end - start) / (stages - 1);

        let html = '';
        for (let row = 0; row < 10; row++) {
            html += '<div class="board-row">';
            const cells = [];
            for (let col = 0; col < 10; col++) {
                const stageIndex = row % 2 === 0 ? row * 10 + col : row * 10 + (9 - col);
                const targetAmount = Math.round(start + step * stageIndex);
                const completed = total >= targetAmount;
                cells.push(`
                    <div class="board-cell ${completed ? 'completed' : ''}">
                        <span class="stage-num">${stageIndex + 1}</span>
                        <span class="stage-amount">${targetAmount.toLocaleString()}</span>
                    </div>
                `);
            }
            html += cells.join('') + '</div>';
        }
        board.innerHTML = html;
    },

    // ----- الحاسبة (تعتمد على الأصول الفعلية) -----
    recalc() {
        const monthlyInput = document.getElementById('calcMonthly');
        const monthly = monthlyInput ? parseFloat(monthlyInput.value) || 1000 : 1000;

        let cash = appData.cash;
        let assets = appData.assets.map(a => ({ ...a }));
        let months = 0;

        while (months < 600) {
            // العائد الشهري لكل أصل
            assets.forEach(a => {
                a.val *= (1 + a.rate / 100 / 12);
            });
            // إضافة الادخار الشهري إلى النقد
            cash += monthly;
            const total = cash + assets.reduce((s, a) => s + a.val, 0);
            months++;
            if (total >= 1000000) break;
        }

        const years = Math.floor(months / 12);
        const remainMonths = months % 12;
        const res = document.getElementById('calcRes');
        if (res) {
            if (months >= 600) res.innerText = 'قد تحتاج أكثر من 50 سنة للوصول للمليون';
            else res.innerText = `تحقيق المليون خلال: ${years} سنة و ${remainMonths} شهر`;
        }
    },

    // ----- المستشار الذكي (شاشة كاملة) -----
    sendPredefined(msg) {
        document.getElementById('chatInput').value = msg;
        this.sendMessage();
    },

    sendMessage() {
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        if (!msg) return;

        this.addChatMessage(msg, 'user');
        input.value = '';

        setTimeout(() => {
            const reply = this.generateReply(msg);
            this.addChatMessage(reply, 'ai');
        }, 800);
    },

    generateReply(userMsg) {
        const msg = userMsg.toLowerCase();
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        const assetList = appData.assets.map(a => `${a.name} (${a.val.toLocaleString()} ج.م, عائد ${a.rate}%)`).join('، ') || 'لا توجد أصول';

        // حساب المدة المتبقية للمليون
        let cash = appData.cash;
        let assets = appData.assets.map(a => ({ ...a }));
        let months = 0;
        while (months < 600) {
            assets.forEach(a => a.val *= (1 + a.rate / 100 / 12));
            cash += parseFloat(document.getElementById('calcMonthly')?.value) || 1000;
            if (cash + assets.reduce((s, a) => s + a.val, 0) >= 1000000) break;
            months++;
        }
        const years = Math.floor(months / 12);
        const remainMonths = months % 12;

        if (msg.includes('كم') && (msg.includes('ثروت') || msg.includes('فلوس') || msg.includes('رصيد'))) {
            return `إجمالي ثروتك حالياً ${Math.floor(total).toLocaleString()} ج.م، منها نقد ${Math.floor(appData.cash).toLocaleString()} وأصول ${Math.floor(assetsTotal).toLocaleString()}.`;
        }
        if (msg.includes('أصول') || msg.includes('محفظة')) {
            return appData.assets.length ? `أصولك الحالية: ${assetList}.` : 'ليس لديك أي أصول حالياً.';
        }
        if (msg.includes('متى') || msg.includes('متي') || msg.includes('زمن') || msg.includes('مليونير') || msg.includes('المليون')) {
            if (total >= 1000000) return 'أنت فعلاً مليونير! حافظ على ثروتك واستثمرها.';
            return `بمعدل ادخارك الشهري وعوائد أصولك الحالية، ستحتاج حوالي ${years} سنة و ${remainMonths} شهر للوصول للمليون.`;
        }
        if (msg.includes('نصيحة') || msg.includes('استثمار')) {
            return 'نصيحتي الذهبية: نوع أصولك بين أسهم وعقارات وذهب، ولا تضع كل البيض في سلة واحدة. تابع السوق باستمرار.';
        }
        if (msg.includes('مخاطر') || msg.includes('خسارة')) {
            return 'لتقليل المخاطر: خصص 40% لأصول آمنة (ودائع)، 40% متوسطة (صناديق)، 20% عالية المخاطر (أسهم).';
        }
        if (msg.includes('شكر')) return 'العفو يا غالي، دايمًا في خدمتك.';
        if (msg.includes('سلام') || msg.includes('باي')) return 'مع السلامة! حافظ على خطتك.';

        const generic = [
            'فكرة جيدة! دعنا نتعمق في التفاصيل.',
            `لديك حالياً ${Math.floor(total).toLocaleString()} ج.م، ومتوقع أن تصبح مليونيراً في ${years} سنوات لو حافظت على نفس الوتيرة.`,
            'أقترح زيادة ادخارك الشهري لو أمكن لتسريع الهدف.',
            'هل تريد أن نخطط لتنويع محفظتك؟'
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
