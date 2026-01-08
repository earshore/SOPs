// src/core/state.js

let state = {
  isScraping: false, // <--- 新增这个状态
  currentTab: "scraper",
  currentDataTab: "preview",
  currentReportTab: "report",
  selectedSite: "",
  scrapedData: null,
  analysisReport: null,
  translatedReport: null,
  selectedAsins: [],
  expandedAsin: null,
  isEditing: false,
  showTranslation: false,
  editHistory: [],
  currentHistoryId: null,

  //Prompt工场

  userProductProfile: {
    targetMarket: "",
    keywordsTier1: "",
    keywordsTier2: "",
    audience: "",
    usps: "",
    specs: "",
    socialHook: "",
    negative: "",

    tone: "professional",
    customStrategy: "",
    useRufus: true,
    useEmoji: true,
    useCosmo: true, // ✅ 新增：构建场景化 (COSMO) 默认开启

    selectedReportSections: [],
    charLimit: 5000,
  },

  //trackerDisplay
  keywords: [],
  processedCopy: '',
  formattedCopy: '',
  matchedKeywords: [],
  unmatchedKeywords: [],
  wordFrequency: [],
  paragraphs: [],
  translationMode: false,
  keywordLocationIndex: {},
  settings: {
      matchPlural: true,
      matchStem: false,
      matchCase: false,
      matchPartial: true
  },
  isWindowMinimized: false


};

export default state;
