// src/modules/home/homeDisplay.js

export function initHomeSplash() {
    console.log("🚀 Initializing Home Splash Screen...");

    const container = document.getElementById('home-splash-container');
    const canvas = document.getElementById('particles-canvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');

    // 1. 粒子系统
    function resizeCanvas() {
        // 使用容器的尺寸而不是 window innerWidth
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    // 初始化尺寸
    resizeCanvas();
    // 监听 resize
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.5 ? '#00f5d4' : '#7b2cbf';
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
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

    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

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

    function animateParticles() {
        // 如果页面切换了，可能需要停止动画（这里简单处理，如果canvas不在DOM了可能会报错，加个判断）
        if (!document.getElementById('particles-canvas')) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        connectParticles();
        requestAnimationFrame(animateParticles);
    }

    animateParticles();

    // 2. 光标跟随效果
    const cursorGlow = document.getElementById('cursor-glow');
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateCursorGlow() {
        if (!cursorGlow) return;
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
        requestAnimationFrame(updateCursorGlow);
    }
    updateCursorGlow();

    // 3. 时间显示
    function updateTime() {
        const timeDisplay = document.getElementById('time-display');
        if (!timeDisplay) return;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        timeDisplay.textContent = `${dateStr} | ${timeStr}`;
    }
    updateTime();
    setInterval(updateTime, 1000);

    // 4. 神经网络 SVG 动画
    const neuralLines = document.getElementById('neural-lines');
    const neuralNodes = document.getElementById('neural-nodes');

    if (neuralNodes && neuralLines) {
        const nodePositions = [];
        for (let i = 0; i < 20; i++) {
            nodePositions.push({
                x: 100 + Math.random() * 600,
                y: 100 + Math.random() * 600
            });
        }

        // 创建节点
        nodePositions.forEach((pos) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', 4 + Math.random() * 4);
            circle.setAttribute('fill', '#00f5d4');
            circle.style.animation = `pulseInner ${2 + Math.random() * 2}s ease-in-out infinite`; // Use existing CSS animation
            circle.style.animationDelay = `${Math.random() * 2}s`;
            neuralNodes.appendChild(circle);
        });

        // 创建连接线
        for (let i = 0; i < nodePositions.length; i++) {
            for (let j = i + 1; j < nodePositions.length; j++) {
                const dx = nodePositions[i].x - nodePositions[j].x;
                const dy = nodePositions[i].y - nodePositions[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 200) {
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