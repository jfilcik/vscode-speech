// Simple test runner that runs all test files
import { execSync } from 'child_process';
import * as path from 'path';

const testFiles = [
    'markdownParser.test.js',
    'speechNormalizer.test.js',
    'filters.test.js',
];

let allPassed = true;

for (const file of testFiles) {
    const testPath = path.join(__dirname, file);
    try {
        execSync(`node "${testPath}"`, { stdio: 'inherit' });
        console.log('');
    } catch {
        allPassed = false;
    }
}

if (!allPassed) {
    process.exit(1);
}

console.log('All test suites passed.');
