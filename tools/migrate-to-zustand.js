#!/usr/bin/env node
/**
 * 批量迁移脚本：将 state.xxx 替换为 appStore.getState().xxx
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/modules/app_center/views/keyword_hunter/process/index.ts',
  'src/modules/app_center/views/keyword_hunter/analysis/index.ts',
  'src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts',
  'src/modules/app_center/views/master_analysis/scraper/components/HistoryPanel.ts',
  'src/modules/app_center/views/master_analysis/services/historyService.ts',
  'src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/helpers.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/computedProperties.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/index.ts',
  'src/common/ui/navigation.ts',
  'src/common/ui/search.ts',
  'src/common/components/SidebarRenderer.ts',
];

const replacements = [
  // Import 替换
  {
    from: /import state from ['"].*?common\/state['"]/g,
    to: "import { appStore } from '@/stores/useAppStore'"
  },
  {
    from: /import state from ['"]@common\/state['"]/g,
    to: "import { appStore } from '@/stores/useAppStore'"
  },
  // 读取替换
  {
    from: /state\.ui\.(\w+)/g,
    to: "appStore.getState().ui.$1"
  },
  {
    from: /state\.scraper\.(\w+)/g,
    to: "appStore.getState().scraper.$1"
  },
  {
    from: /state\.analysis\.(\w+)/g,
    to: "appStore.getState().analysis.$1"
  },
  {
    from: /state\.promptlab\.(\w+)/g,
    to: "appStore.getState().promptlab.$1"
  },
  {
    from: /state\.keywordTracker\.(\w+)/g,
    to: "appStore.getState().keywordTracker.$1"
  },
  // 写入替换 (需要特殊处理)
  {
    from: /appStore\.getState\(\)\.ui\.(\w+)\s*=\s*(.+?);/g,
    to: (match, prop, value) => {
      const setterMap = {
        currentTab: 'setCurrentTab',
        currentDataTab: 'setCurrentDataTab',
        currentReportTab: 'setCurrentReportTab',
        sidebarCollapsed: 'setSidebarCollapsed',
        theme: 'setTheme',
        loading: 'setLoading'
      };
      return setterMap[prop] 
        ? `appStore.getState().${setterMap[prop]}(${value});`
        : `appStore.getState().updateUI({ ${prop}: ${value} });`;
    }
  },
  {
    from: /appStore\.getState\(\)\.scraper\.(\w+)\s*=\s*(.+?);/g,
    to: (match, prop, value) => {
      const setterMap = {
        isScraping: 'setIsScraping',
        status: 'setScraperStatus',
        selectedSite: 'setSelectedSite',
        scrapedData: 'setScrapedData',
        currentHistoryId: 'setCurrentHistoryId'
      };
      return setterMap[prop]
        ? `appStore.getState().${setterMap[prop]}(${value});`
        : `appStore.getState().updateScraper({ ${prop}: ${value} });`;
    }
  },
  {
    from: /appStore\.getState\(\)\.analysis\.(\w+)\s*=\s*(.+?);/g,
    to: (match, prop, value) => {
      const setterMap = {
        selectedAsins: 'setSelectedAsins',
        reportData: 'setReportData',
        analysisReport: 'setAnalysisReport',
        translatedReport: 'setTranslatedReport',
        expandedAsin: 'setExpandedAsin',
        isEditing: 'setIsEditing',
        showTranslation: 'setShowTranslation'
      };
      return setterMap[prop]
        ? `appStore.getState().${setterMap[prop]}(${value});`
        : `appStore.getState().updateAnalysis({ ${prop}: ${value} });`;
    }
  },
  {
    from: /appStore\.getState\(\)\.keywordTracker\.(\w+)\s*=\s*(.+?);/g,
    to: (match, prop, value) => {
      const setterMap = {
        keywords: 'setKeywords',
        processedCopy: 'setProcessedCopy',
        formattedCopy: 'setFormattedCopy',
        matchedKeywords: 'setMatchedKeywords',
        unmatchedKeywords: 'setUnmatchedKeywords',
        translationMode: 'setTranslationMode'
      };
      return setterMap[prop]
        ? `appStore.getState().${setterMap[prop]}(${value});`
        : `appStore.getState().updateKeywordTracker({ ${prop}: ${value} });`;
    }
  }
];

function migrateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  跳过: ${filePath} (文件不存在)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  replacements.forEach(({ from, to }) => {
    if (typeof to === 'function') {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    } else {
      if (from.test(content)) {
        content = content.replace(from, to);
        changed = true;
      }
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ 已迁移: ${filePath}`);
  } else {
    console.log(`⏭️  无需更改: ${filePath}`);
  }
}

console.log('🚀 开始批量迁移...\n');
files.forEach(migrateFile);
console.log('\n✨ 迁移完成!');
