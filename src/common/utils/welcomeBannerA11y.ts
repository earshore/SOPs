const BANNER_SELECTOR = '.wb-container, .ppc-hero, .zn-hero, .zn-notice-title';
const DECORATIVE_SELECTOR = [
  '.wb-orb',
  '.wb-particle',
  '.wb-grid-pattern',
  '.wb-bg-gradient',
  '.wb-icon',
  '.wb-icon-main',
  '.wb-icon-badge',
  '.wb-icon-ring',
  '.wb-tag-dot',
  '.wb-badge i',
  '.ppc-hero-icon',
  '.ppc-tag-dot',
  '.ppc-stat-label i',
].join(', ');
const SIMPLE_BANNER_STATIC_DECORATION_SELECTOR =
  '.wb-orb, .wb-particle, .wb-grid-pattern, .wb-bg-gradient';

let generatedTitleId = 0;

function findBannerTitle(banner: HTMLElement): HTMLElement | null {
  return banner.querySelector<HTMLElement>('.wb-title, h1, h2, h3');
}

function ensureTitleId(title: HTMLElement): string {
  if (title.id) {
    return title.id;
  }

  generatedTitleId += 1;
  title.id = `welcome-banner-title-${generatedTitleId}`;
  return title.id;
}

function collectBanners(root: HTMLElement): HTMLElement[] {
  const banners = Array.from(root.querySelectorAll<HTMLElement>(BANNER_SELECTOR));
  if (root.matches(BANNER_SELECTOR)) {
    banners.unshift(root);
  }
  return banners;
}

export function normalizeWelcomeBanners(root: HTMLElement): void {
  collectBanners(root).forEach(banner => {
    if (!banner.hasAttribute('role') && banner.tagName !== 'SECTION') {
      banner.setAttribute('role', 'region');
    }

    if (!banner.hasAttribute('aria-labelledby')) {
      const title = findBannerTitle(banner);
      if (title) {
        banner.setAttribute('aria-labelledby', ensureTitleId(title));
      }
    }

    banner.querySelectorAll<HTMLElement>(DECORATIVE_SELECTOR).forEach(decorativeElement => {
      decorativeElement.setAttribute('aria-hidden', 'true');
      decorativeElement.setAttribute('role', 'presentation');
    });

    if (banner.classList.contains('wb-container--simple')) {
      banner
        .querySelectorAll<HTMLElement>(SIMPLE_BANNER_STATIC_DECORATION_SELECTOR)
        .forEach(decorativeElement => {
          decorativeElement.remove();
        });
    }
  });
}
