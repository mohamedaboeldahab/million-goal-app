// ========== ملف الذكاء الاصطناعي المستقل ==========
// يتم تحميله فقط عند فتح صفحة ai-chat

window.AIEngine = {
    async saveApiKey() {
        const key = document.getElementById('apiKeyInput')?.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            document.getElementById('apiKeySetup')?.classList.add('hidden');
            window.engine?.showToast?.('✅ تم حفظ المفتاح بنجاح');
        }
    },

    async askAI() {
        const input = document.getElementById('aiInput');
        const question = input?.value.trim();
        if (!question) return;

        // عرض سؤال المستخدم
        const msgId = this.addAIMessage(question, 'user');
        input.value = '';

        // كتابة مؤقتة
        const typingId = this.addAIMessage('...', 'ai');

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            document.getElementById('apiKeySetup')?.classList.remove('hidden');
            this.updateAIMessage(typingId, '⚠️ يرجى إدخال Gemini API Key للمتابعة.');
            return;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `أنت مستشار مالي ذكي اسمه "Shark AI". أجب بالعربية فقط وبطريقة واضحة ومباشرة. سؤال المستخدم: ${question}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم طلبك. حاول مرة أخرى.';
            this.updateAIMessage(typingId, reply);
        } catch (error) {
            this.updateAIMessage(typingId, '❌ حدث خطأ في الاتصال. تأكد من صحة المفتاح أو اتصالك بالإنترنت.');
        }
    },

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

    updateAIMessage(element, newText) {
        if (element) {
            element.textContent = newText;
            const box = document.getElementById('chatBox');
            if (box) box.scrollTop = box.scrollHeight;
        }
    }
};

// ربط الدوال بنفس أسماء engine لتتوافق مع الأزرار
window.engine = window.engine || {};
window.engine.saveApiKey = () => window.AIEngine.saveApiKey();
window.engine.askAI = () => window.AIEngine.askAI();

// عرض خانة المفتاح إذا لم يكن محفوظاً
if (!localStorage.getItem('gemini_api_key')) {
    document.getElementById('apiKeySetup')?.classList.remove('hidden');
}
