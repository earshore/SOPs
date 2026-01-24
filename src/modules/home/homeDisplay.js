// src/modules/home/homeDisplay.js
import BaseModule from "../../common/BaseModule.js";

class HomeModule extends BaseModule {
    constructor() {
        super('home');
        this.animationFrameId = null;
        this.resizeObserver = null;
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        
        // Animation Config
        this.CONFIG = {
            spacing: 50,       // 粒子间距
            friction: 0.9,     // 摩擦力
            spring: 0.1,       // 弹力系数
            mouseForce: 60,    // 鼠标斥力强度
            mouseRadius: 150,  // 鼠标影响范围
            connectDist: 60    // 连线距离
        };
    }

    async render() {
        // Home 模块通常是静态 HTML 已经在 index.html 或由 ViewLoader 预加载了
        // 如果是纯动态加载，这里可以 fetch template
        // 但根据现有架构，Home 的 HTML 往往是默认存在的。
        // 为了兼容 BaseModule，我们假设 container 已经有了内容，或者我们什么都不做
        // 如果容器是空的，我们可以尝试加载（可选）
        if (!this.container.innerHTML.trim()) {
             const response = await fetch('src/modules/home/homeDisplay.html');
             this.container.innerHTML = await response.text();
        }
    }

    async init() {
        console.log("🚀 Initializing Clean Water Ripple Splash (BaseModule)...");
        
        const canvas = document.getElementById('particles-canvas');
        if (!canvas) return;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 1. 绑定事件 (自动清理)
        this.addEventListener(document, 'mousemove', (e) => this.handleMouseMove(e));
        
        // 2. 初始化尺寸监听 (手动清理)
        this.initResizeObserver();

        // 3. 启动时钟 (自动清理)
        this.updateTime();
        this.setInterval(() => this.updateTime(), 1000);

        // 4. 启动动画循环
        this.animate();
    }

    onUnmount() {
        console.log("💤 Home Module Unmounting...");
        // 1. 停止动画循环
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // 2. 停止 ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // BaseModule 会自动清理 setInterval 和 addEventListener
    }

    // ================= Logic =================

    initResizeObserver() {
        const container = document.getElementById('home-splash-container');
        if (!container) return;

        this.resizeObserver = new ResizeObserver(entries => {
            // 使用 requestAnimationFrame 避免 Resize Loop Error
            window.requestAnimationFrame(() => {
                if (!entries.length) return;
                const rect = entries[0].contentRect;
                this.width = rect.width;
                this.height = rect.height;
                
                if (this.canvas) {
                    this.canvas.width = this.width;
                    this.canvas.height = this.height;
                }

                this.initParticles();
            });
        });
        this.resizeObserver.observe(container);
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;

        const cursorFollower = document.getElementById('cursor-follower');
        const heroContent = document.getElementById('hero-content');

        if (cursorFollower) {
            cursorFollower.style.transform = `translate(${this.mouse.x}px, ${this.mouse.y}px) translate(-50%, -50%)`;
        }

        if (heroContent) {
            const moveX = (window.innerWidth / 2 - this.mouse.x) * 0.01;
            const moveY = (window.innerHeight / 2 - this.mouse.y) * 0.01;
            heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
    }

    updateTime() {
        const el = document.getElementById('time-display');
        if (el) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '.');
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            el.textContent = `${dateStr} | ${timeStr}`;
        }
    }

    // ================= Animation System =================

    initParticles() {
        this.particles = [];
        for (let y = 0; y < this.height + this.CONFIG.spacing; y += this.CONFIG.spacing) {
            for (let x = 0; x < this.width + this.CONFIG.spacing; x += this.CONFIG.spacing) {
                this.particles.push(new Particle(x, y, this.CONFIG));
            }
        }
    }

    animate() {
        if (!this._isMounted) return; // BaseModule 提供的标志位

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            p.update(this.mouse);
            p.draw(this.ctx);
        });

        this.drawConnections();

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    drawConnections() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "rgba(37, 99, 235, 0.15)";
        this.ctx.lineWidth = 0.5;

        // 优化：只在鼠标附近检测连线
        this.particles.forEach(p => {
            const dToMouse = Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
            if (dToMouse < this.CONFIG.mouseRadius + 50) {
                this.particles.forEach(p2 => {
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < this.CONFIG.spacing * 1.2 && dist > 0) {
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(p2.x, p2.y);
                    }
                });
            }
        });
        this.ctx.stroke();
    }
}

// 辅助类：粒子 (从内部类提取出来，或者放在模块底部)
class Particle {
    constructor(x, y, config) {
        this.ox = x;
        this.oy = y;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.config = config;
    }

    update(mouse) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.config.mouseRadius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (this.config.mouseRadius - distance) / this.config.mouseRadius;
            const directionX = forceDirectionX * force * this.config.mouseForce;
            const directionY = forceDirectionY * force * this.config.mouseForce;

            this.vx -= directionX;
            this.vy -= directionY;
        }

        const sx = (this.ox - this.x) * this.config.spring;
        const sy = (this.oy - this.y) * this.config.spring;

        this.vx += sx;
        this.vy += sy;

        this.vx *= this.config.friction;
        this.vy *= this.config.friction;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        const speed = Math.hypot(this.vx, this.vy);
        let alpha = 0.05 + (speed * 0.15);
        if (alpha > 1) alpha = 1;

        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);

        if (speed > 2) {
            ctx.fillStyle = `rgba(37, 99, 235, ${alpha})`;
        } else {
            ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
        }
        ctx.fill();
    }
}

// 导出单例 (兼容旧调用)
const instance = new HomeModule();
export const initHomeSplash = () => {
    // 兼容层：如果外部调用 initHomeSplash，我们手动 mount
    // 注意：这意味着我们需要知道 container。
    // 在旧架构中，container 是硬编码的 ID。
    const container = document.getElementById('home-splash-container'); 
    // Home 比较特殊，它的容器 id='home-splash-container' 其实在 panel-home 内部
    // BaseModule 期望传入的是 panel 本身。
    // 这里做个妥协：传入 document.body 或者相关的 wrapper，或者重写 mount
    if (container) instance.mount(container.parentElement); 
};

// 新架构导出
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();