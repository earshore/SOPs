import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCode, 
  faChevronDown, 
  faChevronUp, 
  faCopy, 
  faCheck,
  faTerminal,
  faFileCode
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '../utils/cn';

interface PromptPreviewProps {
  prompt: string;
  taskName: string;
  isVisible: boolean;
  onToggle: () => void;
}

export function PromptPreview({ prompt, taskName, isVisible, onToggle }: PromptPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faTerminal} className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-white">AI 分析提示词</h4>
            <p className="text-xs text-slate-400">{taskName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">{prompt.length} chars</span>
          <FontAwesomeIcon 
            icon={isVisible ? faChevronUp : faChevronDown} 
            className="w-4 h-4 text-slate-400" 
          />
        </div>
      </button>

      {/* Content */}
      {isVisible && (
        <div className="border-t border-slate-700">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FontAwesomeIcon icon={faFileCode} className="w-3 h-3" />
              <span>Prompt Template</span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                copied 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-3 h-3" />
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface PromptPreviewPanelProps {
  prompts: { taskId: string; taskName: string; prompt: string }[];
}

export function PromptPreviewPanel({ prompts }: PromptPreviewPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  if (prompts.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors mb-4"
      >
        <FontAwesomeIcon icon={faCode} className="w-4 h-4" />
        <span className="font-medium">{showPanel ? '隐藏' : '查看'} AI 提示词模板</span>
        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
          {prompts.length} 个任务
        </span>
        <FontAwesomeIcon 
          icon={showPanel ? faChevronUp : faChevronDown} 
          className="w-3 h-3" 
        />
      </button>

      {showPanel && (
        <div className="space-y-3 animate-fade-in-up">
          {prompts.map((item, index) => (
            <PromptPreview
              key={item.taskId}
              prompt={item.prompt}
              taskName={item.taskName}
              isVisible={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
