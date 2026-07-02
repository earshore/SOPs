// 真实待分析数据
export interface Review {
  body: string;
  headline: string;
  origin_country: string;
  review_date: string;
  star_rating: number;
  _origin_site: string;
}

export interface Product {
  asin: string;
  customer_reviews: Review[];
  feature_bullets: string[];
  productTitle: string;
  scrape_status: string;
  metadata: Record<string, unknown>;
}

export interface ProductData {
  metadata: {
    marketplace: string;
    scrape_timestamp: string;
    total_asins: number;
    last_action: string;
  };
  products: Product[];
}

export const sampleProductData: ProductData = {
  metadata: {
    marketplace: 'DE',
    scrape_timestamp: '2026-02-10T18:51:40.100Z',
    total_asins: 1,
    last_action: 'multi_site_import_merge',
  },
  products: [
    {
      asin: 'B0DNMZ2MLG',
      customer_reviews: [
        {
          body: 'Ich finde das Parfum super aber ich habe es noch nicht ausprobiert',
          headline: 'Ja und nein',
          origin_country: 'Deutschland',
          review_date: 'Bewertet in Deutschland am 30. Dezember 2025',
          star_rating: 5,
          _origin_site: 'DE',
        },
        {
          body: 'Great smell 👃 👍',
          headline: 'Smells great',
          origin_country: 'Kanada',
          review_date: 'Bewertet in Kanada am 2. Februar 2026',
          star_rating: 5,
          _origin_site: 'DE',
        },
        {
          body: 'Très bon',
          headline: 'Tres bon',
          origin_country: 'Kanada',
          review_date: 'Bewertet in Kanada am 14. Januar 2026',
          star_rating: 5,
          _origin_site: 'DE',
        },
        {
          body: "The smell is great and the problem is it doesn't stay for long",
          headline: 'Good but not Great',
          origin_country: 'Großbritannien',
          review_date: 'Bewertet in Großbritannien am 19. Januar 2026',
          star_rating: 4,
          _origin_site: 'DE',
        },
        {
          body: "Do not get this product. It's a scam.",
          headline: "It's not perfume",
          origin_country: 'Kanada',
          review_date: 'Bewertet in Kanada am 18. September 2025',
          star_rating: 1,
          _origin_site: 'DE',
        },
        {
          body: 'Expensive for the amount I got',
          headline: 'Expensive for the amount',
          origin_country: 'Kanada',
          review_date: 'Bewertet in Kanada am 18. Oktober 2025',
          star_rating: 4,
          _origin_site: 'DE',
        },
      ],
      feature_bullets: [
        'Perfekte Größe: Mit 50 ml ist dieses langanhaltende Cologne für Herren reisefreundlich und bietet reichlich Vorrat, um sicherzustellen, dass Sie Ihren charakteristischen Duft immer zur Hand haben, wohin Sie auch gehen',
        'Langanhaltender Club-Duft: Dieses Parfüm wurde entwickelt, um einen bleibenden Eindruck zu hinterlassen, umhüllt Sie mit einer aromatischen, holzigen Essenz, die für mehr als 6 Stunden hält. Sein mutiger und dennoch raffinierter Charakter hilft Ihnen, von morgens bis abends Selbstvertrauen auszustrahlen. Treten Sie in jede Veranstaltung ein und seine unverwechselbare Mischung wird mühelos Aufmerksamkeit auf sich ziehen und Ihre Anwesenheit unvergesslich machen',
        '【Elegante Geschenkoption】 Es verfügt über eine schwarze Verpackung, die Geheimnis und Eleganz ausstrahlt, während die blau getönte hochwertige Glasflasche Ruhe und Tiefe symbolisiert. Wenn Sie ein Geschenk für einen Freund, einen geliebten Menschen oder ein Familienmitglied wählen, ist es zweifellos eine ausgezeichnete Wahl',
        'Sanfte sichere Anwendung: Nehmen Sie einfach die Parfümflasche auf und tragen Sie sie gleichmäßig auf Ihren Körper auf. Hinterlässt keine Rückstände oder Flecken. Ob auf Handgelenke, Hals oder Kleidung, seine sanfte Formel ist frei von schädlichen Chemikalien und sicher für Ihre Haut',
        'Brand Reputation From YCZ - A trusted brand with a reputation for excellence in the fragrance industry. Bekannt für seine Qualität, Innovation und Liebe zum Detail. Wenn Sie Fragen zu unseren Produkten haben, wenden Sie sich bitte an YCZ und wir werden Ihnen eine zufriedenstellende Lösung bieten',
      ],
      productTitle:
        "Ycz CLUB GENT'S AROMA Perfume Men, 1.7oz(50ml), Nightclub Essential Fragrance, Long Lasting Cologne for Men with Aromatic Woody Notes of Mint, and Lemon, Ideal Occasions Daily Elegance",
      scrape_status: 'success',
      metadata: {},
    },
  ],
};

// 获取产品数据
export function getProductByAsin(asin: string): Product | undefined {
  return sampleProductData.products.find(p => p.asin === asin);
}

// 获取所有可用ASIN
export function getAvailableAsins(): string[] {
  return sampleProductData.products.map(p => p.asin);
}
