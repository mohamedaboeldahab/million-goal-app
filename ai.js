// ========== محرك الذكاء الاصطناعي المستقل ==========
window.AIEngine = {
    // حفظ المفتاح
    saveApiKey() {
        const key = document.getElementById('apiKeyInput')?.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            document.getElementById('apiKeySetup')?.classList.add('hidden');
            this.showToast('✅ تم حفظ المفتاح بنجاح');
        }
    },

    // إرسال سؤال
    async askAI() {
        const input = document.getElementById('aiInput');
        const question = input?.value.trim();
        if (!question) return;

        // عرض سؤال المستخدم
        this.addAIMessage(question, 'user');
        input.value = '';

        // رسالة "جارٍ الكتابة..."
        const typingDiv = this.addAIMessage('...', 'ai');

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            document.getElementById('apiKeySetup')?.classList.remove('hidden');
            this.updateAIMessage(typingDiv, '⚠️ يرجى إدخال Gemini API Key للمتابعة.');
            return;
        }

        try {
            // استخدام أحدث نموذج Gemini 1.5 Flash (سريع ومجاني)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `أنت مستشار مالي ذكي اسمه Shark AI. أجب بالعربية فقط بإجابات واضحة ومفيدة. سؤال المستخدم: ${question}`
                        }]
                    }]
                })
            });

            const data = await response.json();

            // التحقق من وجود خطأ في المفتاح أو الحصة
            if (data.error) {
                throw new Error(data.error.message || 'خطأ غير معروف');
            }

            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم طلبك. حاول مرة أخرى.';
            this.updateAIMessage(typingDiv, reply);

        } catch (error) {
            console.error('❌ AI Error:', error);
            let errorMsg = '❌ حدث خطأ في الاتصال.';
            if (error.message.includes('API key')) errorMsg = '🔑 مفتاح API غير صالح. تأكد من صحته.';
            else if (error.message.includes('quota')) errorMsg = '⏳ لقد تجاوزت الحد المسموح للاستخدام المجاني. حاول لاحقاً.';
            this.updateAIMessage(typingDiv, errorMsg);
        }
    },

    // إضافة رسالة
    addAIMessage(text, sender) {
        const box = document.getElementById('chatBox');
        if (!box) return null;
        const div = document.createElement('div');
        const isAI = sender === 'ai';
        div.className = isAI
            ? 'bg-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm text-slate-700 max-w-[80%]'
            : 'bg-sky-500 text-white p-4 rounded-2xl rounded-tl-none shadow-sm text-sm max-w-[80%] ml-auto';
        div.textContent = text;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
        return div;
    },

    // تحديث رسالة (مؤشر الكتابة)
    updateAIMessage(element, newText) {
        if (element) {
            element.textContent = newText;
            const box = document.getElementById('chatBox');
            if (box) box.scrollTop = box.scrollHeight;
        }
    },

    // توست صغير (نسخة محلية)
    showToast(msg) {
        const t = document.createElement('div');
        t.className = 'fixed bottom-20 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
};

// ربط الدوال المطلوبة
window.engine = window.engine || {};
window.engine.saveApiKey = () => window.AIEngine.saveApiKey();
window.engine.askAI = () => window.AIEngine.askAI();

// إظهار حقل API إذا كان غير موجود
setTimeout(() => {
    if (!localStorage.getItem('gemini_api_key')) {
        document.getElementById('apiKeySetup')?.classList.remove('hidden');
    }
}, 500);
