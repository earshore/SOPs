// src/modules/home/homeDisplay.js

export function initHomeSplash() {
    console.log("🚀 Initializing Optimized Home Splash...");

    const container = document.getElementById('home-splash-container');
    const canvas = document.getElementById('particles-canvas');
    const heroSection = document.getElementById('magnetic-hero');
    const cursorFollower = document.getElementById('cursor-follower');

    // 神经网络 SVG 节点
    const neuralNodes = document.getElementById('neural-nodes');
    const neuralLines = document.getElementById('neural-lines');

    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true }); // 优化透明度处理
    let width, height;
    let particles = [];

    // 鼠标位置缓存
    let mouseX = 0, mouseY = 0;
    // 视差目标位置
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    // 配色：青、紫、白
    const colors = ['#00F3FF', '#BC13FE', '#FFFFFF'];

    // =========================================
    // 1. 高性能粒子系统 (无 ShadowBlur)
    // =========================================
    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 10;
            this.size = Math.random() * 2 + 0.5; // 小粒子
            this.speedY = Math.random() * 0.5 + 0.1; // 慢速上浮
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.alpha = Math.random() * 0.5 + 0.1;
            this.angle = Math.random() * Math.PI * 2;
        }

        update() {
            this.y -= this.speedY;
            // 简单的正弦摆动，不做复杂物理计算
            this.x += Math.sin(this.angle) * 0.2;
            this.angle += 0.02;

            if (this.y < -10) this.reset();
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        // 限制粒子数量：每 20000 像素 1 个，防止低端机卡顿
        const particleCount = Math.min(Math.floor((width * height) / 20000), 80);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        if (!canvas.isConnected) return;

        ctx.clearRect(0, 0, width, height);

        // 使用 lighter 混合模式来模拟发光，比 shadowBlur 快 100 倍
        ctx.globalCompositeOperation = 'lighter';

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // 恢复默认
        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(animate);
    }

    // =========================================
    // 2. 视差与光标 (Parallax & Cursor)
    // =========================================

    // 统一的鼠标事件监听
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // 光标直接移动 (CSS transition 会处理平滑)
        if (cursorFollower) {
            // 使用 translate3d 开启 GPU 加速
            cursorFollower.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
        }

        // 计算视差目标值 (反向移动)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        targetX = (centerX - mouseX) * 0.015; // 移动系数小一点，太大会晕
        targetY = (centerY - mouseY) * 0.015;
    });

    // 独立的动画帧处理视差，避免阻塞主线程
    function loopParallax() {
        if (heroSection) {
            // 简单的缓动算法 (Lerp)
            currentX += (targetX - currentX) * 0.1;
            currentY += (targetY - currentY) * 0.1;

            // 应用到 DOM
            heroSection.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
        requestAnimationFrame(loopParallax);
    }
    loopParallax();

    // =========================================
    // 3. 尺寸监听
    // =========================================
    const observer = new ResizeObserver(entries => {
        window.requestAnimationFrame(() => {
            if (!entries.length) return;
            const rect = entries[0].contentRect;
            width = rect.width;
            height = rect.height;
            canvas.width = width;
            canvas.height = height;

            // 只有尺寸变化较大时才重置粒子
            if (particles.length === 0 || Math.abs(canvas.width - width) > 100) {
                initParticles();
            }
        });
    });
    observer.observe(container);
    animate();

    // =========================================
    // 4. 功能：时间显示
    // =========================================
    function updateTime() {
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '.');
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
            timeDisplay.textContent = `${dateStr} // ${timeStr}`;
        }
    }
    // 立即执行一次，然后每秒更新
    updateTime();
    setInterval(updateTime, 1000);

    // =========================================
    // 5. 静态神经网络生成 (只执行一次)
    // =========================================
    if (neuralNodes && neuralLines && !neuralNodes.childElementCount) {
        const nodes = [];
        // 限制节点数量，提升 SVG 渲染性能
        for (let i = 0; i < 20; i++) {
            nodes.push({ x: Math.random() * 800, y: Math.random() * 800 });
        }

        // 绘制节点
        nodes.forEach(p => {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
            c.setAttribute('r', Math.random() * 2);
            c.setAttribute('fill', '#00F3FF');
            c.style.opacity = Math.random() * 0.5 + 0.2;
            neuralNodes.appendChild(c);
        });

        // 绘制连线
        nodes.forEach((p1, i) => {
            nodes.forEach((p2, j) => {
                if (i >= j) return; // 避免重复连线
                const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (d < 200) {
                    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    l.setAttribute('x1', p1.x); l.setAttribute('y1', p1.y);
                    l.setAttribute('x2', p2.x); l.setAttribute('y2', p2.y);
                    l.setAttribute('stroke', 'url(#lineGrad)');
                    l.setAttribute('stroke-width', 0.5);
                    l.style.opacity = (1 - d / 200) * 0.2;
                    neuralLines.appendChild(l);
                }
            });
        });
    }
}