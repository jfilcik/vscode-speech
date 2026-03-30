import { getFilterForMode, shouldReadBlock, PROSE_ONLY_FILTER, PROSE_EXAMPLES_FILTER, FULL_FILTER } from '../filters';
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

    console.log('filters tests:');

    const heading: SpeechBlock = { type: 'heading', text: 'Title', startLine: 0, endLine: 0, level: 1 };
    const paragraph: SpeechBlock = { type: 'paragraph', text: 'Text', startLine: 0, endLine: 0 };
    const codeBlock: SpeechBlock = { type: 'code_block', text: 'code', startLine: 0, endLine: 0 };
    const table: SpeechBlock = { type: 'table', text: 'table', startLine: 0, endLine: 0 };
    const listItem: SpeechBlock = { type: 'list_item', text: 'item', startLine: 0, endLine: 0 };
    const blockquote: SpeechBlock = { type: 'blockquote', text: 'quote', startLine: 0, endLine: 0 };
    const thematicBreak: SpeechBlock = { type: 'thematic_break', text: '', startLine: 0, endLine: 0 };
    const frontmatter: SpeechBlock = { type: 'frontmatter', text: 'fm', startLine: 0, endLine: 0 };
    const htmlBlock: SpeechBlock = { type: 'html_block', text: '<div>', startLine: 0, endLine: 0 };

    // Prose-only mode
    test('prose-only reads headings', () => {
        assert.strictEqual(shouldReadBlock(heading, PROSE_ONLY_FILTER), true);
    });

    test('prose-only reads paragraphs', () => {
        assert.strictEqual(shouldReadBlock(paragraph, PROSE_ONLY_FILTER), true);
    });

    test('prose-only reads list items', () => {
        assert.strictEqual(shouldReadBlock(listItem, PROSE_ONLY_FILTER), true);
    });

    test('prose-only reads blockquotes', () => {
        assert.strictEqual(shouldReadBlock(blockquote, PROSE_ONLY_FILTER), true);
    });

    test('prose-only skips code blocks', () => {
        assert.strictEqual(shouldReadBlock(codeBlock, PROSE_ONLY_FILTER), false);
    });

    test('prose-only skips tables', () => {
        assert.strictEqual(shouldReadBlock(table, PROSE_ONLY_FILTER), false);
    });

    test('prose-only skips frontmatter', () => {
        assert.strictEqual(shouldReadBlock(frontmatter, PROSE_ONLY_FILTER), false);
    });

    // Prose+examples mode
    test('prose-examples reads code blocks', () => {
        assert.strictEqual(shouldReadBlock(codeBlock, PROSE_EXAMPLES_FILTER), true);
    });

    test('prose-examples skips tables', () => {
        assert.strictEqual(shouldReadBlock(table, PROSE_EXAMPLES_FILTER), false);
    });

    // Full mode
    test('full reads code blocks', () => {
        assert.strictEqual(shouldReadBlock(codeBlock, FULL_FILTER), true);
    });

    test('full reads tables', () => {
        assert.strictEqual(shouldReadBlock(table, FULL_FILTER), true);
    });

    test('full skips frontmatter', () => {
        assert.strictEqual(shouldReadBlock(frontmatter, FULL_FILTER), false);
    });

    test('full skips html blocks', () => {
        assert.strictEqual(shouldReadBlock(htmlBlock, FULL_FILTER), false);
    });

    // Thematic break always skipped
    test('thematic break always skipped', () => {
        assert.strictEqual(shouldReadBlock(thematicBreak, FULL_FILTER), false);
        assert.strictEqual(shouldReadBlock(thematicBreak, PROSE_ONLY_FILTER), false);
    });

    // getFilterForMode returns independent copies
    test('getFilterForMode returns copies that can be mutated independently', () => {
        const filter1 = getFilterForMode('prose-only');
        const filter2 = getFilterForMode('prose-only');
        filter1.readCodeBlocks = true;
        assert.strictEqual(filter2.readCodeBlocks, false);
    });

    console.log(`\n  ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

run();
