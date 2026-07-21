# Amazon Skills 椤典笌 Skill Registry 璁捐瑙勬牸

**鏃ユ湡锛?* 2026-07-21  
**鐘舵€侊細** Ready for review  
**鑼冨洿浠ｅ彿锛?* Phase A 鈥?Skills 椤?+ 鍙皟鐢?Registry锛堥潪宸ヤ綔鍙?UI锛?
---

## 1. 鑳屾櫙涓庣洰鏍?
### 1.1 鑳屾櫙

SOPs銆屾洿澶?鈫?澶фā鍨嬫帰绱€嶇幇鏈変笁椤碉細鏅鸿兘浣撱€佹彁绀鸿瘝銆佸伐浣滄祦銆傛櫤鑳戒綋椤靛凡鐢诲嚭 `Role 鈫?Goal 鈫?Skill 鈫?MCP 鈫?Tool 鈫?Report` 閾捐矾锛屼絾 Skill Library 浠嶄负鍗犱綅銆?
澶栭儴璧勪骇 [nexscope-ai/Amazon-Skills](https://github.com/nexscope-ai/Amazon-Skills) 鎻愪緵绾?53 涓爣鍑?Agent Skills锛堟瘡鐩綍 `SKILL.md` + 鍙€?`scripts/`锛夛紝鍙 OpenClaw / Claude Code / Cursor 绛夊姞杞姐€傞渶灏嗗叾鍚堢悊妞嶅叆鏈郴缁燂紝渚涚洰褰曟祻瑙堬紝骞惰鍚庣画宸ヤ綔鍙?Agent **鐪熷疄鎸?id 璋冪敤鍏ㄩ儴 skill**銆?
### 1.2 鐩爣

1. 鍦ㄣ€屾洿澶?鈫?澶фā鍨嬫帰绱€嶆柊澧?**鎶€鑳?* 椤碉紝椋庢牸涓庤鑼冨榻愮幇鏈?explore 浣撶郴銆?2. 浠?Git submodule 寮曞叆 Amazon-Skills 鍏ㄦ枃璧勪骇銆?3. 钀藉湴鍏ㄧ珯 **`skillRegistry`**锛歚list` / `get` / `loadSkillContext`锛屼笌 Skills 椤靛悓婧愩€?4. 宸ヤ綔鍙?Agent **鏈湡涓嶆敼涓氬姟缁戝畾**锛屼絾 API 蹇呴』灏辩华锛屼换鎰?skillId 鍙悓姝ュ姞杞借繘 LLM 涓婁笅鏂囥€?5. 鏇村鎬昏琛ャ€屾妧鑳姐€嶅叆鍙ｅ崱鐗囥€?
### 1.3 闈炵洰鏍囷紙鏈湡涓嶅仛锛?
- 宸ヤ綔鍙?UI銆侀〉鍐呮墽琛?skill `scripts/`銆侀〉鍐呰皟鐢?LLM
- 灏?PPC / 鏃ユ姤绛夌幇鏈?Agent 寮哄埗缁戝畾鍏蜂綋 skill
- 鍏ㄩ噺涓枃缈昏瘧 `SKILL.md` 姝ｆ枃
- 鏂?npm 渚濊禆鍋?frontmatter / markdown 娓叉煋
- 鎸傝浇鍒?DI `ServiceRegistry`锛堜竴鏈熺洿鎺?export 鍗曚緥锛?- 涓€娆℃妸 53 涓?skill 鍏ㄩ儴娉ㄥ叆涓婁笅鏂囷紙绂佹榛樿琛屼负锛?
---

## 2. 宸查攣瀹氬喅绛?
| # | 鍐崇瓥 | 缁撹 |
|---|---|---|
| D1 | 鑼冨洿 | Skills 椤?+ Registry锛涘伐浣滃彴鍙皟鍏ㄩ儴 skill锛堟寜 id 鏄惧紡 load锛?|
| D2 | 璧勪骇鏉ユ簮 | Git submodule 鈫?`nexscope-ai/Amazon-Skills` |
| D3 | 鍔犺浇鏂瑰紡 | Vite `import.meta.glob` + 杩愯鏃惰В鏋愶紙璺緞 1锛?|
| D4 | 涓昏皟鐢ㄦ柟 | 鏈簲鐢ㄥ唴 Agent / 宸ヤ綔娴?|
| D5 | 璇█ | 涓枃澶栧３ + 涓婃父鑻辨枃 `SKILL.md` 鍘熸枃 |
| D6 | 娉ㄥ叆榛樿鏍煎紡 | `loadSkillContext` 榛樿 `raw`锛堝畬鏁?SKILL.md锛?|
| D7 | scripts | 浠呭厓鏁版嵁鎺㈡祴锛涙祻瑙堝櫒涓嶆墽琛岋紱绂佹 `?raw` 鍐呰仈鑴氭湰杩涗笟鍔″寘 |
| D8 | DI | 涓€鏈?`export const skillRegistry` 鍗曚緥锛屼笉鎸?DI |
| D9 | UI 鑼冨紡 | explore violet + 鎻愮ず璇嶉〉鎼滅储/鍒嗙被/鍗＄墖/modal锛泆i-ux-pro-max 浣滅洰褰曞瀷淇℃伅鏋舵瀯鍙傝€?|
| D10 | 鎬昏 | 蹇呭仛銆屾妧鑳姐€嶅崱锛涘窘绔?**宸叉帴鍏?*锛涢『搴忥細鏅鸿兘浣?鈫?鎶€鑳?鈫?鎻愮ず璇?鈫?宸ヤ綔娴?|

---

## 3. 淇℃伅鏋舵瀯涓庤矾鐢?
### 3.1 鑿滃崟浣嶇疆

| 椤?| 鍊?|
|---|---|
| 妯″潡 | 鏇村 (`more_core`) |
| 鍒嗙粍 | 澶фā鍨嬫帰绱?(`explore`) |
| 渚ф爮鏍囩 | 鎶€鑳?|
| 鍥炬爣 | `fas fa-graduation-cap` |
| 椤哄簭 | 鏅鸿兘浣?鈫?**鎶€鑳?* 鈫?鎻愮ず璇?鈫?宸ヤ綔娴?|

鍚屾鏇存柊 `menuConfig.moreCategories.explore.description`锛?
> 鏅鸿兘浣撱€佹妧鑳姐€佹彁绀鸿瘝銆佸伐浣滄祦绛夊疄鐢ㄥ姛鑳姐€?
### 3.2 璺敱濂戠害

| 瀛楁 | 鍊?|
|---|---|
| `key` | `SKILLS` |
| `routeId` | `more_skills` |
| `path` | `/more/explore/skills` |
| `label` | 鎶€鑳?|
| `category` | `explore` |
| `loaderPath` | `./views/explore/skills/index.ts` |

鑱斿姩锛?
- `src/modules/more/module.manifest.ts`
- `src/common/router/legacyRouteAliases.ts`锛坄/more_skills` 鈫?`more_skills`锛?- `MODULE_MAP` 鐢?`import.meta.glob` 鑷姩鎷惧彇
- 璺敱鐩稿叧鍗曟祴锛堣嫢鏈夋灇涓撅級琛?`more_skills`

### 3.3 鐩綍缁撴瀯

```text
vendor/amazon-skills/                    # git submodule
src/services/skillRegistry/              # 鍏ㄧ珯鍙皟鐢?  types.ts
  parseSkillMd.ts
  categoryMap.ts
  loadSkillModules.ts
  skillRegistryService.ts
  index.ts
  *.test.ts
src/modules/more/views/explore/skills/
  index.ts
  template.html
  skills_style.css
```

鍘熷垯锛?*璧勪骇鍦?submodule锛涜В鏋愪笌绱㈠紩鍦?`src/services/skillRegistry`**銆傚伐浣滃彴绂佹渚濊禆 more 妯″潡 UI銆?
### 3.4 涓庣浉閭婚〉鍏崇郴

```text
鏅鸿兘浣?鈹€鈹€鍙戠幇鍏ュ彛鈹€鈹€鈻?鎶€鑳斤紙鐩綍 + Registry锛?鎻愮ず璇?鈹€鈹€骞惰灞傗攢鈹€鈻?鎶€鑳斤紙Prompt 妯℃澘 鈮?Agent Skill锛?宸ヤ綔娴?鈹€鈹€鍚庣画鍙紩鐢ㄢ攢鈹€鈻?skillId锛堟湰鏈熶笉鏀瑰伐浣滄祦椤碉級
鏇村鎬昏 鈹€鈹€蹇呭仛鍗＄墖鈹€鈹€鈻?more_skills
```

---

## 4. Skill Registry锛堝伐浣滃彴濂戠害锛?
### 4.1 璁捐鐩爣

- 鍗曚竴鐪熺浉婧愶細`vendor/amazon-skills/*/SKILL.md`
- 鏋勫缓鏈熸墦鍏ュ寘鍐咃紝杩愯鏃?**鍚屾** `getSkill` / `loadSkillContext`锛堟棤缃戠粶锛?- Skills 椤典笌宸ヤ綔鍙板叡鐢ㄥ悓涓€ API锛氥€岄〉涓婂彲瑙?鉄?鍙?load銆?- 鍙崟娴嬶細瑙ｆ瀽銆佸垎绫汇€佹悳绱€佺己 skill銆佺┖搴?
### 4.2 绫诲瀷

```ts
type SkillCategoryId =
  | 'product_research'
  | 'competitor'
  | 'pricing_profit'
  | 'advertising'
  | 'listing'
  | 'analytics'
  | 'growth'
  | 'other';

type SkillStatus = 'available' | 'beta' | 'unknown';

type SkillLoadFormat = 'raw' | 'body';

interface SkillMeta {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  categoryLabel: string;
  emoji?: string;
  status: SkillStatus;
  hasScripts: boolean;
  source: 'amazon-skills';
  repoPath: string;
}

interface Skill extends SkillMeta {
  body: string;
  raw: string;
  frontmatter: Record<string, unknown>;
}

interface SkillLoadOptions {
  format?: SkillLoadFormat; // default: 'raw'
}

interface SkillSearchQuery {
  keyword?: string;
  category?: SkillCategoryId | 'all';
  status?: SkillStatus | 'all';
  hasScripts?: boolean;
}
```

### 4.3 鍒嗙被鏄犲皠

- `categoryMap.ts`锛歴kill id / 鐩綍鍚?鈫?`SkillCategoryId` + 涓枃 label + status
- 涓庝笂娓?README 涓氬姟鍒嗙粍瀵归綈
- **鏈叆琛?skill 浠嶅畬鏁村叆搴撳苟鍙?load**锛孶I 褰掋€屽叾浠栥€嶃€乻tatus 涓?`unknown`
- categoryMap 鍙奖鍝嶅睍绀哄垎缁勶紝涓嶅奖鍝嶃€屽彲璋冪敤鍏ㄩ儴銆?
### 4.4 鍔犺浇

```ts
// loadSkillModules.ts 鈥?璺緞鐩稿璇ユ枃浠?import.meta.glob(
  '../../../vendor/amazon-skills/*/SKILL.md',
  { query: '?raw', import: 'default', eager: true }
);

// scripts 浠呰矾寰?URL 鎺㈡祴锛岀姝??raw 鍐呰仈鑴氭湰姝ｆ枃
import.meta.glob(
  '../../../vendor/amazon-skills/*/scripts/**',
  { query: '?url', import: 'default', eager: true }
);
```

绫诲瀷澹版槑锛坄src/types/global.d.ts`锛夛細

```ts
declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

鍒濆鍖栵紙鎳掑姞杞斤紝`ensureInitialized`锛夛細

1. 閬嶅巻 SKILL.md glob
2. `parseSkillMd(raw)` 鈫?name / description / body / frontmatter
3. 鐖剁洰褰曞悕 + scripts glob 鈫?`hasScripts`
4. `Map<id, Skill>`锛?*id 鍐茬獊 first-wins + warn**
5. 缂?`name`锛氱敤鐖剁洰褰曞悕浣?id + warn锛?*浠嶇撼鍏?*
6. 鍗曟枃浠?parse 澶辫触锛歴kip + `parseFailures++` + warn锛屼笉闃绘柇鍏朵綑

**绌哄簱绛栫暐锛堣蒋澶辫触锛夛細**

- `ensureInitialized()` 寰楀埌 0 涓?skill 鈫?绌?Map + `Logger.error`锛?*涓?*鎶涢敊鎷栧灝鏁寸珯
- 椤甸潰灞曠ず绌烘€侊紙鎻愮ず submodule init锛?- 宸ヤ綔鍙?`loadSkillContext` / strict 鎵归噺鍦ㄧ┖搴撴椂鎶?`SystemError` `SKILL_REG_002`

### 4.5 Frontmatter 瑙ｆ瀽

- **闆舵柊渚濊禆**
- 鍖归厤鏂囦欢澶?`---\n...\n---`
- 瑙ｆ瀽鏍囬噺锛歚name`銆乣description`锛堣绾?`key: value` / 寮曞彿瀛楃涓诧級
- `metadata` 鍙€夎В鏋?`nexscope.emoji`锛涘け璐ュ垯蹇界暐 emoji
- 涓嶄緷璧栧畬鏁?YAML 瑙勮寖锛涢潪娉?frontmatter 鈫?璇ユ枃浠?skip锛坄SKILL_REG_003` 璇箟锛?
### 4.6 瀵瑰 API

```ts
interface SkillRegistry {
  ensureInitialized(): void;

  listSkills(query?: SkillSearchQuery): SkillMeta[];
  getSkill(id: string): Skill | undefined;
  hasSkill(id: string): boolean;
  getCategories(): Array<{ id: SkillCategoryId; label: string; count: number }>;

  /** 鏈煡 id 鈫?ValidationError SKILL_REG_001锛涚┖搴?鈫?SystemError SKILL_REG_002 */
  loadSkillContext(id: string, options?: SkillLoadOptions): string;

  /**
   * 鎵归噺鍔犺浇銆俿trict:true 鏃朵换涓€缂哄け/绌哄簱鎶涢敊锛?   * 榛樿 skip 缂哄け + warn銆?   */
  loadSkillsContext(
    ids: string[],
    options?: SkillLoadOptions & { strict?: boolean }
  ): string;

  getStats(): {
    total: number;
    parseFailures: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  };
}
```

鎵归噺鎷兼帴妯℃澘锛?
```text
---
# Skill: {id}
{content}
---
```

瀵煎嚭锛歚src/services/skillRegistry/index.ts` 鈫?`export { skillRegistry } from './skillRegistryService'`

### 4.7 閿欒鐮?
| Code | 绫诲瀷 | 鍦烘櫙 |
|---|---|---|
| `SKILL_REG_001` | ValidationError | 鎸囧畾 skill id 涓嶅瓨鍦?|
| `SKILL_REG_002` | SystemError | load 鏃?registry 涓虹┖锛坰ubmodule/glob 澶辫触锛?|
| `SKILL_REG_003` | 锛堝唴閮級 | 鍗曟枃浠?parse 澶辫触锛宻kip + warn |

### 4.8 宸ヤ綔鍙拌皟鐢ㄧ害瀹?
```ts
import { skillRegistry } from '@/services/skillRegistry';

const block = skillRegistry.loadSkillContext('amazon-ppc-campaign');
// 鎷煎叆 system / developer 娑堟伅锛屽嬁涓庝笉鍙俊鐢ㄦ埛鏁版嵁娣锋

const multi = skillRegistry.loadSkillsContext([
  'amazon-keyword-research',
  'amazon-listing-optimization',
]);
```

缁嗗垯锛?
1. **鎸?id 鏄惧紡鍔犺浇**锛涚姝㈤粯璁ゆ敞鍏ュ叏閮?53
2. skill 姝ｆ枃瑙嗕负鍙俊鍐呴儴璧勪骇锛坰ubmodule锛?3. 鐢ㄦ埛涓氬姟鏁版嵁浠嶆寜鐜版湁瑙勫垯 untrusted
4. scripts 涓嶅湪娴忚鍣ㄦ墽琛岋紱瀹夸富鎵ц灞傚彟寮€鏈?5. Agent 鍦ㄩ厤缃?浠ｇ爜涓０鏄庝緷璧栫殑 `skillId[]`

---

## 5. Skills 椤?UI / 浜や簰

### 5.1 璁捐鍘熷垯

鍚告敹 **ui-ux-pro-max** 鐨勬枃妗ｇ洰褰曟ā寮忥紙Search-first + 鍒嗙被 + 鍒楄〃 + 璇︽儏锛夛紝瑙嗚涓庣粍浠?**寮哄埗璐村悎** more/explore锛?
| 閲囩敤 | 鎷掔粷锛堥槻瀛ゅ矝锛?|
|---|---|
| `wb-theme-violet`銆佺櫧搴?`border-slate-200` 鍗＄墖 | 鏂板瓧浣撱€丱LED 鏆楄壊涓婚 |
| 鎻愮ず璇嶉〉鎼滅储 / `category-btn` / 鍗＄墖 / `app-modal` | 鐙珛 design system 鑹叉澘 |
| Font Awesome 缁撴瀯鍥炬爣 | emoji 浣滃鑸?缁撴瀯鍥炬爣 |
| design tokens / 鐜版湁 Tailwind violet-slate | glass 閲嶇壒鏁?|
| `textContent` 娓叉煋 skill 姝ｆ枃 | `innerHTML` 娓叉煋涓嶅彲淇?澶栭儴 md |

涓婃父 `emoji` 浠呬綔鏍囬鏃佹瑕佹枃鏈楗帮紝涓嶄綔鍥炬爣瀹瑰櫒銆?
### 5.2 椤甸潰缁撴瀯

1. Welcome Banner锛坄wb-container--simple wb-theme-violet`锛?2. 鎸囨爣鏉?4 鍗★紙`getStats()`锛?3. 宸ヤ綔鍙拌皟鐢ㄨ鏄庯紙鍙浠ｇ爜鍧?+ 濂戠害璇存槑锛?4. Skill Library锛氭悳绱?+ 鍒嗙被 + 缁撴灉璁℃暟 + 鍗＄墖缃戞牸
5. 璇︽儏 Modal
6. 椤佃剼褰掑睘锛圡IT / 婧愪粨搴?/ 涓嶆墽琛?scripts锛?
### 5.3 Banner 鏂囨

- 鏍囬锛氭妧鑳? 
- Badge锛歚SKILL OPS`  
- 鎻忚堪锛欰mazon Skills 璧勪骇鐩綍锛氭祻瑙堛€佹绱€佸鍒?skill 姝ｆ枃涓?skillId锛涘伐浣滃彴閫氳繃 skillRegistry 鎸?id 鍔犺浇锛屼笌鏈〉鍚屾簮銆? 
- Tags锛歚{total} Skills`锛堟潵鑷?`getStats().total`锛岀姝㈠啓姝?53锛壜?`Registry 鍙皟鐢╜ 路 `涓枃澶栧３ / 鑻辨枃鍘熸枃`

### 5.4 鎸囨爣鏉?
| 鍗?| 鏁版嵁 |
|---|---|
| TOTAL | `stats.total` |
| CATEGORY | 鏈夎鏁扮殑鍒嗙被鏁?|
| SCRIPTS | `hasScripts === true` 鏁伴噺 |
| BETA | `status === 'beta'` 鏁伴噺 |

### 5.5 Library 浜や簰

- 鎼滅储锛歚#skill-search`锛宒ebounce 200ms锛宍listSkills({ keyword, category })`
- 鍒嗙被锛氬叏閮?+ `getCategories()`锛沗aria-pressed`锛沘ctive 鐢ㄧ幇鏈?`category-btn.active`
- 缁撴灉璁℃暟锛歚鏄剧ず N / 鍏?M 涓妧鑳絗锛宍aria-live="polite"`
- 缃戞牸锛歚grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- 鍗＄墖锛氬垎绫?badge銆乻tatus锛堣壊+鏂囷級銆乼itle銆乣id` mono銆乨escription 涓よ clamp銆佹煡鐪?澶嶅埗 id/澶嶅埗姝ｆ枃
- 绌烘€侊細鏃犲尮閰嶏紙寤鸿娓呯┖/绀轰緥璇嶏級锛況egistry 绌猴紙submodule 鍛戒护 + `role="alert"`锛?- DOM锛歚createElement` + `textContent`锛屽榻?prompts 瀹夊叏娓叉煋

### 5.6 璇︽儏 Modal

- 澶嶇敤 `app-modal`锛沨eader 娓愬彉涓?prompts 涓€鑷达紙`violet 鈫?fuchsia`锛?- 灞曠ず meta + **`raw` 鍙 pre/text**锛堜竴鏈熶笉鍋?markdown 娓叉煋锛?- 鎿嶄綔锛氬鍒?raw銆佸鍒?skillId銆佸鍒? 
  `npx skills add nexscope-ai/Amazon-Skills --skill {id} -g`  
  鍏抽棴锛堟寜閽?/ backdrop / Escape锛?- Toast锛歚showToast`锛沜lipboard锛歚copyTextToClipboard`

### 5.7 涓嶅仛

- 椤靛唴杩愯 skill / 璋?LLM  
- 铏氭嫙鍒楄〃锛?3 閲忕骇鏃犻渶锛? 
- URL query 娣遍摼锛堜簩鏈熷彲閫?`?skill=id`锛? 
- 鏂?icon 搴?/ 鏂板瓧浣?/ 鐙珛涓婚  

### 5.8 UI 鑷娓呭崟

- [ ] FA 缁撴瀯鍥炬爣锛涙棤 emoji 瀵艰埅鍥炬爣  
- [ ] hover + cursor-pointer锛涜繃娓＄敤鐜版湁 duration token  
- [ ] 姝ｆ枃瀵规瘮 鈮?4.5:1  
- [ ] 鍙 focus ring  
- [ ] 鍥炬爣鎸夐挳 `aria-label`  
- [ ] 绌烘€佹湁鎭㈠璺緞  
- [ ] status 涓嶅崟闈犻鑹? 
- [ ] 鏃犳柊澧炶楗板姩鐢伙紱灏婇噸 reduced-motion 鍏ㄥ眬绛栫暐  
- [ ] 375鈥?440 鏃犳í鍚戞孩鍑? 
- [ ] skill 姝ｆ枃涓嶇敤 `innerHTML`  

---

## 6. 鏇村鎬昏锛堝繀鍋氾級

**鏂囦欢锛?* `src/modules/more/views/overview/template.html`

1. 鎺㈢储鍖哄壇鏍囬鏀逛负鍚€屾妧鑳姐€? 
2. 鍦ㄦ櫤鑳戒綋涓庢彁绀鸿瘝涔嬮棿鎻掑叆鎶€鑳藉崱锛?
| 瀛楁 | 鍊?|
|---|---|
| 瀵艰埅 | `data-action="switch-tab" data-tab="more_skills"` |
| 鏍峰紡 | `sop-card overview-accent-card overview-accent-violet` |
| 鍥炬爣 | `fas fa-graduation-cap` + `bg-violet-50 text-violet-600` |
| 寰界珷 | `sop-status-badge sop-status-active` + **宸叉帴鍏?* |
| 鏍囬 | 鎶€鑳?|
| 鎻忚堪 | Amazon Skills 璧勪骇鐩綍锛氭祻瑙堛€佹绱€佸鍒?skill 姝ｆ枃涓?skillId锛涘伐浣滃彴缁?skillRegistry 鍚屾簮璋冪敤銆?|
| 搴曟爮 | `Agent Skill 路 鍙皟鐢?Registry` |

3. 椤哄簭锛氭櫤鑳戒綋 鈫?鎶€鑳?鈫?鎻愮ず璇?鈫?宸ヤ綔娴? 
4. 涓€鏈熶笉鍋氭€昏鍔ㄦ€?skill 璁℃暟锛涗笉鏂板鎬昏涓撶敤 CSS  

---

## 7. Submodule 宸ョ▼绾﹀畾

| 椤?| 绾﹀畾 |
|---|---|
| 璺緞 | `vendor/amazon-skills` |
| 杩滅▼ | `https://github.com/nexscope-ai/Amazon-Skills.git` |
| 鎸囬拡 | 閿佸畾 commit SHA |
| 鏈湴 | `git submodule update --init --recursive` |
| CI | checkout 寮€鍚?submodules 鎴栨樉寮?init |
| 鍗囩骇 | 鏇存柊鎸囬拡 + 鏂?skill 琛?categoryMap |

---

## 8. 瀹炵幇椤哄簭

1. submodule + `*.md?raw` 绫诲瀷  
2. parseSkillMd + categoryMap + loadSkillModules + skillRegistry + 鍗曟祴  
3. module.manifest + alias + menu 鏂囨  
4. Skills 椤?UI  
5. 鏇村鎬昏鍗＄墖  
6. 锛堝彲閫夛級Agent 椤?Skill Library 閾惧埌 `more_skills`  
7. type-check / 鐩稿叧鍗曟祴 / 鎵嬪伐鍐掔儫  

Registry 鍏堜簬 UI锛屼繚璇佸伐浣滃彴濂戠害涓嶄緷璧栭〉闈€?
---

## 9. 娴嬭瘯涓庨獙鏀?
### 9.1 鑷姩鍖?
| 鐢ㄤ緥 | 鏈熸湜 |
|---|---|
| frontmatter 姝ｅ父 | name / description / body |
| 缂?name | 鐖剁洰褰曞悕浣?id锛屼粛鍏ュ簱 |
| 鍧忔枃浠?| skip + parseFailures++ |
| id 鍐茬獊 | first-wins |
| listSkills 鍏抽敭璇?| 鍖归厤 id/title/description锛屽ぇ灏忓啓涓嶆晱鎰?|
| 鏈槧灏勫垎绫?| other锛屼粛鍙?load |
| 鏈煡 id load | ValidationError `SKILL_REG_001` |
| 绌哄簱 load | SystemError `SKILL_REG_002` |
| 鎵归噺 strict / 闈?strict | 绗﹀悎 4.6 |
| 璺敱 | `routeIdToPath('more_skills') === '/more/explore/skills'` |

### 9.2 鎵嬪伐鍐掔儫

1. 渚ф爮鍑虹幇銆屾妧鑳姐€嶏紝椤哄簭姝ｇ‘  
2. `/more/explore/skills` 鍒楄〃闈炵┖锛坰ubmodule 宸?init锛? 
3. 鎼滅储涓庡垎绫绘湁鏁? 
4. 璇︽儏澶嶅埗 raw / id / 瀹夎鍛戒护 + toast  
5. 鎬昏銆屾妧鑳姐€嶁啋 杩涘叆椤碉紱寰界珷銆屽凡鎺ュ叆銆? 
6. `listSkills().length` 涓?TOTAL 涓€鑷? 
7. `loadSkillContext('amazon-keyword-research')` 闈炵┖  

### 9.3 涓嶇畻澶辫触

- 涓嶆墽琛?scripts  
- 涓嶈嚜鍔ㄦ敼閫?PPC Agent  
- 涓嶇炕璇?SKILL 姝ｆ枃  

---

## 10. 椋庨櫓

| 椋庨櫓 | 缂撹В |
|---|---|
| 鏈?init submodule | 绌烘€?+ 鍛戒护锛沴oad 鏃?`SKILL_REG_002` |
| 涓婃父鏂?skill 鏈槧灏?| 浠嶅彲璋冪敤锛孶I銆屽叾浠栥€?|
| 鍖呬綋绉?| 涓€鏈熷彲鎺ュ彈锛沴azy 灞炲绾﹀彉鏇达紝鍙﹀紑鏈?|
| frontmatter 闈炴爣 | 鏈€灏忚В鏋?+ skip |
| 鏍峰紡鍒嗗弶 | 澶嶇敤 category-btn / modal / violet |

---

## 11. 鍙傝€?
- 婧愯祫浜э細https://github.com/nexscope-ai/Amazon-Skills  
- UI 鍙傝€?skill锛歶i-ux-pro-max锛坄~/.agents/skills/ui-ux-pro-max`锛夛紝浠呯敤淇℃伅鏋舵瀯涓?UX 娓呭崟  
- 鍚屾瀯椤甸潰锛歚src/modules/more/views/explore/prompts/`銆乣agents/`銆乣overview/`  

---

## 12. 鍙樻洿璁板綍

| 鏃ユ湡 | 璇存槑 |
|---|---|
| 2026-07-21 | 鍒濈锛歋ection 1鈥? 鐢ㄦ埛纭鍚庤惤鐩?|
