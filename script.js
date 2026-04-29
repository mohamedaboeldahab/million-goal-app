// البيانات الأساسية للتطبيق
let data = {
    cash: 7613,
    assets: [],
    monthly: 1000
};

let activeOp = 'add';

const engine = {
    // تشغيل التطبيق أول مرة
    init() {
        const saved = localStorage.getItem('millionaire_v6_data');
        if (saved) data = JSON.parse(saved);
        this.sync();
        this.nav('home');
    },

    // حفظ ومزامنة البيانات مع الواجهة
    sync() {
        localStorage.setItem('millionaire_v6_data', JSON.stringify(data));
        const assetsSum = data.assets.reduce((s, a) => s + a.val, 0);
        const total = data.cash + assetsSum;

        document.getElementById('totalWealth').innerText = Math.floor(total).toLocaleString();
        
        // نصيحة سريعة
        document.getElementById('quickAdvice').innerText = total < 500000 
            ? "استمر في بناء الأصول، الطريق للمليون يحتاج صبر." 
            : "رائع! تجاوزت منتصف الطريق، ركز على العوائد السنوية.";

        this.renderAssets();
        this.renderRoadmap(total);
        this.calculate(total);
    },

    // التنقل بين الصفحات
    nav(id) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + id).classList.remove('hidden');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
    },

    // إضافة أصل جديد
    addAsset() {
        const name = document.getElementById('aName').value;
        const val = parseFloat(document.getElementById('aVal').value);
        const rate = parseFloat(document.getElementById('aRate').value) || 0;

        if (name && val) {
            data.assets.push({ name, val, rate });
            this.sync();
            toggleAssetInp();
            document.getElementById('aName').value = '';
            document.getElementById('aVal').value = '';
        }
    },

    renderAssets() {
        const list = document.getElementById('assetsList');
        if (!list) return;
        list.innerHTML = data.assets.map((a, i) => `
            <div class="card flex justify-between items-center">
                <div>
                    <p class="font-black text-sm">${a.name}</p>
                    <p class="text-[10px] font-bold text-sky-500">عائد ${a.rate}%</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-[#0ea5e9]">${a.val.toLocaleString()} ج.م</p>
                    <button onclick="engine.delAsset(${i})" class="text-[10px] text-red-400 font-bold">حذف</button>
                </div>
            </div>
        `).join('');
    },

    delAsset(i) {
        data.assets.splice(i, 1);
        this.sync();
    },

    // الخريطة الذكية
    renderRoadmap(total) {
        const container = document.getElementById('roadmapNodes');
        let html = '';
        for (let i = 1; i <= 100; i++) {
            const target = (1000000 / 100) * i;
            // إظهار المحطات القريبة من الرصيد الحالي فقط
            if (total >= target - 50000 && total <= target + 150000) {
                const active = total >= target;
                html += `
                <div class="flex items-center gap-4 mb-4 ${active ? 'text-sky-500' : 'text-gray-300'}">
                    <div class="w-3 h-3 rounded-full bg-current shadow-sm"></div>
                    <div class="card flex-1 mb-0 p-3">
                        <p class="text-[11px] font-black">المحطة ${i} - ${target.toLocaleString()} ج.م</p>
                    </div>
                </div>`;
            }
        }
        container.innerHTML = html;
    },

    // الحاسبة
    calculate(total) {
        const monthly = parseFloat(document.getElementById('monthlyInp').value) || 1000;
        let temp = total; let m = 0;
        while (temp < 1000000 && m < 600) {
            temp = (temp + monthly) * 1.015; // افتراض نمو 1.5% شهرياً
            m++;
        }
        document.getElementById('calcRes').innerText = `ستصل للمليون خلال: ${Math.floor(m/12)} سنة و ${m%12} شهر`;
    },

    // المستشار الذكي
    chat: {
        ask() {
            const inp = document.getElementById('chatInput');
            const box = document.getElementById('chatBox');
            if (!inp.value) return;

            box.innerHTML += `<div class="msg user">${inp.value}</div>`;
            const userTxt = inp.value;
            inp.value = '';

            setTimeout(() => {
                const total = data.cash + data.assets.reduce((s, a) => s + a.val, 0);
                let reply = "بصفتي مستشارك، أرى أن خطتك المالية مستقرة. هل فكرت في زيادة أصولك؟";
                
                if (userTxt.includes("مليون")) {
                    reply = `رصيدك الحالي ${total.toLocaleString()} ج.م. أنت على بعد ${(1000000 - total).toLocaleString()} ج.م من المليون الأول.`;
                } else if (userTxt.includes("نصيحة")) {
                    reply = "أفضل نصيحة لك هي تنويع الأصول بين الذهب وصناديق الاستثمار لتقليل المخاطر.";
                }

                box.innerHTML += `<div class="msg ai">${reply}</div>`;
                box.scrollTop = box.scrollHeight;
            }, 600);
        }
    }
};

// وظائف مساعدة للواجهة
function openModal(op) {
    activeOp = op;
    document.getElementById('modalTitle').innerText = op === 'add' ? 'إضافة أرباح' : 'خصم مصروفات';
    document.getElementById('opModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('opModal').classList.add('hidden'); }

document.getElementById('modalConfirm').onclick = () => {
    const val = parseFloat(document.getElementById('modalAmount').value) || 0;
    if (val > 0) {
        data.cash = activeOp === 'add' ? data.cash + val : data.cash - val;
        engine.sync();
        document.getElementById('modalAmount').value = '';
        closeModal();
    }
};

function toggleAssetInp() {
    document.getElementById('assetInputArea').classList.toggle('hidden');
}

// بدء التشغيل
window.onload = () => engine.init();
