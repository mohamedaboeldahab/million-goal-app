let appData = {
    cash: 7613,
    assets: [],
    monthly: 1000,
    rate: 18
};

const engine = {
    init() {
        const saved = localStorage.getItem('millionaire_engine_data');
        if (saved) appData = JSON.parse(saved);
        this.sync();
        this.nav('home');
    },

    sync() {
        localStorage.setItem('millionaire_engine_data', JSON.stringify(appData));
        
        const assetsTotal = appData.assets.reduce((s, a) => s + a.val, 0);
        const total = appData.cash + assetsTotal;
        
        // تحديث الواجهة
        if(document.getElementById('totalVal')) document.getElementById('totalVal').innerText = Math.floor(total).toLocaleString();
        
        this.renderRoadmap(total);
        this.renderAssets();
        this.calculate();
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');
        
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + pageId).classList.add('active');
    },

    // إدارة الأصول
    addAsset(name, val, rate) {
        appData.assets.push({ name, val: parseFloat(val), rate: parseFloat(rate) });
        this.sync();
    },

    renderAssets() {
        const container = document.getElementById('assetsList');
        if(!container) return;
        container.innerHTML = appData.assets.map((a, i) => `
            <div class="card" style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div><b style="font-size:14px">${a.name}</b><br><small>${a.rate}% سنوي</small></div>
                <div style="text-align:left"><b class="text-brand">${a.val.toLocaleString()}</b><br>
                <button onclick="engine.deleteAsset(${i})" style="color:red; font-size:10px">حذف</button></div>
            </div>
        `).join('');
    },

    deleteAsset(i) {
        appData.assets.splice(i, 1);
        this.sync();
    },

    // الخريطة
    renderRoadmap(total) {
        const container = document.getElementById('roadmapList');
        if(!container) return;
        let html = '';
        for(let i=1; i<=100; i++) {
            const target = (1000000 / 100) * i;
            if (total >= target - 100000 && total <= target + 200000) { // عرض المحطات القريبة فقط للسرعة
                html += `
                <div class="step-item ${total >= target ? 'completed' : ''}">
                    <div class="step-circle"></div>
                    <div class="card" style="flex:1; margin-bottom:0; padding:10px">
                        <b>المرحلة ${i}</b> - ${target.toLocaleString()} ج.م
                    </div>
                </div>`;
            }
        }
        container.innerHTML = html;
    },

    // الحاسبة
    calculate() {
        let temp = appData.cash + appData.assets.reduce((s, a) => s + a.val, 0);
        let months = 0;
        const monthly = appData.monthly;
        const monthlyRate = (appData.rate / 100) / 12;

        while(temp < 1000000 && months < 600) {
            temp = (temp + monthly) * (1 + monthlyRate);
            months++;
        }
        const res = document.getElementById('calcRes');
        if(res) res.innerText = `تحقيق المليون خلال: ${Math.floor(months/12)} سنة و ${months%12} شهر`;
    }
};

// تشغيل عند التحميل
window.onload = () => engine.init();
