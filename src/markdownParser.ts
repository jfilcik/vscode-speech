import MarkdownIt = require('markdown-it');

export interface SpeechBlock {
    type: 'heading' | 'paragraph' | 'list_item' | 'blockquote' | 'code_block' | 'table' | 'inline_code' | 'image' | 'html_block' | 'frontmatter' | 'thematic_break';
    text: string;
    startLine: number;
    endLine: number;
    level?: number;
}

export function parseMarkdown(text: string): SpeechBlock[] {
    const md = new MarkdownIt();
    const tokens = md.parse(text, {});
    const blocks: SpeechBlock[] = [];
    const lines = text.split('\n');

    // Detect frontmatter (--- delimited YAML at start of document)
    const frontmatter = detectFrontmatter(lines);
    if (frontmatter) {
        blocks.push(frontmatter);
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        switch (token.type) {
            case 'heading_open': {
                const level = parseInt(token.tag.slice(1), 10);
                const inlineToken = tokens[i + 1];
                const closeToken = tokens[i + 2];
                if (inlineToken && inlineToken.type === 'inline') {
                    const map = token.map || (closeToken && closeToken.map);
                    const startLine = map ? map[0] : 0;
                    const endLine = map ? map[1] - 1 : 0;
                    blocks.push({
                        type: 'heading',
                        text: inlineToken.content,
                        startLine,
                        endLine,
                        level,
                    });
                    i += 2; // skip inline + heading_close
                }
                break;
            }

            case 'paragraph_open': {
                const inlineToken = tokens[i + 1];
                if (inlineToken && inlineToken.type === 'inline') {
                    const map = token.map;
                    const startLine = map ? map[0] : 0;
                    const endLine = map ? map[1] - 1 : 0;
                    blocks.push({
                        type: 'paragraph',
                        text: inlineToken.content,
                        startLine,
                        endLine,
                    });
                    i += 2; // skip inline + paragraph_close
                }
                break;
            }

            case 'bullet_list_open':
            case 'ordered_list_open': {
                const closeType = token.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close';
                i = collectListItems(tokens, i + 1, closeType, blocks);
                break;
            }

            case 'blockquote_open': {
                const map = token.map;
                const startLine = map ? map[0] : 0;
                const endLine = map ? map[1] - 1 : 0;
                const contentParts: string[] = [];
                i++;
                while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
                    if (tokens[i].type === 'inline') {
                        contentParts.push(tokens[i].content);
                    }
                    i++;
                }
                const blockText = contentParts.join('\n');
                if (blockText.trim()) {
                    blocks.push({
                        type: 'blockquote',
                        text: blockText,
                        startLine,
                        endLine,
                    });
                }
                break;
            }

            case 'fence':
            case 'code_block': {
                const map = token.map;
                const startLine = map ? map[0] : 0;
                const endLine = map ? map[1] - 1 : 0;
                blocks.push({
                    type: 'code_block',
                    text: token.content,
                    startLine,
                    endLine,
                });
                break;
            }

            case 'table_open': {
                const map = token.map;
                const startLine = map ? map[0] : 0;
                let endLine = map ? map[1] - 1 : 0;
                const contentParts: string[] = [];
                i++;
                while (i < tokens.length && tokens[i].type !== 'table_close') {
                    if (tokens[i].type === 'inline') {
                        contentParts.push(tokens[i].content);
                    }
                    if (tokens[i].map) {
                        endLine = Math.max(endLine, tokens[i].map![1] - 1);
                    }
                    i++;
                }
                blocks.push({
                    type: 'table',
                    text: contentParts.join(' | '),
                    startLine,
                    endLine,
                });
                break;
            }

            case 'html_block': {
                const map = token.map;
                const startLine = map ? map[0] : 0;
                const endLine = map ? map[1] - 1 : 0;
                blocks.push({
                    type: 'html_block',
                    text: token.content,
                    startLine,
                    endLine,
                });
                break;
            }

            case 'hr': {
                const map = token.map;
                const startLine = map ? map[0] : 0;
                const endLine = map ? map[1] - 1 : 0;
                blocks.push({
                    type: 'thematic_break',
                    text: '',
                    startLine,
                    endLine,
                });
                break;
            }
        }
    }

    // Filter out empty blocks (except thematic_break which is intentionally empty)
    return blocks.filter(b => b.type === 'thematic_break' || b.text.trim().length > 0);
}

function collectListItems(
    tokens: MarkdownIt.Token[],
    startIndex: number,
    closeType: string,
    blocks: SpeechBlock[]
): number {
    let i = startIndex;
    while (i < tokens.length && tokens[i].type !== closeType) {
        const token = tokens[i];
        if (token.type === 'list_item_open') {
            const map = token.map;
            const startLine = map ? map[0] : 0;
            const endLine = map ? map[1] - 1 : 0;
            const contentParts: string[] = [];
            i++;
            while (i < tokens.length && tokens[i].type !== 'list_item_close') {
                if (tokens[i].type === 'inline') {
                    contentParts.push(tokens[i].content);
                } else if (tokens[i].type === 'bullet_list_open') {
                    // Nested list: recurse
                    i = collectListItems(tokens, i + 1, 'bullet_list_close', blocks);
                } else if (tokens[i].type === 'ordered_list_open') {
                    i = collectListItems(tokens, i + 1, 'ordered_list_close', blocks);
                }
                i++;
            }
            const itemText = contentParts.join('\n');
            if (itemText.trim()) {
                blocks.push({
                    type: 'list_item',
                    text: itemText,
                    startLine,
                    endLine,
                });
            }
        }
        i++;
    }
    return i;
}

function detectFrontmatter(lines: string[]): SpeechBlock | null {
    if (lines.length < 3 || lines[0].trim() !== '---') {
        return null;
    }
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            return {
                type: 'frontmatter',
                text: lines.slice(1, i).join('\n'),
                startLine: 0,
                endLine: i,
            };
        }
    }
    return null;
}
