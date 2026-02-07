/**
 * Repository Analyzer - Phase 1: Repository Intelligence
 *
 * Extracts ZIP archives, enumerates file trees, reads all files,
 * and produces a structured Repository Intelligence Report.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', '.webm',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.class', '.jar', '.pyc', '.pyo',
  '.lock', '.map'
]);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.gradle', 'build',
  'dist', '.angular', '.next', '.nuxt', 'target', 'vendor',
  '.idea', '.vscode', '.settings', 'bin', 'obj'
]);

/**
 * Extract a ZIP file to a temporary directory.
 * @param {string} zipPath - Path to the ZIP file
 * @returns {string} Path to extracted directory
 */
function extractZip(zipPath) {
  const absPath = path.resolve(zipPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`ZIP file not found: ${absPath}`);
  }

  const extractDir = path.join(
    path.dirname(absPath),
    `_extracted_${Date.now()}`
  );
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`unzip -q -o "${absPath}" -d "${extractDir}"`, {
      stdio: 'pipe',
      timeout: 60000
    });
  } catch (err) {
    throw new Error(`Failed to extract ZIP: ${err.message}`);
  }

  return extractDir;
}

/**
 * Recursively enumerate all files in a directory.
 * @param {string} dir - Root directory
 * @param {string} [relativeTo] - Base path for relative paths
 * @returns {Array<{path: string, relativePath: string, size: number, ext: string}>}
 */
function enumerateFiles(dir, relativeTo) {
  const base = relativeTo || dir;
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        results.push({
          path: fullPath,
          relativePath: path.relative(base, fullPath),
          size: stat.size,
          ext: path.extname(entry.name).toLowerCase()
        });
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Read file contents, skipping binary files.
 * @param {string} filePath - Absolute file path
 * @param {string} ext - File extension
 * @returns {string|null} File contents or null for binary
 */
function readFileContent(filePath, ext) {
  if (BINARY_EXTENSIONS.has(ext)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('\0')) {
      return null;
    }
    return content;
  } catch {
    return null;
  }
}

/**
 * Detect technology stack from file inventory and contents.
 * @param {Array} files - File inventory
 * @param {Map<string, string>} fileContents - Map of relativePath -> content
 * @returns {object} Detected stack information
 */
function detectTechStack(files, fileContents) {
  const stack = {
    languages: [],
    frameworks: [],
    buildSystem: [],
    packageManager: [],
    testingFramework: []
  };

  const extCounts = {};
  for (const f of files) {
    extCounts[f.ext] = (extCounts[f.ext] || 0) + 1;
  }

  // Language detection
  if (extCounts['.ts'] || extCounts['.tsx']) stack.languages.push('TypeScript');
  if (extCounts['.js'] || extCounts['.jsx']) stack.languages.push('JavaScript');
  if (extCounts['.py']) stack.languages.push('Python');
  if (extCounts['.java']) stack.languages.push('Java');
  if (extCounts['.rs']) stack.languages.push('Rust');
  if (extCounts['.go']) stack.languages.push('Go');
  if (extCounts['.rb']) stack.languages.push('Ruby');
  if (extCounts['.cs']) stack.languages.push('C#');
  if (extCounts['.cpp'] || extCounts['.cc'] || extCounts['.cxx']) stack.languages.push('C++');
  if (extCounts['.c'] || extCounts['.h']) stack.languages.push('C');
  if (extCounts['.swift']) stack.languages.push('Swift');
  if (extCounts['.kt'] || extCounts['.kts']) stack.languages.push('Kotlin');
  if (extCounts['.dart']) stack.languages.push('Dart');
  if (extCounts['.php']) stack.languages.push('PHP');

  // Framework detection from config files
  const fileNames = new Set(files.map(f => path.basename(f.relativePath)));
  const relativePaths = new Set(files.map(f => f.relativePath));

  if (fileNames.has('angular.json') || fileNames.has('.angular-cli.json')) {
    stack.frameworks.push('Angular');
  }
  if (fileNames.has('next.config.js') || fileNames.has('next.config.ts') || fileNames.has('next.config.mjs')) {
    stack.frameworks.push('Next.js');
  }
  if (fileNames.has('nuxt.config.js') || fileNames.has('nuxt.config.ts')) {
    stack.frameworks.push('Nuxt.js');
  }
  if (fileNames.has('svelte.config.js')) {
    stack.frameworks.push('Svelte/SvelteKit');
  }
  if (fileNames.has('vue.config.js') || fileNames.has('vite.config.ts')) {
    stack.frameworks.push('Vue.js');
  }
  if (fileNames.has('capacitor.config.ts') || fileNames.has('capacitor.config.json')) {
    stack.frameworks.push('Capacitor');
  }

  // Check package.json for more frameworks
  for (const [relPath, content] of fileContents) {
    if (path.basename(relPath) === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps['react']) stack.frameworks.push('React');
        if (allDeps['express']) stack.frameworks.push('Express');
        if (allDeps['fastify']) stack.frameworks.push('Fastify');
        if (allDeps['@nestjs/core']) stack.frameworks.push('NestJS');
        if (allDeps['django'] || allDeps['Django']) stack.frameworks.push('Django');
        if (allDeps['flask'] || allDeps['Flask']) stack.frameworks.push('Flask');

        // Testing
        if (allDeps['jest']) stack.testingFramework.push('Jest');
        if (allDeps['mocha']) stack.testingFramework.push('Mocha');
        if (allDeps['vitest']) stack.testingFramework.push('Vitest');
        if (allDeps['karma']) stack.testingFramework.push('Karma');
        if (allDeps['jasmine-core']) stack.testingFramework.push('Jasmine');
        if (allDeps['@playwright/test']) stack.testingFramework.push('Playwright');
        if (allDeps['cypress']) stack.testingFramework.push('Cypress');
      } catch {
        // skip invalid JSON
      }
    }
  }

  // Python frameworks from requirements.txt or pyproject.toml
  for (const [relPath, content] of fileContents) {
    const base = path.basename(relPath);
    if (base === 'requirements.txt' || base === 'pyproject.toml' || base === 'setup.py') {
      if (content.includes('django') || content.includes('Django')) stack.frameworks.push('Django');
      if (content.includes('flask') || content.includes('Flask')) stack.frameworks.push('Flask');
      if (content.includes('fastapi') || content.includes('FastAPI')) stack.frameworks.push('FastAPI');
      if (content.includes('pytest')) stack.testingFramework.push('pytest');
      if (content.includes('unittest')) stack.testingFramework.push('unittest');
    }
  }

  // Rust
  if (fileNames.has('Cargo.toml')) {
    stack.buildSystem.push('Cargo');
    stack.packageManager.push('Cargo');
  }

  // Build system detection
  if (fileNames.has('package.json')) stack.packageManager.push('npm');
  if (fileNames.has('yarn.lock')) stack.packageManager.push('Yarn');
  if (fileNames.has('pnpm-lock.yaml')) stack.packageManager.push('pnpm');
  if (fileNames.has('build.gradle') || fileNames.has('build.gradle.kts')) stack.buildSystem.push('Gradle');
  if (fileNames.has('pom.xml')) stack.buildSystem.push('Maven');
  if (fileNames.has('Makefile')) stack.buildSystem.push('Make');
  if (fileNames.has('CMakeLists.txt')) stack.buildSystem.push('CMake');
  if (fileNames.has('webpack.config.js') || fileNames.has('webpack.config.ts')) stack.buildSystem.push('Webpack');
  if (fileNames.has('vite.config.ts') || fileNames.has('vite.config.js')) stack.buildSystem.push('Vite');
  if (fileNames.has('rollup.config.js')) stack.buildSystem.push('Rollup');
  if (fileNames.has('esbuild.config.js')) stack.buildSystem.push('esbuild');
  if (fileNames.has('tsconfig.json')) stack.buildSystem.push('TypeScript Compiler');
  if (fileNames.has('Dockerfile')) stack.buildSystem.push('Docker');
  if (fileNames.has('go.mod')) {
    stack.buildSystem.push('Go Modules');
    stack.packageManager.push('Go Modules');
  }

  // Deduplicate
  for (const key of Object.keys(stack)) {
    stack[key] = [...new Set(stack[key])];
  }

  return stack;
}

/**
 * Detect architecture patterns from directory structure and code.
 * @param {Array} files - File inventory
 * @param {Map<string, string>} fileContents - Map of relativePath -> content
 * @returns {object} Architecture analysis
 */
function analyzeArchitecture(files, fileContents) {
  const dirs = new Set();
  for (const f of files) {
    const parts = f.relativePath.split(path.sep);
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join(path.sep));
    }
  }

  const dirList = [...dirs].sort();
  const topLevelDirs = dirList.filter(d => !d.includes(path.sep));

  // Pattern detection
  let pattern = 'Unknown';
  const dirNames = new Set(topLevelDirs.map(d => d.toLowerCase()));

  if (dirNames.has('src')) {
    const srcDirs = dirList
      .filter(d => d.startsWith('src' + path.sep))
      .map(d => d.split(path.sep)[1])
      .filter(Boolean);
    const srcDirSet = new Set(srcDirs);

    if (srcDirSet.has('features') && srcDirSet.has('core')) {
      pattern = 'Feature-Based Modular';
    } else if (srcDirSet.has('controllers') && srcDirSet.has('models')) {
      pattern = 'MVC';
    } else if (srcDirSet.has('components') && srcDirSet.has('pages')) {
      pattern = 'Component-Based with Pages';
    } else if (srcDirSet.has('modules')) {
      pattern = 'Modular';
    } else if (srcDirSet.has('app')) {
      pattern = 'Application-Centric';
    } else {
      pattern = 'Flat/Simple';
    }
  } else if (dirNames.has('lib') && dirNames.has('test')) {
    pattern = 'Library';
  } else if (dirNames.has('cmd') && dirNames.has('pkg')) {
    pattern = 'Go Standard Layout';
  }

  // Detect naming conventions
  const conventions = detectNamingConventions(files, fileContents);

  // Detect entry points
  const entryPoints = [];
  const entryNames = ['main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js',
    'server.ts', 'server.js', 'main.py', 'app.py', 'manage.py', 'main.go',
    'main.rs', 'Program.cs', 'Main.java'];
  for (const f of files) {
    if (entryNames.includes(path.basename(f.relativePath))) {
      entryPoints.push(f.relativePath);
    }
  }

  return {
    pattern,
    directories: dirList,
    topLevelDirs,
    entryPoints,
    conventions
  };
}

/**
 * Detect naming conventions from source files.
 * @param {Array} files
 * @param {Map<string, string>} fileContents
 * @returns {object}
 */
function detectNamingConventions(files, fileContents) {
  const conventions = {
    fileNaming: 'unknown',
    variableNaming: 'unknown',
    importStyle: 'unknown',
    errorHandling: 'unknown'
  };

  // File naming
  const sourceFiles = files.filter(f =>
    ['.ts', '.js', '.py', '.java', '.rs', '.go'].includes(f.ext)
  );
  const fileNames = sourceFiles.map(f => path.basename(f.relativePath, f.ext));

  const kebabCount = fileNames.filter(n => n.includes('-') && !n.includes('_')).length;
  const snakeCount = fileNames.filter(n => n.includes('_') && !n.includes('-')).length;
  const camelCount = fileNames.filter(n => /^[a-z][a-zA-Z0-9]*$/.test(n)).length;

  if (kebabCount > snakeCount && kebabCount > camelCount) {
    conventions.fileNaming = 'kebab-case';
  } else if (snakeCount > kebabCount && snakeCount > camelCount) {
    conventions.fileNaming = 'snake_case';
  } else if (camelCount > 0) {
    conventions.fileNaming = 'camelCase';
  }

  // Variable and import style from content samples
  let relativeImports = 0;
  let absoluteImports = 0;
  let tryCatchCount = 0;
  let resultTypeCount = 0;

  for (const [, content] of fileContents) {
    if (!content) continue;
    const sample = content.substring(0, 5000);

    if (sample.match(/from\s+['"]\.\//g)) relativeImports++;
    if (sample.match(/from\s+['"]@/g)) absoluteImports++;
    if (sample.match(/from\s+['"][a-zA-Z]/g)) absoluteImports++;

    if (sample.includes('try {') || sample.includes('try:')) tryCatchCount++;
    if (sample.includes('Result<') || sample.includes('Result[')) resultTypeCount++;
  }

  conventions.importStyle = absoluteImports > relativeImports ? 'absolute' : 'relative';
  conventions.errorHandling = resultTypeCount > tryCatchCount ? 'Result types' : 'try-catch';

  return conventions;
}

/**
 * Extract sourced facts from the codebase.
 * @param {Array} files
 * @param {Map<string, string>} fileContents
 * @returns {Array<{key: string, value: string, source: string, line: number}>}
 */
function extractFacts(files, fileContents) {
  const facts = [];

  for (const [relPath, content] of fileContents) {
    if (!content) continue;
    const base = path.basename(relPath);
    const lines = content.split('\n');

    // package.json facts
    if (base === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        if (pkg.name) {
          const lineNum = lines.findIndex(l => l.includes('"name"')) + 1;
          facts.push({ key: 'Project.Name', value: pkg.name, source: relPath, line: lineNum });
        }
        if (pkg.version) {
          const lineNum = lines.findIndex(l => l.includes('"version"')) + 1;
          facts.push({ key: 'Project.Version', value: pkg.version, source: relPath, line: lineNum });
        }
        if (pkg.description) {
          const lineNum = lines.findIndex(l => l.includes('"description"')) + 1;
          facts.push({ key: 'Project.Description', value: pkg.description, source: relPath, line: lineNum });
        }
        if (pkg.scripts) {
          for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
            const lineNum = lines.findIndex(l => l.includes(`"${scriptName}"`)) + 1;
            facts.push({ key: `Script.${scriptName}`, value: String(scriptCmd), source: relPath, line: lineNum });
          }
        }
      } catch {
        // skip
      }
    }

    // Cargo.toml facts
    if (base === 'Cargo.toml') {
      for (let i = 0; i < lines.length; i++) {
        const nameMatch = lines[i].match(/^name\s*=\s*"(.+)"/);
        if (nameMatch) {
          facts.push({ key: 'Project.Name', value: nameMatch[1], source: relPath, line: i + 1 });
        }
        const verMatch = lines[i].match(/^version\s*=\s*"(.+)"/);
        if (verMatch) {
          facts.push({ key: 'Project.Version', value: verMatch[1], source: relPath, line: i + 1 });
        }
      }
    }

    // pyproject.toml facts
    if (base === 'pyproject.toml') {
      for (let i = 0; i < lines.length; i++) {
        const nameMatch = lines[i].match(/^name\s*=\s*"(.+)"/);
        if (nameMatch) {
          facts.push({ key: 'Project.Name', value: nameMatch[1], source: relPath, line: i + 1 });
        }
        const verMatch = lines[i].match(/^version\s*=\s*"(.+)"/);
        if (verMatch) {
          facts.push({ key: 'Project.Version', value: verMatch[1], source: relPath, line: i + 1 });
        }
      }
    }

    // Angular/Capacitor config facts
    if (base === 'angular.json') {
      try {
        const cfg = JSON.parse(content);
        const projectNames = Object.keys(cfg.projects || {});
        if (projectNames.length > 0) {
          facts.push({ key: 'Angular.ProjectName', value: projectNames[0], source: relPath, line: 1 });
        }
      } catch {
        // skip
      }
    }

    if (base === 'capacitor.config.ts' || base === 'capacitor.config.json') {
      for (let i = 0; i < lines.length; i++) {
        const appIdMatch = lines[i].match(/appId:\s*['"](.+)['"]/);
        if (appIdMatch) {
          facts.push({ key: 'Capacitor.AppId', value: appIdMatch[1], source: relPath, line: i + 1 });
        }
        const appNameMatch = lines[i].match(/appName:\s*['"](.+)['"]/);
        if (appNameMatch) {
          facts.push({ key: 'Capacitor.AppName', value: appNameMatch[1], source: relPath, line: i + 1 });
        }
      }
    }

    // tsconfig.json facts
    if (base === 'tsconfig.json') {
      try {
        const cfg = JSON.parse(content);
        if (cfg.compilerOptions?.target) {
          const lineNum = lines.findIndex(l => l.includes('"target"')) + 1;
          facts.push({ key: 'TypeScript.Target', value: cfg.compilerOptions.target, source: relPath, line: lineNum });
        }
        if (cfg.compilerOptions?.strict !== undefined) {
          const lineNum = lines.findIndex(l => l.includes('"strict"')) + 1;
          facts.push({ key: 'TypeScript.StrictMode', value: String(cfg.compilerOptions.strict), source: relPath, line: lineNum });
        }
      } catch {
        // skip
      }
    }

    // Go module facts
    if (base === 'go.mod') {
      for (let i = 0; i < lines.length; i++) {
        const modMatch = lines[i].match(/^module\s+(.+)/);
        if (modMatch) {
          facts.push({ key: 'Go.Module', value: modMatch[1].trim(), source: relPath, line: i + 1 });
        }
        const goMatch = lines[i].match(/^go\s+(.+)/);
        if (goMatch) {
          facts.push({ key: 'Go.Version', value: goMatch[1].trim(), source: relPath, line: i + 1 });
        }
      }
    }
  }

  return facts;
}

/**
 * Assess completeness of the codebase.
 * @param {Array} files
 * @param {Map<string, string>} fileContents
 * @returns {object}
 */
function assessCompleteness(files, fileContents) {
  const complete = [];
  const incomplete = [];
  const missing = [];
  const broken = [];
  const deadCode = [];

  for (const [relPath, content] of fileContents) {
    if (!content) continue;

    const hasTodo = content.includes('TODO') || content.includes('FIXME') || content.includes('HACK');
    const hasPlaceholder = content.includes('placeholder') || content.includes('NotImplemented')
      || content.includes('pass  #') || content.includes('throw new Error(\'Not implemented\')');
    const hasEmptyFunctions = /\{\s*\}/.test(content) && content.includes('function');

    if (hasTodo || hasPlaceholder) {
      incomplete.push({
        file: relPath,
        reason: hasTodo ? 'Contains TODO/FIXME markers' : 'Contains placeholder code'
      });
    } else if (hasEmptyFunctions) {
      incomplete.push({
        file: relPath,
        reason: 'Contains empty function bodies'
      });
    } else {
      complete.push(relPath);
    }
  }

  // Check for expected files that are missing
  const fileNames = new Set(files.map(f => path.basename(f.relativePath)));
  const hasTests = files.some(f =>
    f.relativePath.includes('.spec.') || f.relativePath.includes('.test.')
    || f.relativePath.includes('__tests__') || f.relativePath.includes('test/')
  );
  if (!hasTests) {
    missing.push('Test files (no .spec/.test files or test directory found)');
  }

  const hasCI = files.some(f =>
    f.relativePath.includes('.github/workflows') || f.relativePath.includes('.gitlab-ci')
    || f.relativePath.includes('Jenkinsfile') || f.relativePath.includes('.circleci')
  );
  if (!hasCI) {
    missing.push('CI/CD configuration');
  }

  return { complete, incomplete, missing, broken, deadCode };
}

/**
 * Generate file tree string.
 * @param {Array} files
 * @returns {string}
 */
function generateFileTree(files) {
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const lines = [];
  for (const f of sorted) {
    const sizeStr = f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`;
    lines.push(`${f.relativePath} (${sizeStr})`);
  }
  return lines.join('\n');
}

/**
 * Generate the complete Repository Intelligence Report.
 * @param {string} repoDir - Path to extracted/repository directory
 * @returns {object} Full report object with all sections
 */
function generateReport(repoDir) {
  const files = enumerateFiles(repoDir);
  const fileContents = new Map();

  for (const f of files) {
    const content = readFileContent(f.path, f.ext);
    if (content !== null) {
      fileContents.set(f.relativePath, content);
    }
  }

  const techStack = detectTechStack(files, fileContents);
  const architecture = analyzeArchitecture(files, fileContents);
  const facts = extractFacts(files, fileContents);
  const completeness = assessCompleteness(files, fileContents);
  const fileTree = generateFileTree(files);

  return {
    fileTree,
    files,
    fileContents,
    techStack,
    architecture,
    facts,
    completeness
  };
}

/**
 * Format the report as a structured text block.
 * @param {object} report - Report from generateReport()
 * @returns {string}
 */
function formatReport(report) {
  const sections = [];

  sections.push('REPOSITORY INTELLIGENCE REPORT');
  sections.push('='.repeat(60));

  sections.push('\nFILE TREE');
  sections.push('-'.repeat(40));
  sections.push(report.fileTree);

  sections.push('\nTECHNOLOGY STACK');
  sections.push('-'.repeat(40));
  sections.push(`Language(s): ${report.techStack.languages.join(', ') || 'NOT_FOUND'}`);
  sections.push(`Framework(s): ${report.techStack.frameworks.join(', ') || 'NOT_FOUND'}`);
  sections.push(`Build System: ${report.techStack.buildSystem.join(', ') || 'NOT_FOUND'}`);
  sections.push(`Package Manager: ${report.techStack.packageManager.join(', ') || 'NOT_FOUND'}`);
  sections.push(`Testing Framework: ${report.techStack.testingFramework.join(', ') || 'NOT_FOUND'}`);

  sections.push('\nARCHITECTURE ANALYSIS');
  sections.push('-'.repeat(40));
  sections.push(`Pattern: ${report.architecture.pattern}`);
  sections.push(`Top-Level Directories: ${report.architecture.topLevelDirs.join(', ')}`);
  sections.push(`Entry Points: ${report.architecture.entryPoints.join(', ') || 'NOT_FOUND'}`);

  sections.push('\nCODING CONVENTIONS (MUST PRESERVE)');
  sections.push('-'.repeat(40));
  sections.push(`File Naming: ${report.architecture.conventions.fileNaming}`);
  sections.push(`Import Style: ${report.architecture.conventions.importStyle}`);
  sections.push(`Error Handling: ${report.architecture.conventions.errorHandling}`);

  sections.push('\nEXTRACTED FACTS (WITH SOURCES)');
  sections.push('-'.repeat(40));
  for (const fact of report.facts) {
    sections.push(`${fact.key} = ${fact.value} (SOURCE: ${fact.source}:${fact.line})`);
  }
  if (report.facts.length === 0) {
    sections.push('No facts extracted');
  }

  sections.push('\nINVENTORY');
  sections.push('-'.repeat(40));
  sections.push(`Complete: ${report.completeness.complete.length} files`);
  if (report.completeness.incomplete.length > 0) {
    sections.push('Incomplete:');
    for (const item of report.completeness.incomplete) {
      sections.push(`  - ${item.file}: ${item.reason}`);
    }
  }
  if (report.completeness.missing.length > 0) {
    sections.push('Missing:');
    for (const item of report.completeness.missing) {
      sections.push(`  - ${item}`);
    }
  }
  if (report.completeness.broken.length > 0) {
    sections.push('Broken:');
    for (const item of report.completeness.broken) {
      sections.push(`  - ${item}`);
    }
  }

  return sections.join('\n');
}

module.exports = {
  extractZip,
  enumerateFiles,
  readFileContent,
  detectTechStack,
  analyzeArchitecture,
  extractFacts,
  assessCompleteness,
  generateReport,
  formatReport
};
