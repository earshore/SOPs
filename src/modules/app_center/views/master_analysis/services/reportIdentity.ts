type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function omitVolatileScrapeMetadata(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const metadata = isRecord(value.metadata)
    ? Object.fromEntries(
        Object.entries(value.metadata).filter(([key]) => key !== 'scrape_timestamp')
      )
    : value.metadata;

  return {
    ...value,
    metadata
  };
}

function stableStringify(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);

  if (seen.has(value)) return '"[Circular]"';
  seen.add(value);

  if (Array.isArray(value)) {
    const serialized = `[${value.map(item => stableStringify(item, seen)).join(',')}]`;
    seen.delete(value);
    return serialized;
  }

  const record = value as JsonRecord;
  const entries = Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(record[key], seen)}`);

  const serialized = `{${entries.join(',')}}`;
  seen.delete(value);
  return serialized;
}

function hashString(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function getReportFingerprint(report: unknown): string | null {
  if (report === null || report === undefined) return null;
  if (typeof report === 'string' && report.trim().length === 0) return null;

  const serialized = stableStringify(report);
  return `${hashString(serialized)}-${serialized.length}`;
}

export function getScrapedDataFingerprint(scrapedData: unknown): string | null {
  if (scrapedData === null || scrapedData === undefined) return null;

  const serialized = stableStringify(omitVolatileScrapeMetadata(scrapedData));
  return `${hashString(serialized)}-${serialized.length}`;
}

export function unwrapReportPayload(report: unknown): unknown {
  if (!isRecord(report)) {
    return report;
  }

  return report.analysisReport ?? report;
}
