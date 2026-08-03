// TD-SET-01 Phase 1: appearance section fragment (verbatim).
import { AnimationSpeed } from '@/types/animation-types';
import { SettingsPanelPart } from '../panelTypes';
import { ThemeManager, THEME_PRESETS, type ColorMode } from '@/common/config/themeConfig';
import { animationSettingsStore, getAnimationSettings } from '@/stores/animation-settings';

export const appearanceSectionBehavior: SettingsPanelPart = {
  get appearanceThemeOptions(): Array<{ id: string; name: string; description?: string }> {
    return Object.values(THEME_PRESETS).map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
    }));
  },

  loadAppearanceSettings(): void {
    this.appearanceThemeId = ThemeManager.getCurrentTheme();
    this.appearanceColorMode = ThemeManager.getCurrentColorMode();
    const anim = getAnimationSettings();
    this.appearanceAnimationsEnabled = anim.enabled;
    this.appearanceAnimationSpeed = anim.speed;
    this.appearanceRespectSystemPreference = anim.respectSystemPreference;
  },

  get appearanceColorModeIsSystem(): boolean {
    return this.appearanceColorMode === 'system';
  },

  /** e.g. "（当前为深色）" — re-resolves on appearanceColorModeRev bumps. */
  get appearanceColorModeSystemHint(): string {
    void this.appearanceColorModeRev;
    if (this.appearanceColorMode !== 'system') return '';
    return ThemeManager.getResolvedColorMode() === 'dark' ? '（当前为深色）' : '（当前为浅色）';
  },

  setAppearanceTheme(themeId: string): void {
    // Instant accent swap: avoid CSS var transition that feels laggy vs segmented radios.
    ThemeManager.applyTheme(themeId, { animate: false });
    this.appearanceThemeId = ThemeManager.getCurrentTheme();
  },

  setAppearanceThemeFromEvent(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value;
    if (typeof value === 'string' && value) {
      this.setAppearanceTheme(value);
    }
  },

  setAppearanceColorMode(mode: ColorMode): void {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
    ThemeManager.applyColorMode(mode);
    this.appearanceColorMode = ThemeManager.getCurrentColorMode();
  },

  setAppearanceAnimationsEnabled(event: Event): void {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
    if (checked) {
      animationSettingsStore.getState().enableAnimations();
    } else {
      animationSettingsStore.getState().disableAnimations();
    }
    this.loadAppearanceSettings();
  },

  setAppearanceAnimationSpeed(speed: AnimationSpeed): void {
    if (speed !== 'fast' && speed !== 'normal' && speed !== 'slow') return;
    animationSettingsStore.getState().setAnimationSpeed(speed);
    this.loadAppearanceSettings();
  },

  setAppearanceRespectSystemPreference(event: Event): void {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
    animationSettingsStore.getState().setRespectSystemPreference(checked);
    this.loadAppearanceSettings();
  },
};
