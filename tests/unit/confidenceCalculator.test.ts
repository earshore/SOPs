/**
 * 置信度计算器单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTitleKeywordsConfidence,
  calculateSellingPointsConfidence,
  calculateFatalFlawsConfidence,
  calculateWowMomentsConfidence,
  calculateHesitationPointsConfidence,
  calculateBuyerProfileConfidence,
  calculateVocabGapConfidence,
  calculatePromiseRealityConfidence,
  calculateFullReportConfidence,
  calculateOverallConfidence,
  getConfidenceLevel,
  getConfidenceColorClass
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator';

import type {
  TitleKeywordsReport,
  SellingPointsReport,
  FatalFlawsReport,
  WowMomentsReport,
  HesitationPointsReport,
  BuyerProfileReport,
  VocabGapReport,
  PromiseRealityReport
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

  describe('calculateTitleKeywordsConfidence', () => {
    it('应该为完整的报告返回高置信度', () => {
      const report: TitleKeywordsReport = {
        primary_keywords: [
          { keyword: 'wireless earbuds', weight: 'high', search_volume_estimate: 'high' },
          { keyword: 'bluetooth', weight: 'high', search_volume_estimate: 'high' },
          { keyword: 'noise cancelling', weight: 'medium', search_volume_estimate: 'medium' }
        ],
        secondary_keywords: [
          { keyword: 'waterproof', type: 'feature', importance: 'high' },
          { keyword: 'long battery', type: 'feature', importance: 'medium' },
          { keyword: 'comfortable', type: 'feature', importance: 'medium' },
          { keyword: 'portable', type: 'feature', importance: 'low' },
          { keyword: 'wireless', type: 'feature', importance: 'high' }
        ],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: ['Add more keywords', 'Improve title structure']
      };

      const confidence = calculateTitleKeywordsConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为空报告返回低置信度', () => {
      const report: TitleKeywordsReport = {
        primary_keywords: [],
        secondary_keywords: [],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: []
      };

      const confidence = calculateTitleKeywordsConfidence(report);
      expect(confidence).toBeLessThan(0.3);
    });
  });

  describe('calculateSellingPointsConfidence', () => {
    it('应该为完整的卖点报告返回高置信度', () => {
      const report: SellingPointsReport = {
        bullet_analysis: [
          {
            bullet_index: 1,
            original_text_summary: 'Long battery life up to 30 hours',
            functions: ['long battery'],
            scenes: ['travel', 'work'],
            pain_points_addressed: ['battery anxiety'],
            differentiation_angle: 'Extended battery life',
            credibility_score: 'high'
          },
          {
            bullet_index: 2,
            original_text_summary: 'Waterproof IPX7 design',
            functions: ['waterproof'],
            scenes: ['gym', 'outdoor'],
            pain_points_addressed: ['water damage'],
            differentiation_angle: 'Durability',
            credibility_score: 'high'
          },
          {
            bullet_index: 3,
            original_text_summary: 'Comfortable ergonomic fit',
            functions: ['comfort'],
            scenes: ['daily use'],
            pain_points_addressed: ['ear pain'],
            differentiation_angle: 'Comfort',
            credibility_score: 'medium'
          }
        ],
        overall_strategy: {
          primary_differentiation: 'Long battery life and durability',
          target_positioning: 'Active lifestyle users',
          emotional_hooks: ['Freedom', 'Reliability'],
          missing_elements: []
        },
        function_scene_matrix: {
          functions: ['battery', 'waterproof', 'comfort'],
          scenes: ['travel', 'gym', 'work'],
          pain_points: ['battery anxiety', 'water damage', 'ear pain']
        }
      };

      const confidence = calculateSellingPointsConfidence(report);
      expect(confidence).toBeGreaterThan(0.7);
    });
  });

  describe('calculateFatalFlawsConfidence', () => {
    it('应该为没有致命缺陷的报告返回高置信度', () => {
      const report: FatalFlawsReport = {
        critical_issues: [], // 空数组表示产品很好
        return_triggers: [],
        expectation_gaps: [],
        actionable_fixes: ['No critical issues found', 'Product meets expectations'],
        risk_assessment: {
          overall_risk_level: 'low',
          primary_concern: 'None'
        }
      };

      const confidence = calculateFatalFlawsConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为有致命缺陷的报告返回合理置信度', () => {
      const report: FatalFlawsReport = {
        critical_issues: [
          {
            issue: 'Battery dies quickly',
            frequency: 'high',
            user_quotes: ['Battery only lasts 2 hours'],
            severity: 'critical',
            category: 'hardware'
          },
          {
            issue: 'Poor sound quality',
            frequency: 'medium',
            user_quotes: ['Sound is muffled'],
            severity: 'major',
            category: 'audio'
          }
        ],
        return_triggers: ['Battery life', 'Sound quality'],
        expectation_gaps: [],
        actionable_fixes: ['Improve battery capacity', 'Enhance audio drivers'],
        risk_assessment: {
          overall_risk_level: 'high',
          primary_concern: 'Battery performance'
        }
      };

      const confidence = calculateFatalFlawsConfidence(report);
      expect(confidence).toBeGreaterThan(0.5);
    });
  });

  describe('calculateWowMomentsConfidence', () => {
    it('应该为完整的惊喜时刻报告返回高置信度', () => {
      const report: WowMomentsReport = {
        moments: [
          {
            moment_description: 'Amazing scent that lasts all day',
            user_quote: 'The fragrance is incredible and stays fresh for 12+ hours',
            emotion_type: 'delight',
            aspect: 'longevity',
            marketing_potential: 'high'
          },
          {
            moment_description: 'Compliments from everyone',
            user_quote: 'I get compliments everywhere I go',
            emotion_type: 'pride',
            aspect: 'social_appeal',
            marketing_potential: 'high'
          }
        ],
        emotional_triggers: ['amazing', 'incredible', 'love', 'best'],
        high_conversion_phrases: ['lasts all day', 'get compliments', 'smells great'],
        unexpected_benefits: ['Long lasting', 'Great value', 'Professional packaging'],
        copywriting_angles: ['Sensory appeal', 'Social proof', 'Value proposition']
      };

      const confidence = calculateWowMomentsConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为空报告返回低置信度', () => {
      const report: WowMomentsReport = {
        moments: [],
        emotional_triggers: [],
        high_conversion_phrases: [],
        unexpected_benefits: [],
        copywriting_angles: []
      };

      const confidence = calculateWowMomentsConfidence(report);
      expect(confidence).toBeLessThan(0.3);
    });

    it('应该处理部分数据的报告', () => {
      const report: WowMomentsReport = {
        moments: [
          {
            moment_description: 'Good smell',
            user_quote: 'Nice',
            emotion_type: 'satisfaction',
            aspect: 'scent',
            marketing_potential: 'medium'
          }
        ],
        emotional_triggers: [],
        high_conversion_phrases: [],
        unexpected_benefits: [],
        copywriting_angles: []
      };

      const confidence = calculateWowMomentsConfidence(report);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(0.6);
    });
  });

  describe('calculateHesitationPointsConfidence', () => {
    it('应该为完整的犹豫点报告返回高置信度', () => {
      const report: HesitationPointsReport = {
        hesitations: [
          {
            pre_purchase_worry: 'Will the scent last long enough?',
            post_purchase_resolution: 'Lasts 8-10 hours, exceeded expectations',
            user_evidence: 'Multiple reviews confirm longevity',
            qa_recommendation: 'Add Q&A about longevity with specific hours'
          },
          {
            pre_purchase_worry: 'Is it too strong for office use?',
            post_purchase_resolution: 'Perfect for professional settings',
            user_evidence: 'Many office workers praise the subtle strength',
            qa_recommendation: 'Clarify scent strength in product description'
          },
          {
            pre_purchase_worry: 'Will it cause allergic reactions?',
            post_purchase_resolution: 'Hypoallergenic formula, no issues reported',
            user_evidence: 'Sensitive skin users report no problems',
            qa_recommendation: 'Highlight hypoallergenic properties'
          }
        ],
        common_doubts: ['Longevity concerns', 'Scent strength', 'Allergies', 'Value for money'],
        trust_builders: ['Money-back guarantee', 'Dermatologist tested', 'Customer reviews'],
        qa_optimization_items: [
          {
            question: 'How long does the scent last?',
            suggested_answer: '8-10 hours with proper application'
          },
          {
            question: 'Is it suitable for sensitive skin?',
            suggested_answer: 'Yes, hypoallergenic and dermatologist tested'
          }
        ]
      };

      const confidence = calculateHesitationPointsConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为空报告返回低置信度', () => {
      const report: HesitationPointsReport = {
        hesitations: [],
        common_doubts: [],
        trust_builders: [],
        qa_optimization_items: []
      };

      const confidence = calculateHesitationPointsConfidence(report);
      expect(confidence).toBeLessThan(0.3);
    });

    it('应该处理只有犹豫点但缺少其他数据的报告', () => {
      const report: HesitationPointsReport = {
        hesitations: [
          {
            pre_purchase_worry: 'Price concern',
            post_purchase_resolution: 'Worth it',
            user_evidence: 'Good reviews',
            qa_recommendation: 'Add value explanation'
          }
        ],
        common_doubts: [],
        trust_builders: [],
        qa_optimization_items: []
      };

      const confidence = calculateHesitationPointsConfidence(report);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(0.6);
    });
  });

  describe('calculateVocabGapConfidence', () => {
    it('应该为完整的词汇差距报告返回高置信度', () => {
      const report: VocabGapReport = {
        seller_terms: ['Aromatic Woody', 'Eau de Parfum', 'Premium Fragrance'],
        buyer_terms: ['smells good', 'long lasting', 'not too strong', 'fresh scent'],
        uncovered_buyer_terms: [
          {
            term: 'office appropriate',
            frequency: 'high',
            context: 'Many buyers mention using it for work',
            recommendation: 'Add "professional" or "office-friendly" to description'
          },
          {
            term: 'date night',
            frequency: 'medium',
            context: 'Popular for romantic occasions',
            recommendation: 'Include "perfect for special occasions" in bullets'
          },
          {
            term: 'gym bag essential',
            frequency: 'medium',
            context: 'Active lifestyle users love it',
            recommendation: 'Mention portability and freshness'
          },
          {
            term: 'compliment getter',
            frequency: 'high',
            context: 'Users report receiving compliments',
            recommendation: 'Add social proof angle'
          },
          {
            term: 'value for money',
            frequency: 'high',
            context: 'Price-conscious buyers appreciate quality',
            recommendation: 'Emphasize quality-to-price ratio'
          }
        ],
        term_translations: [
          { seller_says: 'Aromatic Woody', buyer_says: 'masculine fresh scent' },
          { seller_says: 'Long-lasting formula', buyer_says: 'stays on all day' },
          { seller_says: 'Premium ingredients', buyer_says: 'smells expensive' }
        ],
        listing_optimization: {
          title_additions: ['Office Appropriate', 'Long Lasting', 'Fresh Scent'],
          bullet_additions: ['Perfect for dates and special occasions', 'Portable 50ml size for gym bag'],
          keyword_opportunities: ['professional cologne', 'date night fragrance', 'compliment getter']
        }
      };

      const confidence = calculateVocabGapConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为空报告返回低置信度', () => {
      const report: VocabGapReport = {
        seller_terms: [],
        buyer_terms: [],
        uncovered_buyer_terms: [],
        term_translations: [],
        listing_optimization: {
          title_additions: [],
          bullet_additions: [],
          keyword_opportunities: []
        }
      };

      const confidence = calculateVocabGapConfidence(report);
      expect(confidence).toBeLessThan(0.3);
    });

    it('应该为没有未覆盖术语的报告返回高置信度', () => {
      const report: VocabGapReport = {
        seller_terms: ['perfume', 'cologne', 'fragrance'],
        buyer_terms: ['perfume', 'cologne', 'fragrance'],
        uncovered_buyer_terms: [], // 空数组表示词汇覆盖很好
        term_translations: [
          { seller_says: 'fragrance', buyer_says: 'perfume' }
        ],
        listing_optimization: {
          title_additions: [],
          bullet_additions: [],
          keyword_opportunities: []
        }
      };

      const confidence = calculateVocabGapConfidence(report);
      expect(confidence).toBeGreaterThan(0.5);
    });
  });

  describe('calculatePromiseRealityConfidence', () => {
    it('应该为完整的承诺现实报告返回高置信度', () => {
      const report: PromiseRealityReport = {
        gaps: [
          {
            listing_claim: 'Lasts 24 hours',
            review_reality: 'Actually lasts 8-10 hours',
            contradiction_severity: 'moderate',
            evidence_quotes: ['Lasts about 8 hours on me', 'Gone by evening'],
            false_advertising_risk: 'medium',
            recommended_action: 'Update to "Lasts 8-10 hours" for accuracy'
          },
          {
            listing_claim: 'Hypoallergenic',
            review_reality: 'Some users report skin irritation',
            contradiction_severity: 'severe',
            evidence_quotes: ['Caused rash', 'Skin reaction'],
            false_advertising_risk: 'high',
            recommended_action: 'Remove claim or add disclaimer'
          },
          {
            listing_claim: 'Premium ingredients',
            review_reality: 'Quality matches price point',
            contradiction_severity: 'minor',
            evidence_quotes: ['Good quality', 'Worth the price'],
            false_advertising_risk: 'low',
            recommended_action: 'Claim is generally supported'
          }
        ],
        verified_claims: ['50ml size', 'Aromatic woody scent', 'Portable bottle'],
        unverified_claims: ['24-hour longevity', 'Hypoallergenic'],
        overall_credibility: {
          score: '7/10',
          assessment: 'Mostly accurate with some exaggerations'
        },
        listing_revision_suggestions: [
          'Adjust longevity claim to 8-10 hours',
          'Remove or qualify hypoallergenic claim',
          'Add more specific scent descriptions'
        ]
      };

      const confidence = calculatePromiseRealityConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('应该为空报告返回低置信度', () => {
      const report: PromiseRealityReport = {
        gaps: [],
        verified_claims: [],
        unverified_claims: [],
        overall_credibility: {
          score: '',
          assessment: ''
        },
        listing_revision_suggestions: []
      };

      const confidence = calculatePromiseRealityConfidence(report);
      expect(confidence).toBeLessThan(0.3);
    });

    it('应该为有少量差距的高质量报告返回合理置信度', () => {
      const report: PromiseRealityReport = {
        gaps: [
          {
            listing_claim: 'Lasts 24 hours',
            review_reality: 'Actually lasts 8-10 hours',
            contradiction_severity: 'minor',
            evidence_quotes: ['Lasts about 8 hours on me'],
            false_advertising_risk: 'low',
            recommended_action: 'Update to "Lasts 8-10 hours"'
          }
        ],
        verified_claims: ['Long lasting', 'Fresh scent', 'Good value'],
        unverified_claims: [],
        overall_credibility: {
          score: '9/10',
          assessment: 'Highly credible, minor discrepancy found'
        },
        listing_revision_suggestions: ['Adjust longevity claim']
      };

      const confidence = calculatePromiseRealityConfidence(report);
      expect(confidence).toBeGreaterThan(0.5);
    });
  });

  describe('calculateBuyerProfileConfidence', () => {
    it('应该为完整的买家画像返回高置信度', () => {
      const report: BuyerProfileReport = {
        demographics: {
          likely_gender: 'Male',
          age_range_estimate: '25-35',
          lifestyle_indicators: ['Active', 'Tech-savvy', 'Urban']
        },
        buyer_types: [
          {
            type: 'Fitness Enthusiast',
            percentage_estimate: '40%',
            evidence: 'Frequent mentions of gym and workout use'
          },
          {
            type: 'Commuter',
            percentage_estimate: '35%',
            evidence: 'Many reviews mention daily commute'
          },
          {
            type: 'Traveler',
            percentage_estimate: '25%',
            evidence: 'Reviews mention travel and flights'
          }
        ],
        usage_scenes: [
          {
            scene: 'Gym workouts',
            frequency: 'high',
            context: 'During cardio and weight training'
          },
          {
            scene: 'Daily commute',
            frequency: 'high',
            context: 'On subway and bus'
          }
        ],
        purchase_motivations: ['Convenience', 'Quality', 'Brand reputation'],
        geographic_insights: {
          primary_markets: ['US', 'UK', 'Canada'],
          cultural_considerations: ['Western lifestyle', 'Fitness culture']
        }
      };

      const confidence = calculateBuyerProfileConfidence(report);
      expect(confidence).toBeGreaterThan(0.6);
    });
  });

  describe('calculateFullReportConfidence', () => {
    it('应该计算完整报告的所有置信度分数', () => {
      const report = {
        'title-keywords': {
          primary_keywords: [
            { keyword: 'test', weight: 'high' as const, search_volume_estimate: 'high' },
            { keyword: 'test2', weight: 'high' as const, search_volume_estimate: 'high' },
            { keyword: 'test3', weight: 'medium' as const, search_volume_estimate: 'medium' }
          ],
          secondary_keywords: [
            { keyword: 'feature1', type: 'feature', importance: 'high' },
            { keyword: 'feature2', type: 'feature', importance: 'medium' }
          ],
          scene_keywords: [],
          audience_keywords: [],
          removed_modifiers: [],
          removed_brand_terms: [],
          optimization_suggestions: ['Suggestion 1', 'Suggestion 2']
        },
        'buyer-profile': {
          demographics: {
            likely_gender: 'Male',
            age_range_estimate: '25-35',
            lifestyle_indicators: ['Active', 'Tech-savvy']
          },
          buyer_types: [
            { type: 'Type 1', percentage_estimate: '50%', evidence: 'Evidence' }
          ],
          usage_scenes: [
            { scene: 'Scene 1', frequency: 'high', context: 'Context' }
          ],
          purchase_motivations: ['Motivation 1'],
          geographic_insights: {
            primary_markets: ['US'],
            cultural_considerations: ['Western']
          }
        }
      };

      const confidence = calculateFullReportConfidence(report);

      expect(confidence).toHaveProperty('title-keywords');
      expect(confidence).toHaveProperty('buyer-profile');
      expect(confidence['title-keywords']).toBeGreaterThan(0);
      expect(confidence['buyer-profile']).toBeGreaterThan(0);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('应该计算平均置信度', () => {
      const confidenceScores = {
        'title-keywords': 0.8,
        'selling-points': 0.7,
        'buyer-profile': 0.9
      };

      const overall = calculateOverallConfidence(confidenceScores);
      expect(overall).toBeCloseTo(0.8, 1);
    });

    it('应该为空对象返回 0', () => {
      const overall = calculateOverallConfidence({});
      expect(overall).toBe(0);
    });
  });

  describe('getConfidenceLevel', () => {
    it('应该正确分类置信度等级', () => {
      expect(getConfidenceLevel(0.8)).toBe('high');
      expect(getConfidenceLevel(0.6)).toBe('medium');
      expect(getConfidenceLevel(0.3)).toBe('low');
    });
  });

  describe('getConfidenceColorClass', () => {
    it('应该返回正确的颜色类', () => {
      expect(getConfidenceColorClass(0.8)).toContain('green');
      expect(getConfidenceColorClass(0.6)).toContain('yellow');
      expect(getConfidenceColorClass(0.3)).toContain('orange');
    });
  });
