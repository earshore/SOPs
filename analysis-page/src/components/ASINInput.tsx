import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faCircleCheck, faInfoCircle, faBoxOpen, faStar, faComments } from '@fortawesome/free-solid-svg-icons';
import { Product } from '../data/sampleData';

interface ASINInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  availableAsins?: string[];
  currentProduct?: Product;
}

export function ASINInput({ value, onChange, disabled, availableAsins = [], currentProduct }: ASINInputProps) {
  const isValid = value.length === 10;
  const hasData = !!currentProduct;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 h-full">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <FontAwesomeIcon icon={faBarcode} className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">产品 ASIN</h2>
          <p className="text-sm text-slate-500">选择或输入产品标识符</p>
        </div>
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="例如：B0DNMZ2MLG"
          disabled={disabled}
          className={`
            w-full px-5 py-4 bg-slate-50 border-2 rounded-xl text-slate-800 
            placeholder-slate-400 font-mono text-lg tracking-widest
            transition-all duration-200
            focus:outline-none focus:bg-white
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasData 
              ? 'border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50' 
              : isValid 
                ? 'border-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-50'
                : 'border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50'}
          `}
          maxLength={10}
        />
        {hasData && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-full font-medium border border-emerald-100">
              <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3" />
              数据已加载
            </span>
          </div>
        )}
        {!hasData && isValid && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs px-3 py-1.5 rounded-full font-medium border border-amber-100">
              <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3" />
              无数据
            </span>
          </div>
        )}
      </div>
      
      {/* 产品预览 */}
      {currentProduct && (
        <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faBoxOpen} className="w-3 h-3" />
            产品信息
          </h4>
          <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-relaxed">
            {currentProduct.productTitle}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faComments} className="w-3 h-3 text-amber-500" />
              {currentProduct.customer_reviews.length} 条评论
            </span>
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faStar} className="w-3 h-3 text-amber-500" />
              {(currentProduct.customer_reviews.reduce((acc, r) => acc + r.star_rating, 0) / currentProduct.customer_reviews.length).toFixed(1)} 平均分
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <FontAwesomeIcon icon={faInfoCircle} className="w-3.5 h-3.5" />
        <span>选择已加载数据中的 ASIN 进行分析</span>
      </div>
      
      {/* 可用 ASIN 列表 */}
      {availableAsins.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2 font-medium">已加载的产品：</p>
          <div className="flex flex-wrap gap-2">
            {availableAsins.map((asinItem) => (
              <button
                key={asinItem}
                onClick={() => onChange(asinItem)}
                disabled={disabled}
                className={`
                  px-3 py-2 text-xs font-mono rounded-lg transition-all
                  ${asinItem === value 
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-sm' 
                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border-2 border-transparent'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {asinItem}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
