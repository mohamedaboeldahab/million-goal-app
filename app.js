const engine = {
    levels: [
        { t: 10000, n: "مرحلة التأسيس", icon: "🌱", tip: "أول 10 آلاف هي البذرة. حافظ على انضباطك المالي." },
        { t: 100000, n: "نادي الـ 100 ألف", icon: "🏢", tip: "رصيدك الآن يعمل لصالحك. فكر في تنويع استثماراتك." },
        { t: 500000, n: "نصف مليون", icon: "🚀", tip: "أنت في منطقة الأمان المالي. استمر في تعظيم أصولك." },
        { t: 1000000, n: "نادي المليونير", icon: "👑", tip: "مبروك! لقد حققت الهدف الأكبر. المليون القادم أسهل." }
    ],

    sync() {
        const val = parseFloat(document.getElementById('balance').value) || 0;
        localStorage.setItem('future_millionaire_data', val);
        this.updateAI(val);
        this.renderRoadmap(val);
    },

    updateAI(val) {
        const currentLvl = this.levels.find(l => val < l.t) || this.levels[this.levels.length-1];
        document.getElementById('aiAdvice').innerText = currentLvl.tip;
        
        // تحديث بار التحدي (تحدي الوصول للمستوى التالي)
        const progress = Math.min((val / currentLvl.t) * 100, 100);
        document.getElementById('challengeProgress').style.width = progress + "%";
    },

    renderRoadmap(val) {
        const container = document.getElementById('roadmapNodes');
        container.innerHTML = this.levels.map(l => {
            const active = val >= l.t;
            return `
                <div class="roadmap-step flex items-center gap-6 ${active ? 'active' : 'opacity-40'}">
                    <div class="icon-box w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xl transition-all duration-500 shadow-sm">
                        ${active ? '✅' : l.icon}
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">${l.t.toLocaleString()} ج.م</p>
                        <h4 class="text-sm font-black text-slate-700">${l.n}</h4>
                    </div>
                </div>
            `;
        }).join('');
    },

    calculate() {
        const current = parseFloat(document.getElementById('balance').value) || 0;
        const monthly = parseFloat(document.getElementById('monthly').value) || 0;
        const rate = (parseFloat(document.getElementById('rate').value) / 100) / 12;

        if (monthly <= 0) return;

        let temp = current;
        let months = 0;
        while (temp < 1000000 && months < 600) {
            temp = (temp + monthly) * (1 + rate);
            months++;
        }

        const y = Math.floor(months / 12);
        const m = months % 12;
        document.getElementById('calcResult').innerText = `ستصل لهدفك خلال ${y} سنة و ${m} شهر`;
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('nav button').forEach(b => {
            b.classList.remove('text-sky-500');
            b.classList.add('text-slate-400');
        });

        document.getElementById('page-' + pageId).classList.remove('hidden');
        document.getElementById('btn-' + pageId).classList.add('text-sky-500');
        document.getElementById('btn-' + pageId).classList.remove('text-slate-400');
    }
};

window.onload = () => {
    const saved = localStorage.getItem('future_millionaire_data');
    if (saved) document.getElementById('balance').value = saved;
    engine.sync();
    engine.calculate();
};
