/**
 * Tech Stack Augmenter - Adds tech-stack-specific requirements
 * based on detected languages, frameworks, and build systems.
 */

/**
 * Generate tech-stack-specific augmentation text.
 * @param {object} techStack - From repository-analyzer detectTechStack()
 * @returns {string} Augmentation requirements text
 */
function generateAugmentation(techStack) {
  const sections = [];

  sections.push('TECH-STACK-SPECIFIC REQUIREMENTS');
  sections.push('='.repeat(60));

  const allTech = [
    ...techStack.languages,
    ...techStack.frameworks,
    ...techStack.buildSystem,
    ...techStack.packageManager
  ].map(t => t.toLowerCase());

  // Python
  if (allTech.includes('python')) {
    sections.push('\nPYTHON REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Virtual environment setup/activation commands must be included');
    sections.push('- requirements.txt or pyproject.toml must list all dependencies');
    sections.push('- Type hints must be present for all public API functions');
    sections.push('- Test structure must follow pytest or unittest conventions');
    sections.push('- All string formatting must use f-strings or .format() (no % formatting)');
    sections.push('- Imports must follow PEP 8 ordering: stdlib, third-party, local');
  }

  // Node.js / JavaScript / TypeScript
  if (allTech.includes('javascript') || allTech.includes('typescript') || allTech.includes('npm') || allTech.includes('yarn') || allTech.includes('pnpm')) {
    sections.push('\nNODE.JS / JAVASCRIPT REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- package.json must contain correct scripts for build, test, and start');
    sections.push('- node_modules must NOT be committed; .gitignore must exclude it');
    sections.push('- ESM vs CommonJS must be consistent with existing codebase patterns');

    if (allTech.includes('typescript')) {
      sections.push('- TypeScript configuration (tsconfig.json) must be maintained');
      sections.push('- All new code must pass strict TypeScript compilation');
      sections.push('- Type assertions (as) must be avoided where type narrowing suffices');
      sections.push('- Explicit return types on exported functions');
    }
  }

  // Angular
  if (allTech.includes('angular')) {
    sections.push('\nANGULAR REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Components must follow standalone component pattern if existing code uses it');
    sections.push('- Services must use @Injectable({ providedIn: \'root\' }) unless scoped');
    sections.push('- Templates must use Angular control flow syntax (@if, @for) if Angular 17+');
    sections.push('- Signals must be preferred over BehaviorSubject for new state management');
    sections.push('- angular.json configuration must remain valid');
    sections.push('- Component selectors must follow existing prefix conventions');
  }

  // React
  if (allTech.includes('react')) {
    sections.push('\nREACT REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Components must follow functional component pattern with hooks');
    sections.push('- State management must be consistent with existing patterns (Context/Redux/Zustand)');
    sections.push('- JSX/TSX files must use consistent file extensions');
    sections.push('- Custom hooks must follow use* naming convention');
    sections.push('- Prop types or TypeScript interfaces must define component props');
  }

  // Next.js
  if (allTech.includes('next.js')) {
    sections.push('\nNEXT.JS REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- App Router vs Pages Router must match existing pattern');
    sections.push('- Server/Client component boundaries must be explicitly marked');
    sections.push('- API routes must follow Next.js conventions');
    sections.push('- next.config.js must remain valid');
  }

  // Vue.js
  if (allTech.includes('vue.js')) {
    sections.push('\nVUE.JS REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Components must follow Composition API or Options API consistently');
    sections.push('- Single File Components (.vue) must maintain template/script/style order');
    sections.push('- Vue Router configuration must remain valid');
    sections.push('- Pinia/Vuex store patterns must be followed');
  }

  // Java/JVM
  if (allTech.includes('java') || allTech.includes('kotlin') || allTech.includes('gradle') || allTech.includes('maven')) {
    sections.push('\nJAVA/JVM REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- build.gradle or pom.xml must be valid and list all dependencies');
    sections.push('- Package structure must follow Java conventions (com.company.project)');
    sections.push('- Exception handling must use specific exception types, not generic Exception');
    sections.push('- Maven/Gradle wrapper scripts must be present if they existed before');
    sections.push('- JUnit or TestNG test structure must follow existing patterns');
  }

  // Rust
  if (allTech.includes('rust') || allTech.includes('cargo')) {
    sections.push('\nRUST REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Cargo.toml must list all dependencies with proper version constraints');
    sections.push('- Error handling must use Result<T, E> with proper error types');
    sections.push('- Ownership and borrowing must be correct (no unnecessary clones)');
    sections.push('- Code must pass cargo fmt formatting check');
    sections.push('- Code must pass cargo clippy without warnings');
    sections.push('- unsafe blocks must include safety comments');
  }

  // Go
  if (allTech.includes('go') || allTech.includes('go modules')) {
    sections.push('\nGO REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- go.mod must be maintained with proper module path');
    sections.push('- Error handling must follow Go conventions (if err != nil)');
    sections.push('- Code must pass gofmt formatting');
    sections.push('- Package naming must follow Go conventions (lowercase, no underscores)');
    sections.push('- Exported functions must have doc comments');
    sections.push('- go vet must pass without issues');
  }

  // C# / .NET
  if (allTech.includes('c#')) {
    sections.push('\nC# / .NET REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Solution/project files must be valid');
    sections.push('- NuGet packages must be properly referenced');
    sections.push('- Async methods must follow async/await patterns consistently');
    sections.push('- Naming must follow .NET conventions (PascalCase for publics)');
  }

  // Capacitor / Mobile
  if (allTech.includes('capacitor')) {
    sections.push('\nMOBILE (CAPACITOR) REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- capacitor.config.ts/json must remain valid');
    sections.push('- Platform-specific code must use Capacitor plugin API');
    sections.push('- Web fallbacks must exist for native-only features');
    sections.push('- Android manifest permissions must be justified');
    sections.push('- webDir must point to correct build output directory');
  }

  // Docker
  if (allTech.includes('docker')) {
    sections.push('\nDOCKER REQUIREMENTS');
    sections.push('-'.repeat(40));
    sections.push('- Dockerfile must use specific base image tags (no :latest)');
    sections.push('- Multi-stage builds must be used where applicable');
    sections.push('- .dockerignore must exclude node_modules, .git, build artifacts');
    sections.push('- No secrets or credentials in Dockerfile or docker-compose');
  }

  // Database detection from content
  sections.push('\nUNIVERSAL REQUIREMENTS');
  sections.push('-'.repeat(40));
  sections.push('- No hardcoded credentials, API keys, or secrets in source code');
  sections.push('- All SQL queries must use parameterized queries (no string concatenation)');
  sections.push('- User input must be validated at system boundaries');
  sections.push('- Error messages must not expose internal system details');
  sections.push('- File paths must use platform-agnostic path joining');

  return sections.join('\n');
}

module.exports = {
  generateAugmentation
};
