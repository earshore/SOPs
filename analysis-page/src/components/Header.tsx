import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faRocket, faMicrochip, faChartLine } from '@fortawesome/free-solid-svg-icons';

export function Header() {
  return (
    <header className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/30 rounded-full filter blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full filter blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full filter blur-[80px]" />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo with glow effect */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-2xl shadow-2xl border border-white/10">
                <FontAwesomeIcon icon={faBrain} className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                Insight<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI</span>
                <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-1 rounded-full font-semibold tracking-wider">PRO</span>
              </h1>
              <p className="text-slate-400 text-sm mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faRocket} className="w-3.5 h-3.5 text-indigo-400" />
                  亚马逊产品智能分析平台
                </span>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChartLine} className="w-3.5 h-3.5 text-purple-400" />
                  Listings & Reviews 深度洞察
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Tech indicators */}
            <div className="hidden lg:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
                <FontAwesomeIcon icon={faMicrochip} className="w-4 h-4 text-cyan-400" />
                <span>GPT-4 Turbo</span>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              AI 引擎就绪
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
