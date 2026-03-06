# Technical Specs Full Extraction Plan

**Version**: 1.0
**Date**: 2026-03-06
**Author**: data-analyst
**Status**: Design Document

---

## Overview

This document defines a comprehensive plan for extracting technical specifications from multiple report types and consolidating them into a unified, structured format for the DNA system.

## Extraction Sources

Based on the data structure analysis, technical specs are distributed across multiple fields:

### Primary Sources (P0 - Must Extract)

1. **`feature_points`** (Competitor/Product Reports)
   - Type: `string[]`
   - Format: Free-text feature descriptions
   - Contains: Materials, dimensions, capabilities, use cases
   - Example: `"Kompakte, tragbare Größe (ca. 11 x 5,5 x 5,5 cm) mit ergonomischem Griff"`

2. **`coreFeatures`** (Product Analysis Reports)
   - Type: `object`
   - Format: Structured key-value pairs
   - Contains: Detailed technical breakdown
   - Fields:
     - `materials`: Material composition
     - `packContents`: Package contents
     - `assembly`: Assembly requirements
     - `useCases`: Usage scenarios
     - `safetyClaims`: Safety information
     - `positioning`: Market positioning
     - Category-specific fields (e.g., `flightCharacteristics`)

3. **`product_summary`** (All Report Types)
   - Type: `string`
   - Format: Narrative description
   - Contains: Embedded specs within prose
   - Example: `"Größendetail vorhanden (ca. 11 x 5,5 x 5,5 cm)"`

### Secondary Sources (P1 - Should Extract)

4. **`high_frequency_phrases.attribute`** (Semantic Reports)
   - Type: `string[]`
   - Format: Customer language for attributes
   - Contains: Natural descriptions of specs
   - Example: `["natürlich", "langlebig / bissfest", "verschiedene Größen (8–10 mm)"]`

5. **`competitor_insights.strengths`** (Competitor Reports)
   - Type: `string[]`
   - Format: Competitive advantages
   - Contains: Implicit specs and quality indicators
   - Example: `"Betonung robuster Metallmaterialien (Messing, Zinklegierung)"`

### Tertiary Sources (P2 - Nice to Have)

6. **`bullet_points`** (Copywriting Reports)
   - Type: `string[]`
   - Format: Marketing bullets
   - Contains: Specs formatted for customer appeal
   - Example: `"Kompakte, tragbare Größe (ca. 11 x 5,5 x 5,5 cm)"`

---

## Extraction Strategy

### Phase 1: Field-Level Extraction

Extract raw data from each source field:

```typescript
interface RawSpecData {
  featurePoints: string[];           // From feature_points
  coreFeatures: CoreFeaturesObject;  // From coreFeatures
  productSummary: string;            // From product_summary
  attributePhrases: string[];        // From high_frequency_phrases.attribute
  competitorStrengths: string[];     // From competitor_insights.strengths
  bulletPoints: string[];            // From bullet_points (if available)
}

function extractRawSpecs(reports: Report[]): RawSpecData {
  const raw: RawSpecData = {
    featurePoints: [],
    coreFeatures: {},
    productSummary: '',
    attributePhrases: [],
    competitorStrengths: [],
    bulletPoints: []
  };

  for (const report of reports) {
    // Extract from each report type
    if (report.feature_points) {
      raw.featurePoints.push(...report.feature_points);
    }

    if (report.coreFeatures) {
      raw.coreFeatures = { ...raw.coreFeatures, ...report.coreFeatures };
    }

    if (report.product_summary) {
      raw.productSummary = report.product_summary; // Use most recent
    }

    if (report.high_frequency_phrases?.attribute) {
      raw.attributePhrases.push(...report.high_frequency_phrases.attribute);
    }

    if (report.competitor_insights?.strengths) {
      raw.competitorStrengths.push(...report.competitor_insights.strengths);
    }

    if (report.bullet_points) {
      raw.bulletPoints.push(...report.bullet_points);
    }
  }

  return raw;
}
```

### Phase 2: Spec Parsing & Normalization

Parse free-text into structured specifications:

```typescript
interface ParsedSpec {
  category: SpecCategory;
  key: string;
  value: string | number;
  unit?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

enum SpecCategory {
  DIMENSION = 'dimension',
  MATERIAL = 'material',
  WEIGHT = 'weight',
  CAPACITY = 'capacity',
  POWER = 'power',
  PERFORMANCE = 'performance',
  SAFETY = 'safety',
  PACKAGING = 'packaging',
  FEATURE = 'feature',
  OTHER = 'other'
}

function parseSpecs(raw: RawSpecData): ParsedSpec[] {
  const specs: ParsedSpec[] = [];

  // Parse feature_points
  for (const feature of raw.featurePoints) {
    specs.push(...parseFeaturePoint(feature));
  }

  // Parse coreFeatures (already structured)
  specs.push(...parseCoreFeatures(raw.coreFeatures));

  // Parse product_summary
  specs.push(...parseProductSummary(raw.productSummary));

  // Parse attribute phrases
  specs.push(...parseAttributePhrases(raw.attributePhrases));

  return specs;
}
```

### Phase 3: Pattern Recognition

Identify common spec patterns using regex and NLP:

```typescript
const SPEC_PATTERNS = {
  // Dimensions: "ca. 11 x 5,5 x 5,5 cm", "38 cm length", "8-10 mm"
  dimension: /(?:ca\.\s*)?(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?))?)?\s*(cm|mm|m|inch|zoll)/gi,

  // Weight: "500g", "1.2 kg", "2 pounds"
  weight: /(\d+(?:[.,]\d+)?)\s*(g|kg|pound|lb|oz)/gi,

  // Volume/Capacity: "50 ml", "1 liter", "500ml"
  volume: /(\d+(?:[.,]\d+)?)\s*(ml|l|liter|litre)/gi,

  // Power: "5V", "2A", "10W", "USB"
  power: /(\d+(?:[.,]\d+)?)\s*(V|A|W|mAh|watt)/gi,

  // Duration: "8 Stunden", "30 minutes", "5-8 hours"
  duration: /(\d+(?:\s*[-–]\s*\d+)?)\s*(stunden?|minuten?|sekunden?|hours?|minutes?|seconds?)/gi,

  // Temperature: "30°C", "-10 to 50 degrees"
  temperature: /(-?\d+(?:[.,]\d+)?)\s*(?:°|grad|degrees?)?\s*([CF])/gi,

  // Count/Quantity: "4 Stück", "20 pieces", "2-pack"
  quantity: /(\d+)\s*(?:stück|pieces?|pack|pcs|x)/gi,

  // Material keywords
  material: /(EPP|schaum|foam|messing|brass|zink|zinc|holz|wood|metall|metal|kunststoff|plastic|glas|glass|silikon|silicone)/gi,

  // Age range: "ab 3 Jahren", "3-12 years", "ages 3+"
  ageRange: /(?:ab\s+)?(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:jahren?|years?|age)/gi
};

function parseFeaturePoint(feature: string): ParsedSpec[] {
  const specs: ParsedSpec[] = [];

  // Extract dimensions
  const dimMatches = [...feature.matchAll(SPEC_PATTERNS.dimension)];
  for (const match of dimMatches) {
    specs.push({
      category: SpecCategory.DIMENSION,
      key: 'size',
      value: match[0],
      unit: match[4],
      confidence: 'high',
      source: 'feature_points'
    });
  }

  // Extract weight
  const weightMatches = [...feature.matchAll(SPEC_PATTERNS.weight)];
  for (const match of weightMatches) {
    specs.push({
      category: SpecCategory.WEIGHT,
      key: 'weight',
      value: parseFloat(match[1].replace(',', '.')),
      unit: match[2],
      confidence: 'high',
      source: 'feature_points'
    });
  }

  // Extract materials
  const materialMatches = [...feature.matchAll(SPEC_PATTERNS.material)];
  for (const match of materialMatches) {
    specs.push({
      category: SpecCategory.MATERIAL,
      key: 'material',
      value: match[1],
      confidence: 'medium',
      source: 'feature_points'
    });
  }

  // Extract age range
  const ageMatches = [...feature.matchAll(SPEC_PATTERNS.ageRange)];
  for (const match of ageMatches) {
    const minAge = parseInt(match[1]);
    const maxAge = match[2] ? parseInt(match[2]) : null;
    specs.push({
      category: SpecCategory.SAFETY,
      key: 'age_range',
      value: maxAge ? `${minAge}-${maxAge}` : `${minAge}+`,
      confidence: 'high',
      source: 'feature_points'
    });
  }

  // If no structured specs found, store as generic feature
  if (specs.length === 0) {
    specs.push({
      category: SpecCategory.FEATURE,
      key: 'feature',
      value: feature,
      confidence: 'low',
      source: 'feature_points'
    });
  }

  return specs;
}
```

### Phase 4: Structured Extraction from coreFeatures

```typescript
function parseCoreFeatures(coreFeatures: any): ParsedSpec[] {
  const specs: ParsedSpec[] = [];

  // Materials (already structured)
  if (coreFeatures.materials) {
    specs.push({
      category: SpecCategory.MATERIAL,
      key: 'materials',
      value: coreFeatures.materials,
      confidence: 'high',
      source: 'coreFeatures.materials'
    });
  }

  // Package contents
  if (coreFeatures.packContents) {
    specs.push({
      category: SpecCategory.PACKAGING,
      key: 'pack_contents',
      value: coreFeatures.packContents,
      confidence: 'high',
      source: 'coreFeatures.packContents'
    });
  }

  // Assembly requirements
  if (coreFeatures.assembly) {
    specs.push({
      category: SpecCategory.FEATURE,
      key: 'assembly',
      value: coreFeatures.assembly,
      confidence: 'high',
      source: 'coreFeatures.assembly'
    });
  }

  // Safety claims
  if (coreFeatures.safetyClaims) {
    specs.push({
      category: SpecCategory.SAFETY,
      key: 'safety',
      value: coreFeatures.safetyClaims,
      confidence: 'high',
      source: 'coreFeatures.safetyClaims'
    });
  }

  // Use cases
  if (coreFeatures.useCases) {
    specs.push({
      category: SpecCategory.FEATURE,
      key: 'use_cases',
      value: coreFeatures.useCases,
      confidence: 'high',
      source: 'coreFeatures.useCases'
    });
  }

  // Category-specific fields (dynamic)
  const knownFields = ['materials', 'packContents', 'assembly', 'safetyClaims', 'useCases', 'positioning'];
  for (const [key, value] of Object.entries(coreFeatures)) {
    if (!knownFields.includes(key) && value) {
      specs.push({
        category: SpecCategory.PERFORMANCE,
        key: key,
        value: String(value),
        confidence: 'high',
        source: `coreFeatures.${key}`
      });
    }
  }

  return specs;
}
```

### Phase 5: Deduplication & Consolidation

```typescript
function consolidateSpecs(specs: ParsedSpec[]): ParsedSpec[] {
  const consolidated = new Map<string, ParsedSpec>();

  for (const spec of specs) {
    const key = `${spec.category}:${spec.key}`;
    const existing = consolidated.get(key);

    if (!existing) {
      consolidated.set(key, spec);
    } else {
      // Merge logic: prefer higher confidence, more specific values
      if (spec.confidence === 'high' && existing.confidence !== 'high') {
        consolidated.set(key, spec);
      } else if (spec.confidence === existing.confidence) {
        // If same confidence, prefer coreFeatures source
        if (spec.source.startsWith('coreFeatures')) {
          consolidated.set(key, spec);
        }
      }
    }
  }

  return Array.from(consolidated.values());
}
```

### Phase 6: Format Output

```typescript
interface TechnicalSpecsDNA {
  dimensions: {
    length?: { value: number; unit: string };
    width?: { value: number; unit: string };
    height?: { value: number; unit: string };
    diameter?: { value: number; unit: string };
    raw?: string;
  };
  weight: {
    value?: number;
    unit?: string;
    raw?: string;
  };
  materials: string[];
  capacity: {
    value?: number;
    unit?: string;
    raw?: string;
  };
  power: {
    voltage?: string;
    current?: string;
    wattage?: string;
    battery?: string;
  };
  performance: Record<string, string>;
  safety: {
    ageRange?: string;
    certifications?: string[];
    warnings?: string[];
    claims?: string[];
  };
  packaging: {
    contents?: string;
    quantity?: number;
  };
  features: string[];
  useCases: string[];
}

function formatTechnicalSpecs(specs: ParsedSpec[]): TechnicalSpecsDNA {
  const dna: TechnicalSpecsDNA = {
    dimensions: {},
    weight: {},
    materials: [],
    capacity: {},
    power: {},
    performance: {},
    safety: {},
    packaging: {},
    features: [],
    useCases: []
  };

  for (const spec of specs) {
    switch (spec.category) {
      case SpecCategory.DIMENSION:
        if (!dna.dimensions.raw) {
          dna.dimensions.raw = String(spec.value);
        }
        // Parse structured dimensions if possible
        parseDimensionValue(spec.value, dna.dimensions);
        break;

      case SpecCategory.WEIGHT:
        dna.weight.value = Number(spec.value);
        dna.weight.unit = spec.unit;
        break;

      case SpecCategory.MATERIAL:
        if (!dna.materials.includes(String(spec.value))) {
          dna.materials.push(String(spec.value));
        }
        break;

      case SpecCategory.CAPACITY:
        dna.capacity.value = Number(spec.value);
        dna.capacity.unit = spec.unit;
        break;

      case SpecCategory.POWER:
        if (spec.key === 'voltage') dna.power.voltage = String(spec.value);
        if (spec.key === 'current') dna.power.current = String(spec.value);
        if (spec.key === 'wattage') dna.power.wattage = String(spec.value);
        if (spec.key === 'battery') dna.power.battery = String(spec.value);
        break;

      case SpecCategory.PERFORMANCE:
        dna.performance[spec.key] = String(spec.value);
        break;

      case SpecCategory.SAFETY:
        if (spec.key === 'age_range') {
          dna.safety.ageRange = String(spec.value);
        } else if (spec.key === 'safety') {
          if (!dna.safety.claims) dna.safety.claims = [];
          dna.safety.claims.push(String(spec.value));
        }
        break;

      case SpecCategory.PACKAGING:
        if (spec.key === 'pack_contents') {
          dna.packaging.contents = String(spec.value);
        } else if (spec.key === 'quantity') {
          dna.packaging.quantity = Number(spec.value);
        }
        break;

      case SpecCategory.FEATURE:
        if (spec.key === 'use_cases') {
          dna.useCases.push(String(spec.value));
        } else {
          dna.features.push(String(spec.value));
        }
        break;
    }
  }

  return dna;
}

function parseDimensionValue(value: string | number, dimensions: any): void {
  const str = String(value);

  // Try to parse "11 x 5.5 x 5.5 cm" format
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|m)/i);

  if (match) {
    const unit = match[4];
    dimensions.length = { value: parseFloat(match[1].replace(',', '.')), unit };
    dimensions.width = { value: parseFloat(match[2].replace(',', '.')), unit };
    if (match[3]) {
      dimensions.height = { value: parseFloat(match[3].replace(',', '.')), unit };
    }
  }
}
```

---

## Complete Extraction Pipeline

```typescript
export function extractTechnicalSpecs(reports: Report[]): TechnicalSpecsDNA {
  // Phase 1: Extract raw data from all sources
  const rawData = extractRawSpecs(reports);

  // Phase 2: Parse specs from free-text
  const parsedSpecs = parseSpecs(rawData);

  // Phase 3: Deduplicate and consolidate
  const consolidatedSpecs = consolidateSpecs(parsedSpecs);

  // Phase 4: Format into DNA structure
  const dna = formatTechnicalSpecs(consolidatedSpecs);

  return dna;
}
```

---

## Example Extraction Results

### Input: Hand Bell Report

```json
{
  "feature_points": [
    "Kompakte, tragbare Größe (ca. 11 x 5,5 x 5,5 cm) mit ergonomischem Griff",
    "Metallkonstruktion (Zinklegierung oder massiv Messing laut Listing) für Robustheit und Rostschutz",
    "Klarer, lauter Klang durch innere Metallkugel/Feder"
  ],
  "product_summary": "Kleine Handglocken (metallisch) mit Griff für Service-, Tisch- und Dekorationsgebrauch..."
}
```

### Output: Technical Specs DNA

```json
{
  "dimensions": {
    "length": { "value": 11, "unit": "cm" },
    "width": { "value": 5.5, "unit": "cm" },
    "height": { "value": 5.5, "unit": "cm" },
    "raw": "ca. 11 x 5,5 x 5,5 cm"
  },
  "weight": {},
  "materials": ["Zinklegierung", "Messing", "Metall"],
  "capacity": {},
  "power": {},
  "performance": {
    "sound": "Klarer, lauter Klang durch innere Metallkugel/Feder"
  },
  "safety": {
    "claims": ["Rostschutz"]
  },
  "packaging": {},
  "features": [
    "ergonomischer Griff",
    "Metallkonstruktion für Robustheit"
  ],
  "useCases": [
    "Service",
    "Tisch",
    "Dekoration"
  ]
}
```

---

## Validation Rules

### Required Fields
- At least one of: `dimensions`, `materials`, `features`
- `materials` array must not be empty if present
- Numeric values must be positive

### Data Quality Checks
```typescript
function validateTechnicalSpecs(dna: TechnicalSpecsDNA): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for minimum data
  if (!dna.dimensions.raw && dna.materials.length === 0 && dna.features.length === 0) {
    errors.push('No technical specs extracted - at least one category required');
  }

  // Validate dimensions
  if (dna.dimensions.length && dna.dimensions.length.value <= 0) {
    errors.push('Invalid dimension: length must be positive');
  }

  // Validate materials
  if (dna.materials.length === 0) {
    warnings.push('No materials extracted - consider manual review');
  }

  // Check for conflicting materials
  const materialConflicts = detectMaterialConflicts(dna.materials);
  if (materialConflicts.length > 0) {
    warnings.push(`Conflicting materials detected: ${materialConflicts.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function detectMaterialConflicts(materials: string[]): string[] {
  const conflicts: string[] = [];

  // Example: "Zinklegierung" and "massiv Messing" are conflicting
  const hasZinc = materials.some(m => m.toLowerCase().includes('zink'));
  const hasSolidBrass = materials.some(m => m.toLowerCase().includes('massiv') && m.toLowerCase().includes('messing'));

  if (hasZinc && hasSolidBrass) {
    conflicts.push('Zinc alloy vs Solid brass');
  }

  return conflicts;
}
```

---

## Edge Cases & Handling

### 1. Missing Data
- **Issue**: Some reports lack `coreFeatures` or `feature_points`
- **Solution**: Fall back to `product_summary` parsing and `attribute_phrases`

### 2. Conflicting Specs
- **Issue**: Different reports provide conflicting values (e.g., "Zinklegierung" vs "massiv Messing")
- **Solution**:
  - Flag conflicts in validation
  - Prefer `coreFeatures` over `feature_points`
  - Store all variants with confidence scores

### 3. Ambiguous Units
- **Issue**: "11 x 5,5 x 5,5" without unit
- **Solution**: Infer from context (most common unit in category)

### 4. Category-Specific Fields
- **Issue**: `flightCharacteristics` only exists for toys
- **Solution**: Store in `performance` object with original key

### 5. Multi-Language Support
- **Issue**: Reports in different languages (German, Polish, English)
- **Solution**:
  - Use language-specific regex patterns
  - Normalize units to standard (cm, g, ml)
  - Translate material names to English for deduplication

---

## Performance Optimization

### Caching Strategy
```typescript
const specCache = new Map<string, ParsedSpec[]>();

function extractWithCache(reports: Report[]): TechnicalSpecsDNA {
  const cacheKey = reports.map(r => r.meta.generatedAt).join('|');

  if (specCache.has(cacheKey)) {
    return formatTechnicalSpecs(specCache.get(cacheKey)!);
  }

  const specs = parseSpecs(extractRawSpecs(reports));
  specCache.set(cacheKey, specs);

  return formatTechnicalSpecs(specs);
}
```

### Batch Processing
- Process multiple reports in parallel
- Use worker threads for regex-heavy parsing
- Stream large report files instead of loading entirely

---

## Testing Strategy

### Unit Tests
```typescript
describe('Technical Specs Extraction', () => {
  test('extracts dimensions from feature_points', () => {
    const feature = "Kompakte Größe (ca. 11 x 5,5 x 5,5 cm)";
    const specs = parseFeaturePoint(feature);

    expect(specs).toContainEqual({
      category: SpecCategory.DIMENSION,
      key: 'size',
      value: expect.stringContaining('11'),
      unit: 'cm',
      confidence: 'high',
      source: 'feature_points'
    });
  });

  test('extracts materials from multiple sources', () => {
    const raw = {
      featurePoints: ["Metallkonstruktion (Zinklegierung)"],
      coreFeatures: { materials: "EPP foam" },
      attributePhrases: ["natürlich", "Holz"]
    };

    const specs = parseSpecs(raw);
    const materials = specs.filter(s => s.category === SpecCategory.MATERIAL);

    expect(materials.length).toBeGreaterThan(0);
  });

  test('handles missing coreFeatures gracefully', () => {
    const raw = {
      featurePoints: ["50 ml Format"],
      coreFeatures: {},
      productSummary: "Herrenparfum 50ml"
    };

    const specs = parseSpecs(raw);
    expect(specs.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
- Test with real report files from Downloads folder
- Verify extraction across all 5 report types
- Compare output with manually verified specs

---

## Implementation Checklist

- [ ] Implement `extractRawSpecs()` function
- [ ] Implement regex patterns for all spec types
- [ ] Implement `parseFeaturePoint()` function
- [ ] Implement `parseCoreFeatures()` function
- [ ] Implement `parseProductSummary()` function
- [ ] Implement `consolidateSpecs()` deduplication
- [ ] Implement `formatTechnicalSpecs()` output formatter
- [ ] Implement validation rules
- [ ] Add unit tests for each parser
- [ ] Add integration tests with real data
- [ ] Add multi-language support
- [ ] Optimize performance with caching
- [ ] Document edge cases and limitations

---

## Next Steps

1. Implement the extraction pipeline in TypeScript
2. Test with all 8 report files from Downloads
3. Validate output against manual review
4. Integrate with DNA extractor main module
5. Add monitoring for extraction quality metrics
