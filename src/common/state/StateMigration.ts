// src/common/state/StateMigration.ts
// ================================================================
// 🎯 状态迁移适配器
// 提供从旧Proxy状态到Zustand的平滑迁移路径
// ================================================================

import { appStore } from '@/stores/useAppStore';
import type { AppState } from '@/types/state';

/**
 * 状态迁移适配器
 * 将旧的Proxy状态API映射到Zustand store
 */
class StateMigrationAdapter {
  private deprecationWarnings = new Set<string>();

  /**
   * 显示弃用警告（每个属性只警告一次）
   */
  private warnDeprecation(path: string, suggestion: string): void {
    if (this.deprecationWarnings.has(path)) return;
    
    this.deprecationWarnings.add(path);
    
    if (import.meta.env.DEV) {
      console.warn(
        `[StateMigration] 弃用警告: state.${path} 已废弃\n` +
        `建议: ${suggestion}\n` +
        `此警告在生产环境不会显示`
      );
    }
  }

  /**
   * 创建兼容的Proxy状态对象
   */
  createCompatState(): AppState {
    const self = this;
    
    return new Proxy({} as AppState, {
      get(_target, prop: string) {
        const state = appStore.getState();
        
        // UI状态
        if (prop === 'ui') {
          return new Proxy(state.ui, {
            get(_uiTarget, uiProp: string) {
              self.warnDeprecation(
                `ui.${uiProp}`,
                `使用 appStore.getState().ui.${uiProp} 或 selectors.${uiProp}(appStore.getState())`
              );
              return state.ui[uiProp as keyof typeof state.ui];
            },
            set(_uiTarget, uiProp: string, value) {
              self.warnDeprecation(
                `ui.${uiProp}`,
                `使用 appStore.getState().updateUI({ ${uiProp}: value })`
              );
              
              // 映射到Zustand action
              if (uiProp === 'currentTab') {
                appStore.getState().setCurrentTab(value);
              } else if (uiProp === 'currentDataTab') {
                appStore.getState().setCurrentDataTab(value);
              } else if (uiProp === 'currentReportTab') {
                appStore.getState().setCurrentReportTab(value);
              } else {
                appStore.getState().updateUI({ [uiProp]: value });
              }
              
              return true;
            }
          });
        }
        
        // Scraper状态
        if (prop === 'scraper') {
          return new Proxy(state.scraper, {
            get(_scraperTarget, scraperProp: string) {
              self.warnDeprecation(
                `scraper.${scraperProp}`,
                `使用 appStore.getState().scraper.${scraperProp}`
              );
              return state.scraper[scraperProp as keyof typeof state.scraper];
            },
            set(_scraperTarget, scraperProp: string, value) {
              self.warnDeprecation(
                `scraper.${scraperProp}`,
                `使用 appStore.getState().updateScraper({ ${scraperProp}: value })`
              );
              
              // 映射到Zustand action
              if (scraperProp === 'isScraping') {
                appStore.getState().setIsScraping(value);
              } else if (scraperProp === 'selectedSite') {
                appStore.getState().setSelectedSite(value);
              } else if (scraperProp === 'scrapedData') {
                appStore.getState().setScrapedData(value);
              } else if (scraperProp === 'currentHistoryId') {
                appStore.getState().setCurrentHistoryId(value);
              } else if (scraperProp === 'status') {
                appStore.getState().setScraperStatus(value);
              } else {
                // 处理其他属性: inputAsins, progress, error, expandedAsin, currentDataTab
                appStore.getState().updateScraper({ [scraperProp]: value });
              }
              
              return true;
            }
          });
        }
        
        // Analysis状态
        if (prop === 'analysis') {
          return new Proxy(state.analysis, {
            get(_analysisTarget, analysisProp: string) {
              self.warnDeprecation(
                `analysis.${analysisProp}`,
                `使用 appStore.getState().analysis.${analysisProp}`
              );
              return state.analysis[analysisProp as keyof typeof state.analysis];
            },
            set(_analysisTarget, analysisProp: string, value) {
              self.warnDeprecation(
                `analysis.${analysisProp}`,
                `使用 appStore.getState().updateAnalysis({ ${analysisProp}: value })`
              );
              
              // 映射到Zustand action
              if (analysisProp === 'selectedAsins') {
                appStore.getState().setSelectedAsins(value);
              } else if (analysisProp === 'analysisReport') {
                appStore.getState().setAnalysisReport(value);
              } else if (analysisProp === 'translatedReport') {
                appStore.getState().setTranslatedReport(value);
              } else if (analysisProp === 'expandedAsin') {
                appStore.getState().setExpandedAsin(value);
              } else if (analysisProp === 'isEditing') {
                appStore.getState().setIsEditing(value);
              } else if (analysisProp === 'showTranslation') {
                appStore.getState().setShowTranslation(value);
              } else {
                appStore.getState().updateAnalysis({ [analysisProp]: value });
              }
              
              return true;
            }
          });
        }
        
        // PromptLab状态
        if (prop === 'promptlab') {
          return new Proxy(state.promptlab, {
            get(_promptlabTarget, promptlabProp: string) {
              self.warnDeprecation(
                `promptlab.${promptlabProp}`,
                `使用 appStore.getState().promptlab.${promptlabProp}`
              );
              return state.promptlab[promptlabProp as keyof typeof state.promptlab];
            },
            set(_promptlabTarget, promptlabProp: string, value) {
              self.warnDeprecation(
                `promptlab.${promptlabProp}`,
                `使用 appStore.getState().updatePromptLab({ ${promptlabProp}: value })`
              );
              
              // 映射到Zustand action
              if (promptlabProp === 'currentPrompt') {
                appStore.getState().setCurrentPrompt(value);
              } else if (promptlabProp === 'userProductProfile') {
                appStore.getState().setUserProductProfile(value);
              } else if (promptlabProp === 'selectedModel') {
                appStore.getState().setSelectedModel(value);
              } else {
                appStore.getState().updatePromptLab({ [promptlabProp]: value });
              }
              
              return true;
            }
          });
        }
        
        // KeywordTracker状态
        if (prop === 'keywordTracker') {
          return new Proxy(state.keywordTracker, {
            get(_keywordTrackerTarget, keywordTrackerProp: string) {
              self.warnDeprecation(
                `keywordTracker.${keywordTrackerProp}`,
                `使用 appStore.getState().keywordTracker.${keywordTrackerProp}`
              );
              return state.keywordTracker[keywordTrackerProp as keyof typeof state.keywordTracker];
            },
            set(_keywordTrackerTarget, keywordTrackerProp: string, value) {
              self.warnDeprecation(
                `keywordTracker.${keywordTrackerProp}`,
                `使用 appStore.getState().updateKeywordTracker({ ${keywordTrackerProp}: value })`
              );
              
              // 映射到Zustand action
              if (keywordTrackerProp === 'keywords') {
                appStore.getState().setKeywords(value);
              } else if (keywordTrackerProp === 'processedCopy') {
                appStore.getState().setProcessedCopy(value);
              } else if (keywordTrackerProp === 'formattedCopy') {
                appStore.getState().setFormattedCopy(value);
              } else if (keywordTrackerProp === 'matchedKeywords') {
                appStore.getState().setMatchedKeywords(value);
              } else if (keywordTrackerProp === 'unmatchedKeywords') {
                appStore.getState().setUnmatchedKeywords(value);
              } else if (keywordTrackerProp === 'translationMode') {
                appStore.getState().setTranslationMode(value);
              } else if (keywordTrackerProp === 'settings') {
                appStore.getState().updateKeywordTrackerSettings(value);
              } else {
                // 处理其他属性: wordFrequency, paragraphs, keywordLocationIndex, isWindowMinimized, 
                // trackingData, isTracking, keywordsInputText, copyInputText, llmAnalysisResult, showTranslation
                appStore.getState().updateKeywordTracker({ [keywordTrackerProp]: value });
              }
              
              return true;
            }
          });
        }
        
        // MasterPrompt状态（向后兼容）
        if (prop === 'masterPrompt') {
          self.warnDeprecation(
            'masterPrompt',
            '使用 appStore.getState() 直接访问各模块状态'
          );
          
          return {
            scraper: state.scraper,
            analysis: state.analysis,
            promptlab: state.promptlab
          };
        }
        
        return undefined;
      },
      
      set(_target, prop: string, _value) {
        console.error(
          `[StateMigration] 不支持直接设置 state.${prop}\n` +
          `请使用 appStore.getState() 的相应action方法`
        );
        return false;
      }
    });
  }

  /**
   * 获取弃用警告统计
   */
  getDeprecationStats(): { total: number; warnings: string[] } {
    return {
      total: this.deprecationWarnings.size,
      warnings: Array.from(this.deprecationWarnings)
    };
  }

  /**
   * 清除弃用警告记录
   */
  clearDeprecationWarnings(): void {
    this.deprecationWarnings.clear();
  }
}

// 创建单例
export const stateMigration = new StateMigrationAdapter();

// 创建兼容状态对象
export const compatState = stateMigration.createCompatState();

export default compatState;
