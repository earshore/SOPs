import { useState, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faBoxOpen, faStar, faDatabase, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { Header } from './components/Header';
import { ASINInput } from './components/ASINInput';
import { TargetSelector } from './components/TargetSelector';
import { AnalysisButton } from './components/AnalysisButton';
import { ResultsGrid } from './components/ResultsGrid';
import { PromptPreviewPanel } from './components/PromptPreview';
import { analysisTargets } from './data/analysisTargets';
import { generateRealDataResults } from './data/mockAnalysisResults';
import { sampleProductData, getProductByAsin, getAvailableAsins } from './data/sampleData';
import { generateAnalysisPrompt, getTaskDefinition } from './prompts/analysisPrompts';
import { AnalysisResult } from './types/analysis';

export function App() {
  const availableAsins = getAvailableAsins();
  const [asin, setAsin] = useState(availableAsins[0] || 'B0DNMZ2MLG');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // 获取当前产品数据
  const currentProduct = useMemo(() => getProductByAsin(asin), [asin]);

  // 生成提示词预览
  const generatedPrompts = useMemo(() => {
    if (!currentProduct || selectedTargets.length === 0) return [];
    
    return selectedTargets.map(targetId => {
      const taskDef = getTaskDefinition(targetId);
      if (!taskDef) return null;
      
      try {
        const prompt = generateAnalysisPrompt(targetId, currentProduct, 'en');
        return {
          taskId: targetId,
          taskName: taskDef.name,
          prompt
        };
      } catch {
        return null;
      }
    }).filter((p): p is { taskId: string; taskName: string; prompt: string } => p !== null);
  }, [currentProduct, selectedTargets]);

  const handleToggleTarget = useCallback((id: string) => {
    setSelectedTargets(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTargets(analysisTargets.map(t => t.id));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTargets([]);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (selectedTargets.length === 0 || !currentProduct) return;

    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);

    const steps = [
      '正在连接 AI 分析引擎...',
      `正在加载产品数据 (ASIN: ${asin})...`,
      `正在解析 ${currentProduct.feature_bullets.length} 条 Bullet Points...`,
      `正在分析 ${currentProduct.customer_reviews.length} 条用户评论...`,
      '正在执行自然语言处理...',
      '正在生成结构化洞察...',
      '分析完成！'
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress((i / (steps.length - 1)) * 100);
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));
    }

    const analysisResults = generateRealDataResults(selectedTargets, currentProduct);
    setResults(analysisResults);
    setIsAnalyzing(false);
  }, [selectedTargets, asin, currentProduct]);

  const isButtonDisabled = selectedTargets.length === 0 || !currentProduct || isAnalyzing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 数据源提示 */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">数据源已加载：</span>
              包含 {sampleProductData.products.length} 个产品，
              共 {sampleProductData.products.reduce((acc, p) => acc + p.customer_reviews.length, 0)} 条评论
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <FontAwesomeIcon icon={faGlobe} className="w-3 h-3" />
              市场: {sampleProductData.metadata.marketplace} · 
              抓取时间: {new Date(sampleProductData.metadata.scrape_timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-4">
            <ASINInput 
              value={asin} 
              onChange={setAsin}
              disabled={isAnalyzing}
              availableAsins={availableAsins}
              currentProduct={currentProduct}
            />
          </div>
          <div className="lg:col-span-8">
            <TargetSelector
              targets={analysisTargets}
              selectedIds={selectedTargets}
              onToggle={handleToggleTarget}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              disabled={isAnalyzing}
            />
          </div>
        </div>

        {/* Prompt Preview */}
        {selectedTargets.length > 0 && currentProduct && (
          <div className="mb-8">
            <PromptPreviewPanel prompts={generatedPrompts} />
          </div>
        )}

        {/* Analysis Button */}
        <div className="mb-10">
          <AnalysisButton
            onClick={runAnalysis}
            disabled={isButtonDisabled}
            isAnalyzing={isAnalyzing}
            progress={progress}
            currentStep={currentStep}
            selectedCount={selectedTargets.length}
          />
        </div>

        {/* Results */}
        <ResultsGrid results={results} asin={asin} />

        {/* Empty State */}
        {results.length === 0 && !isAnalyzing && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-8 shadow-inner">
              <FontAwesomeIcon icon={faLightbulb} className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-3">准备开始智能分析</h3>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
              选择分析目标并确认 ASIN，点击"开始分析"按钮，
              <br />AI 将自动提取 Listings 和 Reviews 中的关键洞察
            </p>
            <div className="mt-10 flex items-center justify-center gap-8">
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
                  <FontAwesomeIcon icon={faBoxOpen} className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-700">Listings 分析</div>
                  <div className="text-xs text-slate-400">标题与卖点洞察</div>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
                  <FontAwesomeIcon icon={faStar} className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-700">Reviews 分析</div>
                  <div className="text-xs text-slate-400">用户评论深度挖掘</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 mt-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
              <span className="text-sm text-slate-600 font-medium">InsightAI 智能分析平台</span>
            </div>
            <p className="text-sm text-slate-400">
              基于大语言模型的电商产品洞察工具 · 让数据驱动决策
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
