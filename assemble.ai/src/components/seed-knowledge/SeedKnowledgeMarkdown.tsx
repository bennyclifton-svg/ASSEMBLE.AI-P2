'use client';

import { Fragment, ReactNode } from 'react';

interface SeedKnowledgeMarkdownProps {
    source: string;
}

const INK = 'var(--sw-ink)';
const MUTED = 'var(--sw-muted)';
const RULE = 'var(--sw-rule)';

function renderInline(text: string): ReactNode[] {
    const tokens: ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith('**')) {
            tokens.push(
                <strong key={`b${key++}`} style={{ fontWeight: 700, color: INK }}>
                    {token.slice(2, -2)}
                </strong>
            );
        } else if (token.startsWith('`')) {
            tokens.push(
                <code
                    key={`c${key++}`}
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: '0.85em',
                        background: 'var(--sw-canvas)',
                        padding: '1px 4px',
                        border: `1px solid ${RULE}`,
                    }}
                >
                    {token.slice(1, -1)}
                </code>
            );
        } else {
            tokens.push(
                <em key={`i${key++}`} style={{ fontStyle: 'italic' }}>
                    {token.slice(1, -1)}
                </em>
            );
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
        tokens.push(text.slice(lastIndex));
    }
    return tokens;
}

interface Block {
    type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'hr' | 'code';
    content?: string;
    items?: string[];
    lang?: string;
}

function parseBlocks(source: string): Block[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.trim() === '') {
            i++;
            continue;
        }

        if (/^---\s*$/.test(line)) {
            blocks.push({ type: 'hr' });
            i++;
            continue;
        }

        const fenceOpen = line.match(/^```(\w*)\s*$/);
        if (fenceOpen) {
            const lang = fenceOpen[1] ?? '';
            const buf: string[] = [];
            i++;
            while (i < lines.length && !/^```\s*$/.test(lines[i])) {
                buf.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++;
            blocks.push({ type: 'code', content: buf.join('\n'), lang });
            continue;
        }

        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length as 1 | 2 | 3 | 4;
            const tag = (`h${level}`) as Block['type'];
            blocks.push({ type: tag, content: heading[2].trim() });
            i++;
            continue;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
                i++;
            }
            blocks.push({ type: 'ul', items });
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
                i++;
            }
            blocks.push({ type: 'ol', items });
            continue;
        }

        const paraLines: string[] = [line];
        i++;
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !/^#{1,4}\s+/.test(lines[i]) &&
            !/^\s*[-*]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^```/.test(lines[i]) &&
            !/^---\s*$/.test(lines[i])
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        blocks.push({ type: 'p', content: paraLines.join(' ').trim() });
    }

    return blocks;
}

export function SeedKnowledgeMarkdown({ source }: SeedKnowledgeMarkdownProps) {
    const blocks = parseBlocks(source);

    return (
        <article
            style={{
                color: INK,
                fontSize: 14,
                lineHeight: 1.65,
                fontFamily: 'var(--sw-font-serif, Georgia, serif)',
            }}
        >
            {blocks.map((block, idx) => {
                switch (block.type) {
                    case 'h1':
                        return (
                            <h1
                                key={idx}
                                style={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: INK,
                                    marginTop: idx === 0 ? 0 : 24,
                                    marginBottom: 12,
                                    paddingBottom: 8,
                                    borderBottom: `1px solid ${RULE}`,
                                    fontFamily: 'var(--sw-font-sans, system-ui)',
                                }}
                            >
                                {renderInline(block.content ?? '')}
                            </h1>
                        );
                    case 'h2':
                        return (
                            <h2
                                key={idx}
                                style={{
                                    fontSize: 17,
                                    fontWeight: 700,
                                    color: INK,
                                    marginTop: idx === 0 ? 0 : 22,
                                    marginBottom: 10,
                                    fontFamily: 'var(--sw-font-sans, system-ui)',
                                }}
                            >
                                {renderInline(block.content ?? '')}
                            </h2>
                        );
                    case 'h3':
                        return (
                            <h3
                                key={idx}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: INK,
                                    marginTop: 18,
                                    marginBottom: 8,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    fontFamily: 'var(--sw-font-sans, system-ui)',
                                }}
                            >
                                {renderInline(block.content ?? '')}
                            </h3>
                        );
                    case 'h4':
                        return (
                            <h4
                                key={idx}
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: INK,
                                    marginTop: 14,
                                    marginBottom: 6,
                                    fontFamily: 'var(--sw-font-sans, system-ui)',
                                }}
                            >
                                {renderInline(block.content ?? '')}
                            </h4>
                        );
                    case 'p':
                        return (
                            <p key={idx} style={{ margin: '0 0 12px 0' }}>
                                {renderInline(block.content ?? '')}
                            </p>
                        );
                    case 'ul':
                        return (
                            <ul
                                key={idx}
                                style={{
                                    margin: '0 0 12px 0',
                                    paddingLeft: 20,
                                    listStyle: 'disc',
                                }}
                            >
                                {(block.items ?? []).map((item, j) => (
                                    <li key={j} style={{ marginBottom: 4 }}>
                                        {renderInline(item)}
                                    </li>
                                ))}
                            </ul>
                        );
                    case 'ol':
                        return (
                            <ol
                                key={idx}
                                style={{
                                    margin: '0 0 12px 0',
                                    paddingLeft: 22,
                                    listStyle: 'decimal',
                                }}
                            >
                                {(block.items ?? []).map((item, j) => (
                                    <li key={j} style={{ marginBottom: 4 }}>
                                        {renderInline(item)}
                                    </li>
                                ))}
                            </ol>
                        );
                    case 'hr':
                        return (
                            <hr
                                key={idx}
                                style={{
                                    margin: '20px 0',
                                    border: 0,
                                    borderTop: `1px solid ${RULE}`,
                                }}
                            />
                        );
                    case 'code':
                        return (
                            <pre
                                key={idx}
                                style={{
                                    margin: '0 0 12px 0',
                                    padding: 12,
                                    background: 'var(--sw-canvas)',
                                    border: `1px solid ${RULE}`,
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    overflowX: 'auto',
                                    color: MUTED,
                                }}
                            >
                                <code>{block.content}</code>
                            </pre>
                        );
                    default:
                        return <Fragment key={idx} />;
                }
            })}
        </article>
    );
}
