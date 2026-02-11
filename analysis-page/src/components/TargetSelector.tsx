import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble, faTimes, faBoxOpen, faStar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { AnalysisTarget } from '../types/analysis';
import { cn } from '../utils/cn';

interface TargetSelectorProps {
  targets: AnalysisTarget[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function TargetSelector({ 
  targets, 
  selectedIds, 
  onToggle, 
  onSelectAll, 
  onClearAll,
  disabled 
}: TargetSelectorProps) {
  const listingsTargets = targets.filter(t => t.source === 'Listings');
  const reviewsTargets = targets.filter(t => t.source === 'Reviews');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <FontAwesomeIcon icon={faCheckDouble} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">选择分析目标</h2>
            <p className="text-sm text-slate-500">选择需要执行的 AI 分析维度</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSelectAll}
            disabled={disabled}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="w-3.5 h-3.5" />
            全选
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={onClearAll}
            disabled={disabled}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5" />
            清空
          </button>
        </div>
      </div>

      {/* Listings Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
            <FontAwesomeIcon icon={faBoxOpen} className="w-3 h-3" />
            Listings 分析
          </div>
          <span className="text-xs text-slate-400">基于标题与五点描述</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listingsTargets.map(target => (
            <TargetCard
              key={target.id}
              target={target}
              selected={selectedIds.includes(target.id)}
              onToggle={() => onToggle(target.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
            <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
            Reviews 分析
          </div>
          <span className="text-xs text-slate-400">基于用户评论数据</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reviewsTargets.map(target => (
            <TargetCard
              key={target.id}
              target={target}
              selected={selectedIds.includes(target.id)}
              onToggle={() => onToggle(target.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Selection summary */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            已选择 <span className="font-bold text-indigo-600 text-base">{selectedIds.length}</span> / {targets.length} 个分析目标
          </span>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">已选：</span>
            <div className="flex -space-x-2">
              {selectedIds.slice(0, 5).map(id => {
                const target = targets.find(t => t.id === id);
                if (!target) return null;
                return (
                  <div 
                    key={id} 
                    className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    <FontAwesomeIcon icon={target.icon} className="w-3 h-3 text-indigo-600" />
                  </div>
                );
              })}
              {selectedIds.length > 5 && (
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white text-xs font-medium text-slate-600">
                  +{selectedIds.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TargetCardProps {
  target: AnalysisTarget;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function TargetCard({ target, selected, onToggle, disabled }: TargetCardProps) {
  const colorClasses: Record<string, { bg: string; icon: string; selectedBg: string; border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', selectedBg: 'bg-blue-50', border: 'border-blue-300' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', selectedBg: 'bg-cyan-50', border: 'border-cyan-300' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', selectedBg: 'bg-red-50', border: 'border-red-300' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', selectedBg: 'bg-amber-50', border: 'border-amber-300' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', selectedBg: 'bg-orange-50', border: 'border-orange-300' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', selectedBg: 'bg-purple-50', border: 'border-purple-300' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', selectedBg: 'bg-teal-50', border: 'border-teal-300' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', selectedBg: 'bg-rose-50', border: 'border-rose-300' },
  };

  const colors = colorClasses[target.color] || colorClasses.blue;

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md",
        selected
          ? `${colors.border} ${colors.selectedBg} shadow-sm`
          : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
          selected ? colors.bg : "bg-slate-100 group-hover:bg-slate-200"
        )}>
          <FontAwesomeIcon 
            icon={target.icon} 
            className={cn(
              "w-4 h-4 transition-colors",
              selected ? colors.icon : "text-slate-500"
            )} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-sm",
            selected ? "text-slate-800" : "text-slate-700"
          )}>
            {target.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {target.description}
          </p>
        </div>
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5",
          selected
            ? "border-indigo-500 bg-indigo-500"
            : "border-slate-300 group-hover:border-slate-400"
        )}>
          {selected && (
            <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 text-white" />
          )}
        </div>
      </div>
    </button>
  );
}
