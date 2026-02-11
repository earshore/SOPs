import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faBoxOpen, faStar, faDownload, faFileExport, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { AnalysisResult } from '../types/analysis';
import { ResultWidget } from './ResultWidget';

interface ResultsGridProps {
  results: AnalysisResult[];
  asin: string;
}

export function ResultsGrid({ results, asin }: ResultsGridProps) {
  if (results.length === 0) {
    return null;
  }

  const listingsResults = results.filter(r => r.source === 'Listings');
  const reviewsResults = results.filter(r => r.source === 'Reviews');

  return (
    <div className="space-y-10">
      {/* Results Header */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full filter blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full filter blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-purple-500/10 rounded-full filter blur-[60px]" />
        </div>
        
        <div className="relative p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-300/30 shadow-xl">
                  <FontAwesomeIcon icon={faCircleCheck} className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">分析报告</h2>
                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  <span className="font-mono bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">{asin}</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full" />
                  <span>分析完成于 {new Date().toLocaleTimeString('zh-CN')}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-white">{results.length}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mt-1">分析维度</div>
                </div>
                <div className="w-px h-14 bg-slate-700" />
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-emerald-400">100%</div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mt-1">完成度</div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20">
                  <FontAwesomeIcon icon={faFileExport} className="w-4 h-4" />
                  导出 JSON
                </button>
                <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                  下载报告
                </button>
              </div>
            </div>
          </div>
          
          {/* Summary stats bar */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faBoxOpen} className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{listingsResults.length}</div>
                  <div className="text-xs text-slate-400">Listings 分析</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faStar} className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{reviewsResults.length}</div>
                  <div className="text-xs text-slate-400">Reviews 分析</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faChartPie} className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {results.reduce((acc, r) => acc + r.highlights.length, 0)}
                  </div>
                  <div className="text-xs text-slate-400">核心发现</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {results.reduce((acc, r) => acc + r.details.length, 0)}
                  </div>
                  <div className="text-xs text-slate-400">分析维度</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Results */}
      {listingsResults.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
              <FontAwesomeIcon icon={faBoxOpen} className="w-4 h-4" />
              Listings 分析结果
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-300 via-blue-200 to-transparent" />
            <span className="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">{listingsResults.length} 项</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {listingsResults.map((result, index) => (
              <ResultWidget key={result.targetId} result={result} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Reviews Results */}
      {reviewsResults.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-amber-500/20">
              <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              Reviews 分析结果
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-300 via-amber-200 to-transparent" />
            <span className="text-sm text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">{reviewsResults.length} 项</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {reviewsResults.map((result, index) => (
              <ResultWidget key={result.targetId} result={result} index={index + listingsResults.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
