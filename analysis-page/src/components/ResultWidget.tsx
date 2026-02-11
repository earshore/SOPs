import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartBar, 
  faLightbulb, 
  faList, 
  faCircleExclamation, 
  faCircleCheck, 
  faCircleInfo, 
  faTriangleExclamation,
  faQuoteLeft
} from '@fortawesome/free-solid-svg-icons';
import { AnalysisResult } from '../types/analysis';
import { cn } from '../utils/cn';

interface ResultWidgetProps {
  result: AnalysisResult;
  index: number;
}

export function ResultWidget({ result, index }: ResultWidgetProps) {
  const colorSchemes: Record<string, { 
    gradient: string; 
    gradientFrom: string;
    gradientTo: string;
    light: string; 
    text: string; 
    border: string;
    iconBg: string;
  }> = {
    blue: { 
      gradient: 'from-blue-500 via-blue-600 to-indigo-600', 
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-600',
      light: 'bg-blue-50', 
      text: 'text-blue-700', 
      border: 'border-blue-100',
      iconBg: 'bg-blue-500/20'
    },
    cyan: { 
      gradient: 'from-cyan-500 via-cyan-600 to-teal-600', 
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-teal-600',
      light: 'bg-cyan-50', 
      text: 'text-cyan-700', 
      border: 'border-cyan-100',
      iconBg: 'bg-cyan-500/20'
    },
    red: { 
      gradient: 'from-red-500 via-red-600 to-rose-600', 
      gradientFrom: 'from-red-500',
      gradientTo: 'to-rose-600',
      light: 'bg-red-50', 
      text: 'text-red-700', 
      border: 'border-red-100',
      iconBg: 'bg-red-500/20'
    },
    amber: { 
      gradient: 'from-amber-500 via-orange-500 to-orange-600', 
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-orange-600',
      light: 'bg-amber-50', 
      text: 'text-amber-700', 
      border: 'border-amber-100',
      iconBg: 'bg-amber-500/20'
    },
    orange: { 
      gradient: 'from-orange-500 via-orange-600 to-red-500', 
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      light: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-100',
      iconBg: 'bg-orange-500/20'
    },
    purple: { 
      gradient: 'from-purple-500 via-purple-600 to-indigo-600', 
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-indigo-600',
      light: 'bg-purple-50', 
      text: 'text-purple-700', 
      border: 'border-purple-100',
      iconBg: 'bg-purple-500/20'
    },
    teal: { 
      gradient: 'from-teal-500 via-teal-600 to-cyan-600', 
      gradientFrom: 'from-teal-500',
      gradientTo: 'to-cyan-600',
      light: 'bg-teal-50', 
      text: 'text-teal-700', 
      border: 'border-teal-100',
      iconBg: 'bg-teal-500/20'
    },
    rose: { 
      gradient: 'from-rose-500 via-pink-500 to-pink-600', 
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-pink-600',
      light: 'bg-rose-50', 
      text: 'text-rose-700', 
      border: 'border-rose-100',
      iconBg: 'bg-rose-500/20'
    },
  };

  const highlightStyles: Record<string, { bg: string; text: string; border: string; icon: typeof faCircleInfo; iconColor: string }> = {
    danger: { bg: 'bg-gradient-to-r from-red-50 to-rose-50', text: 'text-red-700', border: 'border-red-200', icon: faCircleExclamation, iconColor: 'text-red-500' },
    success: { bg: 'bg-gradient-to-r from-emerald-50 to-green-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: faCircleCheck, iconColor: 'text-emerald-500' },
    warning: { bg: 'bg-gradient-to-r from-amber-50 to-orange-50', text: 'text-amber-700', border: 'border-amber-200', icon: faTriangleExclamation, iconColor: 'text-amber-500' },
    info: { bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', text: 'text-blue-700', border: 'border-blue-200', icon: faCircleInfo, iconColor: 'text-blue-500' },
  };

  const colors = colorSchemes[result.color] || colorSchemes.blue;

  return (
    <div 
      className="group bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:border-slate-300/60 transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header with gradient */}
      <div className={cn("relative overflow-hidden bg-gradient-to-r p-6 text-white", colors.gradient)}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full filter blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full filter blur-2xl -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-lg", colors.iconBg)}>
            <FontAwesomeIcon icon={result.icon} className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl tracking-tight">{result.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 border border-white/20 font-medium backdrop-blur-sm">
                {result.source}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-5 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faChartBar} className="w-3 h-3 text-indigo-600" />
          </div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">数据概览</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {result.stats.map((stat, i) => (
            <div key={i} className="relative bg-white rounded-xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group/stat">
              <div className="text-2xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights Section */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faLightbulb} className="w-3 h-3 text-amber-600" />
          </div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">核心发现</span>
        </div>
        <div className="space-y-2.5">
          {result.highlights.map((highlight, i) => {
            const style = highlightStyles[highlight.type];
            return (
              <div 
                key={i} 
                className={cn(
                  "relative flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-all hover:shadow-md",
                  style.bg, style.text, style.border
                )}
              >
                <FontAwesomeIcon icon={style.icon} className={cn("w-4 h-4 mt-0.5 flex-shrink-0", style.iconColor)} />
                <span className="leading-relaxed">{highlight.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Section */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faList} className="w-3 h-3 text-slate-600" />
          </div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">详细分析</span>
        </div>
        <div className="space-y-5">
          {result.details.map((detail, idx) => (
            <div key={idx}>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-3", 
                colors.light, colors.text
              )}>
                <FontAwesomeIcon icon={faQuoteLeft} className="w-2.5 h-2.5 opacity-60" />
                {detail.category}
              </span>
              <div className="flex flex-wrap gap-2">
                {detail.items.map((item, i) => (
                  <span 
                    key={i}
                    className="inline-block px-3 py-2 bg-slate-50 text-slate-700 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-default border border-slate-100 hover:border-indigo-200 font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
