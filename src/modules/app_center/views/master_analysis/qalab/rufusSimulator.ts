/**
 * Rufus AI 问答模拟器
 * 基于分析报告内容智能生成仿真回答
 */

export interface RufusMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Rufus AI 智能回答生成器
 */
export class RufusSimulator {
    private reportData: any = null;
    
    /**
     * 初始化模拟器
     */
    initialize(reportData: any): void {
        this.reportData = reportData?.analysisReport || reportData;
    }
    
    /**
     * 生成 Rufus 风格的回答
     */
    async generateAnswer(question: string): Promise<string> {
        if (!this.reportData) {
            return this.getDefaultResponse();
        }
        
        const questionLower = question.toLowerCase();
        
        // 分析问题类型并生成对应答案
        if (this.isAboutLongevity(questionLower)) {
            return this.generateLongevityAnswer();
        } else if (this.isAboutScent(questionLower)) {
            return this.generateScentAnswer();
        } else if (this.isAboutValue(questionLower)) {
            return this.generateValueAnswer();
        } else if (this.isAboutGift(questionLower)) {
            return this.generateGiftAnswer();
        } else if (this.isAboutSafety(questionLower)) {
            return this.generateSafetyAnswer();
        } else if (this.isAboutOccasions(questionLower)) {
            return this.generateOccasionsAnswer();
        } else if (this.isAboutComparison(questionLower)) {
            return this.generateComparisonAnswer();
        } else {
            return this.generateGeneralAnswer(question);
        }
    }
    
    /**
     * 判断问题类型
     */
    private isAboutLongevity(q: string): boolean {
        return /halt|dauer|long|last|持久|时间/.test(q);
    }
    
    private isAboutScent(q: string): boolean {
        return /duft|geruch|smell|scent|fragrance|香味|气味/.test(q);
    }
    
    private isAboutValue(q: string): boolean {
        return /preis|wert|value|worth|price|性价比|值得/.test(q);
    }
    
    private isAboutGift(q: string): boolean {
        return /geschenk|gift|present|cadeau|礼物|送礼/.test(q);
    }
    
    private isAboutSafety(q: string): boolean {
        return /allergi|haut|skin|irritation|safe|安全|过敏/.test(q);
    }
    
    private isAboutOccasions(q: string): boolean {
        return /anlass|occasion|wann|when|场合|适合/.test(q);
    }
    
    private isAboutComparison(q: string): boolean {
        return /vergleich|compare|besser|better|对比|比较/.test(q);
    }
    
    /**
     * 生成持久度相关回答
     */
    private generateLongevityAnswer(): string {
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const longevityIssues = fatalFlaws.filter((issue: any) => 
            issue.issue?.toLowerCase().includes('longevity') || 
            issue.issue?.toLowerCase().includes('disappear')
        );
        
        if (longevityIssues.length > 0) {
            const quotes = longevityIssues[0].user_quotes?.slice(0, 2) || [];
            return `Basierend auf Kundenbewertungen variieren die Erfahrungen mit der Haltbarkeit:\n\n⚠️ Einige Kunden berichten:\n${quotes.map((q: string) => `• "${q}"`).join('\n')}\n\n💡 Die Duftintensität und Haltbarkeit können von Person zu Person unterschiedlich sein. Faktoren wie Hauttyp, Körperchemie und Auftragungsmethode spielen eine wichtige Rolle.\n\nTipp: Tragen Sie den Duft auf Pulspunkte auf und vermeiden Sie das Verreiben für bessere Haltbarkeit.`;
        }
        
        return `Die Haltbarkeit wird von den meisten Kunden als zufriedenstellend bewertet. Für optimale Ergebnisse empfehle ich:\n\n• Auftragen auf Pulspunkte (Handgelenke, Hals)\n• Nicht verreiben nach dem Aufsprühen\n• Auf leicht angefeuchtete Haut auftragen\n\nDas kompakte 50-ml-Format ermöglicht einfaches Nachsprühen unterwegs.`;
    }
    
    /**
     * 生成香味相关回答
     */
    private generateScentAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const scentBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('duft') ||
            b.original_text_summary?.toLowerCase().includes('note')
        );
        
        if (scentBullet) {
            return `Der Duft entwickelt sich in mehreren Phasen:\n\n${scentBullet.original_text_summary}\n\n🌟 Besonderheit: Die Duftkomposition ist ausgewogen zwischen frisch und warm, ohne aufdringlich zu wirken. Perfekt für den Alltag und besondere Anlässe.`;
        }
        
        return `Der Duft zeichnet sich durch eine ausgewogene Komposition aus:\n\n🍋 Frische Kopfnoten für einen belebenden Start\n🌿 Elegante Herznoten für Tiefe\n🪵 Warme Basisnoten für Beständigkeit\n\nDie Balance macht ihn vielseitig einsetzbar.`;
    }
    
    /**
     * 生成性价比相关回答
     */
    private generateValueAnswer(): string {
        const wowMoments = this.reportData?.['wow-moments']?.moments || [];
        const valueWow = wowMoments.find((m: any) => m.aspect === 'value');
        
        if (valueWow) {
            return `Das Preis-Leistungs-Verhältnis wird sehr positiv bewertet:\n\n💬 Kundenstimme:\n"${valueWow.user_quote}"\n\n✅ Sie erhalten:\n• Hochwertige Duftkomposition\n• Elegante Verpackung\n• Reisefreundliches Format\n• Geschenkgeeignete Präsentation\n\nFür den Preis eine ausgezeichnete Wahl!`;
        }
        
        return `Das Produkt bietet ein gutes Preis-Leistungs-Verhältnis. Viele Kunden sind mit der Qualität für den Preis zufrieden und empfehlen es als Budget-freundliche Option ohne Kompromisse bei der Präsentation.`;
    }
    
    /**
     * 生成送礼相关回答
     */
    private generateGiftAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const giftBullet = sellingPoints.find((b: any) => 
            b.original_text_summary?.toLowerCase().includes('geschenk') ||
            b.functions?.includes('Geschenkoption')
        );
        
        if (giftBullet) {
            return `Ja, dieses Parfum eignet sich hervorragend als Geschenk:\n\n🎁 ${giftBullet.original_text_summary}\n\n✨ Vorteile als Geschenk:\n• Elegante Verpackung\n• Universell ansprechender Duft\n• Praktisches Format\n• Angemessener Preis\n\nPerfekt für verschiedene Anlässe!`;
        }
        
        return `Dieses Parfum ist eine ausgezeichnete Geschenkwahl:\n\n🎁 Geeignet für: Geburtstage, Weihnachten, Valentinstag, Vatertag\n✨ Die elegante Verpackung macht einen hochwertigen Eindruck\n💝 Universell ansprechend und praktisch\n\nEine aufmerksame Geschenkidee, die gut ankommt!`;
    }
    
    /**
     * 生成安全性相关回答
     */
    private generateSafetyAnswer(): string {
        const fatalFlaws = this.reportData?.['fatal-flaws']?.critical_issues || [];
        const allergyIssues = fatalFlaws.filter((issue: any) => 
            issue.issue?.toLowerCase().includes('allergic') || 
            issue.issue?.toLowerCase().includes('skin')
        );
        
        if (allergyIssues.length > 0) {
            return `⚠️ Wichtiger Hinweis zur Hautverträglichkeit:\n\nEin Kunde berichtete über eine allergische Reaktion. Dies ist ein Einzelfall, aber ich empfehle:\n\n1. Patch-Test vor der ersten Anwendung\n2. Bei Rötungen oder Irritationen sofort absetzen\n3. Bei bekannten Allergien vorher Dermatologen konsultieren\n\nJede Haut reagiert individuell auf Duftstoffe. Im Zweifelsfall testen Sie das Produkt zunächst an einer kleinen Hautstelle.`;
        }
        
        return `Das Produkt wird als hautverträglich beworben. Dennoch empfehle ich bei empfindlicher Haut:\n\n✓ Patch-Test vor der ersten Anwendung\n✓ Auf bekannte Allergien achten\n✓ Bei Unsicherheit Dermatologen konsultieren\n\nDie meisten Kunden berichten von problemloser Anwendung.`;
    }
    
    /**
     * 生成场合相关回答
     */
    private generateOccasionsAnswer(): string {
        const sellingPoints = this.reportData?.['selling-points']?.bullet_analysis || [];
        const sceneBullets = sellingPoints.filter((b: any) => b.scenes && b.scenes.length > 0);
        
        if (sceneBullets.length > 0) {
            const allScenes = sceneBullets.flatMap((b: any) => b.scenes);
            const uniqueScenes = [...new Set(allScenes)];
            
            return `Dieser Duft ist vielseitig einsetzbar:\n\n${uniqueScenes.map(s => `✓ ${s}`).join('\n')}\n\nDie ausgewogene Duftkomposition macht ihn zum perfekten Allrounder für verschiedene Situationen. Nicht zu aufdringlich für das Büro, aber präsent genug für besondere Anlässe.`;
        }
        
        return `Der Duft eignet sich für vielfältige Anlässe:\n\n👔 Beruflich: Subtil und professionell\n💑 Romantisch: Warme, anziehende Noten\n🌃 Abends: Elegant und präsent\n🚶 Alltag: Frisch und belebend\n\nEin echter Allrounder!`;
    }
    
    /**
     * 生成对比相关回答
     */
    private generateComparisonAnswer(): string {
        const hesitations = this.reportData?.['hesitation-points']?.hesitations || [];
        const valueHesitation = hesitations.find((h: any) => 
            h.pre_purchase_worry?.toLowerCase().includes('wert') ||
            h.pre_purchase_worry?.toLowerCase().includes('geld')
        );
        
        if (valueHesitation) {
            return `Im Vergleich zu teureren Marken:\n\n${valueHesitation.post_purchase_resolution}\n\n💡 Realistische Einschätzung:\n• Keine Luxus-Edition, aber solide Qualität\n• Durchdachte Duftkomposition\n• Ansprechende Präsentation\n• Hervorragendes Preis-Leistungs-Verhältnis\n\nFür den Alltag und als Geschenk eine ausgezeichnete Wahl ohne Premium-Budget.`;
        }
        
        return `Dieses Produkt positioniert sich im Budget-Segment mit überraschend guter Qualität:\n\n✓ Mehrschichtige Duftkomposition\n✓ Hochwertige Verpackung\n✓ Praktisches Format\n✓ Gutes Preis-Leistungs-Verhältnis\n\nEs ist kein Luxusparfum, bietet aber für den Preis eine überzeugende Leistung.`;
    }
    
    /**
     * 生成通用回答
     */
    private generateGeneralAnswer(_question: string): string {
        const productTitle = this.reportData?.product_title || 'dieses Produkt';
        
        return `Vielen Dank für Ihre Frage zu ${productTitle}.\n\nBasierend auf den verfügbaren Informationen und Kundenbewertungen kann ich Ihnen folgendes mitteilen:\n\nDas Produkt zeichnet sich durch eine ausgewogene Qualität und ein gutes Preis-Leistungs-Verhältnis aus. Die Kundenmeinungen sind überwiegend positiv, wobei individuelle Erfahrungen variieren können.\n\nHaben Sie eine spezifischere Frage? Ich helfe gerne weiter!`;
    }
    
    /**
     * 默认回答（无报告数据时）
     */
    private getDefaultResponse(): string {
        return `Entschuldigung, ich benötige zunächst einen Analysebericht, um Ihre Frage präzise beantworten zu können.\n\nBitte laden Sie einen Bericht, indem Sie:\n1. Daten im Scraper-Modul erfassen\n2. Eine AI-Analyse durchführen\n3. Oder einen vorhandenen Bericht laden\n\nDann kann ich Ihnen detaillierte, datenbasierte Antworten geben!`;
    }
}

/**
 * 全局 Rufus 模拟器实例
 */
export const rufusSimulator = new RufusSimulator();
