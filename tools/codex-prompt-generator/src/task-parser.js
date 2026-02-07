/**
 * Task Parser - Phase 2: Task Requirement Decomposition
 *
 * Parses task specifications into structured requirements,
 * classifies by type and constraint level, and maps to repository state.
 */

const PRIORITY_KEYWORDS = {
  BLOCKING: ['MUST', 'REQUIRED', 'LOCKED', 'MANDATORY', 'BLOCKING', 'SHALL', 'CRITICAL'],
  CRITICAL: ['SHOULD', 'IMPORTANT', 'EXPECTED', 'NEEDED', 'ESSENTIAL'],
  IMPORTANT: ['WANT', 'NICE', 'PREFER', 'IDEALLY'],
  OPTIONAL: ['OPTIONAL', 'MAY', 'COULD', 'CONSIDER', 'BONUS']
};

const CONSTRAINT_MARKERS = ['LOCKED', 'REQUIRED', 'MUST', 'IMMUTABLE', 'NON-NEGOTIABLE', 'MANDATORY'];

const NF_CATEGORIES = {
  Performance: ['performance', 'speed', 'latency', 'throughput', 'fast', 'slow', 'optimize', 'efficient'],
  Security: ['security', 'auth', 'encrypt', 'permission', 'credential', 'token', 'xss', 'csrf', 'injection'],
  Scalability: ['scale', 'scalab', 'concurrent', 'parallel', 'distributed', 'load'],
  Maintainability: ['maintain', 'readable', 'clean', 'refactor', 'document', 'comment', 'test']
};

/**
 * Parse a task specification text into structured requirements.
 * @param {string} taskSpec - Raw task specification text
 * @returns {object} Parsed requirements
 */
function parseTaskSpec(taskSpec) {
  const lines = taskSpec.split('\n').map(l => l.trim()).filter(Boolean);
  const title = extractTitle(lines);
  const functionalReqs = extractFunctionalRequirements(taskSpec);
  const nonFunctionalReqs = extractNonFunctionalRequirements(taskSpec);
  const constraints = extractConstraints(taskSpec);
  const deliverables = extractDeliverables(taskSpec);

  return {
    title,
    rawSpec: taskSpec,
    functionalRequirements: functionalReqs,
    nonFunctionalRequirements: nonFunctionalReqs,
    constraints,
    deliverables
  };
}

/**
 * Extract title from task specification.
 * @param {string[]} lines
 * @returns {string}
 */
function extractTitle(lines) {
  for (const line of lines) {
    // Look for markdown headers
    const headerMatch = line.match(/^#+\s+(.+)/);
    if (headerMatch) return headerMatch[1].trim();

    // Look for title-like patterns
    const titleMatch = line.match(/^(?:Title|Task|Project|Feature):\s*(.+)/i);
    if (titleMatch) return titleMatch[1].trim();
  }

  // First non-empty line as fallback
  return lines[0] || 'Untitled Task';
}

/**
 * Classify priority based on keywords in requirement text.
 * @param {string} text
 * @returns {string}
 */
function classifyPriority(text) {
  const upper = text.toUpperCase();
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (upper.includes(keyword)) return priority;
    }
  }
  return 'IMPORTANT';
}

/**
 * Extract functional requirements from task spec.
 * @param {string} taskSpec
 * @returns {Array}
 */
function extractFunctionalRequirements(taskSpec) {
  const requirements = [];
  let reqCounter = 1;

  // Split into sections and parse
  const sections = taskSpec.split(/\n(?=#+\s|[A-Z][A-Z\s]+:)/);

  for (const section of sections) {
    const lines = section.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Numbered items
      const numberedMatch = line.match(/^\d+[\.\)]\s+(.+)/);
      if (numberedMatch) {
        const desc = numberedMatch[1];
        requirements.push({
          id: `REQ-F-${String(reqCounter).padStart(3, '0')}`,
          description: desc,
          priority: classifyPriority(desc),
          repoState: 'MISSING',
          dependencies: [],
          acceptance: deriveAcceptanceCriteria(desc)
        });
        reqCounter++;
        continue;
      }

      // Bullet items
      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      if (bulletMatch) {
        const desc = bulletMatch[1];
        // Skip if this looks like a sub-detail or is very short
        if (desc.length > 15) {
          requirements.push({
            id: `REQ-F-${String(reqCounter).padStart(3, '0')}`,
            description: desc,
            priority: classifyPriority(desc),
            repoState: 'MISSING',
            dependencies: [],
            acceptance: deriveAcceptanceCriteria(desc)
          });
          reqCounter++;
        }
        continue;
      }

      // Imperative sentences (verbs at start)
      const imperativeMatch = line.match(/^(Create|Add|Implement|Build|Write|Design|Configure|Set up|Update|Modify|Fix|Remove|Delete|Refactor|Migrate|Test|Deploy|Enable|Disable)\s+(.+)/i);
      if (imperativeMatch && line.length > 20) {
        requirements.push({
          id: `REQ-F-${String(reqCounter).padStart(3, '0')}`,
          description: line,
          priority: classifyPriority(line),
          repoState: 'MISSING',
          dependencies: [],
          acceptance: deriveAcceptanceCriteria(line)
        });
        reqCounter++;
      }
    }
  }

  // If no requirements extracted, treat the entire spec as one requirement
  if (requirements.length === 0) {
    requirements.push({
      id: 'REQ-F-001',
      description: taskSpec.substring(0, 200).trim(),
      priority: 'CRITICAL',
      repoState: 'MISSING',
      dependencies: [],
      acceptance: 'Task completed as specified'
    });
  }

  return requirements;
}

/**
 * Extract non-functional requirements from task spec.
 * @param {string} taskSpec
 * @returns {Array}
 */
function extractNonFunctionalRequirements(taskSpec) {
  const requirements = [];
  let reqCounter = 1;
  const lower = taskSpec.toLowerCase();

  for (const [category, keywords] of Object.entries(NF_CATEGORIES)) {
    for (const keyword of keywords) {
      const idx = lower.indexOf(keyword);
      if (idx !== -1) {
        // Extract the sentence containing this keyword
        const start = taskSpec.lastIndexOf('.', idx);
        const end = taskSpec.indexOf('.', idx);
        const sentence = taskSpec.substring(
          start === -1 ? 0 : start + 1,
          end === -1 ? taskSpec.length : end + 1
        ).trim();

        if (sentence.length > 10 && sentence.length < 500) {
          // Avoid duplicates
          const exists = requirements.some(r => r.description === sentence);
          if (!exists) {
            requirements.push({
              id: `REQ-NF-${String(reqCounter).padStart(3, '0')}`,
              description: sentence,
              category,
              metric: extractMetric(sentence),
              repoState: 'MISSING'
            });
            reqCounter++;
          }
        }
      }
    }
  }

  return requirements;
}

/**
 * Extract quantifiable metric from requirement text if present.
 * @param {string} text
 * @returns {string}
 */
function extractMetric(text) {
  // Look for numeric patterns
  const numMatch = text.match(/(\d+\s*(?:ms|seconds?|minutes?|MB|GB|%|requests?\/s|rps|tps))/i);
  if (numMatch) return numMatch[1];

  // Look for comparison patterns
  const compMatch = text.match(/(less than|under|below|at least|minimum|maximum|within)\s+\S+/i);
  if (compMatch) return compMatch[0];

  return 'N/A';
}

/**
 * Extract locked constraints from task spec.
 * @param {string} taskSpec
 * @returns {Array}
 */
function extractConstraints(taskSpec) {
  const constraints = [];
  let constCounter = 1;
  const lines = taskSpec.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upper = line.toUpperCase();

    for (const marker of CONSTRAINT_MARKERS) {
      if (upper.includes(marker)) {
        constraints.push({
          id: `CONSTRAINT-${String(constCounter).padStart(3, '0')}`,
          description: line.replace(/^[-*\d.)\s]+/, '').trim(),
          marker,
          verification: `Verify that: ${line.replace(/^[-*\d.)\s]+/, '').trim()}`,
          failureAction: `OUTPUT "FAIL: CONSTRAINT-${String(constCounter).padStart(3, '0')}" AND STOP`
        });
        constCounter++;
        break;
      }
    }
  }

  return constraints;
}

/**
 * Extract deliverables from task spec.
 * @param {string} taskSpec
 * @returns {Array}
 */
function extractDeliverables(taskSpec) {
  const deliverables = [];
  let delCounter = 1;
  const lines = taskSpec.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for file path mentions
    const fileMatch = trimmed.match(/(?:create|generate|produce|output|write)\s+(?:a\s+)?(?:file\s+)?(?:at\s+|to\s+|in\s+)?['"`]?([^\s'"`,]+\.\w+)/i);
    if (fileMatch) {
      deliverables.push({
        id: `DELIVERABLE-${String(delCounter).padStart(3, '0')}`,
        description: trimmed,
        type: inferDeliverableType(fileMatch[1]),
        location: fileMatch[1],
        format: inferFormat(fileMatch[1]),
        validation: `File exists at ${fileMatch[1]} and has valid content`
      });
      delCounter++;
      continue;
    }

    // Look for deliverable sections
    const deliverableMatch = trimmed.match(/^(?:Deliverable|Output|Artifact|Result)s?:\s*(.+)/i);
    if (deliverableMatch) {
      deliverables.push({
        id: `DELIVERABLE-${String(delCounter).padStart(3, '0')}`,
        description: deliverableMatch[1],
        type: 'unknown',
        location: 'TBD',
        format: 'TBD',
        validation: 'Verify artifact exists and meets specification'
      });
      delCounter++;
    }
  }

  return deliverables;
}

/**
 * Infer deliverable type from file path.
 * @param {string} filePath
 * @returns {string}
 */
function inferDeliverableType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const typeMap = {
    js: 'executable', ts: 'executable', py: 'executable', rb: 'executable',
    go: 'executable', rs: 'executable', java: 'executable', cs: 'executable',
    json: 'configuration', yaml: 'configuration', yml: 'configuration',
    toml: 'configuration', ini: 'configuration', xml: 'configuration',
    md: 'document', txt: 'document', rst: 'document',
    html: 'document', css: 'document',
    sh: 'script', bash: 'script', bat: 'script', ps1: 'script',
    sql: 'database', dockerfile: 'configuration'
  };
  return typeMap[ext] || 'unknown';
}

/**
 * Infer format from file path.
 * @param {string} filePath
 * @returns {string}
 */
function inferFormat(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ext.toUpperCase();
}

/**
 * Derive acceptance criteria from a requirement description.
 * @param {string} description
 * @returns {string}
 */
function deriveAcceptanceCriteria(description) {
  const lower = description.toLowerCase();

  if (lower.includes('create') || lower.includes('add') || lower.includes('implement')) {
    return `Feature exists and functions as described: ${description.substring(0, 100)}`;
  }
  if (lower.includes('fix') || lower.includes('resolve') || lower.includes('repair')) {
    return `Issue resolved: ${description.substring(0, 100)}`;
  }
  if (lower.includes('test')) {
    return `Tests pass successfully: ${description.substring(0, 100)}`;
  }
  if (lower.includes('remove') || lower.includes('delete')) {
    return `Item removed: ${description.substring(0, 100)}`;
  }
  if (lower.includes('update') || lower.includes('modify') || lower.includes('change')) {
    return `Update applied: ${description.substring(0, 100)}`;
  }
  if (lower.includes('configure') || lower.includes('set up') || lower.includes('setup')) {
    return `Configuration complete: ${description.substring(0, 100)}`;
  }

  return `Completed as specified: ${description.substring(0, 100)}`;
}

/**
 * Map requirements to repository state.
 * @param {Array} requirements - Functional requirements
 * @param {object} report - Repository intelligence report
 * @returns {Array} Requirements with updated repoState
 */
function mapToRepoState(requirements, report) {
  const completePaths = new Set(report.completeness.complete);
  const allContent = [...report.fileContents.values()].join('\n').toLowerCase();

  return requirements.map(req => {
    const desc = req.description.toLowerCase();

    // Check if key terms from the requirement appear in existing code
    const words = desc.split(/\s+/).filter(w => w.length > 4);
    const matchCount = words.filter(w => allContent.includes(w)).length;
    const matchRatio = words.length > 0 ? matchCount / words.length : 0;

    let repoState = 'MISSING';
    if (matchRatio > 0.7) {
      repoState = 'SATISFIED';
    } else if (matchRatio > 0.4) {
      repoState = 'INCOMPLETE';
    }

    return { ...req, repoState };
  });
}

/**
 * Format the requirements matrix as structured text.
 * @param {object} parsed - Parsed task spec
 * @returns {string}
 */
function formatRequirementsMatrix(parsed) {
  const sections = [];

  sections.push('TASK REQUIREMENTS MATRIX');
  sections.push('='.repeat(60));

  sections.push('\nFUNCTIONAL REQUIREMENTS');
  sections.push('-'.repeat(40));
  for (const req of parsed.functionalRequirements) {
    sections.push(`${req.id}: ${req.description}`);
    sections.push(`  Priority: ${req.priority}`);
    sections.push(`  Repo State: ${req.repoState}`);
    sections.push(`  Dependencies: ${req.dependencies.length > 0 ? req.dependencies.join(', ') : 'None'}`);
    sections.push(`  Acceptance: ${req.acceptance}`);
    sections.push('');
  }

  sections.push('NON-FUNCTIONAL REQUIREMENTS');
  sections.push('-'.repeat(40));
  for (const req of parsed.nonFunctionalRequirements) {
    sections.push(`${req.id}: ${req.description}`);
    sections.push(`  Category: ${req.category}`);
    sections.push(`  Metric: ${req.metric}`);
    sections.push(`  Repo State: ${req.repoState}`);
    sections.push('');
  }
  if (parsed.nonFunctionalRequirements.length === 0) {
    sections.push('None identified');
    sections.push('');
  }

  sections.push('LOCKED CONSTRAINTS (IMMUTABLE)');
  sections.push('-'.repeat(40));
  for (const c of parsed.constraints) {
    sections.push(`${c.id}: ${c.description}`);
    sections.push(`  Verification: ${c.verification}`);
    sections.push(`  Failure Action: ${c.failureAction}`);
    sections.push('');
  }
  if (parsed.constraints.length === 0) {
    sections.push('None identified');
    sections.push('');
  }

  sections.push('DELIVERABLES');
  sections.push('-'.repeat(40));
  for (const d of parsed.deliverables) {
    sections.push(`${d.id}: ${d.description}`);
    sections.push(`  Type: ${d.type}`);
    sections.push(`  Location: ${d.location}`);
    sections.push(`  Format: ${d.format}`);
    sections.push(`  Validation: ${d.validation}`);
    sections.push('');
  }
  if (parsed.deliverables.length === 0) {
    sections.push('None explicitly specified');
    sections.push('');
  }

  return sections.join('\n');
}

module.exports = {
  parseTaskSpec,
  mapToRepoState,
  formatRequirementsMatrix,
  classifyPriority,
  extractConstraints,
  extractDeliverables,
  deriveAcceptanceCriteria
};
