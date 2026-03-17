import { SpeechBlock } from './markdownParser';

export interface PlaybackFilter {
    readHeadings: boolean;
    readParagraphs: boolean;
    readListItems: boolean;
    readCodeBlocks: boolean;
    readInlineCode: boolean;
    readTables: boolean;
    readBlockquotes: boolean;
    readImages: boolean;
    readHtmlBlocks: boolean;
    readFrontmatter: boolean;
}

export type ListeningMode = 'prose-only' | 'prose-examples' | 'full' | 'custom';

export const PROSE_ONLY_FILTER: PlaybackFilter = {
    readHeadings: true,
    readParagraphs: true,
    readListItems: true,
    readCodeBlocks: false,
    readInlineCode: false,
    readTables: false,
    readBlockquotes: true,
    readImages: false,
    readHtmlBlocks: false,
    readFrontmatter: false,
};

export const PROSE_EXAMPLES_FILTER: PlaybackFilter = {
    readHeadings: true,
    readParagraphs: true,
    readListItems: true,
    readCodeBlocks: true,
    readInlineCode: false,
    readTables: false,
    readBlockquotes: true,
    readImages: false,
    readHtmlBlocks: false,
    readFrontmatter: false,
};

export const FULL_FILTER: PlaybackFilter = {
    readHeadings: true,
    readParagraphs: true,
    readListItems: true,
    readCodeBlocks: true,
    readInlineCode: true,
    readTables: true,
    readBlockquotes: true,
    readImages: true,
    readHtmlBlocks: false,
    readFrontmatter: false,
};

export const CUSTOM_DEFAULT_FILTER: PlaybackFilter = {
    readHeadings: true,
    readParagraphs: true,
    readListItems: true,
    readCodeBlocks: true,
    readInlineCode: true,
    readTables: true,
    readBlockquotes: true,
    readImages: true,
    readHtmlBlocks: true,
    readFrontmatter: true,
};

export function getFilterForMode(mode: ListeningMode): PlaybackFilter {
    switch (mode) {
        case 'prose-only':
            return { ...PROSE_ONLY_FILTER };
        case 'prose-examples':
            return { ...PROSE_EXAMPLES_FILTER };
        case 'full':
            return { ...FULL_FILTER };
        case 'custom':
            return { ...CUSTOM_DEFAULT_FILTER };
    }
}

const BLOCK_TYPE_TO_FILTER_KEY: Record<SpeechBlock['type'], keyof PlaybackFilter | null> = {
    heading: 'readHeadings',
    paragraph: 'readParagraphs',
    list_item: 'readListItems',
    code_block: 'readCodeBlocks',
    inline_code: 'readInlineCode',
    table: 'readTables',
    blockquote: 'readBlockquotes',
    image: 'readImages',
    html_block: 'readHtmlBlocks',
    frontmatter: 'readFrontmatter',
    thematic_break: null, // structural element, always skipped
};

export function shouldReadBlock(block: SpeechBlock, filter: PlaybackFilter): boolean {
    const key = BLOCK_TYPE_TO_FILTER_KEY[block.type];
    if (key === null) {
        return false;
    }
    return filter[key];
}
