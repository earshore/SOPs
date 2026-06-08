import BaseModule from "../../../../../common/BaseModule";
import { setSafeHtml } from "../../../../../common/utils/security";
import templateHTML from "./template.html?raw";
import "./styles.css";

interface ContentItem {
  title?: string;
  icon?: string;
  desc?: string;
  text?: string;
  tags?: string[];
  key?: string;
  value?: string;
  done?: boolean;
}

interface ContentBlock {
  type:
    | "text"
    | "section_header"
    | "callout"
    | "sub_items"
    | "stats"
    | "comparison_table"
    | "tip_list"
    | "key_value_list"
    | "checklist";
  text?: string;
  title?: string;
  style?: "insight" | "core" | "warning" | "success" | "tip" | "formula";
  headers?: string[];
  rows?: string[][];
  items?: ContentItem[];
}

interface PromoSection {
  id: string;
  title: string;
  icon: string;
  navLabel: string;
  navMeta: string;
  navHint: string;
  content: ContentBlock[];
}

const promoData: PromoSection[] = [
  {
    id: "overview",
    title: "欧洲站促销工具全景图",
    icon: "fa-sitemap",
    navLabel: "工具全景",
    navMeta: "总览定位",
    navHint: "先把流量、转化、组合购、清库存工具分清楚",
    content: [
      {
        type: "callout",
        style: "insight",
        title: "这页的核心目标：先认清工具，再决定打法",
        text: "欧洲站促销工具很多，但不是全部都该同时开。正确顺序是：先看业务目标，再看后台资格，再看利润和库存，最后才是选工具。后台显示可提报，不等于这个 ASIN 值得上活动。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "日常提转化",
            icon: "fa-chart-line",
            desc: "以 Coupons、Prime 专享折扣、Price Discounts 为主，核心目的是提高点击率和详情页转化，而不是赌一次性爆发。",
            tags: ["低门槛", "全年可用", "适合成熟款"],
          },
          {
            title: "节点冲排名",
            icon: "fa-bolt",
            desc: "以 Lightning Deal、Best Deal / 7-Day Deal、官方大促专场 Deal 为主，适合 Prime Day、Prime 秋促、BFCM 等关键档期。",
            tags: ["爆发流量", "报名费高", "只给主推款"],
          },
          {
            title: "组合购拉客单",
            icon: "fa-boxes-stacked",
            desc: "以 Promotions 为主，包括 Percentage Off、Buy One Get One、Social Media Promo Code 等，重点是提升客单和带动配件销量。",
            tags: ["多件购", "配件联动", "详情页转化"],
          },
          {
            title: "清库存回款",
            icon: "fa-warehouse",
            desc: "以 Outlet 和深折扣为主，目标是处理库龄库存、冗余 FBA 货件和季节尾货，不适合作为核心爆款工具。",
            tags: ["库龄治理", "尾货回款", "不做形象款"],
          },
        ],
      },
      {
        type: "comparison_table",
        headers: ["目标", "首选工具", "前台入口", "成本结构", "更适合谁"],
        rows: [
          [
            "日常转化",
            "Coupons / Prime 专享折扣 / Price Discounts",
            "搜索结果、详情页、优惠页",
            "让利为主，部分工具按核销收费",
            "稳定款、利润款、常规广告款",
          ],
          [
            "节点冲量",
            "Lightning Deal / Best Deal / Event Deal",
            "Today’s Deals、活动会场、推荐位",
            "固定报名费 + 让利 + 广告预算",
            "评价、库存、转化都成熟的主推款",
          ],
          [
            "拉升客单",
            "Promotions 组合促销",
            "详情页、购物车、站外码",
            "让利 / 赠品成本",
            "主品 + 配件、替换装、套装款",
          ],
          [
            "清库存",
            "Outlet / 深折扣",
            "Outlet 会场、折扣流量入口",
            "深折扣为主",
            "库龄高、尾货、季节性库存",
          ],
        ],
      },
      {
        type: "stats",
        items: [
          {
            icon: "fa-eye",
            text: "先看后台资格：Deals、PED、Outlet 是否开放，以及每个站点是否可提报。",
          },
          {
            icon: "fa-scale-balanced",
            text: "先算经营底线：折后毛利、广告预算、核销费、报名费要一起算，而不是只看折扣幅度。",
          },
          {
            icon: "fa-layer-group",
            text: "组合原则：一个主工具负责拿结果，一个辅工具负责补转化；不要把所有工具堆在同一个 ASIN 上。",
          },
        ],
      },
    ],
  },
  {
    id: "deals",
    title: "Deals 系列：爆发流量工具",
    icon: "fa-bolt",
    navLabel: "Deals 系列",
    navMeta: "爆发流量",
    navHint: "Lightning Deal、Best Deal、活动专场 Deal 的使用边界",
    content: [
      {
        type: "callout",
        style: "core",
        title: "Deals 适合冲排名，不适合救差链接",
        text: "Deals 是欧洲站站内最强的爆发型促销工具，但前提是 ASIN 本身已经有基础：评价不差、图片合格、转化在线、库存充足。如果链接基础弱，报名费和折扣都会白烧。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "Lightning Deal",
            icon: "fa-bolt-lightning",
            desc: "短时高峰流量工具，适合冲自然排名、测高峰转化、抢特定时间段曝光。持续时间短，对库存和广告协同要求高。",
            tags: ["短时爆发", "冲排名", "对运营盯盘要求高"],
          },
          {
            title: "Best Deal / 7-Day Deal",
            icon: "fa-calendar-week",
            desc: "持续时间更长，更适合大促前后承接广告和自然流量，也更适合需要稳定放量而不是瞬时爆发的主推款。",
            tags: ["持续放量", "大促常用", "适合成熟爆款"],
          },
          {
            title: "Event Deal / 官方大促专场",
            icon: "fa-flag-checkered",
            desc: "Prime Day、Prime Big Deal Days、BFCM 等官方档期的专场 Deal。名额、收费、价格门槛以 Deals Dashboard 实时显示为准。",
            tags: ["名额制", "提前提报", "站点差异大"],
          },
        ],
      },
      {
        type: "key_value_list",
        items: [
          { key: "操作入口", value: "优先看 Seller Central 中的 Deals Dashboard，以后台 eligibility、费用和日期窗口为准。" },
          { key: "适用目标", value: "冲排名、冲销量、承接大促会场流量，或为重点关键词打短周期权重。" },
          { key: "核心门槛", value: "历史价格校验、库存覆盖、评分、图文质量、站点资格，缺一个都会影响提报价值。" },
          { key: "不适合", value: "新品冷启动、利润极薄的款、库存不稳的款、转化还没跑通的链接。" },
        ],
      },
      {
        type: "tip_list",
        items: [
          { icon: "fa-check-circle", text: "只把 Deals 给 1-3 个主推 ASIN，用来打关键词和排名，而不是平均分给所有 SKU。", tags: ["success"] },
          { icon: "fa-check-circle", text: "提报前同步锁库存、调广告预算、检查参考价和活动价，避免临门一脚失效。", tags: ["success"] },
          { icon: "fa-times-circle", text: "不要为了“能报”硬报 Deal。报名费、深折扣和广告叠加后，常常会把净利打穿。", tags: ["danger"] },
        ],
      },
    ],
  },
  {
    id: "coupons",
    title: "Coupons：全年最灵活的转化工具",
    icon: "fa-ticket-alt",
    navLabel: "Coupons",
    navMeta: "日常转化",
    navHint: "绿色标签、预算控制、适合全年常开",
    content: [
      {
        type: "callout",
        style: "tip",
        title: "如果只能保留一个常规促销工具，很多团队最后会选 Coupons",
        text: "因为它前台识别度高、上线快、关闭快、适合日常广告流量承接。对欧洲站来说，搜索结果里的优惠标签能明显提高点击欲望，是很典型的“低风险换转化”工具。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "百分比 Coupon",
            icon: "fa-percent",
            desc: "最常见的日常玩法，适合标准价带产品，折扣理解简单，前台展示清晰。",
            tags: ["通用型", "易理解", "CTR 友好"],
          },
          {
            title: "固定金额 Coupon",
            icon: "fa-euro-sign",
            desc: "适合客单较高的产品，能让消费者快速感知“立减金额”，在高价带商品上更有冲击力。",
            tags: ["高客单", "金额感知强", "促单明显"],
          },
          {
            title: "定向 Coupon",
            icon: "fa-bullseye",
            desc: "部分类目或账户会开放更细的定向能力，例如面向 Prime 或指定客群。是否开放以后台实际显示为准。",
            tags: ["资格制", "定向更准", "不是所有账户都有"],
          },
        ],
      },
      {
        type: "key_value_list",
        items: [
          { key: "前台入口", value: "搜索结果、详情页、优惠券聚合页面，适合承接站内自然流量和广告流量。" },
          { key: "费用模式", value: "通常按核销收费，具体费率和站点规则以后台实时提示为准，必须同步看预算上限。" },
          { key: "常见折扣", value: "日常 5%-15% 更稳妥，大促时再结合利润空间加深折扣，不建议无脑长期高折。" },
          { key: "运营建议", value: "必须设置预算、起止时间和复盘节点；高销量 ASIN 没有预算上限，容易把费用跑飞。" },
        ],
      },
      {
        type: "tip_list",
        items: [
          { icon: "fa-check-circle", text: "广告在跑、转化还想再提一点时，Coupons 往往是第一优先级。", tags: ["success"] },
          { icon: "fa-check-circle", text: "做大促预热时，可以先用 Coupons 观察折扣敏感度，再决定要不要上更重的工具。", tags: ["success"] },
          { icon: "fa-times-circle", text: "不要把 Coupons 当成清库存主工具，费用会被核销拖高，尾货处理效率也未必最好。", tags: ["danger"] },
        ],
      },
    ],
  },
  {
    id: "prime-exclusive-discount",
    title: "Prime 专享折扣：会员流量承接工具",
    icon: "fa-crown",
    navLabel: "Prime 专享折扣",
    navMeta: "会员承接",
    navHint: "适合成熟款长期挂，重点吃 Prime 用户转化",
    content: [
      {
        type: "callout",
        style: "success",
        title: "Prime 专享折扣的价值，不在“免费”两个字，而在它对高质量流量更友好",
        text: "Prime 用户购买意愿强、下单更快，这个工具适合用来承接高质量流量，尤其适合成熟款、常规爆款和大促期间的会员流量承接。是否开放、折扣门槛和价格校验以后台实际为准。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "详情页转化感知强",
            icon: "fa-strikethrough",
            desc: "折扣信息更接近 Buy Box 决策区，适合已经拿到点击、只差最后一脚转化的链接。",
            tags: ["详情页强感知", "更偏收口", "适合成熟款"],
          },
          {
            title: "工具成本相对轻",
            icon: "fa-wallet",
            desc: "相较 Deals 和部分 Coupon 场景，Prime 专享折扣更适合作为长期挂载工具，但前提是利润可承受。",
            tags: ["适合常态化", "预算压力轻", "别忽略让利成本"],
          },
          {
            title: "适合与其他工具搭配",
            icon: "fa-link",
            desc: "在利润可控的前提下，可与 Coupon 等工具搭配，形成“先吸引点击，再加速转化”的组合。",
            tags: ["可组合", "先算净利", "叠加需谨慎"],
          },
        ],
      },
      {
        type: "key_value_list",
        items: [
          { key: "最佳场景", value: "成熟款常态提转化、大促会员承接、广告已经有流量但还想压榨详情页转化率。" },
          { key: "重点检查", value: "站点资格、价格校验、评分基础、库存深度，以及是否与现有折扣冲突。" },
          { key: "经营纪律", value: "成熟款可以常态化挂，但不要频繁开关或大幅波动折扣，容易打乱价格节奏。" },
          { key: "一句话判断", value: "如果你想提升 Prime 流量下的转化效率，它通常比硬上 Deal 更轻、更稳。" },
        ],
      },
    ],
  },
  {
    id: "price-discounts",
    title: "Price Discounts：被低估的常规活动价工具",
    icon: "fa-tags",
    navLabel: "Price Discounts",
    navMeta: "常规活动价",
    navHint: "适合月度主题、节日预热、净利更干净的折扣打法",
    content: [
      {
        type: "callout",
        style: "core",
        title: "Price Discounts 适合“想做活动感，但不想承担 Coupon 核销费”的场景",
        text: "很多团队容易只盯 Coupons 和 Deals，忽略 Price Discounts。实际上，它更适合常规活动月、节庆预热、多站点统一活动价，以及利润纪律要求更严的账号。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "日历型活动价",
            icon: "fa-calendar-days",
            desc: "适合围绕月度主题或节日前后设置固定时间窗口，让价格节奏更有计划感。",
            tags: ["可排期", "适合预热", "利于团队协作"],
          },
          {
            title: "前台价格表达更干净",
            icon: "fa-eye",
            desc: "适合不想过度依赖绿色 Coupon 标签，但仍希望前台有明确活动感的商品。",
            tags: ["表达清爽", "便于控利", "日常友好"],
          },
          {
            title: "多站点统一活动节奏",
            icon: "fa-globe",
            desc: "对于欧洲多站点运营，Price Discounts 更容易做统一的时间排期和价格管理。",
            tags: ["多站点协同", "便于计划", "适合矩阵运营"],
          },
        ],
      },
      {
        type: "comparison_table",
        headers: ["维度", "Price Discounts", "Coupons", "Prime 专享折扣"],
        rows: [
          ["前台感知", "活动价 / 划线价表达", "绿色优惠标签最醒目", "更偏 Prime 用户决策区"],
          ["工具成本", "主要是让利成本", "让利 + 可能的核销费", "主要是让利成本"],
          ["适用目标", "常规活动、预热、稳态提转化", "提点击、提转化、测试折扣敏感度", "承接高质量 Prime 流量"],
          ["更适合", "重计划、重净利的团队", "需要更强视觉抓手的链接", "成熟款、会员导向产品"],
        ],
      },
    ],
  },
  {
    id: "promotions",
    title: "Promotions：组合购与站外码工具",
    icon: "fa-boxes-stacked",
    navLabel: "Promotions",
    navMeta: "组合购",
    navHint: "Percentage Off、BOGO、Promo Code 等组合促销工具",
    content: [
      {
        type: "callout",
        style: "tip",
        title: "Promotions 的强项不是公域流量，而是“做规则”",
        text: "它最适合解决两类问题：一是让用户多买一件，二是给站外渠道一个可追踪的优惠入口。所以它更像转化策略工具，而不是纯曝光工具。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "Percentage Off",
            icon: "fa-percent",
            desc: "买满件数或金额后享受折扣，适合做多件购门槛，提升客单价和整单毛利。",
            tags: ["拉客单", "门槛优惠", "适合替换装"],
          },
          {
            title: "Buy One Get One / Buy X Get Y",
            icon: "fa-gift",
            desc: "更适合主品带配件、主品带耗材、AB 组合成交的场景，用规则带动关联购买。",
            tags: ["组合成交", "带动配件", "适合搭配购"],
          },
          {
            title: "Social Media Promo Code",
            icon: "fa-share-nodes",
            desc: "适合红人、邮件、社媒、私域等站外渠道，能把折扣规则做成可追踪的优惠码。",
            tags: ["站外转化", "好追踪", "适合投放合作"],
          },
          {
            title: "Free Shipping / 运费类促销",
            icon: "fa-truck-fast",
            desc: "适用性与站点、履约方式有关。若后台开放，更适合边际运费敏感的场景，而非主流站内打爆工具。",
            tags: ["资格看后台", "不是主流打法", "谨慎使用"],
          },
        ],
      },
      {
        type: "key_value_list",
        items: [
          { key: "最佳场景", value: "配件带动主品、替换装拉件数、套装促单、站外合作码、老客复购。" },
          { key: "前台逻辑", value: "更多发生在详情页、购物车和结算逻辑中，对 CTR 帮助有限，但对客单价和连带率帮助明显。" },
          { key: "运营关键", value: "规则一定要简单，最好一句话能讲明白，否则用户理解成本高、转化不一定升。" },
          { key: "风险提醒", value: "赠品、折扣门槛和变体组合设置复杂时，最容易出现利润误判和前台理解偏差。" },
        ],
      },
    ],
  },
  {
    id: "outlet",
    title: "Outlet：欧洲站清库存工具",
    icon: "fa-warehouse",
    navLabel: "Outlet",
    navMeta: "库存回收",
    navHint: "适合库龄货、尾货、冗余库存，不适合做品牌形象款",
    content: [
      {
        type: "callout",
        style: "warning",
        title: "Outlet 的目标是回款和腾库，不是打造爆款",
        text: "如果一个 ASIN 已经进入库龄压力区、冗余库存明显、季节窗口错过，Outlet 往往比继续硬打广告更有效。但它适合处理“库存问题”，不适合处理“品牌心态”。",
      },
      {
        type: "sub_items",
        items: [
          {
            title: "Outlet Deal",
            icon: "fa-box-open",
            desc: "适合有明确库存压力、愿意用更深折扣换取现金流和仓储效率的商品。",
            tags: ["深折扣", "回款优先", "清货场景"],
          },
          {
            title: "库龄库存修复",
            icon: "fa-clock-rotate-left",
            desc: "当 FBA 库龄和仓储费压力开始放大时，Outlet 比继续拖延更实用。",
            tags: ["治理仓储费", "减少滞销", "库存优先级高"],
          },
          {
            title: "季节尾货处理",
            icon: "fa-snowflake",
            desc: "季节性商品过了销售窗口后，应该尽快考虑 Outlet 或清仓价格，而不是期待次年自然恢复。",
            tags: ["季节尾货", "避免长期占仓", "快速止损"],
          },
        ],
      },
      {
        type: "key_value_list",
        items: [
          { key: "适用库存", value: "库龄高、销量持续下滑、补货失误导致积压、季节窗口已过的 FBA 库存。" },
          { key: "经营目标", value: "降低仓储费、回收现金流、腾出仓位给主推产品，而不是继续追求高毛利。" },
          { key: "不要怎么用", value: "不要把品牌形象款、长期主力款、还在上升期的产品轻易扔进 Outlet。" },
          { key: "实操提醒", value: "深折扣前先核算尾货回收底线，确保“尽快回款”不等于“盲目清仓”。" },
        ],
      },
    ],
  },
  {
    id: "playbook",
    title: "选品与组合打法：怎么把工具真正用起来",
    icon: "fa-chess-knight",
    navLabel: "组合打法",
    navMeta: "实操组合",
    navHint: "按业务目标选工具，而不是按兴趣堆工具",
    content: [
      {
        type: "callout",
        style: "formula",
        title: "实操原则：一个主工具负责拿结果，一个辅工具负责补效率",
        text: "主工具决定这次活动的核心目标，比如 Deals 负责冲量、Coupon 负责提点击、Promotions 负责拉客单；辅工具只做补强，不要为了“看起来很热闹”把所有工具都叠上。",
      },
      {
        type: "comparison_table",
        headers: ["业务场景", "首选工具", "建议搭配", "不建议做法"],
        rows: [
          ["新品冷启动", "小力度 Coupon / 轻 Price Discount", "配合广告验证转化", "评论和转化还没跑通就上 Deals"],
          ["成熟款稳态提转化", "Prime 专享折扣 / Price Discounts", "视利润再叠小 Coupon", "长期高折把价格体系打乱"],
          ["Prime Day / BFCM 主推款", "Best Deal / Lightning Deal", "广告 + Coupon / PED 协同", "对所有 SKU 一视同仁地报活动"],
          ["配件带主品、提高客单", "Promotions", "与详情页文案、套装图同步", "规则太复杂导致用户看不懂"],
          ["滞销或尾货处理", "Outlet", "必要时配合深折扣", "继续砸广告赌自然恢复"],
        ],
      },
      {
        type: "section_header",
        text: "促销提报前检查清单",
      },
      {
        type: "checklist",
        items: [
          { text: "这个 ASIN 的目标到底是什么：冲量、提转化、拉客单，还是清库存？", done: true },
          { text: "后台 eligibility 是否真实开放，对应站点是否都能报？", done: true },
          { text: "折后毛利、广告预算、工具费用是否一起测算过？", done: true },
          { text: "价格历史是否稳定，是否可能卡在参考价或最低价校验上？", done: true },
          { text: "库存是否能覆盖活动期和活动后 1-2 周的销量波动？", done: true },
          { text: "Listing 主图、卖点、评论和评分是否足以承接促销流量？", done: true },
          { text: "活动结束时间、预算上限、复盘节点有没有提前设好？", done: true },
          { text: "如果活动效果不理想，是否有止损方案，而不是继续硬投？", done: true },
        ],
      },
    ],
  },
];

function renderTextBlock(block: ContentBlock): string {
  return `<div class="amzpt_text">${block.text ?? ""}</div>`;
}

function renderSectionHeaderBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_section_header">
      <i class="fas fa-caret-right"></i>
      <span>${block.text ?? ""}</span>
    </div>
  `;
}

function renderCalloutBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_callout amzpt_callout--${block.style ?? "insight"}">
      <div class="amzpt_callout__title">${block.title ?? ""}</div>
      <div class="amzpt_callout__text">${block.text ?? ""}</div>
    </div>
  `;
}

function renderTagRow(tags: string[] | undefined): string {
  if (!tags?.length) return "";

  return `<div class="amzpt_tag_row">${tags.map((tag) => `<span class="amzpt_tag">${tag}</span>`).join("")}</div>`;
}

function renderSubItemsBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_grid">
      ${(block.items ?? [])
        .map(
          (item) => `
            <div class="amzpt_sub_item">
              <div class="amzpt_sub_header">
                <div class="amzpt_sub_icon"><i class="fas ${item.icon ?? "fa-circle"}"></i></div>
                <div class="amzpt_sub_title">${item.title ?? ""}</div>
              </div>
              <div class="amzpt_sub_desc">${item.desc ?? item.text ?? ""}</div>
              ${renderTagRow(item.tags)}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderStatsBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_stats_grid">
      ${(block.items ?? [])
        .map(
          (item) => `
            <div class="amzpt_stats_box">
              <div class="amzpt_stats_icon"><i class="fas ${item.icon ?? "fa-circle"}"></i></div>
              <div class="amzpt_stats_text">${item.text ?? ""}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderComparisonTableBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_table_wrapper">
      <table class="amzpt_table">
        <thead>
          <tr>
            ${(block.headers ?? []).map((header) => `<th>${header}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${(block.rows ?? [])
            .map(
              (row) => `
                <tr>
                  ${row.map((cell) => `<td>${cell}</td>`).join("")}
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getTipVariant(item: ContentItem): "danger" | "success" {
  return item.tags?.includes("danger") ? "danger" : "success";
}

function renderTipListBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_tip_list">
      ${(block.items ?? [])
        .map(
          (item) => `
            <div class="amzpt_tip_item amzpt_tip_item--${getTipVariant(item)}">
              <div class="amzpt_tip_icon"><i class="fas ${item.icon ?? "fa-circle"}"></i></div>
              <div class="amzpt_tip_text">${item.text ?? ""}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderKeyValueListBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_kv_list">
      ${(block.items ?? [])
        .map(
          (item) => `
            <div class="amzpt_kv_row">
              <div class="amzpt_kv_key">${item.key ?? ""}</div>
              <div class="amzpt_kv_value">${item.value ?? ""}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderChecklistBlock(block: ContentBlock): string {
  return `
    <div class="amzpt_checklist">
      ${(block.items ?? [])
        .map(
          (item) => `
            <div class="amzpt_check_item ${item.done ? "amzpt_check_item--done" : ""}">
              <div class="amzpt_check_icon">
                <i class="fas ${item.done ? "fa-check-square" : "fa-square"}"></i>
              </div>
              <div class="amzpt_check_text">${item.text ?? ""}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

const contentBlockRenderers: Record<ContentBlock["type"], (block: ContentBlock) => string> = {
  text: renderTextBlock,
  section_header: renderSectionHeaderBlock,
  callout: renderCalloutBlock,
  sub_items: renderSubItemsBlock,
  stats: renderStatsBlock,
  comparison_table: renderComparisonTableBlock,
  tip_list: renderTipListBlock,
  key_value_list: renderKeyValueListBlock,
  checklist: renderChecklistBlock,
};

function renderContentBlock(block: ContentBlock): string {
  return contentBlockRenderers[block.type](block);
}

class PromotionsModule extends BaseModule {
  constructor() {
    super("amz_promo_tools");
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    setSafeHtml(container, templateHTML);
    container.classList.add("fade-in");
  }

  async init(): Promise<void> {
    this.renderNavigation();
    this.renderContent();
    console.log("✅ [PromoTools] 促销工具页面已加载");
  }

  protected onUnmount(): void {
    console.log("🗑️ [PromoTools] 模块已卸载");
  }

  private renderNavigation(): void {
    const navContainer = document.getElementById("amzpt_nav");
    if (!navContainer) return;

    // ✅ 安全: promoData 是本文件内定义的静态运营内容，不包含用户输入
    setSafeHtml(navContainer, `
      <div class="amzpt_anchor_nav">
        <div class="amzpt_anchor_header">
          <div>
            <span class="amzpt_anchor_eyebrow">PROMOTION TOOL MAP</span>
            <h2 class="amzpt_anchor_title">欧洲站促销工具总览（运营工具版）</h2>
            <p class="amzpt_anchor_desc">
              本页专门解决“用什么工具、什么时候适合用、工具之间能否叠加、哪些场景不要误用”；如果你要看 Prime Day、BFCM 等节点的推进节奏与执行 SOP，请配合“促销活动”页一起使用。
            </p>

          </div>
          <div class="amzpt_anchor_tip">
            <i class="fas fa-hand-pointer"></i>
            <span>点击卡片直达对应工具章节</span>
          </div>
        </div>
        <div class="amzpt_process_nav">
          ${promoData
            .map(
              (section, index) => `
                <a class="amzpt_nav_step" href="#${section.id}">
                  <span class="amzpt_nav_step_no">${String(index + 1).padStart(2, "0")}</span>
                  <span class="amzpt_nav_step_meta">${section.navMeta}</span>
                  <span class="amzpt_nav_step_title">${section.navLabel}</span>
                  <span class="amzpt_nav_step_desc">${section.navHint}</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </div>
    `);
  }

  private renderContent(): void {
    const contentContainer = document.getElementById("amzpt_main");
    if (!contentContainer) return;

    // ✅ 安全: promoData 和 renderSectionBody 内容均来自本文件内静态常量
    setSafeHtml(contentContainer, promoData
      .map(
        (section) => `
          <section id="${section.id}" class="amzpt_card">
            <div class="amzpt_card_header">
              <i class="fas ${section.icon} amzpt_card_icon"></i>
              <h2 class="amzpt_card_title">${section.title}</h2>
            </div>
            ${this.renderSectionBody(section.content)}
          </section>
        `,
      )
      .join(""));
  }

  private renderSectionBody(contentArray: ContentBlock[]): string {
    return contentArray
      .map((block) => renderContentBlock(block))
      .join("");
  }
}

const instance = new PromotionsModule();
export const mount = (container: HTMLElement) => instance.mount(container);
export const unmount = () => instance.unmount();
