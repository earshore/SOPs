/**
 * Rufus 模拟器功能测试
 * 验证基于报告内容的智能回答生成
 */

// 模拟报告数据
const mockReport = {
    metadata: {
        asins: ["B0FVM8J662"],
        marketplace: "DE"
    },
    analysisReport: {
        product_title: "50ml Parfum Homme Test Product",
        market: "DE",
        "selling-points": {
            bullet_analysis: [
                {
                    bullet_index: 1,
                    original_text_summary: "Duftkomposition: frische Kopfnoten (Bergamotte, Vetiver), Herznoten (Ylang-Ylang, holzige Noten, Zedernholz) und Basisnoten (Sandelholz, Amber)",
                    functions: ["Spezifische Duftkomposition", "Angenehmes olfaktorisches Erlebnis"],
                    scenes: ["Tägliche Anwendung"],
                    credibility_score: "high"
                },
                {
                    bullet_index: 2,
                    original_text_summary: "Kompaktes 50-ml-Format, passt in Aktentasche, Reisetasche oder Manteltasche",
                    functions: ["Portables Format", "Einfaches Mitnehmen"],
                    scenes: ["Geschäftsreisen", "Reisen"],
                    credibility_score: "high"
                },
                {
                    bullet_index: 5,
                    original_text_summary: "Geschenk für Männer: Geburtstag, Weihnachten, Vatertag",
                    functions: ["Geschenkoption"],
                    scenes: ["Geschenkanlässe"],
                    credibility_score: "high"
                }
            ]
        },
        "fatal-flaws": {
            critical_issues: [
                {
                    issue: "Very poor longevity / fragrance disappears quickly",
                    frequency: 4,
                    user_quotes: [
                        "Der Geruch haltet keine 5 Minuten",
                        "der Duft verblasst recht schnell auf der Haut"
                    ],
                    severity: "critical"
                },
                {
                    issue: "Allergic reaction / causes skin redness",
                    frequency: 1,
                    user_quotes: ["Ich habe allergisch auf den Duft reagiert, gerötete Haut nach Anwendung"],
                    severity: "critical"
                }
            ]
        },
        "wow-moments": {
            moments: [
                {
                    moment_description: "Fragrance evolving from fresh citrus to warm, woody notes",
                    user_quote: "Une très belle surprise pour ce parfum ! L'ouverture est vive et fraîche avec les agrumes",
                    emotion_type: "surprise",
                    aspect: "smell",
                    marketing_potential: "high"
                },
                {
                    moment_description: "Good value for quality/price",
                    user_quote: "Für den Preis absolut in Ordnung",
                    emotion_type: "delight",
                    aspect: "value",
                    marketing_potential: "medium"
                }
            ]
        },
        "hesitation-points": {
            hesitations: [
                {
                    pre_purchase_worry: "Ist es sein Geld wert?",
                    post_purchase_resolution: "Gutes Preis-Leistungs-Verhältnis für Budget-Käufer",
                    conversion_impact: "low"
                }
            ]
        },
        "buyer-profile": {
            buyer_types: [
                {
                    type: "budget-conscious buyers",
                    percentage_estimate: "40%",
                    motivation: "Affordable fragrance option"
                },
                {
                    type: "gift purchasers",
                    percentage_estimate: "20%",
                    motivation: "Looking for presentable gift"
                }
            ]
        }
    }
};

// 测试问题列表
const testQuestions = [
    { q: "Wie lange hält der Duft?", type: "longevity" },
    { q: "Wie riecht das Parfum?", type: "scent" },
    { q: "Ist es sein Geld wert?", type: "value" },
    { q: "Eignet sich das als Geschenk?", type: "gift" },
    { q: "Ist es sicher für empfindliche Haut?", type: "safety" },
    { q: "Für welche Anlässe geeignet?", type: "occasions" },
    { q: "Wie vergleicht es sich mit anderen?", type: "comparison" },
    { q: "Was sind die Hauptmerkmale?", type: "general" }
];

console.log('='.repeat(80));
console.log('Rufus 模拟器功能测试');
console.log('='.repeat(80));
console.log('\n测试数据已准备:');
console.log(`- 产品: ${mockReport.analysisReport.product_title}`);
console.log(`- 市场: ${mockReport.metadata.marketplace}`);
console.log(`- 卖点数量: ${mockReport.analysisReport['selling-points'].bullet_analysis.length}`);
console.log(`- 致命缺陷: ${mockReport.analysisReport['fatal-flaws'].critical_issues.length}`);
console.log(`- Wow 时刻: ${mockReport.analysisReport['wow-moments'].moments.length}`);
console.log('\n测试问题列表:');
testQuestions.forEach((item, index) => {
    console.log(`${index + 1}. [${item.type}] ${item.q}`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ 测试数据准备完成');
console.log('💡 请在浏览器中手动测试以下场景:');
console.log('   1. 加载分析报告');
console.log('   2. 在 Rufus AI 对话框中输入上述测试问题');
console.log('   3. 验证回答是否基于报告内容动态生成');
console.log('   4. 检查回答中是否包含具体的数据引用');
console.log('='.repeat(80));
