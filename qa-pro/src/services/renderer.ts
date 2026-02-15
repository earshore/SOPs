import { CompetitorReport } from '../types/report';
import { QAGenerator } from './qa-generator';
import { QAItem } from '../types/qa';

/**
 * 渲染产品信息栏 - 完全基于报告数据
 */
export function renderProductBar(report: CompetitorReport): void {
  const productBar = document.getElementById('productBar');
  if (!productBar) {
    console.error('productBar元素不存在');
    return;
  }

  try {
    // 兼容两种数据结构：
    // 1. analysisReport.product_title (标准结构)
    // 2. 从results中提取title-keywords (备用方案)
    let title = '未知产品';
    
    if (report.analysisReport?.product_title) {
      title = report.analysisReport.product_title.split('|')[0].trim();
    } else {
      // 备用：从title-keywords提取
      const titleKeywords = report.results?.find((t) => t.targetId === 'title-keywords');
      if (titleKeywords?.highlights && titleKeywords.highlights.length > 0) {
        title = titleKeywords.highlights.map(h => h.text.split(' - ')[0]).join(' ');
      }
    }
    
    const asinCount = report.metadata?.asins?.length || 0;
    const targetCount = report.metadata?.targets?.length || 0;

    // 从买家画像提取市场信息
    const buyerProfile = report.results?.find((t) => t.targetId === 'buyer-profile');
    let marketList = report.metadata?.marketplace || report.analysisReport?.marketplace || 'Unknown';
    
    if (buyerProfile?.details) {
      const details = buyerProfile.details as { geographic_insights?: { primary_markets?: string[] } };
      if (details.geographic_insights?.primary_markets) {
        // 将国家名转换为简写
        const marketMap: { [key: string]: string } = {
          'France': 'FR',
          'Germany': 'DE',
          'Deutschland': 'DE',
          'Allemagne': 'DE',
          'Spain': 'ES',
          'Espagne': 'ES',
          'Spanien': 'ES',
          'Italy': 'IT',
          'Italie': 'IT',
          'Italien': 'IT',
          'United Kingdom': 'UK',
          'Royaume-Uni': 'UK',
          'Canada': 'CA',
          'Belgium': 'BE',
          'Belgique': 'BE',
          'Belgien': 'BE'
        };
        marketList = details.geographic_insights.primary_markets
          .map(m => marketMap[m] || m)
          .join(' / ');
      }
    }

    productBar.innerHTML = `
      <div class="product-icon"><i class="fa-solid fa-spray-can"></i></div>
      <div class="product-info">
        <h3>${title}</h3>
        <p>竞品ASIN: ${asinCount}个 · 分析维度: ${targetCount}</p>
      </div>
      <div class="product-meta">
        <span class="meta-chip">${marketList}</span>
      </div>
    `;
    
    console.log('✅ 产品信息栏渲染成功');
  } catch (error) {
    console.error('渲染产品信息栏失败:', error);
    productBar.innerHTML = '<div class="product-info"><h3>产品信息加载失败</h3></div>';
  }
}

/**
 * 渲染统计卡片 - 直接从stats字段读取并提取数字
 */
export function renderStats(report: CompetitorReport): void {
  console.log('=== renderStats 开始 ===');
  console.log('完整报告数据:', report);
  
  try {
    const fatalFlaws = report.results?.find((t) => t.targetId === 'fatal-flaws');
    const wowMoments = report.results?.find((t) => t.targetId === 'wow-moments');
    const hesitations = report.results?.find((t) => t.targetId === 'hesitation-points');
    const buyerProfile = report.results?.find((t) => t.targetId === 'buyer-profile');

    console.log('fatalFlaws:', fatalFlaws);
    console.log('wowMoments:', wowMoments);
    console.log('hesitations:', hesitations);
    console.log('buyerProfile:', buyerProfile);

    // 从stats字段读取数值并提取数字
    const extractNumber = (value: string): string => {
      const match = value.match(/\d+/);
      return match ? match[0] : '0';
    };

    const criticalIssues = extractNumber(fatalFlaws?.stats?.find(s => s.label === '严重问题')?.value || '0');
    const wowCount = extractNumber(wowMoments?.stats?.find(s => s.label === '惊喜时刻')?.value || '0');
    const hesitationCount = extractNumber(hesitations?.stats?.find(s => s.label === '识别犹豫点')?.value || '0');
    const marketCount = extractNumber(buyerProfile?.stats?.find(s => s.label === '覆盖市场')?.value || '0');

    console.log('提取的数字:', {
      criticalIssues,
      wowCount,
      hesitationCount,
      marketCount
    });

    document.querySelectorAll('.count-up').forEach((el, index) => {
      const values = [criticalIssues, wowCount, hesitationCount, marketCount];
      console.log(`设置第${index}个统计卡片:`, values[index]);
      el.setAttribute('data-target', values[index]);
      el.textContent = values[index];
    });
    
    console.log('✅ 统计卡片渲染成功');
  } catch (error) {
    console.error('渲染统计卡片失败:', error);
  }
  
  console.log('=== renderStats 完成 ===');
}

/**
 * 渲染关键洞察 - 完全基于报告数据
 */
export function renderInsights(report: CompetitorReport): void {
  console.log('=== renderInsights 开始 ===');
  const insightsStrip = document.getElementById('insightsStrip');
  console.log('insightsStrip元素:', insightsStrip);
  if (!insightsStrip) {
    console.error('insightsStrip元素不存在');
    return;
  }

  try {
    const insights: Array<{ text: string; type: string; icon: string }> = [];

    // 从致命缺陷提取洞察
    const fatalFlaws = report.results?.find((t) => t.targetId === 'fatal-flaws');
    console.log('fatalFlaws highlights:', fatalFlaws?.highlights);
    if (fatalFlaws?.highlights && Array.isArray(fatalFlaws.highlights)) {
      fatalFlaws.highlights.slice(0, 2).forEach((highlight) => {
        // 提取关键信息
        let text = highlight.text || '';
        if (text.includes('-')) {
          text = text.split('-')[0].trim();
        }
        if (text.length > 50) {
          text = text.substring(0, 50) + '...';
        }
        if (text) {
          insights.push({
            text,
            type: 'orange',
            icon: 'fa-solid fa-triangle-exclamation',
          });
        }
      });
    }

    // 从惊喜时刻提取洞察
    const wowMoments = report.results?.find((t) => t.targetId === 'wow-moments');
    console.log('wowMoments highlights:', wowMoments?.highlights);
    if (wowMoments?.highlights && Array.isArray(wowMoments.highlights)) {
      wowMoments.highlights.slice(0, 2).forEach((highlight) => {
        let text = highlight.text || '';
        if (text.length > 50) {
          text = text.substring(0, 50) + '...';
        }
        if (text) {
          insights.push({
            text,
            type: 'green',
            icon: 'fa-solid fa-check-double',
          });
        }
      });
    }

    // 从犹豫点提取洞察
    const hesitations = report.results?.find((t) => t.targetId === 'hesitation-points');
    console.log('hesitations highlights:', hesitations?.highlights);
    if (hesitations?.highlights && Array.isArray(hesitations.highlights)) {
      hesitations.highlights.slice(0, 2).forEach((highlight) => {
        let text = highlight.text || '';
        if (text.length > 50) {
          text = text.substring(0, 50) + '...';
        }
        if (text) {
          insights.push({
            text,
            type: 'blue',
            icon: 'fa-solid fa-circle-question',
          });
        }
      });
    }

    console.log('提取的洞察总数:', insights.length);
    console.log('洞察内容:', insights);

    if (insights.length === 0) {
      insightsStrip.innerHTML = '<div class="insight-tag blue"><i class="fa-solid fa-info-circle"></i> 暂无关键洞察</div>';
    } else {
      insightsStrip.innerHTML = insights
        .map(
          (insight) => `
        <div class="insight-tag ${insight.type}">
          <i class="${insight.icon}"></i> ${insight.text}
        </div>
      `
        )
        .join('');
    }
    
    console.log('✅ 关键洞察渲染成功');
  } catch (error) {
    console.error('渲染关键洞察失败:', error);
    insightsStrip.innerHTML = '<div class="insight-tag orange"><i class="fa-solid fa-exclamation"></i> 洞察加载失败</div>';
  }
  
  console.log('=== renderInsights 完成 ===');
}

/**
 * 渲染 QA 卡片 - 使用智能生成的 Q&A
 */
export function renderQACards(report: CompetitorReport): void {
  console.log('=== renderQACards 开始 ===');
  const qaGrid = document.getElementById('qaGrid');
  if (!qaGrid) {
    console.error('qaGrid元素不存在');
    return;
  }

  try {
    // 使用 QAGenerator 智能生成 Q&A
    const generator = new QAGenerator(report);
    const qaList = generator.generateAllQA();
    console.log('生成的Q&A总数:', qaList.length);
    console.log('Q&A列表:', qaList);

    if (qaList.length === 0) {
      qaGrid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">暂无Q&A数据</div>';
      console.log('⚠️ 未生成任何Q&A');
      return;
    }

    // 只显示前10个最重要的 Q&A
    const topQA = qaList.slice(0, 10);
    console.log('显示前10个Q&A');

    qaGrid.innerHTML = topQA
      .map(
        (qa, index) => `
      <div class="qa-card ${qa.categoryClass} ${index === 0 ? 'expanded' : ''} fade-in-up stagger-${index + 1}" data-source="${qa.source}">
        <div class="qa-header">
          <div class="qa-rank ${qa.rank <= 3 ? 'top-3' : ''}">${qa.rank}</div>
          <div class="qa-question-wrap">
            <div class="qa-question">${qa.question}</div>
            <div class="qa-meta">
              <span class="qa-tag category">${qa.category}</span>
              <span class="qa-tag ${qa.tagClass}">${qa.tag}</span>
            </div>
          </div>
          <div class="qa-toggle"><i class="fa-solid fa-chevron-down"></i></div>
        </div>
        <div class="qa-body">
          <div class="qa-answer-content">
            <div class="qa-answer-text">
              ${qa.answer}
            </div>
            <div class="qa-answer-actions">
              <button class="qa-action-btn" data-copy><i class="fa-regular fa-copy"></i> 复制</button>
              <button class="qa-action-btn"><i class="fa-solid fa-pen"></i> 编辑</button>
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join('');
    
    console.log('✅ Q&A卡片渲染成功');
  } catch (error) {
    console.error('渲染Q&A卡片失败:', error);
    qaGrid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-danger);">Q&A生成失败，请检查报告数据格式</div>';
  }
  
  console.log('=== renderQACards 完成 ===');
}

/**
 * 渲染完整报告
 */
export function renderReport(report: CompetitorReport): void {
  console.log('========== 开始渲染完整报告 ==========');
  console.log('报告数据:', report);
  
  try {
    renderProductBar(report);
    renderStats(report);
    renderInsights(report);
    renderQACards(report);
    
    // 更新分类标签的数量
    updateCategoryTabCounts(report);
    
    // 重新绑定QA卡片事件
    rebindQACardEvents();
    
    console.log('✅ 报告渲染完成');
  } catch (error) {
    console.error('❌ 报告渲染失败:', error);
    alert('报告渲染失败，请检查控制台错误信息');
  }
  
  console.log('========== 报告渲染完成 ==========');
}

/**
 * 更新分类标签的数量 - 基于实际显示的Q&A
 */
function updateCategoryTabCounts(report: CompetitorReport): void {
  console.log('=== updateCategoryTabCounts 开始 ===');
  const generator = new QAGenerator(report);
  const qaList = generator.generateAllQA();
  
  // 只统计实际显示的前10个Q&A
  const displayedQA = qaList.slice(0, 10);
  console.log('实际显示的Q&A数量:', displayedQA.length);
  
  // 统计各分类的数量
  const counts: { [key: string]: number } = {
    'all': displayedQA.length,
    'cat-performance': 0,
    'cat-features': 0,
    'cat-concerns': 0,
    'cat-usage': 0
  };
  
  displayedQA.forEach(qa => {
    console.log(`Q&A分类: ${qa.category}, categoryClass: ${qa.categoryClass}`);
    if (counts[qa.categoryClass] !== undefined) {
      counts[qa.categoryClass]++;
    }
  });
  
  console.log('统计结果(仅前10个):', counts);
  
  // 更新HTML中的数量
  document.querySelectorAll('.cat-tab').forEach(tab => {
    const category = tab.getAttribute('data-category');
    if (category && counts[category] !== undefined) {
      const countSpan = tab.querySelector('.tab-count');
      if (countSpan) {
        console.log(`更新分类 ${category} 的数量为: ${counts[category]}`);
        countSpan.textContent = counts[category].toString();
      }
    }
  });
  
  console.log('=== updateCategoryTabCounts 完成 ===');
}

/**
 * 重新绑定QA卡片交互事件
 */
function rebindQACardEvents(): void {
  // 重新绑定卡片展开/收起
  document.querySelectorAll('.qa-header').forEach((header) => {
    header.addEventListener('click', function (e: Event) {
      const target = e.currentTarget as HTMLElement;
      const card = target.closest('.qa-card');
      card?.classList.toggle('expanded');
    });
  });

  // 重新绑定复制按钮
  document.querySelectorAll('.qa-action-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', function (e: Event) {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const answerContent = target.closest('.qa-answer-content');
      const text = answerContent?.querySelector('.qa-answer-text p')?.textContent || '';

      navigator.clipboard.writeText(text).then(() => {
        target.classList.add('copied');
        target.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
        
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
          const toast = document.createElement('div');
          toast.className = 'toast success';
          toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid fa-check"></i></div>
            <span>已复制到剪贴板</span>
          `;
          toastContainer.appendChild(toast);
          setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
          }, 3000);
        }
        
        setTimeout(() => {
          target.classList.remove('copied');
          target.innerHTML = '<i class="fa-regular fa-copy"></i> 复制';
        }, 2000);
      });
    });
  });
}
