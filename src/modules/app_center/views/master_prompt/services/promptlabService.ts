// src/modules/app_center/master_prompt/services/promptlabService.ts

// ----------------------------------------
// 类型定义
// ----------------------------------------

interface PromptInputs {
  useAnalysisData?: boolean;
  selectedReportSections?: string[];
  audience?: string;
  usps?: string;
  specs?: string;
  keywordsTier1?: string;
  keywordsTier2?: string;
  socialHook?: string;
  negative?: string;
  tone?: string;
  targetMarket?: string;
  useCosmo?: boolean;
  useRufus?: boolean;
  useEmoji?: boolean;
  customStrategy?: string;
}

interface AnalysisReport {
  [key: string]: any;
}

// ----------------------------------------
// 内部 Helper 函数
// ----------------------------------------

/**
 * 构建竞品/市场分析上下文 (Context Section)
 */
const buildContextSection = (inputs: PromptInputs, analysisReport: AnalysisReport | null): string => {
  const { useAnalysisData, selectedReportSections } = inputs;

  if (
    useAnalysisData &&
    analysisReport &&
    selectedReportSections &&
    selectedReportSections.length > 0
  ) {
    const cleanReport = JSON.parse(JSON.stringify(analysisReport));
    // 删除不必要的元数据
    [
      "meta",
      "GeneratedByModel",
      "GeneratedAt",
      "templateUsed",
      "raw_response",
      "language",
      "targetMarket",
      "marketplace",
    ].forEach((k) => delete cleanReport[k]);

    const finalContextObj: Record<string, any> = {};
    selectedReportSections.forEach((key) => {
      if (cleanReport[key]) finalContextObj[key] = cleanReport[key];
    });

    if (Object.keys(finalContextObj).length > 0) {
      return `\n[MARKET CONTEXT]\n**Competitor Insights (JSON):**\n${JSON.stringify(
        finalContextObj,
        null,
        2
      )}\n`;
    }
  }
  return "";
};

/**
 * 构建产品 DNA (Product DNA Section)
 */
const buildProductSection = (inputs: PromptInputs): string => {
  const { audience, usps, specs } = inputs;
  const dnaParts: string[] = [];

  if (audience) dnaParts.push(`- **Target Audience**: ${audience}`);
  if (usps) dnaParts.push(`- **Core USPs**: \n${usps}`);
  if (specs) dnaParts.push(`- **Technical Specs**: \n${specs}`);

  return dnaParts.length > 0 ? `\n[PRODUCT DNA]\n${dnaParts.join("\n")}\n` : "";
};

/**
 * 构建 SEO 部分 (SEO Section)
 */
const buildSeoSection = (inputs: PromptInputs, mode: 'master' | 'visual' = "master"): string => {
  const { keywordsTier1, keywordsTier2, socialHook, negative } = inputs;
  const seoParts: string[] = [];
  const isVisual = mode === "visual";

  // Tier 1 文案差异处理
  const t1Label = isVisual
    ? "Tier 1 (Main Keyword / Product Definition)"
    : "Tier 1 (Title / Bullet 1 / Product Name)";
  if (keywordsTier1) seoParts.push(`- **${t1Label}**: ${keywordsTier1}`);

  // Tier 2 文案差异处理
  const t2Label = isVisual
    ? "Tier 2 (Longtail Keyword)"
    : "Tier 2 (Bullet 2-5)";
  if (keywordsTier2) seoParts.push(`- **${t2Label}**: ${keywordsTier2}`);

  // Social Hook 逻辑
  if (socialHook) {
    seoParts.push(`- **Social/Marketing Hooks**: ${socialHook}`);
  }

  if (negative) {
    seoParts.push(`- **Negative Keywords**: ${negative}`);
  }

  // 头部指令差异处理
  const introText = isVisual
    ? "Discribe with these SEO keywords naturally:"
    : "Integrate **All** these keywords naturally:";

  return seoParts.length > 0
    ? `\n[SEO MANDATE]\n${introText}\n${seoParts.join("\n")}\n`
    : "";
};

// ----------------------------------------
// 主服务导出
// ----------------------------------------

export const promptlabService = {
  /**
   * 生成 Master Prompt
   */
  generateMasterPrompt: (inputs: PromptInputs, analysisReport: AnalysisReport | null): string => {
    const { tone, targetMarket, useCosmo, useRufus, useEmoji, customStrategy } = inputs;

    // 复用 Helper 函数生成基础模块
    const contextSection = buildContextSection(inputs, analysisReport);
    const productSection = buildProductSection(inputs);
    const seoSection = buildSeoSection(inputs, "master");

    // 4. Instructions (Master Prompt 特有的指令逻辑)
    const styleInstructions: string[] = [];

    // 语言
    if (targetMarket) {
      styleInstructions.push(
        `**LANGUAGE:** Aimming at ${targetMarket} market (Use native idioms and phrasing, correct grammar, and cultural relevance, instead of translating).`
      );
    }

    // 语气
    if (tone === "professional")
      styleInstructions.push(
        "Tone: Professional, authoritative, yet approachable."
      );
    if (tone === "exciting")
      styleInstructions.push("Tone: Energetic, exciting.");
    if (tone === "emotional")
      styleInstructions.push("Tone: Emotional, storytelling.");
    if (tone === "minimalist")
      styleInstructions.push("Tone: Clean, minimalist.");

    // COSMO 场景化
    if (useCosmo)
      styleInstructions.push(`**COSMO Framework Application:**
            - **Context**: Don't just list features; describe the *situation* where the user needs it.
            - **Match**: Connect the feature directly to a *User Pain Point* from the Competitor Insights.`);

    // 算法优化 (Rufus)
    if (useRufus)
      styleInstructions.push(`**Amazon Rufus/AI Optimization:**
            - Structure content as direct answers to potential user questions.
            - Avoid fluff. Be concise and fact-based in the first sentence of each block.`);

    if (useEmoji)
      styleInstructions.push("**Formatting:** Use emojis in bullet points.");

    if (customStrategy) {
      styleInstructions.push(`**USER RULES:** ${customStrategy}`);
    }

    // 5. 组装 Master Prompt
    return `
# ROLE
Act as a Senior **${targetMarket}** Listing Copywriter and E-commerce SEO Specialist with 10+ years of experience in the DACH market.
You combine deep expertise in ${targetMarket} consumer psychology, the COSMO framework (Context, Optimization, Search, Match, Offer), and optimization for conversational AI search (Amazon Rufus/A10 Algorithm).

# GOAL
Create a high-converting, native-level ${targetMarket} Amazon listing that passes strict chars-count limits and directly answers user intents (Rufus-Ready).

# INPUT CONTEXT
${productSection}
${seoSection}
${contextSection}

# CRITICAL GUIDELINES
${styleInstructions.join("\n")}

# EXECUTION STEPS (Chain of Thought)
1. **Analyze**: First, silently review the Competitor Insights and identify the top 3 "Buying Hesitations" to address and "Vocab Gaps" to fill.
2. **Drafting - Title**: Construct the title placing the Main Keyword strictly in the first 5 words.
3. **Drafting - Bullets**: Write 5 bullets using the structure: [Emoji] **[BENEFIT HEADER]:** [Direct Answer/Benefit] + [Contextual Usage] + [Tech Spec].
4. **Drafting - Description**: Create an HTML description using "Answer-First" headers.
5. **Review**: Check all character/byte counts before outputting.

# OUTPUT TASK
Generate the complete Amazon Listing following the structure below:
1. **Title:** (Max 180 chars). format: [Main Keyword] + [USP/Benefit] + [Material/Feature] + [Context/Use Case].
2. **5 Bullet Points:** (150-200 bytes each). Structure: [Emoji] **[Benefit Header in Caps]:** [COSMO-optimized explanation of usage context] + [Technical Proof/Spec].
3. **Backend Search Terms:** (Space-separated, < 249 bytes). specific long-tail keywords not already in the title.
4. **Product Description:** (HTML formatted). Use "Answer-First" logic. Start with the core value proposition, then elaborate. Use persuasive storytelling tailored to the German avatar.

**Action:** Review the Input Context and generate the listing now.
`.trim();
  },

  /**
   * 生成 Visual Blueprint
   */
  generateVisualPrompt: (inputs: PromptInputs, analysisReport: AnalysisReport | null): string => {
    const { targetMarket } = inputs;

    // 复用 Helper 函数生成基础模块
    const contextSection = buildContextSection(inputs, analysisReport);
    const productSection = buildProductSection(inputs);
    const seoSection = buildSeoSection(inputs, "visual");

    // 2. 组装 Visual Prompt
    return `
# ROLE
Act as an expert **Amazon Visual Merchandiser & Art Director** with 10+ years of experience in High-Conversion A+ Content (EBC) and Brand Story design for the **${targetMarket}** market.
Your goal is to translate text-based product data and competitor insights into a **Visual Conversion Script**.

# INPUT DATA
${productSection}
${seoSection}
${contextSection}

# STRATEGY: THE VISUAL CVR FORMULA
You must map the "Competitor Insights" directly to visual elements:
1. **Negative Deal Breakers** -> Convert into **"Visual Trust/Solution Modules"** (e.g., if users complain about leaks, design a "Triple-Seal Zoom-in" module).
2. **Positive Aha Moments** -> Convert into **"Lifestyle/Scenario Modules"** (Show the specific moment of joy).
3. **Buying Hesitations** -> Convert into **"Comparison Tables"** or **"Info-graphic Breakdowns"**.

# OUTPUT TASK
Create a structured **A+ Content Blueprint** (Standard 5-Module Layout + Brand Story). 
For EACH module, provide:
1.  **Module Type**: (e.g., Standard Header Image, Four Image/Text, Comparison Chart).
2.  **Visual Goal**: What psychological trigger are we hitting?
3.  **Art Direction (The Image)**: Detailed description for a photographer or Nano Banana prompt. Describe lighting, angle, props, and models.
4.  **Overlay Copy**: The minimal text text/headline on the image.

# OUTPUT FORMAT (Strict Markdown)
 
## 1. Brand Story (Background Strategy)
* **Hero Image**: [Describe the mood/setting]
* **Slogan**: [Short, punchy brand statement]
* **Value Cards**: [3 short value props]

## 2. A+ Content Blueprint

### Module 1: The Hook (Hero Banner)
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: \`/imagine prompt: ...\`
* **Copy Overlay**: ...

### Module 2: The Solution (Addressing Deal Breakers)
* **Insight addressed**: [Reference the specific negative review point]
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: ...

### Module 3: The Experience (Aha Moment)
* **Visual Concept**: ...
* **Nano Banana/Photographer Prompt**: ...

### Module 4: The Logic (Specs/Comparison)
* **Visual Concept**: ...
* **Comparison Strategy**: Us vs. Them (Focus on: [Key Spec])

**Action:** Review the Market Insights and generate the Visual Blueprint now.
`.trim();
  },
};
