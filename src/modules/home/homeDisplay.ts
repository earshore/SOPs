// src/modules/home/homeDisplay.ts
// ================================================================
// 🎯 Home 模块 (TypeScript版本)
// ================================================================

import BaseModule from '@/common/BaseModule';
import { setSafeHtml } from '@/common/utils/security';
import { loadTemplate } from '@/common/utils/viewLoader';
import './homeDisplay.css';

/**
 * 粒子配置接口
 */
interface ParticleConfig {
  spacing: number;
  friction: number;
  spring: number;
  mouseForce: number;
  mouseRadius: number;
  connectDist: number;
}

/**
 * 鼠标位置接口
 */
interface MousePosition {
  x: number;
  y: number;
}

/**
 * 粒子类
 */
class Particle {
  private static idCounter = 0;

  public readonly id: number;
  public readonly ox: number;
  public readonly oy: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  private readonly config: ParticleConfig;

  constructor(x: number, y: number, config: ParticleConfig) {
    this.id = Particle.idCounter++;
    this.ox = x;
    this.oy = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.config = config;
  }

  /**
   * 更新粒子位置
   */
  update(mouse: MousePosition): void {
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

  /**
   * 绘制粒子
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const speed = Math.hypot(this.vx, this.vy);
    let alpha = 0.05 + speed * 0.15;
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

/**
 * Home 模块类
 */
class HomeModule extends BaseModule {
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private particles: Particle[] = [];
  private mouse: MousePosition = { x: -1000, y: -1000 };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  // 🎯 性能优化: 空间分区网格
  private grid: Map<string, Particle[]> = new Map();
  private readonly gridSize = 100;

  // 🎯 性能优化: 帧率控制
  private lastFrameTime = 0;
  private readonly targetFPS = 60;
  private readonly frameInterval: number;

  // 动画配置
  private readonly CONFIG: ParticleConfig = {
    spacing: 50,
    friction: 0.9,
    spring: 0.1,
    mouseForce: 60,
    mouseRadius: 150,
    connectDist: 60,
  };

  constructor() {
    super('home');
    this.frameInterval = 1000 / this.targetFPS;
  }

  /**
   * 渲染模块内容
   */
  async render(): Promise<void> {
    if (this.container && !this.container.innerHTML.trim()) {
      const html = await loadTemplate('src/modules/home/homeDisplay.html');
      // ✅ 安全: 静态HTML模板，无用户输入
      setSafeHtml(this.container, html);
    }
  }

  /**
   * 初始化模块
   */
  async init(): Promise<void> {
    const canvas = document.getElementById('particles-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    // 1. 绑定事件 (自动清理)
    this.addEventListener(document, 'mousemove', e => this.handleMouseMove(e as MouseEvent));

    // 2. 初始化尺寸监听 (手动清理)
    this.initResizeObserver();

    // 3. 启动时钟 (自动清理)
    this.updateTime();
    this.setInterval(() => this.updateTime(), 1000);

    // 4. 启动动画循环
    this.animate();
  }

  /**
   * 卸载模块时的清理工作
   */
  onUnmount(): void {
    // 1. 停止动画循环
    if (this.animationFrameId !== null) {
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

  /**
   * 初始化尺寸监听器
   */
  private initResizeObserver(): void {
    const container = document.getElementById('home-splash-container');
    if (!container) return;

    this.resizeObserver = new ResizeObserver(entries => {
      // 使用 requestAnimationFrame 避免 Resize Loop Error
      window.requestAnimationFrame(() => {
        if (!entries.length || !entries[0]) return;
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

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove(e: MouseEvent): void {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;

    const heroContent = document.getElementById('hero-content');

    if (heroContent) {
      const moveX = (window.innerWidth / 2 - this.mouse.x) * 0.01;
      const moveY = (window.innerHeight / 2 - this.mouse.y) * 0.01;
      heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
  }

  /**
   * 更新时间显示
   */
  private updateTime(): void {
    const el = document.getElementById('time-display');
    if (el) {
      const now = new Date();
      const dateStr = now
        .toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/-/g, '.');
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      el.textContent = `${dateStr} | ${timeStr}`;
    }
  }

  // ================= Animation System =================

  /**
   * 初始化粒子系统
   */
  private initParticles(): void {
    this.particles = [];
    this.grid.clear();

    for (let y = 0; y < this.height + this.CONFIG.spacing; y += this.CONFIG.spacing) {
      for (let x = 0; x < this.width + this.CONFIG.spacing; x += this.CONFIG.spacing) {
        const particle = new Particle(x, y, this.CONFIG);
        this.particles.push(particle);

        // 🎯 性能优化: 将粒子加入空间网格
        this.addToGrid(particle);
      }
    }
  }

  /**
   * 🎯 性能优化: 空间分区 - 添加粒子到网格
   */
  private addToGrid(particle: Particle): void {
    const gridX = Math.floor(particle.x / this.gridSize);
    const gridY = Math.floor(particle.y / this.gridSize);
    const key = `${gridX},${gridY}`;

    let bucket = this.grid.get(key);
    if (!bucket) {
      bucket = [];
      this.grid.set(key, bucket);
    }
    bucket.push(particle);
  }

  /**
   * 🎯 性能优化: 获取粒子周围的网格单元
   */
  private getNearbyParticles(particle: Particle): Particle[] {
    const gridX = Math.floor(particle.x / this.gridSize);
    const gridY = Math.floor(particle.y / this.gridSize);
    const nearby: Particle[] = [];

    // 检查周围9个网格
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const bucket = this.grid.get(key);
        if (bucket) {
          nearby.push(...bucket);
        }
      }
    }

    return nearby;
  }

  /**
   * 动画循环
   */
  private animate(currentTime = 0): void {
    if (!this.isMounted) return; // BaseModule 提供的标志位

    // 🎯 性能优化: 帧率控制，避免过度渲染
    const elapsed = currentTime - this.lastFrameTime;
    if (elapsed < this.frameInterval) {
      this.animationFrameId = requestAnimationFrame(t => this.animate(t));
      return;
    }
    this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    // 🎯 性能优化: 重建空间网格
    this.grid.clear();

    // 更新粒子并重新加入网格
    this.particles.forEach(p => {
      p.update(this.mouse);
      this.addToGrid(p);
      p.draw(ctx);
    });

    this.drawConnections();

    this.animationFrameId = requestAnimationFrame(t => this.animate(t));
  }

  /**
   * 绘制粒子连接线
   */
  private drawConnections(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.lineWidth = 0.5;

    // 🎯 性能优化: 使用空间分区，避免 O(n²) 复杂度
    const connectDistSq = Math.pow(this.CONFIG.spacing * 1.2, 2);
    const mouseRadiusSq = Math.pow(this.CONFIG.mouseRadius + 50, 2);
    const drawn = new Set<string>(); // 避免重复绘制

    this.particles.forEach(p => {
      const dToMouseSq = Math.pow(p.x - this.mouse.x, 2) + Math.pow(p.y - this.mouse.y, 2);

      // 只处理鼠标附近的粒子
      if (dToMouseSq < mouseRadiusSq) {
        // 🎯 只检查附近网格的粒子，而不是全部粒子
        const nearby = this.getNearbyParticles(p);

        nearby.forEach(p2 => {
          if (p === p2) return;

          // 避免重复绘制 (A->B 和 B->A)
          const pairKey = p.id < p2.id ? `${p.id}-${p2.id}` : `${p2.id}-${p.id}`;
          if (drawn.has(pairKey)) return;

          const distSq = Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2);
          if (distSq < connectDistSq) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            drawn.add(pairKey);
          }
        });
      }
    });
    ctx.stroke();
  }
}

// 导出单例 (兼容旧调用)
const instance = new HomeModule();

/**
 * 兼容层：初始化 Home Splash
 * @deprecated 使用 mount() 代替
 */
export const initHomeSplash = (): void => {
  const container = document.getElementById('home-splash-container');
  if (container && container.parentElement) {
    instance.mount(container.parentElement);
  }
};

/**
 * 挂载模块
 */
export const mount = (container: HTMLElement): void => {
  instance.mount(container);
};

/**
 * 卸载模块
 */
export const unmount = (): void => {
  instance.unmount();
};
