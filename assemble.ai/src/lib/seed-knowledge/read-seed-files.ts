import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const SEED_DIR = resolve(process.cwd(), 'src/lib/constants/knowledge-seed');

export interface SeedFrontmatter {
    domainSlug: string;
    name: string;
    domainType: string;
    tags: string[];
    version: string;
    repoType: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
}

export interface SeedSummary {
    slug: string;
    name: string;
    domainSlug: string;
    domainType: string;
    tags: string[];
    version: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
    updatedAt: string;
}

export interface SeedDocument {
    slug: string;
    frontmatter: SeedFrontmatter;
    body: string;
    updatedAt: string;
}

function parseFrontmatter(raw: string): { frontmatter: SeedFrontmatter; body: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        throw new Error('Missing or malformed YAML frontmatter');
    }

    const lines = match[1].split('\n').map((l) => l.replace(/\r$/, ''));
    const body = match[2];
    const fm: Record<string, string | string[]> = {};

    for (const line of lines) {
        const kv = line.match(/^(\w+):\s*(.*)$/);
        if (!kv) continue;
        const [, key, value] = kv;
        const trimmed = value.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            fm[key] = trimmed
                .slice(1, -1)
                .split(',')
                .map((s) => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
        } else {
            fm[key] = trimmed.replace(/^["']|["']$/g, '');
        }
    }

    return { frontmatter: fm as unknown as SeedFrontmatter, body };
}

function slugFromFilename(filename: string): string {
    return filename.replace(/\.md$/i, '');
}

function isSafeSlug(slug: string): boolean {
    return /^[a-z0-9-]+$/i.test(slug);
}

export function listSeedSummaries(): SeedSummary[] {
    const files = readdirSync(SEED_DIR).filter((f) => f.toLowerCase().endsWith('.md'));
    const summaries: SeedSummary[] = [];

    for (const filename of files) {
        const slug = slugFromFilename(filename);
        const fullPath = join(SEED_DIR, filename);
        try {
            const raw = readFileSync(fullPath, 'utf8');
            const { frontmatter } = parseFrontmatter(raw);
            const stat = statSync(fullPath);
            summaries.push({
                slug,
                name: frontmatter.name ?? slug,
                domainSlug: frontmatter.domainSlug ?? '',
                domainType: frontmatter.domainType ?? '',
                tags: frontmatter.tags ?? [],
                version: frontmatter.version ?? '',
                applicableProjectTypes: frontmatter.applicableProjectTypes ?? [],
                applicableStates: frontmatter.applicableStates ?? [],
                updatedAt: stat.mtime.toISOString(),
            });
        } catch {
            // Skip malformed seed files rather than failing the entire list.
            continue;
        }
    }

    summaries.sort((a, b) => a.name.localeCompare(b.name));
    return summaries;
}

export function readSeedDocument(slug: string): SeedDocument | null {
    if (!isSafeSlug(slug)) return null;
    const fullPath = join(SEED_DIR, `${slug}.md`);
    let raw: string;
    let updatedAt: string;
    try {
        raw = readFileSync(fullPath, 'utf8');
        updatedAt = statSync(fullPath).mtime.toISOString();
    } catch {
        return null;
    }
    const { frontmatter, body } = parseFrontmatter(raw);
    return { slug, frontmatter, body, updatedAt };
}
