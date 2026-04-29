const engine = {
    // 1. نظام الـ 100 مرحلة التلقائي
    generateLevels(target = 1000000) {
        const steps = [];
        for (let i = 1; i <= 100; i++) {
            const amount = (target / 100) * i;
            steps.push({
                t: amount,
                n: `المرحلة ${i}`,
                tip: this.getSmartTip(i)
            });
        }
        return steps;
    },

    getSmartTip(step) {
        if (step < 20) return "مرحلة بناء العادات الصارمة.";
        if (step < 50) return "بدأت كرة الثلج في الدوران، لا تتوقف.";
        if (step < 80) return "أنت الآن ضمن فئة المستثمرين الأذكياء.";
        return "اقتربت من الحرية المالية المطلقة!";
    },

    // 2. محرك الشات (AI Chatbot Logic)
    chat: {
        messages: [],
        ask(text) {
            const userMsg = { role: 'user', text };
            this.messages.push(userMsg);
            this.render();

            // محاكاة استجابة الذكاء الاصطناعي بناءً على بيانات المستخدم
            setTimeout(() => {
                const balance = document.getElementById('balance').value;
                const aiMsg = { 
                    role: 'ai', 
                    text: `بناءً على رصيدك الحالي (${balance} ج.م)، أنصحك بزيادة الادخار بنسبة 5% هذا الشهر لتقليص مدة الوصول لهدفك بمقدار شهرين.` 
                };
                this.messages.push(aiMsg);
                this.render();
            }, 800);
        },
        render() {
            const container = document.getElementById('chatContainer');
            container.innerHTML = this.messages.map(m => `
                <div class="mb-4 ${m.role === 'user' ? 'text-left' : 'text-right'}">
                    <div class="inline-block p-3 rounded-2xl ${m.role === 'user' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700'} text-sm font-bold">
                        ${m.text}
                    </div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
    },

    sync() {
        const val = parseFloat(document.getElementById('balance').value) || 0;
        localStorage.setItem('future_millionaire_data', val);
        this.updateAI(val);
        this.renderRoadmap(val);
    },

    updateAI(val) {
        const levels = this.generateLevels();
        const currentLvl = levels.find(l => val < l.t) || levels[99];
        const progress = Math.min((val / 1000000) * 100, 100);
        
        document.getElementById('aiAdvice').innerText = currentLvl.tip;
        document.getElementById('challengeProgress').style.width = progress + "%";
        document.getElementById('progressPercent').innerText = `أتممت ${Math.floor(progress)}% من طريق المليون`;
    },

    renderRoadmap(val) {
        const levels = this.generateLevels();
        const container = document.getElementById('roadmapNodes');
        // عرض المراحل القريبة فقط (الحالية + 5 قادمين) لعدم إثقال الشاشة
        const currentIdx = levels.findIndex(l => val < l.t);
        const displayLevels = levels.slice(Math.max(0, currentIdx - 2), currentIdx + 8);

        container.innerHTML = displayLevels.map(l => {
            const active = val >= l.t;
            return `
                <div class="flex items-center gap-4 p-4 rounded-2xl ${active ? 'bg-sky-50 border-sky-100' : 'opacity-50'} border">
                    <div class="w-8 h-8 rounded-full ${active ? 'bg-sky-500' : 'bg-slate-200'} flex items-center justify-center text-white text-[10px]">
                        ${active ? '✓' : ''}
                    </div>
                    <div>
                        <h4 class="text-xs font-black">${l.n}</h4>
                        <p class="text-[10px] text-slate-400">${l.t.toLocaleString()} ج.م</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');
    }
};
