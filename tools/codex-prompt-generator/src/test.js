/**
 * Basic test suite for the Codex Prompt Generator.
 * Uses Node.js built-in assert module (no external dependencies).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  enumerateFiles,
  readFileContent,
  detectTechStack,
  analyzeArchitecture,
  extractFacts,
  assessCompleteness,
  generateReport,
  formatReport
} = require('./repository-analyzer');

const {
  parseTaskSpec,
  mapToRepoState,
  formatRequirementsMatrix,
  classifyPriority,
  extractConstraints,
  deriveAcceptanceCriteria
} = require('./task-parser');

const {
  analyzeGaps,
  formatGapAnalysis
} = require('./gap-analyzer');

const {
  generateAugmentation
} = require('./tech-stack-augmenter');

const {
  assembleMasterPrompt,
  determineBuildCommand,
  determineTestCommand
} = require('./prompt-generator');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  PASS: ${name}\n`);
  } catch (err) {
    failed++;
    process.stderr.write(`  FAIL: ${name}\n`);
    process.stderr.write(`    ${err.message}\n`);
  }
}

// Create a temporary test fixture
function createTestFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-test-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    description: 'A test project',
    scripts: { build: 'tsc', test: 'jest' },
    dependencies: { express: '^4.18.0' },
    devDependencies: { jest: '^29.0.0', typescript: '^5.0.0' }
  }, null, 2));

  fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', strict: true }
  }, null, 2));

  fs.writeFileSync(path.join(srcDir, 'index.ts'), `
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

export default app;
`);

  fs.writeFileSync(path.join(srcDir, 'utils.ts'), `
// TODO: implement validation
export function validate(input: string): boolean {
  return true;
}
`);

  return tmpDir;
}

function cleanupFixture(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Repository Analyzer Tests ───

process.stdout.write('\nRepository Analyzer Tests\n');
process.stdout.write('─'.repeat(40) + '\n');

const fixture = createTestFixture();

test('enumerateFiles returns all files', () => {
  const files = enumerateFiles(fixture);
  assert.ok(files.length >= 4, `Expected >= 4 files, got ${files.length}`);
  const names = files.map(f => path.basename(f.relativePath));
  assert.ok(names.includes('package.json'));
  assert.ok(names.includes('tsconfig.json'));
  assert.ok(names.includes('index.ts'));
});

test('readFileContent reads text files', () => {
  const content = readFileContent(path.join(fixture, 'package.json'), '.json');
  assert.ok(content !== null);
  assert.ok(content.includes('test-project'));
});

test('readFileContent returns null for binary extensions', () => {
  const content = readFileContent('/nonexistent.png', '.png');
  assert.strictEqual(content, null);
});

test('detectTechStack identifies languages', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const stack = detectTechStack(files, fileContents);
  assert.ok(stack.languages.includes('TypeScript'), 'Should detect TypeScript');
});

test('detectTechStack identifies frameworks', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const stack = detectTechStack(files, fileContents);
  assert.ok(stack.frameworks.includes('Express'), 'Should detect Express');
});

test('detectTechStack identifies testing frameworks', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const stack = detectTechStack(files, fileContents);
  assert.ok(stack.testingFramework.includes('Jest'), 'Should detect Jest');
});

test('analyzeArchitecture detects pattern', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const arch = analyzeArchitecture(files, fileContents);
  assert.ok(arch.pattern !== 'Unknown', `Pattern should not be Unknown, got: ${arch.pattern}`);
});

test('extractFacts extracts project name', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const facts = extractFacts(files, fileContents);
  const nameFact = facts.find(f => f.key === 'Project.Name');
  assert.ok(nameFact, 'Should extract Project.Name');
  assert.strictEqual(nameFact.value, 'test-project');
});

test('assessCompleteness detects incomplete files', () => {
  const files = enumerateFiles(fixture);
  const fileContents = new Map();
  for (const f of files) {
    const c = readFileContent(f.path, f.ext);
    if (c) fileContents.set(f.relativePath, c);
  }
  const completeness = assessCompleteness(files, fileContents);
  assert.ok(completeness.incomplete.length > 0, 'Should detect TODO in utils.ts');
});

test('generateReport produces complete report', () => {
  const report = generateReport(fixture);
  assert.ok(report.fileTree.length > 0);
  assert.ok(report.files.length > 0);
  assert.ok(report.techStack.languages.length > 0);
  assert.ok(report.facts.length > 0);
});

test('formatReport produces readable text', () => {
  const report = generateReport(fixture);
  const text = formatReport(report);
  assert.ok(text.includes('REPOSITORY INTELLIGENCE REPORT'));
  assert.ok(text.includes('TECHNOLOGY STACK'));
  assert.ok(text.includes('TypeScript'));
});

// ─── Task Parser Tests ───

process.stdout.write('\nTask Parser Tests\n');
process.stdout.write('─'.repeat(40) + '\n');

const sampleTask = `# Add User Authentication

## Requirements
1. Create a login endpoint at POST /api/auth/login
2. Implement JWT token generation
3. Add password hashing with bcrypt
- Create user registration endpoint
- MUST use HTTPS for all auth endpoints
- REQUIRED: Rate limiting on login attempts

## Non-Functional
Performance must be under 200ms for authentication requests.
Security: All passwords must be hashed.

## Deliverables
Create file at src/auth/controller.ts
`;

test('parseTaskSpec extracts title', () => {
  const parsed = parseTaskSpec(sampleTask);
  assert.strictEqual(parsed.title, 'Add User Authentication');
});

test('parseTaskSpec extracts functional requirements', () => {
  const parsed = parseTaskSpec(sampleTask);
  assert.ok(parsed.functionalRequirements.length >= 3, `Expected >= 3 reqs, got ${parsed.functionalRequirements.length}`);
});

test('parseTaskSpec extracts constraints', () => {
  const parsed = parseTaskSpec(sampleTask);
  assert.ok(parsed.constraints.length >= 2, `Expected >= 2 constraints, got ${parsed.constraints.length}`);
});

test('classifyPriority detects BLOCKING', () => {
  assert.strictEqual(classifyPriority('MUST implement authentication'), 'BLOCKING');
  assert.strictEqual(classifyPriority('REQUIRED: login endpoint'), 'BLOCKING');
});

test('classifyPriority detects OPTIONAL', () => {
  assert.strictEqual(classifyPriority('OPTIONAL: dark mode support'), 'OPTIONAL');
});

test('deriveAcceptanceCriteria generates criteria', () => {
  const criteria = deriveAcceptanceCriteria('Create a login endpoint');
  assert.ok(criteria.includes('Feature exists'));
});

test('parseTaskSpec extracts deliverables', () => {
  const parsed = parseTaskSpec(sampleTask);
  assert.ok(parsed.deliverables.length >= 1, `Expected >= 1 deliverable, got ${parsed.deliverables.length}`);
});

test('formatRequirementsMatrix produces structured output', () => {
  const parsed = parseTaskSpec(sampleTask);
  const text = formatRequirementsMatrix(parsed);
  assert.ok(text.includes('TASK REQUIREMENTS MATRIX'));
  assert.ok(text.includes('FUNCTIONAL REQUIREMENTS'));
  assert.ok(text.includes('REQ-F-'));
});

// ─── Gap Analyzer Tests ───

process.stdout.write('\nGap Analyzer Tests\n');
process.stdout.write('─'.repeat(40) + '\n');

test('analyzeGaps produces gap list', () => {
  const report = generateReport(fixture);
  const parsed = parseTaskSpec(sampleTask);
  parsed.functionalRequirements = mapToRepoState(parsed.functionalRequirements, report);
  const analysis = analyzeGaps(parsed, report);
  assert.ok(analysis.gaps.length > 0, 'Should have gaps');
  assert.ok(analysis.summary.total > 0);
});

test('analyzeGaps orders by dependency', () => {
  const report = generateReport(fixture);
  const parsed = parseTaskSpec(sampleTask);
  parsed.functionalRequirements = mapToRepoState(parsed.functionalRequirements, report);
  const analysis = analyzeGaps(parsed, report);

  // Blocking gaps should come before non-blocking
  const blockingIdx = analysis.gaps.findIndex(g => g.priority === 'BLOCKING');
  const nonBlockingIdx = analysis.gaps.findIndex(g => g.priority !== 'BLOCKING');
  if (blockingIdx !== -1 && nonBlockingIdx !== -1) {
    assert.ok(blockingIdx <= nonBlockingIdx, 'Blocking should come first');
  }
});

test('formatGapAnalysis produces structured output', () => {
  const report = generateReport(fixture);
  const parsed = parseTaskSpec(sampleTask);
  parsed.functionalRequirements = mapToRepoState(parsed.functionalRequirements, report);
  const analysis = analyzeGaps(parsed, report);
  const text = formatGapAnalysis(analysis);
  assert.ok(text.includes('GAP ANALYSIS'));
  assert.ok(text.includes('DEPENDENCY GRAPH'));
});

// ─── Tech Stack Augmenter Tests ───

process.stdout.write('\nTech Stack Augmenter Tests\n');
process.stdout.write('─'.repeat(40) + '\n');

test('generateAugmentation includes TypeScript requirements', () => {
  const stack = { languages: ['TypeScript'], frameworks: ['Angular'], buildSystem: ['Webpack'], packageManager: ['npm'], testingFramework: [] };
  const text = generateAugmentation(stack);
  assert.ok(text.includes('NODE.JS / JAVASCRIPT REQUIREMENTS'));
  assert.ok(text.includes('TypeScript'));
  assert.ok(text.includes('ANGULAR REQUIREMENTS'));
});

test('generateAugmentation includes Python requirements', () => {
  const stack = { languages: ['Python'], frameworks: ['Django'], buildSystem: [], packageManager: [], testingFramework: ['pytest'] };
  const text = generateAugmentation(stack);
  assert.ok(text.includes('PYTHON REQUIREMENTS'));
});

test('generateAugmentation includes Rust requirements', () => {
  const stack = { languages: ['Rust'], frameworks: [], buildSystem: ['Cargo'], packageManager: ['Cargo'], testingFramework: [] };
  const text = generateAugmentation(stack);
  assert.ok(text.includes('RUST REQUIREMENTS'));
});

test('generateAugmentation always includes universal requirements', () => {
  const stack = { languages: [], frameworks: [], buildSystem: [], packageManager: [], testingFramework: [] };
  const text = generateAugmentation(stack);
  assert.ok(text.includes('UNIVERSAL REQUIREMENTS'));
  assert.ok(text.includes('hardcoded credentials'));
});

// ─── Master Prompt Assembly Tests ───

process.stdout.write('\nMaster Prompt Assembly Tests\n');
process.stdout.write('─'.repeat(40) + '\n');

test('assembleMasterPrompt produces complete prompt', () => {
  const report = generateReport(fixture);
  const parsed = parseTaskSpec(sampleTask);
  parsed.functionalRequirements = mapToRepoState(parsed.functionalRequirements, report);
  const analysis = analyzeGaps(parsed, report);
  const prompt = assembleMasterPrompt(report, parsed, analysis);

  assert.ok(prompt.includes('CODEX MASTER PROMPT'));
  assert.ok(prompt.includes('EXECUTION PROTOCOL'));
  assert.ok(prompt.includes('REPOSITORY INTELLIGENCE REPORT'));
  assert.ok(prompt.includes('TASK REQUIREMENTS MATRIX'));
  assert.ok(prompt.includes('GAP ANALYSIS'));
  assert.ok(prompt.includes('IMPLEMENTATION DIRECTIVES'));
  assert.ok(prompt.includes('VALIDATION GATES'));
  assert.ok(prompt.includes('SELF-VERIFICATION CHECKLIST'));
  assert.ok(prompt.includes('FAILURE MODES'));
  assert.ok(prompt.includes('TECH-STACK-SPECIFIC REQUIREMENTS'));
  assert.ok(prompt.includes('EXECUTION RULES (IMMUTABLE)'));
});

test('assembleMasterPrompt includes task title', () => {
  const report = generateReport(fixture);
  const parsed = parseTaskSpec(sampleTask);
  parsed.functionalRequirements = mapToRepoState(parsed.functionalRequirements, report);
  const analysis = analyzeGaps(parsed, report);
  const prompt = assembleMasterPrompt(report, parsed, analysis);

  assert.ok(prompt.includes('ADD USER AUTHENTICATION'));
});

test('determineBuildCommand returns correct command for npm', () => {
  const report = generateReport(fixture);
  const cmd = determineBuildCommand(report);
  assert.ok(cmd.includes('tsc'), `Expected build command with tsc, got: ${cmd}`);
});

test('determineTestCommand returns correct command for Jest', () => {
  const report = generateReport(fixture);
  const cmd = determineTestCommand(report);
  assert.ok(cmd.includes('jest'), `Expected test command with jest, got: ${cmd}`);
});

// Cleanup
cleanupFixture(fixture);

// ─── Summary ───

process.stdout.write('\n' + '='.repeat(40) + '\n');
process.stdout.write(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.stdout.write('All tests passed.\n');
  process.exit(0);
}
