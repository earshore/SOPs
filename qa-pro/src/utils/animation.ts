/**
 * 计数器动画
 */
export function animateCounters(): void {
  document.querySelectorAll('.count-up').forEach((el) => {
    const target = parseInt(el.getAttribute('data-target') || '0');
    let current = 0;
    const increment = target / 30;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target.toString();
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current).toString();
      }
    }, 40);
  });
}

/**
 * 交叉观察器动画
 */
export function setupIntersectionObserver(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.qa-card, .stat-card, .insight-tag').forEach((el) => {
    observer.observe(el);
  });
}
