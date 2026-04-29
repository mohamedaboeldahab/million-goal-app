// ========== البيانات الأساسية ==========
let appData = {
    cash: 0,
    assets: [],
    posts: [],
    milestonesReached: [],
    transactions: []  // { type: 'income'/'expense', amount, desc, date }
};

const engine = {
    init() {
        const saved = localStorage.getItem('millionaire_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
        }
        if (!appData.posts) appData.posts = [];
        if (!appData.milestonesReached) appData.milestonesReached = [];
        if (!appData.transactions) appData.transactions = [];
        this.sync();
        this.nav('home');
    },

    sync() {
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;

        document.getElementById('totalValAssets').innerText = Math.floor(total).toLocaleString();
        document.getElementById('cashDisplay').innerText = Math.floor(appData.cash).toLocaleString() + ' ج.م';

        for (let pct = 10; pct <= 100; pct += 10) {
            const target = 10000 * pct;
            if (total >= target && !appData.milestonesReached.includes(pct)) {
                appData.milestonesReached.push(pct);
                this.addPost(`🎉 وصلت إلى ${pct}% من حلم المليون!`);
            }
        }

        this.renderFeed();
        this.renderAssets();
        this.renderRoadmap(total);
        this.recalc();

        localStorage.setItem('millionaire_data', JSON.stringify(appData));
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');

        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.remove('text-[#0ea5e9]');
            t.classList.add('text-gray-500');
        });
        document.getElementById('tab-' + pageId).classList.remove('text-gray-500');
        document.getElementById('tab-' + pageId).classList.add('text-[#0ea5e9]');
    },

    // ------ المعاملات النقدية ------
    adjustCash() {
        const amount = parseFloat(document.getElementById('cashAmount').value);
        const type = document.getElementById('cashType').value;
        const desc = document.getElementById('cashDesc').value.trim() || 'معاملة';

        if (isNaN(amount)) return;

        if (type === 'expense' && appData.cash - amount < 0) {
            alert('الرصيد لا يكفي');
            return;
        }

        appData.cash += (type === 'income' ? amount : -amount);
        appData.transactions.push({
            type,
            amount,
            desc,
            date: new Date().toLocaleString('ar-EG')
        });

        document.getElementById('cashAmount').value = '';
        document.getElementById('cashDesc').value = '';
        this.sync();
    },

    // ------ المنشورات ------
    addPost(text = null) {
        const input = document.getElementById('postInput');
        const content = text || (input?.value.trim());
        if (!content) return;
        appData.posts.unshift({ id: Date.now(), content, date: new Date().toLocaleString('ar-EG') });
        if (input) input.value = '';
        this.sync();
    },
    renderFeed() {
        const c = document.getElementById('feedList');
        if (!c) return;
        c.innerHTML = appData.posts.length === 0
            ? '<div class="bg-white rounded-lg shadow p-4 text-center text-gray-400">لا توجد تحديثات</div>'
            : appData.posts.map(p => `
                <div class="bg-white rounded-lg shadow mb-3 overflow-hidden">
                    <div class="flex items-center gap-2 p-3">
                        <i class="fa-solid fa-circle-user text-3xl text-[#0ea5e9]"></i>
                        <div><b>أنت</b><br><small class="text-gray-400">${p.date}</small></div>
                    </div>
                    <div class="px-4 pb-3">${p.content}</div>
                    <div class="flex justify-around border-t py-2 text-gray-500">
                        <button class="flex items-center gap-1 text-sm font-bold"><i class="fa-regular fa-thumbs-up"></i> أعجبني</button>
                        <button class="flex items-center gap-1 text-sm font-bold"><i class="fa-regular fa-comment"></i> تعليق</button>
                        <button class="flex items-center gap-1 text-sm font-bold"><i class="fa-regular fa-share-from-square"></i> مشاركة</button>
                    </div>
                </div>
            `).join('');
    },

    // ------ الأصول ------
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
        const c = document.getElementById('assetsList');
        if (!c) return;
        c.innerHTML = appData.assets.map((a, i) => `
            <div class="bg-white rounded-lg shadow p-3 flex justify-between items-center mb-2">
                <div><b>${a.name}</b><br><small class="text-gray-400">${a.rate}% سنوي</small></div>
                <div class="text-left">
                    <b class="text-[#0ea5e9]">${a.val.toLocaleString()}</b><br>
                    <button onclick="engine.deleteAsset(${i})" class="text-red-500 text-xs">حذف</button>
                </div>
            </div>
        `).join('');
    },
    deleteAsset(i) { appData.assets.splice(i, 1); this.sync(); },

    // ------ الخريطة (لوحة 10×10) ------
    renderRoadmap(total) {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        const stages = 100, start = 500, end = 1_000_000;
        const step = (end - start) / (stages - 1);
        let html = '';
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const idx = (row % 2 === 0) ? row * 10 + col : row * 10 + (9 - col);
                const amount = Math.round(start + step * idx);
                const comp = total >= amount ? 'completed' : '';
                html += `<div class="cell ${comp}">
                    <span>${idx+1}</span><span class="amount">${amount.toLocaleString()}</span>
                </div>`;
            }
        }
        board.innerHTML = html;
    },

    // ------ الحاسبة ------
    recalc() {
        const monthly = parseFloat(document.getElementById('calcMonthly')?.value) || 1000;
        let cash = appData.cash;
        let assets = appData.assets.map(a => ({ ...a }));
        let months = 0;
        while (months < 600) {
            assets.forEach(a => a.val *= (1 + a.rate / 100 / 12));
            cash += monthly;
            if (cash + assets.reduce((s, a) => s + a.val, 0) >= 1_000_000) break;
            months++;
        }
        const y = Math.floor(months / 12), m = months % 12;
        document.getElementById('calcRes').innerText = months >= 600
            ? 'أكثر من 50 سنة' : `تحقيق المليون خلال: ${y} سنة و ${m} شهر`;
    },

    // ------ المستشار الذكي + تحليل النفقات ------
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
        const total = appData.cash + appData.assets.reduce((s, a) => s + a.val, 0);

        // تحليل النفقات
        if (msg.includes('نمط') || msg.includes('نفقات') || msg.includes('إنفاق')) {
            const expenses = appData.transactions.filter(t => t.type === 'expense');
            if (expenses.length === 0) return 'لا توجد نفقات مسجلة حتى الآن. أضف معاملات خصم من صفحة الأصول.';
            const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
            const avg = totalExp / expenses.length;
            const maxExp = Math.max(...expenses.map(t => t.amount));
            return `لديك ${expenses.length} عملية إنفاق بمتوسط ${avg.toFixed(0)} ج.م. أكبر إنفاق: ${maxExp.toLocaleString()} ج.م. أنصح بتقليل المصاريف غير الضرورية لزيادة الادخار.`;
        }

        if (msg.includes('كم') && (msg.includes('ثروت') || msg.includes('رصيد')))
            return `ثروتك ${Math.floor(total).toLocaleString()} ج.م (نقد: ${Math.floor(appData.cash).toLocaleString()}).`;

        if (msg.includes('أصول') || msg.includes('محفظة'))
            return appData.assets.length ? appData.assets.map(a => `${a.name} (${a.val.toLocaleString()} ج.م)`).join('، ') : 'لا توجد أصول.';

        if (msg.includes('متى') || msg.includes('مليونير')) {
            if (total >= 1_000_000) return 'أنت مليونير! 🎉';
            let months = 0, cash = appData.cash, assets = appData.assets.map(a => ({ ...a }));
            while (months < 600) {
                assets.forEach(a => a.val *= (1 + a.rate / 100 / 12));
                cash += 1000;
                if (cash + assets.reduce((s, a) => s + a.val, 0) >= 1_000_000) break;
                months++;
            }
            const y = Math.floor(months / 12), m = months % 12;
            return `المدة المتبقية: ${y} سنة و ${m} شهر تقريباً.`;
        }

        if (msg.includes('نصيحة'))
            return 'نوّع استثماراتك بين العقارات والأسهم والذهب. لا تضع كل البيض في سلة واحدة.';

        const generic = [
            'أنا أتعلم من تعاملاتك المالية لأعطيك توصيات أفضل.',
            `لديك ${appData.assets.length} أصول.`,
            'حافظ على الادخار المنتظم.'
        ];
        return generic[Math.floor(Math.random() * generic.length)];
    },
    addChatMessage(text, sender) {
        const box = document.getElementById('chatBox');
        if (!box) return;
        const div = document.createElement('div');
        div.className = `msg ${sender === 'ai' ? 'bg-gray-200 self-start rounded-2xl rounded-br-md' : 'bg-[#0ea5e9] text-white self-end rounded-2xl rounded-bl-md'} px-4 py-2 font-bold text-sm`;
        div.innerText = text;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }
};

window.onload = () => engine.init();
