// src/modules/home/homeDisplay.ts
// ================================================================
// Home 模块
// ================================================================

import BaseModule from '@/common/BaseModule';
import { setSafeHtml } from '@/common/utils/security';
import { loadTemplate } from '@/common/utils/viewLoader';
import './homeDisplay.css';

interface ParticleConfig {
  spacing: number;
  friction: number;
  spring: number;
  mouseForce: number;
  mouseRadius: number;
}

interface MousePosition {
  x: number;
  y: number;
}

interface FloatingWorkbenchElements {
  workbench: HTMLElement;
  trigger: HTMLButtonElement;
  actions: HTMLElement;
}

interface FloatingWorkbenchState {
  pinnedExpanded: boolean;
  currentExpanded: boolean;
}

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

  update(mouse: MousePosition): void {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < this.config.mouseRadius) {
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

class HomeModule extends BaseModule {
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private particles: Particle[] = [];
  private mouse: MousePosition = { x: -1000, y: -1000 };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private grid: Map<string, Particle[]> = new Map();
  private readonly gridSize = 100;
  private lastFrameTime = 0;
  private readonly targetFPS = 60;
  private readonly frameInterval: number;

  private readonly CONFIG: ParticleConfig = {
    spacing: 50,
    friction: 0.9,
    spring: 0.1,
    mouseForce: 60,
    mouseRadius: 150,
  };

  constructor() {
    super('home');
    this.frameInterval = 1000 / this.targetFPS;
  }

  async render(): Promise<void> {
    if (this.container && !this.container.innerHTML.trim()) {
      const html = await loadTemplate('src/modules/home/homeDisplay.html');
      setSafeHtml(this.container, html);
    }
  }

  async init(): Promise<void> {
    this.updateTime();
    this.setInterval(() => this.updateTime(), 1000);
    this.initFloatingWorkbench();

    const canvas = document.getElementById('particles-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.addEventListener(document, 'mousemove', e => this.handleMouseMove(e as MouseEvent));
    this.initResizeObserver();
    this.animate();
  }

  onUnmount(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private initResizeObserver(): void {
    const container = document.getElementById('home-splash-container');
    if (!container) return;

    this.resizeObserver = new ResizeObserver(entries => {
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

  private initFloatingWorkbench(): void {
    const elements = this.getFloatingWorkbenchElements();
    if (!elements) return;

    const state: FloatingWorkbenchState = {
      pinnedExpanded: false,
      currentExpanded: false,
    };

    this.setFloatingWorkbenchExpanded(elements, state, false);
    this.bindFloatingWorkbenchEvents(elements, state);
  }

  private getFloatingWorkbenchElements(): FloatingWorkbenchElements | null {
    const workbench =
      this.container?.querySelector<HTMLElement>('.floating-workbench') ??
      document.querySelector<HTMLElement>('.floating-workbench');
    const trigger = workbench?.querySelector<HTMLButtonElement>('.floating-workbench__trigger');
    const actions = workbench?.querySelector<HTMLElement>('.floating-workbench__actions');

    if (!workbench || !trigger || !actions) return null;

    return { workbench, trigger, actions };
  }

  private setFloatingWorkbenchExpanded(
    elements: FloatingWorkbenchElements,
    state: FloatingWorkbenchState,
    expanded: boolean
  ): void {
    state.currentExpanded = expanded;
    elements.workbench.classList.toggle('is-expanded', expanded);
    elements.trigger.setAttribute('aria-expanded', String(expanded));
    elements.trigger.setAttribute(
      'aria-label',
      expanded ? '收起应用中心快捷入口' : '展开应用中心快捷入口'
    );
    elements.actions.setAttribute('aria-hidden', String(!expanded));
    elements.actions.toggleAttribute('inert', !expanded);
  }

  private collapseFloatingWorkbench(
    elements: FloatingWorkbenchElements,
    state: FloatingWorkbenchState
  ): void {
    state.pinnedExpanded = false;
    this.setFloatingWorkbenchExpanded(elements, state, false);
  }

  private toggleFloatingWorkbench(
    elements: FloatingWorkbenchElements,
    state: FloatingWorkbenchState
  ): void {
    state.pinnedExpanded = !state.pinnedExpanded;
    this.setFloatingWorkbenchExpanded(elements, state, state.pinnedExpanded);
  }

  private bindFloatingWorkbenchEvents(
    elements: FloatingWorkbenchElements,
    state: FloatingWorkbenchState
  ): void {
    this.addEventListener(elements.trigger, 'click', event => {
      event.stopPropagation();
      this.toggleFloatingWorkbench(elements, state);
    });

    this.addEventListener(elements.actions, 'click', event => {
      if (!this.isFloatingWorkbenchActionTarget(event.target)) return;
      this.collapseFloatingWorkbench(elements, state);
    });

    this.addEventListener(document, 'click', event => {
      if (this.isInsideFloatingWorkbench(event.target, elements.workbench)) return;
      this.collapseFloatingWorkbench(elements, state);
    });

    this.addEventListener(document, 'keydown', event => {
      if (!this.shouldCloseFloatingWorkbenchOnEscape(event, state.currentExpanded)) return;
      this.collapseFloatingWorkbench(elements, state);
      elements.trigger.focus();
    });
  }

  private isFloatingWorkbenchActionTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('.floating-workbench__item, [data-action="switch-tab"]') !== null
    );
  }

  private isInsideFloatingWorkbench(target: EventTarget | null, workbench: HTMLElement): boolean {
    return target instanceof Node && workbench.contains(target);
  }

  private shouldCloseFloatingWorkbenchOnEscape(event: Event, currentExpanded: boolean): boolean {
    return event instanceof KeyboardEvent && event.key === 'Escape' && currentExpanded;
  }

  private updateTime(): void {
    const el = document.getElementById('time-display');
    if (!el) return;

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

  private initParticles(): void {
    this.particles = [];
    this.grid.clear();

    for (let y = 0; y < this.height + this.CONFIG.spacing; y += this.CONFIG.spacing) {
      for (let x = 0; x < this.width + this.CONFIG.spacing; x += this.CONFIG.spacing) {
        const particle = new Particle(x, y, this.CONFIG);
        this.particles.push(particle);
        this.addToGrid(particle);
      }
    }
  }

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

  private getNearbyParticles(particle: Particle): Particle[] {
    const gridX = Math.floor(particle.x / this.gridSize);
    const gridY = Math.floor(particle.y / this.gridSize);
    const nearby: Particle[] = [];

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

  private animate(currentTime = 0): void {
    if (!this.isMounted) return;

    const elapsed = currentTime - this.lastFrameTime;
    if (elapsed < this.frameInterval) {
      this.animationFrameId = requestAnimationFrame(t => this.animate(t));
      return;
    }
    this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    this.grid.clear();

    this.particles.forEach(p => {
      p.update(this.mouse);
      this.addToGrid(p);
      p.draw(ctx);
    });

    this.drawConnections();

    this.animationFrameId = requestAnimationFrame(t => this.animate(t));
  }

  private drawConnections(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.lineWidth = 0.5;

    const connectDistSq = Math.pow(this.CONFIG.spacing * 1.2, 2);
    const mouseRadiusSq = Math.pow(this.CONFIG.mouseRadius + 50, 2);
    const drawn = new Set<string>();

    this.particles.forEach(p => {
      const dToMouseSq = Math.pow(p.x - this.mouse.x, 2) + Math.pow(p.y - this.mouse.y, 2);

      if (dToMouseSq < mouseRadiusSq) {
        const nearby = this.getNearbyParticles(p);

        nearby.forEach(p2 => {
          if (p === p2) return;

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

const instance = new HomeModule();

export const initHomeSplash = (): void => {
  const container = document.getElementById('home-splash-container');
  if (container?.parentElement) {
    instance.mount(container.parentElement);
  }
};

export const mount = (container: HTMLElement): void => {
  instance.mount(container);
};

export const unmount = (): void => {
  instance.unmount();
};
