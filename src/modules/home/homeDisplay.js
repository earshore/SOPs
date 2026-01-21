// src/modules/home/homeDisplay.js

export function initHomeSplash() {
    console.log("🚀 Initializing Clean Water Ripple Splash...");

    const container = document.getElementById('home-splash-container');
    const canvas = document.getElementById('particles-canvas');
    const cursorFollower = document.getElementById('cursor-follower');
    const heroContent = document.getElementById('hero-content');

    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    // 鼠标状态
    let mouse = { x: -1000, y: -1000 };

    // 配置参数 - 水纹手感调节
    const CONFIG = {
        spacing: 50,       // 粒子间距（网格密度）
        friction: 0.9,     // 摩擦力 (0-1，越小停得越快)
        spring: 0.1,       // 弹力系数 (越大回弹越快)
        mouseForce: 60,    // 鼠标斥力强度
        mouseRadius: 150,  // 鼠标影响范围
        connectDist: 60    // 连线距离
    };

    // =========================================
    // 1. 弹性粒子类 (Spring Particle)
    // =========================================
    class Particle {
        constructor(x, y) {
            this.ox = x; // 原始位置 X (Original X)
            this.oy = y; // 原始位置 Y
            this.x = x;  // 当前位置
            this.y = y;
            this.vx = 0; // 速度 X
            this.vy = 0;
            this.density = Math.random() * 20 + 1; // 随机重量感
            this.color = '#cbd5e1'; // 默认浅灰色
        }

        update() {
            // 1. 计算鼠标斥力
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 鼠标交互：推开
            if (distance < CONFIG.mouseRadius) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius;
                const directionX = forceDirectionX * force * CONFIG.mouseForce;
                const directionY = forceDirectionY * force * CONFIG.mouseForce;

                // 施加负向力（推开）
                this.vx -= directionX;
                this.vy -= directionY;
            }

            // 2. 弹簧回弹 (Hooke's Law)
            // 粒子总是想回到 ox, oy
            const sx = (this.ox - this.x) * CONFIG.spring;
            const sy = (this.oy - this.y) * CONFIG.spring;

            this.vx += sx;
            this.vy += sy;

            // 3. 摩擦力损耗
            this.vx *= CONFIG.friction;
            this.vy *= CONFIG.friction;

            // 4. 更新位置
            this.x += this.vx;
            this.y += this.vy;
        }

        draw() {
            // 1. 计算当前速度 (勾股定理)
            // Math.hypot(x, y) 等同于 Math.sqrt(x*x + y*y)
            const speed = Math.hypot(this.vx, this.vy);

            // 2. 动态计算不透明度 (Alpha)
            // - 0.2: 基础不透明度 (静止时的淡色，数值越小越淡)
            // - speed * 0.1: 速度对颜色的增幅 (数值越大，稍微一动就变深)
            let alpha = 0.05 + (speed * 0.15);

            // 限制 alpha 最大为 1 (防止颜色过饱和)
            if (alpha > 1) alpha = 1;

            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);

            // 3. 使用 RGBA 赋值
            // 原色 #94a3b8 转换为 RGB 是 (148, 163, 184)
            // ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
            if (speed > 2) {
                ctx.fillStyle = `rgba(37, 99, 235, ${alpha})`; // 运动时变蓝
            } else {
                ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`; // 静止时灰
            }
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        // 创建网格布局 (Grid Layout)
        // 稍微扩展出屏幕外，保证边缘也有水纹
        for (let y = 0; y < height + CONFIG.spacing; y += CONFIG.spacing) {
            for (let x = 0; x < width + CONFIG.spacing; x += CONFIG.spacing) {
                particles.push(new Particle(x, y));
            }
        }
    }

    function drawConnections() {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(37, 99, 235, 0.15)"; // 极淡的蓝色连线
        ctx.lineWidth = 0.5;

        // 仅连接相邻的粒子（为了性能优化，不进行全连接，只检查网格邻居）
        // 但由于粒子在动，简单的双重循环检查距离更通用
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];

            // 优化：只检查部分粒子，或者只画距离近的
            // 这里为了效果好，检查所有粒子，但只画非常近的
            // 在网格系统中，我们其实只需要检查右边和下边的粒子即可（如果未乱序）
            // 但因为粒子会乱动，我们还是用距离判断

            // 为了性能，只在粒子移动速度较快(受干扰)的区域画线，或者画所有线但透明度极低
            // 简单方案：画所有 < connectDist 的线
            // 性能优化：只检查数组中附近的索引? 不行，因为是网格。
            // 回归简单距离检测，但限制检测范围
        }

        // 实际上，网格连线如果用 drawLine 性能消耗巨大。
        // 我们改为只画粒子点，利用粒子运动产生的“光流感”来模拟水纹，
        // 或者只连接受鼠标影响区域的粒子。

        particles.forEach(p => {
            // 只在鼠标附近画线，强调交互区域
            const dToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            if (dToMouse < CONFIG.mouseRadius + 50) {
                particles.forEach(p2 => {
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < CONFIG.spacing * 1.2 && dist > 0) { // 只连最近的邻居
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                });
            }
        });
        ctx.stroke();
    }

    function animate() {
        if (!canvas.isConnected) return;

        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // 绘制动态连线 (模拟水面张力)
        drawConnections();

        requestAnimationFrame(animate);
    }

    // =========================================
    // 2. 交互与尺寸
    // =========================================

    const mouseHandler = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // 简单的 CSS 光标跟随
        if (cursorFollower) {
            cursorFollower.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;
        }

        // 简单的文字视差 (轻微反向移动)
        if (heroContent) {
            const moveX = (window.innerWidth / 2 - mouse.x) * 0.01;
            const moveY = (window.innerHeight / 2 - mouse.y) * 0.01;
            heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
    };
    document.addEventListener('mousemove', mouseHandler);

    // Resize
    const observer = new ResizeObserver(entries => {
        window.requestAnimationFrame(() => {
            if (!entries.length) return;
            const rect = entries[0].contentRect;
            width = rect.width;
            height = rect.height;
            canvas.width = width;
            canvas.height = height;

            // 尺寸变化重置网格
            initParticles();
        });
    });
    observer.observe(container);
    animate();

    // =========================================
    // 3. 时间与功能
    // =========================================
    function updateTime() {
        const el = document.getElementById('time-display');
        if (el) {
            const now = new Date();
            // 格式：2026.01.20 | 14:30
            const dateStr = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '.');
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            el.textContent = `${dateStr} | ${timeStr}`;
        }
    }
    setInterval(updateTime, 1000);
    updateTime();
}