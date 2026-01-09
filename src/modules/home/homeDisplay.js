// src/modules/home/homeDisplay.js

export function initHomeSplash() {
    console.log("🚀 Initializing Home Splash Screen...");

    const container = document.getElementById('home-splash-container');
    const canvas = document.getElementById('particles-canvas');
    const neuralLines = document.getElementById('neural-lines');
    const neuralNodes = document.getElementById('neural-nodes');

    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // =========================================
    // 1. 粒子系统 (智能 Resize 版)
    // =========================================
    
    // 定义粒子类
    class Particle {
        constructor(w, h) {
            this.reset(w, h);
        }

        reset(w, h) {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.5 ? '#00f5d4' : '#7b2cbf';
        }

        update(w, h) {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > w) this.speedX *= -1;
            if (this.y < 0 || this.y > h) this.speedY *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // 初始化/重置粒子
    function initParticles(width, height) {
        particles = [];
        const particleCount = 100; // 粒子数量
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(width, height));
        }
    }

    // 绘制连线
    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 245, 212, ${0.1 * (1 - distance / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    // 动画循环
    function animateParticles() {
        if (!canvas.isConnected) return; // 防止内存泄漏

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update(canvas.width, canvas.height);
            particle.draw();
        });
        
        connectParticles();
        animationFrameId = requestAnimationFrame(animateParticles);
    }

    // =========================================
    // 修复后的 ResizeObserver
    // =========================================
    const observer = new ResizeObserver(entries => {
        // 【关键修复】：包裹在 requestAnimationFrame 中
        window.requestAnimationFrame(() => {
            // 再次检查元素是否存在，防止组件卸载后的报错
            if (!Array.isArray(entries) || !entries.length) return;

            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                
                // 增加边界检查，避免无效计算
                if (width > 0 && height > 0) {
                    // 在这里修改 canvas 尺寸是安全的，因为它在下一帧执行
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 如果是第一次检测到尺寸，或者尺寸变化大，重新初始化粒子分布
                    // 注意：这里建议用 Math.floor 取整比较，避免亚像素差异导致的抖动
                    if (particles.length === 0 || Math.abs(canvas.width - width) > 50) {
                        initParticles(width, height);
                    }
                }
            }
        });
    });
        
    observer.observe(container);
    animateParticles(); // 启动动画循环

    // =========================================
    // 2. 光标跟随 (Fixed 定位修正)
    // =========================================
    const cursorGlow = document.getElementById('cursor-glow');
    let mouseX = -100, mouseY = -100; // 初始移出屏幕
    let glowX = -100, glowY = -100;

    const mouseHandler = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };
    document.addEventListener('mousemove', mouseHandler);

    function updateCursorGlow() {
        if (!cursorGlow || !cursorGlow.isConnected) return;
        
        // 缓动算法
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;
        
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
        requestAnimationFrame(updateCursorGlow);
    }
    updateCursorGlow();

    // =========================================
    // 3. 时间显示
    // =========================================
    function updateTime() {
        const timeDisplay = document.getElementById('time-display');
        if (!timeDisplay || !timeDisplay.isConnected) return;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        timeDisplay.textContent = `${dateStr} | ${timeStr}`;
    }
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    // =========================================
    // 4. 神经网络 SVG 动画 (一次性生成)
    // =========================================
    if (neuralNodes && neuralLines && neuralNodes.childElementCount === 0) {
        const nodePositions = [];
        // 确保分布在 800x800 的容器内
        for (let i = 0; i < 20; i++) {
            nodePositions.push({
                x: 50 + Math.random() * 700,
                y: 50 + Math.random() * 700
            });
        }

        // 创建节点
        nodePositions.forEach((pos) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', 4 + Math.random() * 4);
            circle.setAttribute('fill', '#00f5d4');
            // CSS 中定义了 pulse 动画，这里应用它
            // 注意：CSS中可能定义的是 orbFloat 或 pulse，这里保持简单缩放
            circle.style.animation = `pulseInner ${2 + Math.random() * 2}s ease-in-out infinite`; 
            // 如果 CSS 里没有 pulseInner，我们需要在 CSS 补上，或者复用 .status-dot 的 pulse
            circle.style.animationName = 'pulse'; 
            circle.style.transformBox = 'fill-box';
            circle.style.transformOrigin = 'center';
            circle.style.animationDelay = `${Math.random() * 2}s`;
            neuralNodes.appendChild(circle);
        });

        // 创建连接线
        for (let i = 0; i < nodePositions.length; i++) {
            for (let j = i + 1; j < nodePositions.length; j++) {
                const dx = nodePositions[i].x - nodePositions[j].x;
                const dy = nodePositions[i].y - nodePositions[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 250) { // 稍微增加连线距离
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', nodePositions[i].x);
                    line.setAttribute('y1', nodePositions[i].y);
                    line.setAttribute('x2', nodePositions[j].x);
                    line.setAttribute('y2', nodePositions[j].y);
                    line.setAttribute('stroke', 'url(#lineGrad)');
                    line.setAttribute('stroke-width', '1');
                    line.style.opacity = 0.3;
                    neuralLines.appendChild(line);
                }
            }
        }
    }
}