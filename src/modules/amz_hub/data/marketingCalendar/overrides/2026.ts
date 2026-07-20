import type { YearEventOverride } from '../types';

/**
 * 2026 annual thin override pack — official / lunar / festival dates only.
 * Not a full-year copy of templates.
 */
export const OVERRIDES_2026: YearEventOverride[] = [
  {
    templateId: 'spring-deal-days',
    year: 2026,
    startDate: '2026-03-10',
    endDate: '2026-03-16',
    dateLabel: '3月10-16日',
    confidence: 'exact',
    sources: [
      {
        label: 'Spring Deal Days',
        url: 'https://www.aboutamazon.eu/news/retail/spring-into-savings-amazon-spring-deal-days-returns-march-10-to-16',
        verifiedAt: '2026-01-01',
      },
    ],
  },
  {
    templateId: 'prime-day',
    year: 2026,
    startDate: '2026-06-23',
    endDate: '2026-06-26',
    dateLabel: '6月23-26日',
    confidence: 'exact',
    sources: [
      {
        label: 'Prime Day 2026',
        url: 'https://www.aboutamazon.eu/news/retail/amazon-prime-day-2026-date',
        verifiedAt: '2026-01-01',
      },
    ],
  },
  {
    templateId: 'ramadan-start',
    year: 2026,
    startDate: '2026-02-18',
    endDate: '2026-02-18',
    dateLabel: '2月18日',
    confidence: 'exact',
    note: 'Islamic calendar; re-verify annually',
  },
  {
    templateId: 'eid-al-fitr',
    year: 2026,
    startDate: '2026-03-19',
    endDate: '2026-03-19',
    dateLabel: '3月19日',
    confidence: 'exact',
    note: 'Islamic calendar; re-verify annually',
  },
  {
    templateId: 'tomorrowland-festival',
    year: 2026,
    startDate: '2026-07-17',
    endDate: '2026-07-26',
    dateLabel: '7月17-19/24-26日',
    confidence: 'exact',
    note: 'Two weekends 17–19 and 24–26 July 2026',
  },
];
