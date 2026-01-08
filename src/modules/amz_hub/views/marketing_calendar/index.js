// ==================== AMZF Data (移植) ====================
const amzf_countries = [
    { code: 'DE', name: '德国', flag: '🇩🇪' },
    { code: 'FR', name: '法国', flag: '🇫🇷' },
    { code: 'IT', name: '意大利', flag: '🇮🇹' },
    { code: 'ES', name: '西班牙', flag: '🇪🇸' },
    { code: 'NL', name: '荷兰', flag: '🇳🇱' },
    { code: 'PL', name: '波兰', flag: '🇵🇱' },
    { code: 'GB', name: '英国', flag: '🇬🇧' },
    { code: 'SE', name: '瑞典', flag: '🇸🇪' }
];
const amzf_months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const amzf_events = [
    // January
    { id: 1, name: '元旦', nameEn: 'New Year', emoji: '🎊', date: '1月1日', month: 1, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', strategy: '新年装饰品、派对用品、健身器材、规划类文具热销。提前2-3周布局，主推"新年新开始"主题。', tags: ['装饰品','派对用品','健身','文具'] },
    { id: 2, name: '主显节/三王节', nameEn: 'Epiphany', emoji: '👑', date: '1月6日', month: 1, countries: ['IT','ES','PL','SE'], type: 'holiday', strategy: '西班牙三王节比圣诞更重要！儿童玩具、礼品需求爆发。意大利Befana女巫主题商品热销。', tags: ['玩具','礼品','儿童用品'] },
    { id: 3, name: '冬季大促', nameEn: 'Winter Sales', emoji: '❄️', date: '1月初-2月中', month: 1, countries: ['FR','IT','ES'], type: 'shopping', strategy: '法国Soldes法定大促期，折扣力度大。清库存良机，服装、家居品类主力出货。', tags: ['服装','家居','清仓'] },
    
    // February
    { id: 4, name: '情人节', nameEn: "Valentine's Day", emoji: '💝', date: '2月14日', month: 2, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', strategy: '珠宝首饰、巧克力、鲜花周边、浪漫礼品需求激增。提前3周开始推广，情侣款商品溢价空间大。', tags: ['珠宝','礼品','情侣款','巧克力'] },
    { id: 5, name: '狂欢节', nameEn: 'Carnival', emoji: '🎭', date: '2月-3月初', month: 2, countries: ['DE','IT','NL'], type: 'cultural', strategy: '德国科隆、意大利威尼斯狂欢节期间，面具、变装服饰、派对用品需求高峰。', tags: ['面具','服饰','派对用品'] },
    
    // March
    { id: 6, name: '国际妇女节', nameEn: "Women's Day", emoji: '👩', date: '3月8日', month: 3, countries: ['DE','IT','PL'], type: 'holiday', strategy: '意大利送含羞草传统。美妆、护肤、珠宝、女性用品销量上涨，适合女性向选品推广。', tags: ['美妆','护肤','珠宝'] },
    { id: 7, name: '母亲节(英国)', nameEn: "Mother's Day UK", emoji: '👩‍👧', date: '3月第4个周日', month: 3, countries: ['GB'], type: 'holiday', strategy: '英国母亲节在3月！与其他欧洲国家时间不同，需单独备货。礼品、花卉、珠宝、SPA用品热销。', tags: ['礼品','珠宝','SPA','鲜花'] },
    { id: 8, name: '父亲节(意/西)', nameEn: "Father's Day IT/ES", emoji: '👨‍👧', date: '3月19日', month: 3, countries: ['IT','ES'], type: 'holiday', strategy: '圣约瑟夫日也是父亲节。男士配饰、电子产品、工具、运动用品是热门选择。', tags: ['男士配饰','电子产品','工具'] },
    
    // April
    { id: 9, name: '复活节', nameEn: 'Easter', emoji: '🐰', date: '3月底-4月中', month: 4, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', strategy: '欧洲最重要节日之一！巧克力彩蛋、兔子装饰、园艺用品、春季服装热销。提前1个月布局。', tags: ['巧克力','装饰品','园艺','春装'] },
    { id: 10, name: '国王节', nameEn: "King's Day", emoji: '🧡', date: '4月27日', month: 4, countries: ['NL'], type: 'holiday', strategy: '荷兰全民穿橙色庆祝！橙色服饰配件、派对用品、户外野餐用品需求激增。', tags: ['橙色服饰','派对','户外用品'] },
    { id: 11, name: '解放日', nameEn: 'Liberation Day', emoji: '🇮🇹', date: '4月25日', month: 4, countries: ['IT'], type: 'holiday', strategy: '意大利公众假期，户外活动增多。野餐、烧烤、户外运动用品销量上升。', tags: ['户外','野餐','烧烤'] },
    { id: 12, name: '瓦尔普吉斯之夜', nameEn: 'Walpurgis Night', emoji: '🔥', date: '4月30日', month: 4, countries: ['SE','DE'], type: 'cultural', strategy: '瑞典重要节日，篝火派对传统。户外派对用品、烧烤设备需求旺盛。', tags: ['派对用品','烧烤','户外'] },
    
    // May
    { id: 13, name: '劳动节', nameEn: 'Labour Day', emoji: '⚒️', date: '5月1日', month: 5, countries: ['DE','FR','IT','ES','NL','PL','SE'], type: 'holiday', strategy: '多国公众假期，出游高峰。户外装备、旅行用品、野餐套装热销。', tags: ['户外','旅行','野餐'] },
    { id: 14, name: '母亲节(欧洲)', nameEn: "Mother's Day EU", emoji: '💐', date: '5月第2个周日', month: 5, countries: ['DE','IT','NL','SE'], type: 'holiday', strategy: '德国、意大利、荷兰、瑞典母亲节。珠宝、鲜花、美妆、家居好物是经典选择。', tags: ['珠宝','鲜花','美妆','家居'] },
    { id: 15, name: '母亲节(法/西)', nameEn: "Mother's Day FR/ES", emoji: '💐', date: '5月最后/第1周日', month: 5, countries: ['FR','ES'], type: 'holiday', strategy: '法国5月最后周日，西班牙5月第1周日。需分别备货，注意时间差异。', tags: ['珠宝','鲜花','美妆'] },
    { id: 16, name: '母亲节(波兰)', nameEn: "Mother's Day PL", emoji: '💐', date: '5月26日', month: 5, countries: ['PL'], type: 'holiday', strategy: '波兰母亲节固定日期，礼品类商品需提前备货至波兰仓。', tags: ['礼品','鲜花','珠宝'] },
    { id: 17, name: '耶稣升天节', nameEn: 'Ascension Day', emoji: '✝️', date: '复活节后40天', month: 5, countries: ['DE','FR','NL','SE'], type: 'holiday', strategy: '德国传统父亲节(Vatertag)！男士们结伴出游，啤酒、户外用品、男士礼品热销。', tags: ['啤酒用品','户外','男士礼品'] },
    
    // June
    { id: 18, name: '父亲节(多国)', nameEn: "Father's Day", emoji: '👔', date: '6月第3个周日', month: 6, countries: ['FR','NL','GB','PL'], type: 'holiday', strategy: '法国、荷兰、英国、波兰父亲节统一时间。电子产品、工具、运动户外、男士护理品热销。', tags: ['电子产品','工具','运动','男士护理'] },
    { id: 19, name: '瑞典国庆日', nameEn: 'Sweden National Day', emoji: '🇸🇪', date: '6月6日', month: 6, countries: ['SE'], type: 'holiday', strategy: '瑞典官方国庆日，蓝黄主题装饰品、国旗相关商品需求上升。', tags: ['装饰品','派对用品'] },
    { id: 20, name: '仲夏节', nameEn: 'Midsummer', emoji: '🌻', date: '6月19-25日间', month: 6, countries: ['SE'], type: 'cultural', strategy: '瑞典最重要节日之一！花环、野餐用品、户外家具、派对装饰热销。', tags: ['花环','野餐','户外家具'] },
    { id: 21, name: '圣胡安节', nameEn: 'San Juan', emoji: '🔥', date: '6月23-24日', month: 6, countries: ['ES'], type: 'cultural', strategy: '西班牙篝火节，海滩派对传统。泳装、沙滩用品、派对装饰需求激增。', tags: ['泳装','沙滩用品','派对'] },
    { id: 22, name: '夏季大促', nameEn: 'Summer Sales', emoji: '☀️', date: '6月底-8月', month: 6, countries: ['FR','IT','ES'], type: 'shopping', strategy: '法国、意大利、西班牙官方夏促期。折扣季清库存，准备秋季新品。服装家居主力出货。', tags: ['服装','家居','清仓'] },
    
    // July
    { id: 23, name: 'Prime Day', nameEn: 'Amazon Prime Day', emoji: '📦', date: '7月中旬', month: 7, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', strategy: '亚马逊年度最大促销！全品类参与，需提前2个月备货、1个月开始广告预热。转化率最高时期。', tags: ['全品类','大促','备货','广告'] },
    { id: 24, name: '法国国庆日', nameEn: 'Bastille Day', emoji: '🇫🇷', date: '7月14日', month: 7, countries: ['FR'], type: 'holiday', strategy: '法国国庆，烟花派对传统。蓝白红主题装饰、派对用品、户外野餐用品热销。', tags: ['装饰品','派对','野餐'] },
    
    // August
    { id: 25, name: '圣母升天节', nameEn: 'Assumption Day', emoji: '⛪', date: '8月15日', month: 8, countries: ['FR','IT','ES','PL'], type: 'holiday', strategy: '多国公众假期，夏季度假高峰。旅行用品、泳装、防晒产品持续热销。', tags: ['旅行','泳装','防晒'] },
    { id: 26, name: '返校季', nameEn: 'Back to School', emoji: '📚', date: '8月中-9月初', month: 8, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'season', strategy: '开学季重要节点！书包、文具、电子产品(平板/耳机)、学生服装需求爆发。', tags: ['书包','文具','电子产品','服装'] },
    
    // September
    { id: 27, name: '慕尼黑啤酒节', nameEn: 'Oktoberfest', emoji: '🍺', date: '9月中-10月初', month: 9, countries: ['DE'], type: 'cultural', strategy: '世界最大啤酒节！传统巴伐利亚服饰(Dirndl/Lederhosen)、啤酒杯、派对用品全欧热销。', tags: ['传统服饰','啤酒用品','派对'] },
    { id: 28, name: '秋季时尚季', nameEn: 'Fall Fashion', emoji: '🍂', date: '9月', month: 9, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'season', strategy: '秋冬新品上架期，外套、靴子、围巾等秋季服饰开始热销。提前布局秋冬选品。', tags: ['外套','靴子','围巾','秋装'] },
    
    // October
    { id: 29, name: '德国统一日', nameEn: 'German Unity Day', emoji: '🇩🇪', date: '10月3日', month: 10, countries: ['DE'], type: 'holiday', strategy: '德国国庆假期，旅游出行高峰。旅行用品、户外装备需求上升。', tags: ['旅行','户外'] },
    { id: 30, name: '万圣节', nameEn: 'Halloween', emoji: '🎃', date: '10月31日', month: 10, countries: ['DE','FR','IT','ES','NL','GB','SE'], type: 'cultural', strategy: '欧洲万圣节氛围渐浓！南瓜装饰、变装服饰、糖果、派对用品需求激增。英国市场尤其火爆。', tags: ['装饰','变装','糖果','派对'] },
    
    // November
    { id: 31, name: '诸圣节', nameEn: 'All Saints Day', emoji: '🕯️', date: '11月1日', month: 11, countries: ['FR','IT','ES','PL'], type: 'holiday', strategy: '欧洲传统节日，祭祀用蜡烛、鲜花需求。同时也是公众假期，注意物流时效。', tags: ['蜡烛','鲜花'] },
    { id: 32, name: '光棍节', nameEn: 'Singles Day', emoji: '🛒', date: '11月11日', month: 11, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', strategy: '全球购物节影响力扩大，欧洲站可配合促销。电子产品、时尚类表现突出。', tags: ['电子产品','时尚','促销'] },
    { id: 33, name: '黑色星期五', nameEn: 'Black Friday', emoji: '🖤', date: '11月第4个周五', month: 11, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', strategy: '全年最重要大促！全品类参与，需提前2个月备货。电子、家居、时尚品类销量可达平时10倍+。', tags: ['全品类','大促','电子','家居'] },
    { id: 34, name: '网络星期一', nameEn: 'Cyber Monday', emoji: '💻', date: '黑五后的周一', month: 11, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', strategy: 'Black Friday延续！电子产品、软件、数码配件表现尤其突出。维持广告投放力度。', tags: ['电子产品','数码','软件'] },
    
    // December
    { id: 35, name: '圣尼古拉斯日', nameEn: 'St. Nicholas Day', emoji: '🎅', date: '12月5-6日', month: 12, countries: ['DE','NL','PL'], type: 'holiday', strategy: '荷兰Sinterklaas(12月5日)比圣诞更重要！德国12月6日。儿童礼品、巧克力、玩具热销。', tags: ['玩具','巧克力','儿童礼品'] },
    { id: 36, name: '圣露西亚日', nameEn: 'St. Lucia Day', emoji: '🕯️', date: '12月13日', month: 12, countries: ['SE'], type: 'cultural', strategy: '瑞典传统节日，白色长袍和蜡烛头饰传统。蜡烛、节日装饰、烘焙用品热销。', tags: ['蜡烛','装饰','烘焙'] },
    { id: 37, name: '圣诞季', nameEn: 'Christmas Season', emoji: '🎄', date: '12月1-24日', month: 12, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', strategy: '全年最大销售旺季！圣诞装饰、礼品、玩具、电子产品、服饰全面爆发。注意各国配送截止日。', tags: ['装饰','礼品','玩具','电子'] },
    { id: 38, name: '节礼日', nameEn: 'Boxing Day', emoji: '🎁', date: '12月26日', month: 12, countries: ['GB','DE','NL','SE'], type: 'shopping', strategy: '英国重要购物日！圣诞后清仓促销，同时为新年礼品采购高峰。', tags: ['清仓','促销','礼品'] },
    { id: 39, name: '跨年/除夕', nameEn: 'New Year Eve', emoji: '🥂', date: '12月31日', month: 12, countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', strategy: '派对用品、香槟酒具、烟花周边、新年装饰热销。为来年销售做好库存准备。', tags: ['派对','酒具','装饰'] }
];

// ==================== AMZF State (移植) ====================
let amzf_currentView = 'country';
let amzf_selectedCountry = 'ALL';
let amzf_searchTerm = '';
let amzf_expandedSections = new Set();

// ==================== AMZF Functions (移植) ====================

function amzf_init() {
    amzf_renderCountryTabs();
    amzf_renderStats();
    amzf_renderContent();
    amzf_bindSearch();
}

function amzf_renderCountryTabs() {
    const container = document.getElementById('amzf_country_tabs');
    if(!container) return;

    let html = `<button class="amzf_country_tab amzf_active" onclick="amzf_selectCountry('ALL')">
        <span class="amzf_country_flag">🌍</span> 全部
    </button>`;
    
    amzf_countries.forEach(c => {
        html += `<button class="amzf_country_tab" onclick="amzf_selectCountry('${c.code}')">
            <span class="amzf_country_flag">${c.flag}</span> ${c.name}
        </button>`;
    });
    
    container.innerHTML = html;
}

function amzf_selectCountry(code) {
    amzf_selectedCountry = code;
    document.querySelectorAll('.amzf_country_tab').forEach(tab => {
        tab.classList.remove('amzf_active');
        if (tab.textContent.includes(code === 'ALL' ? '全部' : amzf_countries.find(c => c.code === code)?.name)) {
            tab.classList.add('amzf_active');
        }
    });
    amzf_renderStats();
    amzf_renderContent();
}

function amzf_switchView(view) {
    amzf_currentView = view;
    document.getElementById('amzf_btn_country').classList.toggle('amzf_active', view === 'country');
    document.getElementById('amzf_btn_event').classList.toggle('amzf_active', view === 'event');
    amzf_expandedSections.clear();
    amzf_renderContent();
}

function amzf_bindSearch() {
    const input = document.getElementById('amzf_search');
    const clear = document.getElementById('amzf_clear');
    
    if(input) {
        input.addEventListener('input', (e) => {
            amzf_searchTerm = e.target.value.toLowerCase();
            clear.classList.toggle('amzf_visible', amzf_searchTerm.length > 0);
            amzf_renderStats();
            amzf_renderContent();
        });
    }
}

function amzf_clearSearch() {
    document.getElementById('amzf_search').value = '';
    document.getElementById('amzf_clear').classList.remove('amzf_visible');
    amzf_searchTerm = '';
    amzf_renderStats();
    amzf_renderContent();
}

function amzf_getFilteredEvents() {
    return amzf_events.filter(event => {
        const countryMatch = amzf_selectedCountry === 'ALL' || event.countries.includes(amzf_selectedCountry);
        const searchMatch = !amzf_searchTerm || 
            event.name.toLowerCase().includes(amzf_searchTerm) ||
            event.nameEn.toLowerCase().includes(amzf_searchTerm) ||
            event.strategy.toLowerCase().includes(amzf_searchTerm) ||
            event.tags.some(t => t.toLowerCase().includes(amzf_searchTerm));
        return countryMatch && searchMatch;
    });
}

function amzf_renderStats() {
    const filtered = amzf_getFilteredEvents();
    const container = document.getElementById('amzf_stats');
    if(!container) return;
    
    const holidays = filtered.filter(e => e.type === 'holiday').length;
    const shopping = filtered.filter(e => e.type === 'shopping').length;
    // const cultural = filtered.filter(e => e.type === 'cultural' || e.type === 'season').length;
    
    container.innerHTML = `
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_blue">📊</div>
            <div>
                <div class="amzf_stat_value">${filtered.length}</div>
                <div class="amzf_stat_label">营销节点</div>
            </div>
        </div>
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_green">🎉</div>
            <div>
                <div class="amzf_stat_value">${holidays}</div>
                <div class="amzf_stat_label">重要节日</div>
            </div>
        </div>
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_orange">🛒</div>
            <div>
                <div class="amzf_stat_value">${shopping}</div>
                <div class="amzf_stat_label">电商大促</div>
            </div>
        </div>
    `;
}

function amzf_renderContent() {
    const container = document.getElementById('amzf_main');
    if(!container) return;

    const filtered = amzf_getFilteredEvents();
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="amzf_empty amzf_animate">
                <div class="amzf_empty_icon">🔍</div>
                <div class="amzf_empty_text">未找到匹配的活动，请调整搜索条件</div>
            </div>
        `;
        return;
    }
    
    if (amzf_currentView === 'country') {
        amzf_renderCountryView(filtered);
    } else {
        amzf_renderEventView(filtered);
    }
}

function amzf_renderCountryView(events) {
    const container = document.getElementById('amzf_main');
    const byMonth = {};
    
    events.forEach(event => {
        if (!byMonth[event.month]) byMonth[event.month] = [];
        byMonth[event.month].push(event);
    });
    
    let html = '<div class="amzf_timeline">';
    
    for (let m = 1; m <= 12; m++) {
        if (!byMonth[m]) continue;
        const monthEvents = byMonth[m];
        const isExpanded = amzf_expandedSections.has(`month_${m}`);
        
        html += `
            <div class="amzf_month_section ${isExpanded ? 'amzf_expanded' : ''} amzf_animate" style="animation-delay: ${(m-1)*0.05}s">
                <div class="amzf_month_header" onclick="amzf_toggleSection('month_${m}')">
                    <div class="amzf_month_info">
                        <span class="amzf_month_name">${amzf_months[m-1]}</span>
                        <span class="amzf_month_badge">${monthEvents.length} 个活动</span>
                    </div>
                    <div class="amzf_month_toggle">▼</div>
                </div>
                <div class="amzf_month_content">
                    <div class="amzf_events_grid">
                        ${monthEvents.map(e => amzf_renderEventCard(e)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function amzf_renderEventCard(event) {
    const typeClass = `amzf_type_${event.type}`;
    const countryBadges = event.countries.map(code => {
        const c = amzf_countries.find(x => x.code === code);
        return `<span class="amzf_country_badge" title="${c?.name}">${c?.flag}</span>`;
    }).join('');
    
    return `
        <div class="amzf_event_card ${typeClass}">
            <div class="amzf_event_header">
                <div class="amzf_event_title_wrapper">
                    <span class="amzf_event_emoji">${event.emoji}</span>
                    <span class="amzf_event_title">${event.name}</span>
                </div>
                <span class="amzf_event_date">📅 ${event.date}</span>
            </div>
            <div class="amzf_event_countries">${countryBadges}</div>
            <div class="amzf_event_strategy">
                <div class="amzf_strategy_title">💡 电商切入策略</div>
                <div class="amzf_strategy_content">${event.strategy}</div>
                <div class="amzf_strategy_tags">
                    ${event.tags.map(t => `<span class="amzf_tag">#${t}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function amzf_renderEventView(events) {
    const container = document.getElementById('amzf_main');
    
    // Group similar events by name pattern
    const eventGroups = {};
    events.forEach(event => {
        // Normalize event names for grouping
        let groupKey = event.nameEn.replace(/ (UK|IT|ES|FR|PL|EU)$/i, '').trim();
        if (!eventGroups[groupKey]) {
            eventGroups[groupKey] = { emoji: event.emoji, events: [] };
        }
        eventGroups[groupKey].events.push(event);
    });
    
    let html = '<div class="amzf_event_view">';
    
    Object.keys(eventGroups).forEach((key, idx) => {
        const group = eventGroups[key];
        const isExpanded = amzf_expandedSections.has(`event_${key}`);
        
        html += `
            <div class="amzf_event_comparison ${isExpanded ? 'amzf_expanded' : ''} amzf_animate" style="animation-delay: ${idx*0.05}s">
                <div class="amzf_comparison_header" onclick="amzf_toggleSection('event_${key}')">
                    <div class="amzf_comparison_title">
                        <span>${group.emoji}</span>
                        <span>${key}</span>
                        <span class="amzf_month_badge">${group.events.length} 个站点</span>
                    </div>
                    <div class="amzf_month_toggle">▼</div>
                </div>
                <div class="amzf_comparison_content">
                    <div class="amzf_country_list">
                        ${group.events.map(e => amzf_renderCountryEvent(e)).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function amzf_renderCountryEvent(event) {
    const flags = event.countries.map(code => {
        const c = amzf_countries.find(x => x.code === code);
        return `<span title="${c?.name}">${c?.flag}</span>`;
    }).join(' ');
    
    return `
        <div class="amzf_country_event">
            <div class="amzf_country_info">
                <span style="font-size:1.3rem">${flags}</span>
            </div>
            <div class="amzf_country_date">
                <strong>📅 ${event.date}</strong>
            </div>
            <div class="amzf_country_strategy_brief">
                💡 ${event.strategy.substring(0, 80)}...
            </div>
        </div>
    `;
}

function amzf_toggleSection(id) {
    if (amzf_expandedSections.has(id)) {
        amzf_expandedSections.delete(id);
    } else {
        amzf_expandedSections.add(id);
    }
    amzf_renderContent();
}

// ==================== Module Exports (核心集成点) ====================

export async function mount(container) {
    // 1. 加载 Template
    const response = await fetch('src/modules/amz_hub/views/marketing_calendar/template.html');
    const html = await response.text();
    container.innerHTML = html;

    // 2. 将内联函数挂载到 window，以便 HTML 里的 onclick 能找到它们
    window.amzf_selectCountry = amzf_selectCountry;
    window.amzf_switchView = amzf_switchView;
    window.amzf_clearSearch = amzf_clearSearch;
    window.amzf_toggleSection = amzf_toggleSection;

    // 3. 初始化
    amzf_init();
    
    console.log("✅ Marketing Calendar Loaded");
}

export function unmount() {
    // 清理 window 上的全局函数，防止污染
    delete window.amzf_selectCountry;
    delete window.amzf_switchView;
    delete window.amzf_clearSearch;
    delete window.amzf_toggleSection;
    
    console.log("❌ Marketing Calendar Unmounted");
}