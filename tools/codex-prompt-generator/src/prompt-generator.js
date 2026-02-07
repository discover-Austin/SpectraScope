/**
 * Prompt Generator - Phase 4-6: Implementation Directives, Validation Gates,
 * and Self-Verification Checklist
 *
 * Assembles the complete Codex master prompt from all analysis phases.
 */

const { formatReport } = require('./repository-analyzer');
const { formatRequirementsMatrix } = require('./task-parser');
const { formatGapAnalysis } = require('./gap-analyzer');
const { generateAugmentation } = require('./tech-stack-augmenter');

/**
 * Generate implementation directive templates for each gap.
 * @param {Array} gaps - Ordered gaps from gap analysis
 * @param {object} repoReport - Repository report
 * @param {object} parsedTask - Parsed task specification
 * @returns {string}
 */
function generateImplementationDirectives(gaps, repoReport, parsedTask) {
  const sections = [];

  sections.push('IMPLEMENTATION DIRECTIVES');
  sections.push('='.repeat(60));
  sections.push('');
  sections.push('For EACH gap below, implement complete, production-ready code.');
  sections.push('NO pseudo-code, NO TODOs, NO placeholders.');
  sections.push('');

  for (const gap of gaps) {
    sections.push(`${'─'.repeat(60)}`);
    sections.push(`IMPLEMENTATION: ${gap.id}`);
    sections.push(`${'─'.repeat(60)}`);
    sections.push('');

    for (const af of gap.affectedFiles) {
      sections.push(`FILE: ${af.file}`);
      sections.push(`ACTION: ${af.action}`);
    }
    sections.push(`PRIORITY: ${gap.priority}`);
    sections.push('');

    sections.push('CONTEXT:');
    sections.push(`  Requirement: ${gap.requirementId}`);
    sections.push(`  Purpose: ${gap.description}`);
    if (gap.blockedBy.length > 0) {
      sections.push(`  Dependencies: ${gap.blockedBy.join(', ')} must be completed first`);
    } else {
      sections.push('  Dependencies: None');
    }
    sections.push('');

    sections.push('PRESERVATION RULES:');
    sections.push(`  - Follow existing ${repoReport.architecture.conventions.fileNaming} file naming convention`);
    sections.push(`  - Use existing ${repoReport.architecture.conventions.importStyle} import style`);
    sections.push(`  - Follow existing ${repoReport.architecture.conventions.errorHandling} error handling pattern`);
    if (repoReport.architecture.pattern !== 'Unknown') {
      sections.push(`  - Maintain ${repoReport.architecture.pattern} architecture pattern`);
    }
    sections.push('  - Integrate with existing module boundaries and interfaces');
    sections.push('');

    sections.push('SPECIFICATION:');
    sections.push(`  - ${gap.description}`);
    sections.push(`  - Current state: ${gap.currentState}`);
    sections.push(`  - Required state: ${gap.requiredState}`);
    sections.push('  - Must handle all error conditions');
    sections.push('  - Must include all necessary imports');
    sections.push('');

    sections.push('IMPLEMENTATION:');
    sections.push('  [Generate complete, production-ready code here]');
    sections.push('  [Include all imports, error handling, and cleanup]');
    sections.push('  [Follow existing patterns exactly]');
    sections.push('');

    sections.push('INTEGRATION:');
    sections.push('  [List files that must be updated to integrate this change]');
    sections.push('  [List imports that must be added elsewhere]');
    sections.push('  [List configurations that must be updated]');
    sections.push('');

    if (repoReport.techStack.testingFramework.length > 0) {
      sections.push('TESTS:');
      sections.push(`  [Write tests using ${repoReport.techStack.testingFramework.join('/')}`);
      sections.push('  [Include test file path and complete test code]');
      sections.push('');
    }

    sections.push('VERIFICATION:');
    sections.push(`  [Verify ${gap.description}]`);
    sections.push('  [Provide command to run if applicable]');
    sections.push('  [Describe expected output/behavior]');
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Generate validation gates section.
 * @param {object} repoReport - Repository report
 * @param {object} parsedTask - Parsed task specification
 * @param {object} gapAnalysis - Gap analysis results
 * @returns {string}
 */
function generateValidationGates(repoReport, parsedTask, gapAnalysis) {
  const sections = [];

  sections.push('VALIDATION GATES');
  sections.push('='.repeat(60));

  // Build verification
  sections.push('\nBUILD VERIFICATION');
  sections.push('-'.repeat(40));
  const buildCmd = determineBuildCommand(repoReport);
  sections.push(`Command: ${buildCmd}`);
  sections.push('Expected: Build completes with exit code 0, no errors');
  sections.push('On Failure: Read error output, identify failing file:line, fix compilation errors');
  sections.push('GATE: If build fails after 3 fix attempts → OUTPUT "FAIL: BUILD" AND STOP');

  // Test verification
  if (repoReport.techStack.testingFramework.length > 0) {
    sections.push('\nTEST VERIFICATION');
    sections.push('-'.repeat(40));
    const testCmd = determineTestCommand(repoReport);
    sections.push(`Command: ${testCmd}`);
    sections.push('Expected: All tests pass, no failures or errors');
    sections.push('On Failure: Read test output, identify failing test, fix implementation or test');
    sections.push('GATE: If tests fail after 3 fix attempts → OUTPUT "FAIL: TESTS" AND STOP');
  }

  // Constraint verification
  sections.push('\nCONSTRAINT VERIFICATION');
  sections.push('-'.repeat(40));
  if (parsedTask.constraints.length > 0) {
    for (const c of parsedTask.constraints) {
      sections.push(`${c.id}: ${c.description}`);
      sections.push(`  Check: ${c.verification}`);
      sections.push(`  GATE: If violated → ${c.failureAction}`);
    }
  } else {
    sections.push('No explicit constraints identified. Verify no implicit constraints violated.');
  }

  // Deliverable verification
  sections.push('\nDELIVERABLE VERIFICATION');
  sections.push('-'.repeat(40));
  if (parsedTask.deliverables.length > 0) {
    for (const d of parsedTask.deliverables) {
      sections.push(`${d.id}: ${d.description}`);
      sections.push(`  Location: ${d.location}`);
      sections.push(`  Check: ${d.validation}`);
      sections.push('  GATE: If missing/invalid → FIX or FAIL');
    }
  } else {
    sections.push('Verify all implemented features function correctly.');
  }

  // Integration verification
  sections.push('\nINTEGRATION VERIFICATION');
  sections.push('-'.repeat(40));
  sections.push('Check: All new code integrates with existing modules');
  sections.push('Check: No broken references or imports');
  sections.push('Check: No dead code introduced');
  sections.push('Check: Existing functionality not broken by changes');
  sections.push('GATE: If integration broken → FIX or FAIL');

  // Quality verification
  sections.push('\nQUALITY VERIFICATION');
  sections.push('-'.repeat(40));
  sections.push('Check: No hardcoded credentials or API keys');
  sections.push('Check: No placeholder code (TODO, FIXME, HACK, NotImplemented)');
  sections.push('Check: Error handling present for all I/O operations');
  sections.push('Check: No SQL injection vulnerabilities (parameterized queries only)');
  sections.push('Check: No XSS vulnerabilities (output encoding present)');
  sections.push('Check: No command injection (no unsanitized user input in exec calls)');
  sections.push('Check: Input validation at system boundaries');
  sections.push('GATE: If quality issues found → FIX AND REVALIDATE');

  return sections.join('\n');
}

/**
 * Generate the self-verification checklist.
 * @param {object} gapAnalysis
 * @param {object} parsedTask
 * @returns {string}
 */
function generateSelfVerification(gapAnalysis, parsedTask) {
  const sections = [];

  sections.push('SELF-VERIFICATION CHECKLIST');
  sections.push('='.repeat(60));
  sections.push('');
  sections.push('Before outputting completion, verify ALL of the following:');
  sections.push('');

  const blocking = gapAnalysis.gaps.filter(g => g.priority === 'BLOCKING');
  const critical = gapAnalysis.gaps.filter(g => g.priority === 'CRITICAL');

  sections.push(`□ All BLOCKING gaps addressed (${blocking.length} total)`);
  for (const g of blocking) {
    sections.push(`  □ ${g.id}: ${g.description}`);
  }

  sections.push(`□ All CRITICAL gaps addressed (${critical.length} total)`);
  for (const g of critical) {
    sections.push(`  □ ${g.id}: ${g.description}`);
  }

  sections.push('□ All LOCKED constraints satisfied');
  for (const c of parsedTask.constraints) {
    sections.push(`  □ ${c.id}: ${c.description}`);
  }

  sections.push('□ All deliverables present at specified locations');
  for (const d of parsedTask.deliverables) {
    sections.push(`  □ ${d.id}: ${d.description}`);
  }

  sections.push('□ Build succeeds without errors');
  sections.push('□ Tests pass (if testing required)');
  sections.push('□ No placeholder code exists (no TODO, FIXME, HACK, NotImplemented)');
  sections.push('□ No hardcoded credentials exist');
  sections.push('□ All integration points functional');
  sections.push('□ Documentation complete for changes made');
  sections.push('');
  sections.push('If ANY checkbox fails: FIX AND REVALIDATE');
  sections.push('');

  sections.push('OUTPUT FORMAT:');
  sections.push('[Complete implementation details]');
  sections.push('[File-by-file manifest of changes]');
  sections.push('[Build/run commands]');
  sections.push('[Verification evidence]');
  sections.push('');

  sections.push('COMPLETION STATEMENT:');
  sections.push('"COMPLETION STATUS: [SUCCESS | PARTIAL: <reason> | FAIL: <reason>]"');

  const reqIds = parsedTask.functionalRequirements.map(r => r.id).join(', ');
  sections.push(`"REQUIREMENTS SATISFIED: [${reqIds}]"`);

  const gapIds = gapAnalysis.gaps.map(g => g.id).join(', ');
  sections.push(`"GAPS REMAINING: [list from: ${gapIds}]"`);

  sections.push('"DELIVERABLES: [list all output file paths]"');

  return sections.join('\n');
}

/**
 * Generate the failure modes section.
 * @param {object} parsedTask
 * @returns {string}
 */
function generateFailureModes(parsedTask) {
  const sections = [];

  sections.push('FAILURE MODES');
  sections.push('='.repeat(60));

  sections.push('\nIMMEDIATE FAIL (OUTPUT "FAIL: [reason]" AND STOP):');
  sections.push('- Any LOCKED constraint violated');
  sections.push('- Repository cannot be read/extracted');
  sections.push('- Task specification missing critical information');
  sections.push('- Circular dependency detected in implementation order');
  for (const c of parsedTask.constraints) {
    sections.push(`- ${c.id} violated: ${c.description}`);
  }

  sections.push('\nFIXABLE FAIL (DIAGNOSE AND REPAIR):');
  sections.push('- Build command fails → Read error output, fix source');
  sections.push('- Tests fail → Read test output, fix implementation');
  sections.push('- Integration broken → Trace imports/references, fix connections');
  sections.push('- Code quality issues → Address specific violations');
  sections.push('- Missing error handling → Add appropriate try-catch/Result handling');

  sections.push('\nAMBIGUITY FAIL (REQUEST CLARIFICATION):');
  sections.push('- Task specification contradictory');
  sections.push('- Multiple valid interpretations of requirement');
  sections.push('- Missing information needed for implementation');
  sections.push('- OUTPUT: "AMBIGUITY: [description] - NEED: [specific information]"');

  return sections.join('\n');
}

/**
 * Generate the execution protocol section.
 * @returns {string}
 */
function generateExecutionProtocol() {
  return `EXECUTION PROTOCOL
${'='.repeat(60)}

EXECUTION SEQUENCE (FOLLOW IN ORDER)

STEP 1: READ REPOSITORY
- Extract ZIP archive to working directory
- Enumerate complete file tree with sizes
- Read every source file (skip binary files)
- Complete REPOSITORY INTELLIGENCE REPORT
- CHECKPOINT: Verify all facts are sourced, all conventions identified

STEP 2: PARSE TASK
- Extract all functional requirements
- Extract all non-functional requirements
- Identify all LOCKED constraints
- Identify all deliverables
- Complete TASK REQUIREMENTS MATRIX
- CHECKPOINT: Verify all constraints identified, acceptance criteria defined

STEP 3: ANALYZE GAPS
- Map each requirement to current repository state
- Identify what must be created, modified, or fixed
- Order by dependency chain (blocking → critical → important → optional)
- Complete GAP ANALYSIS
- CHECKPOINT: Verify dependency order correct, no circular dependencies

STEP 4: IMPLEMENT
- For each gap in dependency order:
  - Read affected files completely before modifying
  - Generate complete, production-ready implementation
  - Include all imports, error handling, and cleanup
  - Specify integration points with other modules
- CHECKPOINT: Verify all gaps addressed, no pseudo-code or placeholders

STEP 5: VALIDATE
- Run build verification command
- Run test verification command (if applicable)
- Check all LOCKED constraints
- Verify all deliverables present
- Check integration integrity
- Check code quality
- Fix any failures and re-validate
- CHECKPOINT: Verify all gates passed, all deliverables present

STEP 6: DOCUMENT COMPLETION
- List all files created with full paths
- List all files modified with change descriptions
- Provide exact build/run commands
- State completion status for each requirement
- CHECKPOINT: Verify documentation complete, completion statement present`;
}

/**
 * Determine the build command based on tech stack.
 * @param {object} repoReport
 * @returns {string}
 */
function determineBuildCommand(repoReport) {
  const stack = repoReport.techStack;

  // Check for specific build scripts in package.json facts
  const buildFact = repoReport.facts.find(f => f.key === 'Script.build');
  if (buildFact) return `npm run build (runs: ${buildFact.value})`;

  if (stack.buildSystem.includes('Gradle')) return './gradlew build';
  if (stack.buildSystem.includes('Maven')) return 'mvn compile';
  if (stack.buildSystem.includes('Cargo')) return 'cargo build';
  if (stack.buildSystem.includes('CMake')) return 'cmake --build build/';
  if (stack.buildSystem.includes('Make')) return 'make';
  if (stack.packageManager.includes('Go Modules')) return 'go build ./...';
  if (stack.packageManager.includes('npm')) return 'npm run build';
  if (stack.packageManager.includes('Yarn')) return 'yarn build';
  if (stack.packageManager.includes('pnpm')) return 'pnpm build';

  if (stack.languages.includes('TypeScript')) return 'npx tsc --noEmit';
  if (stack.languages.includes('Python')) return 'python -m py_compile *.py';

  return 'echo "No build command detected - verify manually"';
}

/**
 * Determine the test command based on tech stack.
 * @param {object} repoReport
 * @returns {string}
 */
function determineTestCommand(repoReport) {
  const stack = repoReport.techStack;

  const testFact = repoReport.facts.find(f => f.key === 'Script.test');
  if (testFact) return `npm test (runs: ${testFact.value})`;

  if (stack.testingFramework.includes('pytest')) return 'pytest';
  if (stack.testingFramework.includes('Jest')) return 'npx jest';
  if (stack.testingFramework.includes('Vitest')) return 'npx vitest run';
  if (stack.testingFramework.includes('Mocha')) return 'npx mocha';
  if (stack.buildSystem.includes('Cargo')) return 'cargo test';
  if (stack.buildSystem.includes('Gradle')) return './gradlew test';
  if (stack.buildSystem.includes('Maven')) return 'mvn test';
  if (stack.packageManager.includes('Go Modules')) return 'go test ./...';

  return 'echo "No test command detected - verify manually"';
}

/**
 * Assemble the complete Codex master prompt from all phases.
 * @param {object} repoReport - From repository-analyzer
 * @param {object} parsedTask - From task-parser
 * @param {object} gapAnalysis - From gap-analyzer
 * @returns {string}
 */
function assembleMasterPrompt(repoReport, parsedTask, gapAnalysis) {
  const sections = [];

  // Title
  const title = parsedTask.title || 'Untitled Task';
  sections.push(`CODEX MASTER PROMPT: ${title.toUpperCase()}`);
  sections.push('');
  sections.push('█'.repeat(60));
  sections.push('THIS PROMPT IS A FORCING FUNCTION. FOLLOW EVERY DIRECTIVE.');
  sections.push('SPECIFICATION VIOLATIONS ARE MECHANICALLY IMPOSSIBLE WHEN');
  sections.push('EACH STEP IS EXECUTED IN ORDER WITH ALL GATES PASSING.');
  sections.push('█'.repeat(60));
  sections.push('');

  // Execution Protocol
  sections.push(generateExecutionProtocol());
  sections.push('');
  sections.push('');

  // Phase 1: Repository Intelligence Report
  sections.push('REQUIRED OUTPUT 1:');
  sections.push(formatReport(repoReport));
  sections.push('');
  sections.push('');

  // Phase 2: Task Requirements Matrix
  sections.push('REQUIRED OUTPUT 2:');
  sections.push(formatRequirementsMatrix(parsedTask));
  sections.push('');
  sections.push('');

  // Phase 3: Gap Analysis
  sections.push('REQUIRED OUTPUT 3:');
  sections.push(formatGapAnalysis(gapAnalysis));
  sections.push('');
  sections.push('');

  // Phase 4: Implementation Directives
  sections.push('REQUIRED OUTPUT 4:');
  sections.push(generateImplementationDirectives(gapAnalysis.gaps, repoReport, parsedTask));
  sections.push('');
  sections.push('');

  // Phase 5: Validation Gates
  sections.push('REQUIRED OUTPUT 5:');
  sections.push(generateValidationGates(repoReport, parsedTask, gapAnalysis));
  sections.push('');
  sections.push('');

  // Phase 6: Self-Verification
  sections.push('REQUIRED OUTPUT 6:');
  sections.push(generateSelfVerification(gapAnalysis, parsedTask));
  sections.push('');
  sections.push('');

  // Failure Modes
  sections.push(generateFailureModes(parsedTask));
  sections.push('');
  sections.push('');

  // Tech-Stack-Specific Requirements
  sections.push(generateAugmentation(repoReport.techStack));
  sections.push('');
  sections.push('');

  // Execution Rules
  sections.push('EXECUTION RULES (IMMUTABLE)');
  sections.push('='.repeat(60));
  sections.push('• Read repository completely before any implementation');
  sections.push('• Extract and preserve all existing patterns and conventions');
  sections.push('• Implement complete, production-ready code only');
  sections.push('• Include comprehensive error handling for all I/O');
  sections.push('• No pseudo-code, placeholders, TODOs, or FIXMEs');
  sections.push('• Follow dependency order strictly (blocking → critical → important → optional)');
  sections.push('• Verify at each checkpoint before proceeding');
  sections.push('• Fix all failures before proceeding to next step');
  sections.push('• Document all changes with file paths and descriptions');
  sections.push('• Output completion status with evidence of verification');

  return sections.join('\n');
}

module.exports = {
  assembleMasterPrompt,
  generateImplementationDirectives,
  generateValidationGates,
  generateSelfVerification,
  generateFailureModes,
  generateExecutionProtocol,
  determineBuildCommand,
  determineTestCommand
};
