import { SpeechBlock } from './markdownParser';

export function stripMarkdownFormatting(text: string): string {
    let result = text;

    // Convert images ![alt](url) to alt text
    result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

    // Convert links [text](url) to just text
    result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

    // Remove bold markers ** and __
    result = result.replace(/\*\*(.+?)\*\*/g, '$1');
    result = result.replace(/__(.+?)__/g, '$1');

    // Remove italic markers * and _
    result = result.replace(/\*(.+?)\*/g, '$1');
    result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1');

    // Remove inline code backticks
    result = result.replace(/`([^`]*)`/g, '$1');

    // Collapse multiple whitespace to single space
    result = result.replace(/\s+/g, ' ');

    return result.trim();
}

export function normalizeSpeechBlock(block: SpeechBlock): string {
    switch (block.type) {
        case 'heading': {
            const text = stripMarkdownFormatting(block.text).trim();
            if (!text) { return ''; }
            return text.endsWith('.') ? text : text + '.';
        }

        case 'paragraph':
            return stripMarkdownFormatting(block.text);

        case 'list_item': {
            let text = block.text;
            // Strip leading list markers (-, *, +, 1., 2., etc.)
            text = text.replace(/^\s*[-*+]\s+/, '');
            text = text.replace(/^\s*\d+\.\s+/, '');
            return stripMarkdownFormatting(text);
        }

        case 'blockquote': {
            let text = block.text;
            // Strip > markers
            text = text.replace(/^\s*>\s?/gm, '');
            return stripMarkdownFormatting(text);
        }

        case 'code_block':
            return 'Code block.';

        case 'table':
            return 'Table.';

        case 'image': {
            const alt = stripMarkdownFormatting(block.text).trim();
            return alt || 'Image.';
        }

        case 'inline_code':
            return stripMarkdownFormatting(block.text);

        case 'thematic_break':
            return '';

        case 'frontmatter':
            return '';

        case 'html_block':
            return '';

        default:
            return stripMarkdownFormatting(block.text);
    }
}
