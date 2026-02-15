import { CompetitorReport } from '../types/report';

/**
 * 获取完整示例报告数据 - 基于真实报告JSON
 */
export function getSampleData(): CompetitorReport {
  return {
    "metadata": {
      "asins": ["B0FVM8J662", "B0DNMZ2MLG", "B0D47FG7QS"],
      "targets": ["title-keywords", "selling-points", "fatal-flaws", "wow-moments", "hesitation-points", "buyer-profile", "vocab-gap", "promise-reality"],
      "timestamp": "2026-02-15T10:57:38.839Z",
      "dataSource": "scraper",
      "marketplace": "FR"
    },
    "results": [
      {
        "targetId": "title-keywords",
        "title": "标题核心词根",
        "source": "Listings",
        "icon": "fa-solid fa-font",
        "color": "blue",
        "stats": [
          {"label": "核心词根", "value": "5个"},
          {"label": "场景词", "value": "6个"},
          {"label": "已剔除", "value": "13个"}
        ],
        "highlights": [
          {"text": "parfum homme - high", "type": "info"},
          {"text": "eau de parfum - high", "type": "info"},
          {"text": "50ml - high", "type": "success"},
          {"text": "1.7oz - medium", "type": "success"}
        ],
        "details": [
          {
            "category": "一级核心词（高权重）",
            "items": ["parfum homme [high]", "eau de parfum [high]", "parfum femme [medium]", "parfum aux phéromones [medium]", "cologne [low]"]
          }
        ]
      },
      {
        "targetId": "fatal-flaws",
        "title": "致命劝退点",
        "source": "Reviews",
        "icon": "fa-solid fa-triangle-exclamation",
        "color": "red",
        "stats": [
          {"label": "严重问题", "value": "3个"},
          {"label": "一般问题", "value": "2个"},
          {"label": "风险等级", "value": "HIGH"}
        ],
        "highlights": [
          {"text": "Très faible tenue / s'évapore presque aussitôt", "type": "danger"},
          {"text": "Très faible intensité / presque pas de parfum", "type": "danger"},
          {"text": "Réaction allergique / irritation cutanée", "type": "danger"}
        ],
        "details": [
          {
            "category": "退货触发原因",
            "items": ["S'évapore presque aussitôt / tenue très faible", "On ne sent presque rien / intensité inexistante", "Réaction allergique (peau rouge après application)"]
          },
          {
            "category": "用户原话",
            "items": ["je parle même pas de la tenue il s'évapore presque aussitôt", "Der Geruch haltet keine 5 Minuten", "Juste nul, on ne sent presque rien"]
          }
        ]
      },
      {
        "targetId": "wow-moments",
        "title": "惊喜顿悟时刻",
        "source": "Reviews",
        "icon": "fa-solid fa-star",
        "color": "amber",
        "stats": [
          {"label": "惊喜时刻", "value": "8个"},
          {"label": "情感触发词", "value": "6个"},
          {"label": "高转化素材", "value": "7条"}
        ],
        "highlights": [
          {"text": "Une très belle surprise pour ce parfum ! L'ouverture est vive et fraîche avec les agrumes", "type": "success"},
          {"text": "Sa tenue est excellente tout au fil de la journée.", "type": "success"},
          {"text": "il tient bien sur la peau et fait son effet sans être envahissant.", "type": "success"},
          {"text": "Bon rapport qualité prix, Format idéal", "type": "success"}
        ],
        "details": [
          {
            "category": "情感触发词",
            "items": ["surprise par l'évolution olfactive", "satisfaction de la tenue longue durée", "confiance dans le rapport qualité-prix"]
          }
        ]
      },
      {
        "targetId": "hesitation-points",
        "title": "购买前犹豫点",
        "source": "Reviews",
        "icon": "fa-solid fa-circle-question",
        "color": "orange",
        "stats": [
          {"label": "识别犹豫点", "value": "5个"},
          {"label": "常见疑虑", "value": "5个"},
          {"label": "Q&A优化项", "value": "5条"}
        ],
        "highlights": [
          {"text": "Le parfum serait trop faible et s'évaporerait rapidement", "type": "warning"},
          {"text": "Le parfum pourrait être trop fort ou envahissant", "type": "warning"},
          {"text": "L'odeur pourrait être de mauvaise qualité", "type": "warning"}
        ],
        "details": {
          "hesitations": [
            {
              "pre_purchase_worry": "Le parfum serait trop faible et s'évaporerait rapidement (mauvaise tenue).",
              "post_purchase_resolution": "Plusieurs acheteurs disent que la tenue est excellente ou correcte pour la journée",
              "user_evidence": "Sa tenue est excellente tout au fil de la journée.",
              "qa_recommendation": "Q: Est-ce que le parfum tient toute la journée ? A: Oui — de nombreux clients rapportent une tenue correcte à excellente"
            },
            {
              "pre_purchase_worry": "Le parfum pourrait être trop fort ou envahissant.",
              "post_purchase_resolution": "Les acheteurs trouvent qu'il est équilibré, agréable et pas trop entêtant",
              "user_evidence": "il ne sent pas trop fort, une fragrance qui a du caractère sans être entêtante",
              "qa_recommendation": "Q: Le parfum est-il trop puissant ? A: Non — l'ouverture peut sembler intense mais il évolue en une senteur équilibrée"
            },
            {
              "pre_purchase_worry": "L'odeur pourrait être de mauvaise qualité, bas de gamme",
              "post_purchase_resolution": "Beaucoup décrivent une fragrance agréable, boisée et elegante",
              "user_evidence": "très agréable... fragrance aux notes boisées, très proche de certains grands classiques",
              "qa_recommendation": "Q: Le parfum sent-il bon ? A: Le parfum est généralement perçu comme de bonne qualité pour son prix"
            },
            {
              "pre_purchase_worry": "Le produit pourrait être une arnaque ou inefficace",
              "post_purchase_resolution": "La majorité des avis sont positifs et plusieurs clients confirment une bonne odeur",
              "user_evidence": "Très bonne tenue, Parfum super, Fragancia equilibrada y duradera",
              "qa_recommendation": "Q: Y a-t-il un risque que le produit soit inefficace ? A: La plupart des acheteurs rapportent une expérience positive"
            },
            {
              "pre_purchase_worry": "Le format pourrait fuir ou être mal conditionné",
              "post_purchase_resolution": "Au moins un client mentionne qu'il n'y a eu aucun problème de fuite",
              "user_evidence": "absolutely no issue with the delivery or the parfume leaking",
              "qa_recommendation": "Q: Le flacon fuit-il ? A: Les incidents de fuite semblent rares"
            }
          ],
          "common_doubts": ["Tenue du parfum (durée)", "Puissance/Intensité", "Qualité olfactive", "Risque d'arnaque", "Problèmes de livraison"],
          "trust_builders": ["Avis multiples confirmant une bonne tenue", "Descriptions d'un accord boisé/élégant", "Commentaires sur le bon rapport qualité-prix"],
          "qa_optimization_items": [
            {"question": "Combien de temps tient ce parfum ?", "suggested_answer": "La plupart des clients rapportent une tenue correcte à excellente pour la journée"},
            {"question": "Le parfum est-il trop puissant ?", "suggested_answer": "Non — il évolue vers une senteur équilibrée et non entêtante"},
            {"question": "Est-ce une bonne qualité ?", "suggested_answer": "Oui — de nombreux acheteurs estiment que le produit offre un très bon rapport qualité-prix"},
            {"question": "Y a-t-il des problèmes de fuite ?", "suggested_answer": "Les incidents de fuite semblent rares"},
            {"question": "Peut-on s'attendre à un produit sans odeur ?", "suggested_answer": "La majorité des avis confirment une odeur agréable et perceptible"}
          ]
        }
      },
      {
        "targetId": "buyer-profile",
        "title": "画像与场景侧写",
        "source": "Reviews",
        "icon": "fa-solid fa-user-group",
        "color": "purple",
        "stats": [
          {"label": "买家类型", "value": "5类"},
          {"label": "使用场景", "value": "5个"},
          {"label": "覆盖市场", "value": "7个"}
        ],
        "highlights": [
          {"text": "核心用户：25-55", "type": "info"},
          {"text": "acheteurs pratiques (40%)", "type": "info"},
          {"text": "主要市场：France、Allemagne、Canada、Espagne、Italie、Royaume-Uni、Belgique", "type": "success"}
        ],
        "details": {
          "lifestyle_indicators": ["professionnel actif (usage travail/journée)", "valorise bon rapport qualité-prix", "voyage/nomade (format petit, poche/voiture)", "acheteurs cherchant idées cadeaux"],
          "buyer_types": [
            {"type": "acheteurs pratiques", "percentage_estimate": "40%", "evidence": "Commentaires mentionnant le format idéal pour la boîte à gants"},
            {"type": "acheteurs sensibles au prix/valeur", "percentage_estimate": "30%", "evidence": "Répétition d'avis louant le rapport qualité-prix"},
            {"type": "acheteurs recherchant un cadeau", "percentage_estimate": "15%", "evidence": "Mentions explicites d'offrir pour la Saint-Valentin"},
            {"type": "acheteurs exigeants/compareurs", "percentage_estimate": "10%", "evidence": "Comparaisons à des parfums de référence"},
            {"type": "acheteurs réactifs aux problèmes", "percentage_estimate": "5%", "evidence": "Avis signalant arnaque ou réactions allergiques"}
          ],
          "usage_scenes": [
            {"scene": "usage quotidien / travail", "frequency": "daily", "context": "Application le matin pour la journée de travail"},
            {"scene": "réappliqué en déplacement", "frequency": "daily", "context": "Petit format transportable pour retouches fréquentes"},
            {"scene": "occasions romantiques / cadeaux", "frequency": "occasional", "context": "Saint-Valentin, anniversaire, fête des pères"},
            {"scene": "essai / achat impulsif", "frequency": "occasional", "context": "Achats motivés par prix attractif ou curiosité"},
            {"scene": "utilisation en voyage", "frequency": "occasional", "context": "Format petit apprécié pour les déplacements"}
          ],
          "purchase_motivations": ["bon rapport qualité-prix", "format pratique/nomade", "parfum boisé/équilibré", "idée cadeau sobre", "curiosité/tester alternative"],
          "geographic_insights": {
            "primary_markets": ["France", "Allemagne", "Canada", "Espagne", "Italie", "Royaume-Uni", "Belgique"],
            "cultural_considerations": ["préférence pour fragrances discrètes en milieu professionnel", "valorisation du rapport qualité-prix", "variabilité des attentes de tenue selon marché"]
          }
        }
      }
    ],
    "analysisReport": {
      "asin": "B0FVM8J662, B0DNMZ2MLG, B0D47FG7QS",
      "product_title": "50ml Parfum Homme Cadeau - Cadeau Saint Valentin pour Homme Parfum",
      "analysis_timestamp": "2026-02-15T10:39:34.638Z",
      "market": "FR"
    }
  };
}
