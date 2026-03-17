import { parseMarkdown, SpeechBlock } from '../markdownParser';
import * as assert from 'assert';

function run() {
    let passed = 0;
    let failed = 0;

    function test(name: string, fn: () => void) {
        try {
            fn();
            passed++;
            console.log(`  ✓ ${name}`);
        } catch (e: any) {
            failed++;
            console.log(`  ✗ ${name}`);
            console.log(`    ${e.message}`);
        }
    }

    console.log('markdownParser tests:');

    test('parses headings with correct level', () => {
        const blocks = parseMarkdown('# Title\n## Subtitle\n### Third');
        const headings = blocks.filter(b => b.type === 'heading');
        assert.strictEqual(headings.length, 3);
        assert.strictEqual(headings[0].text, 'Title');
        assert.strictEqual(headings[0].level, 1);
        assert.strictEqual(headings[1].text, 'Subtitle');
        assert.strictEqual(headings[1].level, 2);
        assert.strictEqual(headings[2].text, 'Third');
        assert.strictEqual(headings[2].level, 3);
    });

    test('parses paragraphs', () => {
        const blocks = parseMarkdown('Hello world.\n\nSecond paragraph.');
        const paragraphs = blocks.filter(b => b.type === 'paragraph');
        assert.strictEqual(paragraphs.length, 2);
        assert.strictEqual(paragraphs[0].text, 'Hello world.');
        assert.strictEqual(paragraphs[1].text, 'Second paragraph.');
    });

    test('parses code fences as code_block', () => {
        const blocks = parseMarkdown('```js\nconsole.log("hi");\n```');
        const codeBlocks = blocks.filter(b => b.type === 'code_block');
        assert.strictEqual(codeBlocks.length, 1);
        assert.ok(codeBlocks[0].text.includes('console.log'));
    });

    test('parses bullet list items', () => {
        const blocks = parseMarkdown('- item one\n- item two\n- item three');
        const items = blocks.filter(b => b.type === 'list_item');
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].text, 'item one');
        assert.strictEqual(items[1].text, 'item two');
    });

    test('parses ordered list items', () => {
        const blocks = parseMarkdown('1. first\n2. second');
        const items = blocks.filter(b => b.type === 'list_item');
        assert.strictEqual(items.length, 2);
        assert.strictEqual(items[0].text, 'first');
        assert.strictEqual(items[1].text, 'second');
    });

    test('parses blockquotes', () => {
        const blocks = parseMarkdown('> This is a quote');
        const quotes = blocks.filter(b => b.type === 'blockquote');
        assert.strictEqual(quotes.length, 1);
        assert.ok(quotes[0].text.includes('This is a quote'));
    });

    test('parses tables', () => {
        const md = '| A | B |\n|---|---|\n| 1 | 2 |';
        const blocks = parseMarkdown(md);
        const tables = blocks.filter(b => b.type === 'table');
        assert.strictEqual(tables.length, 1);
    });

    test('parses thematic break (hr)', () => {
        const blocks = parseMarkdown('---');
        const hrs = blocks.filter(b => b.type === 'thematic_break');
        assert.strictEqual(hrs.length, 1);
    });

    test('preserves source line numbers for headings', () => {
        const blocks = parseMarkdown('# Title\n\nSome text.\n\n## Section');
        const section = blocks.find(b => b.type === 'heading' && b.text === 'Section');
        assert.ok(section);
        assert.strictEqual(section!.startLine, 4);
    });

    test('preserves source line numbers for paragraphs', () => {
        const blocks = parseMarkdown('# Title\n\nFirst paragraph.\n\nSecond paragraph.');
        const paras = blocks.filter(b => b.type === 'paragraph');
        assert.strictEqual(paras[0].startLine, 2);
        assert.strictEqual(paras[1].startLine, 4);
    });

    test('detects frontmatter', () => {
        const md = '---\ntitle: Hello\n---\n\n# Title';
        const blocks = parseMarkdown(md);
        const fm = blocks.filter(b => b.type === 'frontmatter');
        assert.strictEqual(fm.length, 1);
        assert.ok(fm[0].text.includes('title: Hello'));
    });

    test('handles nested lists', () => {
        const md = '- parent\n  - child1\n  - child2\n- sibling';
        const blocks = parseMarkdown(md);
        const items = blocks.filter(b => b.type === 'list_item');
        assert.ok(items.length >= 3);
    });

    test('handles empty document', () => {
        const blocks = parseMarkdown('');
        assert.strictEqual(blocks.length, 0);
    });

    test('handles document with only whitespace', () => {
        const blocks = parseMarkdown('   \n\n   ');
        assert.strictEqual(blocks.length, 0);
    });

    test('handles mixed content document', () => {
        const md = `# Installation

Run the following command:

\`\`\`bash
npm install
\`\`\`

## Usage

- Step 1
- Step 2

> Note: this is important.

| Col A | Col B |
|-------|-------|
| val1  | val2  |
`;
        const blocks = parseMarkdown(md);
        const types = blocks.map(b => b.type);
        assert.ok(types.includes('heading'));
        assert.ok(types.includes('paragraph'));
        assert.ok(types.includes('code_block'));
        assert.ok(types.includes('list_item'));
        assert.ok(types.includes('blockquote'));
        assert.ok(types.includes('table'));
    });

    console.log(`\n  ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

run();
