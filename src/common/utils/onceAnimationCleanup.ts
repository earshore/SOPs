/**
 * One-shot animation cleanup.
 *
 * One-shot CSS animations (slideRight, fadeInScale, fade-in-down/…) are driven
 * by classes that stay on the element forever. When Alpine or ThemeManager
 * later rewrites DOM attributes (e.g. a light/dark theme flip), the style
 * recalculation re-matches those rules and the animations **replay** — the
 * page flickers on every theme switch.
 *
 * This module registers a document-level listener that removes the trigger
 * class as soon as the animation ends. The final state of every registered
 * animation equals the element's default styles, so clearing the class causes
 * no visual snap-back.
 *
 * IMPORTANT: add new one-shot animation classes here as they appear — keep
 * infinite (`animation-iteration-count: infinite`) classes OUT of this list.
 */
const ONCE_ANIMATION_CLASSES = new Set<string>([
  'toast-slide-in',
  'fade-in-scale',
  'fade-in-down',
  'fade-in-left',
  'fade-in-right',
  'animate-fade-in-scale',
  'warning-banner', // scraper: fadeInScale 一次性入场，见 scraper_style.css
]);

let installed = false;

export function installOnceAnimationCleanup(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener(
    'animationstart',
    e => {
      const target = e.target as HTMLElement;
      if (!target || !target.classList) return;

      // The element itself, or an ancestor, carries a one-shot class whose
      // rule is driving this animation.
      let host: HTMLElement | null = target;
      while (host) {
        for (const cls of host.classList) {
          if (ONCE_ANIMATION_CLASSES.has(cls)) {
            // Watch the *host's* animationend so we clear the class only
            // after the animation actually applied to it finishes.
            const clearClass = (): void => {
              host?.classList.remove(cls);
            };
            host.addEventListener('animationend', clearClass, {
              once: true,
              passive: true,
            });
            return;
          }
        }
        host = host.parentElement;
      }
    },
    { passive: true }
  );
}
