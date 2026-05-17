import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

type Finding = {
    file: string;
    line: number;
    rule: string;
    text: string;
};

const ROOT_CONFIG_FILES = new Set([
    '.env.development',
    '.env.example',
    'CLAUDE.md',
    'CODEBASE.md',
    'Dockerfile',
    'README.md',
    'docker-compose.yml',
    'next.config.ts',
    'package.json',
]);

const SCANNED_PREFIXES = ['.github/', 'archive/', 'docs/'];
const SCANNED_EXTENSIONS = new Set([
    '.cjs',
    '.js',
    '.json',
    '.md',
    '.mdx',
    '.mjs',
    '.ts',
    '.txt',
    '.tsx',
    '.yaml',
    '.yml',
]);

const IGNORED_PREFIXES = [
    '.git/',
    '.next/',
    '.npm-cache/',
    '.skill-downloads/',
    '.swc/',
    '.tmp/',
    'coverage/',
    'dist/',
    'node_modules/',
    'uploads/',
];

const IGNORED_FILES = new Set(['package-lock.json', 'tsconfig.tsbuildinfo']);

const TOKEN_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
    { rule: 'OpenAI/Anthropic-style API key', pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}\b/g },
    { rule: 'Polar access token', pattern: /\bpat_[A-Za-z0-9]{20,}\b/g },
    { rule: 'Webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{20,}\b/g },
    { rule: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
    { rule: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    { rule: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g },
];

const POSTGRES_URL_PATTERN =
    /\bpostgres(?:ql)?:\/\/([^:\s/@'"`]+):([^@\s'"`]+)@([^/\s'"`)]+)(\/[^\s'"`)]*)?/gi;

const SENSITIVE_ENV_PATTERN =
    /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|DATABASE_URL|PASSWORD|POSTGRES_URL|PRIVATE_KEY|SECRET|SERVICE_ROLE_KEY|TOKEN|WEBHOOK_SECRET)[A-Z0-9_]*)\s*=\s*([^#\r\n]*)/i;

const OPERATIONAL_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
    { rule: 'Root SSH target', pattern: /\bssh\s+root@\d{1,3}(?:\.\d{1,3}){3}\b/i },
    { rule: 'Dashboard or service login account', pattern: /^\s*(?:Login|Username)\s*:\s*[^<\s@]+@[^>\s@]+\.[^\s@]+/i },
    { rule: 'Public IP operational endpoint', pattern: /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/i },
    { rule: 'Server IP inventory detail', pattern: /\bServer IP\b.*\d{1,3}(?:\.\d{1,3}){3}/i },
];

function normalizePath(file: string): string {
    return file.replace(/\\/g, '/');
}

function listTrackedFiles(): string[] {
    try {
        return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
            .split('\0')
            .filter(Boolean)
            .map(normalizePath);
    } catch {
        return walkFiles(process.cwd()).map((file) => normalizePath(path.relative(process.cwd(), file)));
    }
}

function walkFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relative = normalizePath(path.relative(process.cwd(), fullPath));

        if (IGNORED_PREFIXES.some((prefix) => relative.startsWith(prefix))) continue;

        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

function isScannable(file: string): boolean {
    const normalized = normalizePath(file);
    if (IGNORED_FILES.has(normalized)) return false;
    if (IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
    if (ROOT_CONFIG_FILES.has(normalized)) return true;
    if (!SCANNED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
    return SCANNED_EXTENSIONS.has(path.extname(normalized));
}

function stripValue(raw: string): string {
    let value = raw.trim().replace(/[;,]$/, '');
    const quote = value[0];

    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
        value = value.slice(1, -1);
    }

    return value.trim();
}

function isPlaceholder(value: string): boolean {
    const trimmed = stripValue(value);
    const lower = trimmed.toLowerCase();

    if (!trimmed) return true;
    if (trimmed === '""' || trimmed === "''") return true;
    if (/[<>{}\[\]]/.test(trimmed)) return true;
    if (lower.includes('...')) return true;
    if (lower.includes('xxx')) return true;
    if (lower.includes('your-') || lower.includes('your_') || lower.includes('your ')) return true;
    if (lower.includes('placeholder')) return true;
    if (lower.includes('example')) return true;
    if (lower.includes('generated-secret')) return true;
    if (lower.includes('provider-key')) return true;
    if (lower.includes('change-before-production')) return true;
    if (lower.includes('local-development')) return true;
    if (lower === 'changeme' || lower === 'change-me') return true;

    return false;
}

function isLocalHost(host: string): boolean {
    const normalizedHost = host.toLowerCase().replace(/^\[/, '').replace(/\](:\d+)?$/, '');
    const hostname = normalizedHost.split(':')[0];

    return (
        normalizedHost === '::1' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === 'postgres' ||
        hostname === 'host.docker.internal'
    );
}

function isSafePostgresUrl(user: string, password: string, host: string): boolean {
    return isLocalHost(host) || isPlaceholder(user) || isPlaceholder(password) || isPlaceholder(host);
}

function isSafeEnvAssignment(key: string, value: string): boolean {
    const stripped = stripValue(value);
    const lower = stripped.toLowerCase();

    if (isPlaceholder(stripped)) return true;
    if (key === 'POSTGRES_PASSWORD' && lower === 'postgres') return true;
    if (key === 'DATABASE_URL' || key.endsWith('POSTGRES_URL')) {
        return lower.includes('@localhost') || lower.includes('@127.0.0.1') || lower.includes('@postgres:');
    }
    if (lower.startsWith('http://localhost') || lower.startsWith('https://localhost')) return true;
    if (lower.startsWith('redis://localhost') || lower.startsWith('redis://127.0.0.1')) return true;

    return false;
}

function addFinding(findings: Finding[], file: string, line: number, rule: string, text: string): void {
    findings.push({ file, line, rule, text: redact(text.trim()) });
}

function redact(text: string): string {
    return text
        .replace(/(postgres(?:ql)?:\/\/[^:\s/@'"`]+:)([^@\s'"`]+)(@)/gi, '$1<redacted>$3')
        .replace(/\b(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{8})[A-Za-z0-9_-]{8,}\b/g, '$1<redacted>')
        .replace(/\b(pat_[A-Za-z0-9]{8})[A-Za-z0-9]{8,}\b/g, '$1<redacted>')
        .replace(/\b(whsec_[A-Za-z0-9]{8})[A-Za-z0-9]{8,}\b/g, '$1<redacted>')
        .replace(/\b(AKIA[0-9A-Z]{4})[0-9A-Z]{12}\b/g, '$1<redacted>')
        .replace(/\b(AIza[0-9A-Za-z_-]{6})[0-9A-Za-z_-]{20,}\b/g, '$1<redacted>')
        .replace(/\b(gh[pousr]_[A-Za-z0-9_]{8})[A-Za-z0-9_]{20,}\b/g, '$1<redacted>');
}

function scanLine(file: string, lineNumber: number, line: string, findings: Finding[]): void {
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) {
        addFinding(findings, file, lineNumber, 'Private key block', line);
    }

    for (const { rule, pattern } of TOKEN_PATTERNS) {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
            if (!isPlaceholder(match[0])) addFinding(findings, file, lineNumber, rule, line);
        }
    }

    POSTGRES_URL_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(POSTGRES_URL_PATTERN)) {
        const [, user, password, host] = match;
        if (!isSafePostgresUrl(user, password, host)) {
            addFinding(findings, file, lineNumber, 'Remote PostgreSQL URL with inline credentials', line);
        }
    }

    const envMatch = line.match(SENSITIVE_ENV_PATTERN);
    if (envMatch) {
        const [, key, rawValue] = envMatch;
        if (!isSafeEnvAssignment(key.toUpperCase(), rawValue)) {
            addFinding(findings, file, lineNumber, `Sensitive env assignment (${key})`, line);
        }
    }

    if (/--build-arg\s+DATABASE_URL\b/.test(line)) {
        addFinding(findings, file, lineNumber, 'DATABASE_URL passed as Docker build arg', line);
    }

    for (const { rule, pattern } of OPERATIONAL_PATTERNS) {
        if (pattern.test(line)) addFinding(findings, file, lineNumber, rule, line);
    }
}

function main(): void {
    const files = listTrackedFiles().filter(isScannable);
    const findings: Finding[] = [];

    for (const file of files) {
        const absolutePath = path.join(process.cwd(), file);
        if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) continue;

        const content = readFileSync(absolutePath, 'utf8');
        const lines = content.split(/\r?\n/);

        lines.forEach((line, index) => scanLine(file, index + 1, line, findings));
    }

    if (findings.length > 0) {
        console.error(`Secret hygiene check failed with ${findings.length} finding(s):`);
        for (const finding of findings) {
            console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
        }
        process.exit(1);
    }

    console.log(`Secret hygiene check passed (${files.length} tracked docs/config files scanned).`);
}

main();
