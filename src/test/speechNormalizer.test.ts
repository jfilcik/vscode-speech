import { normalizeSpeechBlock, stripMarkdownFormatting } from '../speechNormalizer';
import { SpeechBlock } from '../markdownParser';
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

    console.log('speechNormalizer tests:');

    // stripMarkdownFormatting tests

    test('strips bold markers **', () => {
        assert.strictEqual(stripMarkdownFormatting('This is **bold** text'), 'This is bold text');
    });

    test('strips bold markers __', () => {
        assert.strictEqual(stripMarkdownFormatting('This is __bold__ text'), 'This is bold text');
    });

    test('strips italic markers *', () => {
        assert.strictEqual(stripMarkdownFormatting('This is *italic* text'), 'This is italic text');
    });

    test('strips inline code backticks', () => {
        assert.strictEqual(stripMarkdownFormatting('Run `npm install`'), 'Run npm install');
    });

    test('converts links to text only', () => {
        assert.strictEqual(
            stripMarkdownFormatting('See [the docs](https://example.com)'),
            'See the docs'
        );
    });

    test('converts images to alt text', () => {
        assert.strictEqual(
            stripMarkdownFormatting('![Screenshot](./img.png)'),
            'Screenshot'
        );
    });

    test('collapses whitespace', () => {
        assert.strictEqual(
            stripMarkdownFormatting('multiple   spaces   here'),
            'multiple spaces here'
        );
    });

    test('handles combined formatting', () => {
        const result = stripMarkdownFormatting('**Bold** and *italic* with `code` and [link](url)');
        assert.strictEqual(result, 'Bold and italic with code and link');
    });

    test('handles empty string', () => {
        assert.strictEqual(stripMarkdownFormatting(''), '');
    });

    // normalizeSpeechBlock tests

    test('heading gets period appended', () => {
        const block: SpeechBlock = { type: 'heading', text: 'Installation', startLine: 0, endLine: 0, level: 2 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Installation.');
    });

    test('heading already ending with period is unchanged', () => {
        const block: SpeechBlock = { type: 'heading', text: 'End.', startLine: 0, endLine: 0, level: 1 };
        assert.strictEqual(normalizeSpeechBlock(block), 'End.');
    });

    test('paragraph strips formatting', () => {
        const block: SpeechBlock = { type: 'paragraph', text: 'This is **bold** text.', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'This is bold text.');
    });

    test('list_item strips inline formatting', () => {
        const block: SpeechBlock = { type: 'list_item', text: 'Install `npm`', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Install npm');
    });

    test('blockquote strips > markers', () => {
        const block: SpeechBlock = { type: 'blockquote', text: '> Important note', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Important note');
    });

    test('code_block returns summary', () => {
        const block: SpeechBlock = { type: 'code_block', text: 'console.log("hi");', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Code block.');
    });

    test('table returns summary', () => {
        const block: SpeechBlock = { type: 'table', text: 'A | B', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Table.');
    });

    test('thematic_break returns empty', () => {
        const block: SpeechBlock = { type: 'thematic_break', text: '', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), '');
    });

    test('frontmatter returns empty', () => {
        const block: SpeechBlock = { type: 'frontmatter', text: 'title: Test', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), '');
    });

    test('html_block returns empty', () => {
        const block: SpeechBlock = { type: 'html_block', text: '<div>hi</div>', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), '');
    });

    test('image block with alt text returns alt', () => {
        const block: SpeechBlock = { type: 'image', text: 'A screenshot', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'A screenshot');
    });

    test('image block with empty text returns Image.', () => {
        const block: SpeechBlock = { type: 'image', text: '', startLine: 0, endLine: 0 };
        assert.strictEqual(normalizeSpeechBlock(block), 'Image.');
    });

    console.log(`\n  ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

run();
