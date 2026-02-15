"use strict";
// DOM元素引用
let elements;
// 全局状态
let allExpanded = false;
let clickCount = 0;
// 初始化函数
function init() {
    // 在 DOM 加载完成后获取元素
    elements = {
        btnAnalyze: document.getElementById('btnAnalyze'),
        btnSample: document.getElementById('btnSample'),
        btnClear: document.getElementById('btnClear'),
        jsonInput: document.getElementById('jsonInput'),
        progressSection: document.getElementById('progressSection'),
        inputSection: document.getElementById('inputSection'),
        resultsSection: document.getElementById('resultsSection'),
        progressBar: document.getElementById('progressBar'),
        expandAllBtn: document.getElementById('expandAllBtn'),
        logoIcon: document.getElementById('logoIcon'),
        toastContainer: document.getElementById('toastContainer'),
    };
    setupButtonRippleEffect();
    setupQACardToggle();
    setupCategoryTabs();
    setupLanguageSelector();
    setupExpandAll();
    setupCopyButtons();
    setupAnalyzeButton();
    setupSampleButton();
    setupClearButton();
    setupExportButtons();
    setupKeyboardShortcuts();
    setupLogoEasterEgg();
    setupIntersectionObserver();
    addShakeAnimation();
}
// 按钮波纹效果
function setupButtonRippleEffect() {
    document.querySelectorAll('.btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            const mouseEvent = e;
            const target = e.currentTarget;
            const ripple = document.createElement('span');
            ripple.classList.add('btn-ripple');
            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = mouseEvent.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = mouseEvent.clientY - rect.top - size / 2 + 'px';
            target.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}
// QA卡片展开/收起
function setupQACardToggle() {
    document.querySelectorAll('.qa-header').forEach((header) => {
        header.addEventListener('click', function (e) {
            const target = e.currentTarget;
            const card = target.closest('.qa-card');
            card?.classList.toggle('expanded');
        });
    });
}
// 分类标签切换
function setupCategoryTabs() {
    document.querySelectorAll('.cat-tab').forEach((tab) => {
        tab.addEventListener('click', function (e) {
            const target = e.currentTarget;
            document.querySelectorAll('.cat-tab').forEach((t) => t.classList.remove('active'));
            target.classList.add('active');
            showToast('info', '已切换筛选分类', 'fa-solid fa-filter');
        });
    });
}
// 语言选择器
function setupLanguageSelector() {
    document.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            const target = e.currentTarget;
            document.querySelectorAll('.lang-btn').forEach((b) => b.classList.remove('active'));
            target.classList.add('active');
            showToast('success', `已切换至 ${target.textContent} 语言版本`, 'fa-solid fa-language');
        });
    });
}
// 全部展开/收起
function setupExpandAll() {
    elements.expandAllBtn?.addEventListener('click', () => {
        allExpanded = !allExpanded;
        document.querySelectorAll('.qa-card').forEach((card) => {
            if (allExpanded) {
                card.classList.add('expanded');
            }
            else {
                card.classList.remove('expanded');
            }
        });
        if (elements.expandAllBtn) {
            elements.expandAllBtn.innerHTML = allExpanded
                ? '<i class="fa-solid fa-compress"></i> 全部收起'
                : '<i class="fa-solid fa-expand"></i> 全部展开';
        }
    });
}
// 复制按钮
function setupCopyButtons() {
    document.querySelectorAll('.qa-action-btn[data-copy]').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const target = e.currentTarget;
            const answerContent = target.closest('.qa-answer-content');
            const text = answerContent?.querySelector('.qa-answer-text p')?.textContent || '';
            navigator.clipboard.writeText(text).then(() => {
                target.classList.add('copied');
                target.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
                showToast('success', '已复制到剪贴板', 'fa-solid fa-check');
                setTimeout(() => {
                    target.classList.remove('copied');
                    target.innerHTML = '<i class="fa-regular fa-copy"></i> 复制';
                }, 2000);
            });
        });
    });
}
// 分析按钮
function setupAnalyzeButton() {
    elements.btnAnalyze?.addEventListener('click', () => {
        if (!elements.jsonInput?.value.trim()) {
            showToast('error', '请先输入或加载竞品分析报告数据', 'fa-solid fa-exclamation');
            elements.jsonInput?.focus();
            // 抖动动画
            const card = elements.jsonInput?.closest('.input-card');
            if (card) {
                card.style.animation = 'none';
                card.offsetHeight; // 触发重排
                card.style.animation = 'shake 0.5s ease-in-out';
            }
            return;
        }
        simulateProgress();
    });
}
// 加载示例数据
function setupSampleButton() {
    elements.btnSample?.addEventListener('click', () => {
        const sampleData = {
            product: '智能便携投影仪 Pro',
            category: '消费电子',
            competitors: 8,
            dimensions: ['标题关键词', '卖点分析', '致命缺陷', '惊喜时刻', '犹豫点', '买家画像'],
            markets: ['DE', 'FR', 'IT', 'ES'],
            analysis: { avg_rating: 4.3, total_reviews: 12400 },
        };
        if (elements.jsonInput) {
            elements.jsonInput.value = JSON.stringify(sampleData, null, 2);
        }
        showToast('success', '示例数据已加载', 'fa-solid fa-flask');
    });
}
// 清空按钮
function setupClearButton() {
    elements.btnClear?.addEventListener('click', () => {
        if (elements.jsonInput) {
            elements.jsonInput.value = '';
        }
        showToast('info', '输入已清空', 'fa-solid fa-eraser');
    });
}
// 进度模拟
function simulateProgress() {
    if (!elements.progressSection || !elements.inputSection || !elements.resultsSection || !elements.progressBar) {
        return;
    }
    elements.inputSection.style.display = 'none';
    elements.resultsSection.classList.remove('visible');
    elements.progressSection.classList.add('visible');
    const steps = document.querySelectorAll('.progress-step');
    let currentStep = 0;
    const totalSteps = steps.length;
    // 重置步骤
    steps.forEach((s) => {
        s.classList.remove('active', 'done');
        const icon = s.querySelector('i');
        if (icon)
            icon.className = 'fa-regular fa-circle';
    });
    steps[0].classList.add('active');
    const firstIcon = steps[0].querySelector('i');
    if (firstIcon)
        firstIcon.className = 'fa-solid fa-circle-notch fa-spin';
    elements.progressBar.style.width = '0%';
    const interval = setInterval(() => {
        if (currentStep < totalSteps) {
            steps[currentStep].classList.remove('active');
            steps[currentStep].classList.add('done');
            const icon = steps[currentStep].querySelector('i');
            if (icon)
                icon.className = 'fa-solid fa-circle-check';
            currentStep++;
            const progress = (currentStep / totalSteps) * 100;
            if (elements.progressBar) {
                elements.progressBar.style.width = progress + '%';
            }
            if (currentStep < totalSteps) {
                steps[currentStep].classList.add('active');
                const nextIcon = steps[currentStep].querySelector('i');
                if (nextIcon)
                    nextIcon.className = 'fa-solid fa-circle-notch fa-spin';
            }
        }
        else {
            clearInterval(interval);
            setTimeout(() => {
                elements.progressSection?.classList.remove('visible');
                if (elements.inputSection)
                    elements.inputSection.style.display = 'block';
                elements.resultsSection?.classList.add('visible');
                showToast('success', '分析完成！已生成 24 条 Q&A', 'fa-solid fa-sparkles');
                animateCounters();
            }, 600);
        }
    }, 800);
}
// 计数器动画
function animateCounters() {
    document.querySelectorAll('.count-up').forEach((el) => {
        const target = parseInt(el.getAttribute('data-target') || '0');
        let current = 0;
        const increment = target / 30;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target.toString();
                clearInterval(timer);
            }
            else {
                el.textContent = Math.floor(current).toString();
            }
        }, 40);
    });
}
// Toast提示系统
function showToast(type, message, iconClass) {
    if (!elements.toastContainer)
        return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = {
        success: 'fa-solid fa-check',
        error: 'fa-solid fa-xmark',
        info: 'fa-solid fa-info',
    };
    const icon = iconClass || iconMap[type];
    toast.innerHTML = `
    <div class="toast-icon"><i class="${icon}"></i></div>
    <span>${message}</span>
  `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// 抖动动画样式
function addShakeAnimation() {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
    document.head.appendChild(style);
}
// Logo彩蛋
function setupLogoEasterEgg() {
    elements.logoIcon?.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 3) {
            clickCount = 0;
            document.querySelectorAll('.ambient-orb').forEach((orb) => {
                orb.style.opacity = '0.7';
                setTimeout(() => (orb.style.opacity = '0.4'), 2000);
            });
            showToast('info', '✨ 氛围模式已激活', 'fa-solid fa-wand-magic-sparkles');
        }
    });
}
// 交叉观察器动画
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.qa-card, .stat-card, .insight-tag').forEach((el) => {
        observer.observe(el);
    });
}
// 导出按钮
function setupExportButtons() {
    document.querySelectorAll('[data-action="amz_qalab_exportJSON"]').forEach((btn) => {
        btn.addEventListener('click', () => showToast('success', 'JSON 文件已导出', 'fa-solid fa-code'));
    });
    document.querySelectorAll('[data-action="amz_qalab_exportCSV"]').forEach((btn) => {
        btn.addEventListener('click', () => showToast('success', 'CSV 文件已导出', 'fa-solid fa-table'));
    });
    document.querySelectorAll('[data-action="amz_qalab_exportText"]').forEach((btn) => {
        btn.addEventListener('click', () => showToast('success', '文本文件已导出', 'fa-solid fa-file-lines'));
    });
}
// 键盘快捷键
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            elements.btnAnalyze?.click();
        }
    });
}
// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
