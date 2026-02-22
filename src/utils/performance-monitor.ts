/**
 * 性能监控器
 * 监控动画性能并在必要时降级
 */
export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private threshold: number;
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private performanceDropCallbacks: Array<() => void> = [];

  /**
   * 初始化性能监控
   * @param threshold - FPS阈值（默认55）
   */
  constructor(threshold: number = 55) {
    this.threshold = threshold;
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.measureFrame();
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number {
    return this.fps;
  }

  /**
   * 检查性能是否低于阈值
   */
  isPerformanceLow(): boolean {
    return this.fps < this.threshold;
  }

  /**
   * 注册性能降级回调
   * @param callback - 回调函数
   */
  onPerformanceDrop(callback: () => void): void {
    this.performanceDropCallbacks.push(callback);
  }

  /**
   * 测量帧率
   */
  private measureFrame(): void {
    if (!this.isMonitoring) {
      return;
    }

    const currentTime = performance.now();
    this.frameCount++;

    // 每秒计算一次FPS
    const elapsed = currentTime - this.lastTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = currentTime;

      // 检查性能是否低于阈值
      if (this.isPerformanceLow()) {
        this.triggerPerformanceDropCallbacks();
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.measureFrame());
  }

  /**
   * 触发性能降级回调
   */
  private triggerPerformanceDropCallbacks(): void {
    this.performanceDropCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Performance drop callback error:', error);
      }
    });
  }
}
