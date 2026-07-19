export type TargetMarket =
  | 'English'
  | 'German'
  | 'French'
  | 'Italian'
  | 'Spanish'
  | 'Japanese'
  | 'Chinese'
  | '';

export type ToneStyle =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'formal'
  | 'enthusiastic'
  | 'persuasive'
  | 'exciting'
  | 'emotional'
  | 'minimalist'
  | '';

export type UserProductDnaField =
  | 'keywordsTier1'
  | 'keywordsTier2'
  | 'negative'
  | 'audience'
  | 'usps'
  | 'specs'
  | 'socialHook';

export interface UserProductProfile {
  targetMarket: TargetMarket;
  keywordsTier1: string;
  keywordsTier2: string;
  audience: string;
  usps: string;
  specs: string;
  socialHook: string;
  negative: string;
  tone: ToneStyle;
  customStrategy: string;
  useRufus: boolean;
  useEmoji: boolean;
  useCosmo: boolean;
  selectedReportSections: string[];
  selectedReportItems?: {
    [dimensionId: string]: {
      enabled: boolean;
      subItems: {
        [subItemKey: string]:
          | boolean
          | {
              enabled: boolean;
              items?: {
                [itemIndex: string]: boolean;
              };
            };
      };
    };
  };
  reportFingerprint?: string;
  charLimit: number;
}
