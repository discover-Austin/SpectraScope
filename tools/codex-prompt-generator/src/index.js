#!/usr/bin/env node

/**
 * Codex Prompt Generator CLI
 *
 * Generates structured Codex master prompts from a ZIP codebase
 * and task specification file.
 *
 * Usage:
 *   node src/index.js --zip <path-to-zip> --task <path-to-task-spec> [--output <output-path>]
 *   node src/index.js --dir <path-to-repo> --task <path-to-task-spec> [--output <output-path>]
 *
 * Options:
 *   --zip <path>     Path to ZIP file containing codebase
 *   --dir <path>     Path to existing directory (alternative to ZIP)
 *   --task <path>    Path to task specification file (text/markdown)
 *   --output <path>  Output file path (default: stdout)
 *   --help           Show this help message
 */

const fs = require('fs');
const path = require('path');
const { extractZip, generateReport } = require('./repository-analyzer');
const { parseTaskSpec, mapToRepoState } = require('./task-parser');
const { analyzeGaps } = require('./gap-analyzer');
const { assembleMasterPrompt } = require('./prompt-generator');

/**
 * Parse command-line arguments into an options object.
 * @param {string[]} argv - Process arguments (process.argv.slice(2))
 * @returns {object}
 */
function parseArgs(argv) {
  const opts = {
    zip: null,
    dir: null,
    task: null,
    output: null,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--zip':
        opts.zip = argv[++i];
        break;
      case '--dir':
        opts.dir = argv[++i];
        break;
      case '--task':
        opts.task = argv[++i];
        break;
      case '--output':
      case '-o':
        opts.output = argv[++i];
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (argv[i].startsWith('-')) {
          process.stderr.write(`Unknown option: ${argv[i]}\n`);
          process.exit(1);
        }
    }
  }

  return opts;
}

/**
 * Print usage information and exit.
 */
function printUsage() {
  process.stdout.write(`
Codex Prompt Generator
======================

Generates structured Codex master prompts from a codebase and task specification.

Usage:
  node src/index.js --zip <path-to-zip> --task <path-to-task-spec> [--output <path>]
  node src/index.js --dir <path-to-repo> --task <path-to-task-spec> [--output <path>]

Options:
  --zip <path>     Path to ZIP file containing codebase
  --dir <path>     Path to existing directory (alternative to ZIP)
  --task <path>    Path to task specification file (text/markdown)
  --output <path>  Output file path (default: stdout)
  --help           Show this help message

Examples:
  node src/index.js --zip ./myproject.zip --task ./task.md --output ./prompt.txt
  node src/index.js --dir ./myproject --task ./task.md

`);
}

/**
 * Validate inputs and return resolved paths.
 * @param {object} opts - Parsed options
 * @returns {object} Validated options with resolved paths
 */
function validateInputs(opts) {
  if (!opts.zip && !opts.dir) {
    process.stderr.write('FAIL: REPOSITORY_REQUIRED\n');
    process.stderr.write('Either --zip or --dir must be provided.\n');
    process.exit(1);
  }

  if (opts.zip && opts.dir) {
    process.stderr.write('FAIL: AMBIGUOUS_INPUT\n');
    process.stderr.write('Provide either --zip or --dir, not both.\n');
    process.exit(1);
  }

  if (!opts.task) {
    process.stderr.write('FAIL: TASK_SPECIFICATION_REQUIRED\n');
    process.stderr.write('--task <path> must be provided.\n');
    process.exit(1);
  }

  if (opts.zip) {
    opts.zip = path.resolve(opts.zip);
    if (!fs.existsSync(opts.zip)) {
      process.stderr.write(`FAIL: ZIP file not found: ${opts.zip}\n`);
      process.exit(1);
    }
  }

  if (opts.dir) {
    opts.dir = path.resolve(opts.dir);
    if (!fs.existsSync(opts.dir) || !fs.statSync(opts.dir).isDirectory()) {
      process.stderr.write(`FAIL: Directory not found: ${opts.dir}\n`);
      process.exit(1);
    }
  }

  opts.task = path.resolve(opts.task);
  if (!fs.existsSync(opts.task)) {
    process.stderr.write(`FAIL: Task specification file not found: ${opts.task}\n`);
    process.exit(1);
  }

  if (opts.output) {
    opts.output = path.resolve(opts.output);
  }

  return opts;
}

/**
 * Main entry point: orchestrates all phases and outputs the master prompt.
 */
function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  const validated = validateInputs(opts);

  process.stderr.write('Codex Prompt Generator v1.0.0\n');
  process.stderr.write('='.repeat(40) + '\n');

  // Phase 1: Repository Intelligence
  process.stderr.write('\n[Phase 1] Analyzing repository...\n');
  let repoDir;
  let cleanupDir = null;

  if (validated.zip) {
    process.stderr.write(`  Extracting: ${validated.zip}\n`);
    repoDir = extractZip(validated.zip);
    cleanupDir = repoDir;
  } else {
    repoDir = validated.dir;
  }

  const repoReport = generateReport(repoDir);
  process.stderr.write(`  Files found: ${repoReport.files.length}\n`);
  process.stderr.write(`  Languages: ${repoReport.techStack.languages.join(', ') || 'none detected'}\n`);
  process.stderr.write(`  Frameworks: ${repoReport.techStack.frameworks.join(', ') || 'none detected'}\n`);
  process.stderr.write(`  Architecture: ${repoReport.architecture.pattern}\n`);
  process.stderr.write(`  Facts extracted: ${repoReport.facts.length}\n`);

  // Phase 2: Task Requirement Decomposition
  process.stderr.write('\n[Phase 2] Parsing task specification...\n');
  const taskContent = fs.readFileSync(validated.task, 'utf-8');
  const parsedTask = parseTaskSpec(taskContent);

  // Map requirements to repo state
  parsedTask.functionalRequirements = mapToRepoState(
    parsedTask.functionalRequirements,
    repoReport
  );

  process.stderr.write(`  Title: ${parsedTask.title}\n`);
  process.stderr.write(`  Functional requirements: ${parsedTask.functionalRequirements.length}\n`);
  process.stderr.write(`  Non-functional requirements: ${parsedTask.nonFunctionalRequirements.length}\n`);
  process.stderr.write(`  Constraints: ${parsedTask.constraints.length}\n`);
  process.stderr.write(`  Deliverables: ${parsedTask.deliverables.length}\n`);

  // Phase 3: Gap Analysis
  process.stderr.write('\n[Phase 3] Analyzing gaps...\n');
  const gapAnalysis = analyzeGaps(parsedTask, repoReport);

  process.stderr.write(`  Blocking gaps: ${gapAnalysis.summary.blocking}\n`);
  process.stderr.write(`  Critical gaps: ${gapAnalysis.summary.critical}\n`);
  process.stderr.write(`  Important gaps: ${gapAnalysis.summary.important}\n`);
  process.stderr.write(`  Optional gaps: ${gapAnalysis.summary.optional}\n`);
  process.stderr.write(`  Total gaps: ${gapAnalysis.summary.total}\n`);

  // Phase 4-6: Assemble Master Prompt
  process.stderr.write('\n[Phase 4-6] Assembling master prompt...\n');
  const masterPrompt = assembleMasterPrompt(repoReport, parsedTask, gapAnalysis);

  // Output
  if (validated.output) {
    const outputDir = path.dirname(validated.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(validated.output, masterPrompt, 'utf-8');
    process.stderr.write(`\nMaster prompt written to: ${validated.output}\n`);
    process.stderr.write(`Size: ${(masterPrompt.length / 1024).toFixed(1)} KB\n`);
  } else {
    process.stdout.write(masterPrompt);
  }

  process.stderr.write('\nDone.\n');

  // Cleanup extracted directory
  if (cleanupDir) {
    try {
      fs.rmSync(cleanupDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

// Run
main();
