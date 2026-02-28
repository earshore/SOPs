/**
 * Q&A Lab 数据导入处理器
 * 负责处理分析报告JSON文件的导入、验证和解析
 */

import { showToast } from '../../../../../../common/ui';
import { appStore } from '@/stores/useAppStore';

/**
 * 分析报告数据结构
 */
export interface AnalysisReportData {
    metadata?: {
        asins?: string[];
        targets?: string[];
        timestamp?: string;
        dataSource?: 'scraper' | 'sample' | 'import';
        marketplace?: string;
        productTitle?: string;
    };
    analysisReport?: Record<string, any>;
    // 兼容直接是分析报告的情况
    [key: string]: any;
}

/**
 * 文件读取结果
 */
interface FileReadResult {
    data: any;
    filename: string;
}

/**
 * 导入结果
 */
export interface ImportResult {
    success: boolean;
    data?: AnalysisReportData;
    error?: string;
}

/**
 * 读取文件为JSON
 */
export function readFileAsJSON(file: File): Promise<FileReadResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                
                // 验证内容不为空
                if (!content || content.trim().length === 0) {
                    reject(new Error(`文件 ${file.name} 内容为空`));
                    return;
                }
                
                // 尝试解析JSON
                let json: unknown;
                try {
                    json = JSON.parse(content);
                } catch (parseError) {
                    reject(new Error(`文件 ${file.name} 不是有效的JSON格式: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
                    return;
                }
                
                // 验证JSON不为null或undefined
                if (json === null || json === undefined) {
                    reject(new Error(`文件 ${file.name} JSON内容无效`));
                    return;
                }
                
                resolve({ data: json, filename: file.name });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`[QALab] 解析文件 ${file.name} 失败:`, err);
                reject(new Error(`文件 ${file.name} 解析失败: ${errorMsg}`));
            }
        };
        
        reader.onerror = () => {
            const errorMsg = reader.error?.message || '未知错误';
            console.error(`[QALab] 读取文件 ${file.name} 失败:`, reader.error);
            reject(new Error(`无法读取文件 ${file.name}: ${errorMsg}`));
        };
        
        reader.readAsText(file);
    });
}

/**
 * 验证分析报告数据结构
 */
export function validateAnalysisReport(data: any): { valid: boolean; error?: string; normalizedData?: AnalysisReportData } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '数据格式错误：必须是JSON对象' };
    }
    
    // 检查是否是完整的FullReportData格式（包含metadata和analysisReport）
    const hasMetadata = 'metadata' in data;
    const hasAnalysisReport = 'analysisReport' in data;
    
    if (hasMetadata && hasAnalysisReport) {
        // 完整格式，直接返回
        return { valid: true, normalizedData: data as AnalysisReportData };
    }
    
    // 检查是否是纯分析报告对象（包含分析维度字段）
    const analysisKeys = [
        'selling-points', 'sellingPoints', 'selling_points',
        'fatal-flaws', 'fatalFlaws', 'fatal_flaws',
        'wow-moments', 'wowMoments', 'wow_moments',
        'hesitation-points', 'hesitationPoints', 'hesitation_points',
        'buyer-profile', 'buyerProfile', 'buyer_profile',
        'title-keywords', 'titleKeywords', 'title_keywords'
    ];
    
    const hasAnalysisKeys = analysisKeys.some(key => key in data);
    
    if (hasAnalysisKeys) {
        // 是纯分析报告，需要包装成完整格式
        const normalizedData: AnalysisReportData = {
            metadata: {
                timestamp: new Date().toISOString(),
                dataSource: 'import',
                asins: data.asin ? [data.asin] : [],
                marketplace: data.market || data.marketplace || 'DE',
                productTitle: data.product_title || data.productTitle || data.title
            },
            analysisReport: data
        };
        
        return { valid: true, normalizedData };
    }
    
    return { 
        valid: false, 
        error: '数据格式错误：未找到有效的分析报告字段（如 selling-points, fatal-flaws 等）' 
    };
}

/**
 * 处理文件导入主流程
 */
export async function handleImportFile(file: File): Promise<ImportResult> {
    try {
        console.log('[QALab] 开始导入文件:', file.name);
        
        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.json')) {
            throw new Error('只支持JSON文件');
        }
        
        // 验证文件大小（最大10MB）
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`文件大小不能超过10MB (当前: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        // 检查空文件
        if (file.size === 0) {
            throw new Error('文件内容为空');
        }
        
        // 大文件警告（5MB以上）
        const LARGE_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > LARGE_FILE_SIZE) {
            console.warn('[QALab] 检测到大文件:', `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            showToast('⚠️ 检测到大文件，处理可能需要较长时间', { type: 'warning' });
        }
        
        showToast('📂 正在解析文件...', { type: 'info' });
        
        // 读取文件
        const { data } = await readFileAsJSON(file);
        
        // 验证数据结构
        const validation = validateAnalysisReport(data);
        if (!validation.valid) {
            throw new Error(validation.error || '数据验证失败');
        }
        
        const normalizedData = validation.normalizedData!;
        
        console.log('[QALab] 文件导入成功:', {
            filename: file.name,
            hasMetadata: !!normalizedData.metadata,
            marketplace: normalizedData.metadata?.marketplace,
            asins: normalizedData.metadata?.asins
        });
        
        // 更新到qalab state
        const qalabState = appStore.getState().qalab;
        qalabState.reportData = normalizedData;
        
        // 更新输入框
        const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
        if (input) {
            input.value = JSON.stringify(normalizedData, null, 2);
        }
        
        showToast('✅ 分析报告导入成功', { 
            type: 'success',
            description: `来源: ${file.name}`
        });
        
        return { success: true, data: normalizedData };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[QALab] 导入失败:', {
            error: error,
            errorMessage: errorMessage,
            fileName: file.name
        });
        
        // 根据错误类型提供友好的错误提示
        let userMessage = '❌ 导入出错';
        if (errorMessage.includes('格式错误') || errorMessage.includes('JSON')) {
            userMessage = `❌ JSON格式错误: ${errorMessage}`;
        } else if (errorMessage.includes('读取文件')) {
            userMessage = `❌ 文件读取失败: ${errorMessage}`;
        } else if (errorMessage.includes('数据验证')) {
            userMessage = `❌ ${errorMessage}`;
        } else {
            userMessage = `❌ 导入出错: ${errorMessage}`;
        }
        
        showToast(userMessage, { type: 'error' });
        
        return { success: false, error: errorMessage };
    }
}

/**
 * 触发文件选择对话框
 */
export function triggerFileImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
            await handleImportFile(file);
            
            // 触发数据预览更新
            window.dispatchEvent(new CustomEvent('qalab:data-imported'));
        }
        
        // 清理
        document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
}
