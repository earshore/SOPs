export const TAG_ONLY_ARCHIVE_VERSIONS = Object.freeze(['3.0.5-rc.1', '3.0.5-rc.2']);

const tagOnlyArchiveVersions = new Set(TAG_ONLY_ARCHIVE_VERSIONS);

export function isTagOnlyArchiveVersion(version) {
  return tagOnlyArchiveVersions.has(version);
}

export function isTagOnlyArchiveTag(tag) {
  return tag.startsWith('v') && isTagOnlyArchiveVersion(tag.slice(1));
}
