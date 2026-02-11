import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faPlay, faSpinner, faRobot, faCog, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { cn } from '../utils/cn';

interface AnalysisButtonProps {
  onClick: () => void;
  disabled: boolean;
  isAnalyzing: boolean;
  progress: number;
  currentStep: string;
  selectedCount: number;
}

export function AnalysisButton({
  onClick,
  disabled,
  isAnalyzing,
  progress,
  currentStep,
  selectedCount
}: AnalysisButtonProps) {
  const isComplete = progress >= 100;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-[length:200%_100%]" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-white/20 rounded-full filter blur-[80px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-300/20 rounded-full filter blur-[60px]" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-cyan-300/10 rounded-full filter blur-[40px]" />
      </div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>
      
      <div className="relative p-8">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-5 text-white">
            <div className="relative">
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/20 rounded-2xl animate-ping" style={{ animationDuration: '1.5s' }} />
              )}
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-lg transition-all",
                isAnalyzing ? "bg-white/20" : "bg-white/10"
              )}>
                <FontAwesomeIcon 
                  icon={isComplete ? faCheckCircle : isAnalyzing ? faRobot : faBolt} 
                  className={cn(
                    "w-7 h-7 transition-all",
                    isAnalyzing && "animate-pulse"
                  )} 
                />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-2xl flex items-center gap-3 tracking-tight">
                {isComplete ? '分析完成' : isAnalyzing ? 'AI 正在分析中' : '执行 AI 分析'}
                {isAnalyzing && !isComplete && (
                  <FontAwesomeIcon icon={faCog} className="w-5 h-5 animate-spin opacity-60" />
                )}
              </h3>
              <p className="text-white/70 text-sm mt-1.5 flex items-center gap-2">
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    {currentStep}
                  </span>
                ) : selectedCount > 0 ? (
                  <>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">{selectedCount} 个维度</span>
                    <span>将生成结构化洞察报告</span>
                  </>
                ) : (
                  '请先选择分析目标'
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "relative px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center shadow-2xl btn-press",
              isAnalyzing
                ? "bg-white/20 text-white cursor-wait backdrop-blur-sm border border-white/30"
                : disabled
                  ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
                  : "bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 hover:shadow-white/20 border border-white/50"
            )}
          >
            {isAnalyzing ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
                开始分析
              </>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {isAnalyzing && (
          <div className="mt-8">
            <div className="flex items-center justify-between text-white/80 text-sm mb-3">
              <span className="flex items-center gap-2 font-medium">
                <FontAwesomeIcon icon={faSpinner} className="w-3.5 h-3.5 animate-spin" />
                分析进度
              </span>
              <span className="font-mono font-bold text-lg">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-white via-indigo-200 to-white rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 shimmer" />
                {/* Glowing end cap */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50" />
              </div>
            </div>
            
            {/* Progress milestones */}
            <div className="flex justify-between mt-3 text-xs text-white/50">
              <span className={progress >= 0 ? 'text-white/80' : ''}>数据加载</span>
              <span className={progress >= 33 ? 'text-white/80' : ''}>NLP 处理</span>
              <span className={progress >= 66 ? 'text-white/80' : ''}>洞察生成</span>
              <span className={progress >= 100 ? 'text-white/80' : ''}>完成</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
