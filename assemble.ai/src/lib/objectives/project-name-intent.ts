interface ProjectAssetInput {
  projectName?: string;
  buildingClass: string;
  subclass: string[];
}

const PROJECT_NAME_ASSET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bamenit(?:y|ies)\s+(?:block|building|facility|facilities)\b/i, label: 'amenities block' },
  { pattern: /\btoilet\s+(?:block|building|facility|facilities)\b/i, label: 'toilet block' },
  { pattern: /\bchangeroom(?:s)?\b|\bchange\s*room(?:s)?\b/i, label: 'changeroom amenities' },
  { pattern: /\bablution\s+(?:block|building|facility|facilities)\b/i, label: 'ablution block' },
  { pattern: /\bend[-\s]?of[-\s]?trip\s+(?:facility|facilities|amenities)\b/i, label: 'end-of-trip facilities' },
];

export function compactProfileLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferProjectNameAssetLabel(projectName?: string): string {
  const name = projectName?.trim();
  if (!name) return '';

  for (const { pattern, label } of PROJECT_NAME_ASSET_PATTERNS) {
    if (pattern.test(name)) return label;
  }

  return '';
}

export function hasReplacementIntent(projectName?: string): boolean {
  return /\breplac(?:e|ement|ing)\b/i.test(projectName ?? '');
}

export function isGenericSubclassValue(value: string): boolean {
  const normalised = compactProfileLabel(value).toLowerCase();
  return normalised === '' || normalised === 'default' || normalised === 'other' || normalised === 'not specified';
}

export function shouldUseProjectNameAsset(subclass: string[]): boolean {
  return subclass.length === 0 || subclass.some(isGenericSubclassValue);
}

export function assetLabelFromProfile(input: ProjectAssetInput): string {
  const projectNameAsset = inferProjectNameAssetLabel(input.projectName);
  if (projectNameAsset && shouldUseProjectNameAsset(input.subclass)) return projectNameAsset;

  if (input.subclass.some((item) => item.toLowerCase().includes('apartment'))) {
    return 'apartment building';
  }

  const specificSubclass = input.subclass.find((item) => !isGenericSubclassValue(item));
  if (specificSubclass) return compactProfileLabel(specificSubclass);

  const classLabel = compactProfileLabel(input.buildingClass);
  return classLabel ? `${classLabel} building` : 'building';
}

export function intentAssetLabel(input: ProjectAssetInput): string {
  const asset = assetLabelFromProfile(input);
  return hasReplacementIntent(input.projectName) ? `${asset} replacement` : asset;
}

export function deliverableAssetLabel(input: ProjectAssetInput): string {
  const asset = assetLabelFromProfile(input);
  return hasReplacementIntent(input.projectName) ? `replacement ${asset}` : asset;
}
