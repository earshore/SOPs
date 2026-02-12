/**
 * JSON 报告查看器组件
 */

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCode, 
  faChevronDown, 
  faChevronUp, 
  faCopy, 
  faCheck,
  faFileCode,
  faDatabase,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '../utils/cn';
import { FullAnalysisReport } from '../data/analysisReportData';

interface ReportJsonViewerProps {
  report: FullAnalysisReport | null;
  selectedTargets: string[];
}

export function ReportJsonViewer({ report, selectedTargets }: ReportJsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  // 根据选中的目标过滤报告数据
  const filteredReport: Partial<FullAnalysisReport> = {
    asin: report.asin,
    product_title: report.product_title,
    analysis_timestamp: report.analysis_timestamp,
    market: report.market,
  };

  if (selectedTargets.includes('title-keywords') && report.title_keywords) {
    filteredReport.title_keywords = report.title_keywords;
  }
  if (selectedTargets.includes('selling-points') && report.selling_points) {
    filteredReport.selling_points = report.selling_points;
  }
  if (selectedTargets.includes('fatal-flaws') && report.fatal_flaws) {
    filteredReport.fatal_flaws = report.fatal_flaws;
  }
  if (selectedTargets.includes('wow-moments') && report.wow_moments) {
    filteredReport.wow_moments = report.wow_moments;
  }
  if (selectedTargets.includes('hesitation-points') && report.hesitation_points) {
    filteredReport.hesitation_points = report.hesitation_points;
  }
  if (selectedTargets.includes('buyer-profile') && report.buyer_profile) {
    filteredReport.buyer_profile = report.buyer_profile;
  }
  if (selectedTargets.includes('vocab-gap') && report.vocab_gap) {
    filteredReport.vocab_gap = report.vocab_gap;
  }
  if (selectedTargets.includes('promise-reality') && report.promise_reality) {
    filteredReport.promise_reality = report.promise_reality;
  }

  const jsonString = JSON.stringify(filteredReport, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl transition-all duration-300",
      isFullScreen && "fixed inset-4 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              AI 分析报告 JSON
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                RAW DATA
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {selectedTargets.length} 个分析维度 · {(jsonString.length / 1024).toFixed(1)} KB
            </p>
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              copied 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50"
            )}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-3.5 h-3.5" />
            {copied ? '已复制' : '复制 JSON'}
          </button>
          
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 transition-all"
          >
            <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 transition-all"
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FontAwesomeIcon icon={faFileCode} className="w-3.5 h-3.5" />
              <span>analysis_report.json</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>行数: {jsonString.split('\n').length}</span>
              <span>字符: {jsonString.length.toLocaleString()}</span>
            </div>
          </div>
          
          <div className={cn(
            "overflow-auto p-4",
            isFullScreen ? "max-h-[calc(100vh-200px)]" : "max-h-96"
          )}>
            <pre className="text-xs font-mono leading-relaxed">
              <JsonHighlighter json={jsonString} />
            </pre>
          </div>
        </div>
      )}

      {/* Collapsed preview */}
      {!isExpanded && (
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FontAwesomeIcon icon={faCode} className="w-3 h-3" />
            <span className="font-mono truncate">
              {`{ "asin": "${report.asin}", "analysis_timestamp": "${report.analysis_timestamp}", ... }`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * JSON 语法高亮组件
 */
function JsonHighlighter({ json }: { json: string }) {
  // 简单的 JSON 语法高亮
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-blue-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-slate-500">$1</span>');

  return (
    <code 
      className="text-slate-300"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
