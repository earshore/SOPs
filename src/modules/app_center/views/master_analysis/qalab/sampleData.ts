/**
 * QA Lab 示例数据
 * 完整的竞品分析报告示例JSON
 */

export const SAMPLE_JSON = `{
  "metadata": {
    "asins": ["B0FVM8J662", "B0DNMZ2MLG", "B0D47FG7QS"],
    "marketplace": "DE"
  },
  "analysisReport": {
    "asin": "B0FVM8J662, B0DNMZ2MLG, B0D47FG7QS",
    "product_title": "50ml Parfum Homme Cadeau - Cadeau Saint Valentin pour Homme Parfum, Eau de Phéromones Parfums | Ycz CLUB GENT'S AROMA Perfume Men, 1.7oz(50ml), Nightclub Essential Fragrance, Long Lasting Cologne for Men | 2 Stück Pheromone Parfum Woman, Parfum Damen",
    "analysis_timestamp": "2026-02-13T19:30:08.840Z",
    "market": "DE",
    "selling-points": {
      "bullet_analysis": [
        {"bullet_index":1,"original_text_summary":"Duftkomposition: frische Kopfnoten (Bergamotte, Vetiver), Herznoten (Ylang-Ylang, holzige Noten, Zedernholz) und Basisnoten (Sandelholz, Amber)","functions":["Spezifische Duftkomposition","Angenehmes olfaktorisches Erlebnis"],"scenes":["Tägliche Anwendung"],"credibility_score":"high"},
        {"bullet_index":2,"original_text_summary":"Kompaktes 50-ml-Format, passt in Aktentasche, Reisetasche oder Manteltasche","functions":["Portables Format","Einfaches Mitnehmen"],"scenes":["Geschäftsreisen","Reisen"],"credibility_score":"high"},
        {"bullet_index":3,"original_text_summary":"Vielseitig: berufliche Meetings, romantische Dates, Pendeln, Ausgehen","functions":["Universell einsetzbarer Duft"],"scenes":["Meetings","Dates","Alltag","Events"],"credibility_score":"medium"},
        {"bullet_index":4,"original_text_summary":"Microencapsulation-Technologie für 5–8 Stunden langanhaltenden Duft","functions":["Langanhaltende Duftwirkung"],"scenes":["Ganztägige Nutzung"],"credibility_score":"medium"},
        {"bullet_index":5,"original_text_summary":"Geschenk für Männer: Geburtstag, Weihnachten, Vatertag","functions":["Geschenkoption"],"scenes":["Geschenkanlässe"],"credibility_score":"high"}
      ],
      "overall_strategy": {
        "primary_differentiation": "Duftkomposition + Portabilität + Geschenkfähigkeit + Pheromon-Claims",
        "emotional_hooks": ["Selbstvertrauen/Anziehung","Romantik und Intimität","Stil/Eleganz","Sicherheit durch Hautverträglichkeit"],
        "missing_elements": ["Konkrete Inhaltsstoffliste","Unabhängige Nachweise zur Haltbarkeit","Klarheit über Varianten","Konzentration und Duftfamilie"]
      },
      "function_scene_matrix": {
        "pain_points": ["Fehlende Dufthaltbarkeit","Unhandliche Verpackungen","Unsicherheit über passenden Duft","Suche nach Geschenkoptionen","Angst vor Hautreizungen","Wunsch nach Attraktivität"]
      }
    },
    "fatal-flaws": {
      "critical_issues": [
        {"issue":"Very poor longevity / fragrance disappears quickly","frequency":4,"user_quotes":["Der Geruch haltet keine 5 Minuten","der Duft verblasst recht schnell auf der Haut","bleibt aber nicht lange und verführt leider null","la tenue il s'évapore presque aussitôt"],"severity":"critical"},
        {"issue":"Almost no scent / extremely weak fragrance","frequency":3,"user_quotes":["Juste nul, on ne sent presque rien","It's not perfume: Do not get this product","Nul aucun effets"],"severity":"critical"},
        {"issue":"Allergic reaction / causes skin redness","frequency":1,"user_quotes":["Ich habe allergisch auf den Duft reagiert, gerötete Haut nach Anwendung"],"severity":"critical"},
        {"issue":"Cheap/odd odor reminiscent of low-quality cologne","frequency":2,"user_quotes":["une très légère odeur d'eau de cologne tres bon marché"],"severity":"major"}
      ],
      "return_triggers": ["Fragrance disappears within minutes","No detectable scent","Allergic skin reaction","Smells like cheap cologne","Feels like a scam"],
      "expectation_gaps": [
        {"expected":"Long-lasting perfume","reality":"Very weak scent that fades within minutes","disappointment_level":"high"},
        {"expected":"Safe for skin","reality":"Caused allergic reaction","disappointment_level":"high"},
        {"expected":"Sophisticated scent","reality":"Smells cheap","disappointment_level":"medium"}
      ],
      "risk_assessment": {"overall_risk_level":"high","primary_concern":"Fragrance performance leading to returns"}
    },
    "wow-moments": {
      "moments": [
        {"moment_description":"Fragrance evolving from fresh citrus to warm, woody notes","user_quote":"Une très belle surprise pour ce parfum ! L'ouverture est vive et fraîche avec les agrumes","emotion_type":"surprise","aspect":"smell","marketing_potential":"high"},
        {"moment_description":"Good value for quality/price","user_quote":"Für den Preis absolut in Ordnung","emotion_type":"delight","aspect":"value","marketing_potential":"medium"}
      ]
    },
    "hesitation-points": {
      "hesitations": [
        {"pre_purchase_worry":"Duft hält nicht lange","post_purchase_resolution":"Mehrere Käufer berichten akzeptable Haltbarkeit","conversion_impact":"medium"},
        {"pre_purchase_worry":"Ist es sein Geld wert?","post_purchase_resolution":"Gutes Preis-Leistungs-Verhältnis für Budget-Käufer","conversion_impact":"low"}
      ]
    },
    "buyer-profile": {
      "demographics": {"likely_gender":"mixed","age_range_estimate":"25-55"},
      "buyer_types": [
        {"type":"budget-conscious buyers","percentage_estimate":"40%","motivation":"Affordable fragrance option"},
        {"type":"gift purchasers","percentage_estimate":"20%","motivation":"Looking for presentable gift"},
        {"type":"fragrance experimenters","percentage_estimate":"25%","motivation":"Trying new scents"},
        {"type":"pheromone believers","percentage_estimate":"15%","motivation":"Attracted by pheromone claims"}
      ]
    }
  }
}`;
