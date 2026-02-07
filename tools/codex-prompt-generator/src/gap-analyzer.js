/**
 * Gap Analyzer - Phase 3: Gap Analysis & Dependency Ordering
 *
 * Maps requirements to repository state, identifies gaps,
 * orders by dependency chain, and estimates scope.
 */

const path = require('path');

/**
 * Generate gap analysis from parsed requirements and repository report.
 * @param {object} parsedTask - From task-parser
 * @param {object} repoReport - From repository-analyzer
 * @returns {object} Gap analysis with dependency graph
 */
function analyzeGaps(parsedTask, repoReport) {
  const gaps = [];
  let gapCounter = { B: 0, C: 0, I: 0, O: 0 };

  for (const req of parsedTask.functionalRequirements) {
    if (req.repoState === 'SATISFIED') continue;

    const priorityPrefix = mapPriorityToGapPrefix(req.priority);
    gapCounter[priorityPrefix]++;
    const gapId = `GAP-${priorityPrefix}-${String(gapCounter[priorityPrefix]).padStart(3, '0')}`;

    const affectedFiles = identifyAffectedFiles(req, repoReport);
    const currentState = describeCurrentState(req, repoReport);

    gaps.push({
      id: gapId,
      requirementId: req.id,
      description: req.description,
      priority: req.priority,
      currentState,
      requiredState: req.acceptance,
      action: determineAction(req, repoReport),
      affectedFiles,
      blocks: [],
      blockedBy: []
    });
  }

  // Add gaps for constraints that are not satisfied
  for (const constraint of parsedTask.constraints) {
    gapCounter.B++;
    const gapId = `GAP-B-${String(gapCounter.B).padStart(3, '0')}`;
    gaps.push({
      id: gapId,
      requirementId: constraint.id,
      description: `Satisfy constraint: ${constraint.description}`,
      priority: 'BLOCKING',
      currentState: 'Constraint not verified',
      requiredState: constraint.verification,
      action: 'VERIFY',
      affectedFiles: [],
      blocks: [],
      blockedBy: []
    });
  }

  // Resolve dependencies between gaps
  resolveDependencies(gaps, repoReport);

  // Sort by dependency order
  const ordered = topologicalSort(gaps);

  // Build dependency graph text
  const dependencyGraph = buildDependencyGraph(ordered);

  return {
    gaps: ordered,
    dependencyGraph,
    summary: {
      blocking: gaps.filter(g => g.priority === 'BLOCKING').length,
      critical: gaps.filter(g => g.priority === 'CRITICAL').length,
      important: gaps.filter(g => g.priority === 'IMPORTANT').length,
      optional: gaps.filter(g => g.priority === 'OPTIONAL').length,
      total: gaps.length
    }
  };
}

/**
 * Map priority string to gap prefix letter.
 * @param {string} priority
 * @returns {string}
 */
function mapPriorityToGapPrefix(priority) {
  const map = {
    BLOCKING: 'B',
    CRITICAL: 'C',
    IMPORTANT: 'I',
    OPTIONAL: 'O'
  };
  return map[priority] || 'I';
}

/**
 * Identify files that will be affected by implementing a requirement.
 * @param {object} req - Requirement
 * @param {object} repoReport - Repository report
 * @returns {Array<{file: string, action: string}>}
 */
function identifyAffectedFiles(req, repoReport) {
  const affected = [];
  const desc = req.description.toLowerCase();

  // Look for file path mentions in the requirement
  const filePathMatch = desc.match(/(?:in|at|to|from|file)\s+['"`]?([^\s'"`,]+\.\w+)/);
  if (filePathMatch) {
    const mentioned = filePathMatch[1];
    const existing = repoReport.files.find(f =>
      f.relativePath.includes(mentioned) || path.basename(f.relativePath) === mentioned
    );
    if (existing) {
      affected.push({ file: existing.relativePath, action: 'MODIFY' });
    } else {
      affected.push({ file: mentioned, action: 'CREATE' });
    }
  }

  // Infer affected files from keywords
  const keywords = extractKeywords(desc);
  for (const [relPath, content] of repoReport.fileContents) {
    if (!content) continue;
    const lower = content.toLowerCase();
    const matchCount = keywords.filter(k => lower.includes(k)).length;
    if (matchCount >= 2 && affected.length < 10) {
      if (!affected.some(a => a.file === relPath)) {
        affected.push({ file: relPath, action: 'MODIFY' });
      }
    }
  }

  // If no files identified, suggest creation
  if (affected.length === 0) {
    affected.push({ file: 'TBD (new file required)', action: 'CREATE' });
  }

  return affected;
}

/**
 * Extract meaningful keywords from a description.
 * @param {string} desc
 * @returns {string[]}
 */
function extractKeywords(desc) {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'that', 'this',
    'these', 'those', 'it', 'its', 'not', 'no', 'all', 'each', 'every',
    'any', 'some', 'such', 'new', 'must', 'need', 'also'
  ]);

  return desc.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 3 && !stopwords.has(w));
}

/**
 * Describe current state of a requirement in the repository.
 * @param {object} req
 * @param {object} repoReport
 * @returns {string}
 */
function describeCurrentState(req, repoReport) {
  switch (req.repoState) {
    case 'SATISFIED':
      return 'Fully implemented in existing codebase';
    case 'INCOMPLETE':
      return 'Partially implemented; requires completion';
    case 'CONFLICTS':
      return 'Existing implementation conflicts with requirement';
    case 'MISSING':
    default:
      return 'Not present in current codebase';
  }
}

/**
 * Determine the action needed for a requirement.
 * @param {object} req
 * @param {object} repoReport
 * @returns {string}
 */
function determineAction(req, repoReport) {
  const desc = req.description.toLowerCase();

  if (desc.includes('remove') || desc.includes('delete')) return 'REMOVE';
  if (desc.includes('fix') || desc.includes('repair') || desc.includes('resolve')) return 'FIX';
  if (desc.includes('refactor') || desc.includes('restructure')) return 'REFACTOR';
  if (req.repoState === 'INCOMPLETE') return 'MODIFY';
  if (req.repoState === 'MISSING') return 'CREATE';
  if (req.repoState === 'CONFLICTS') return 'MODIFY';

  return 'CREATE';
}

/**
 * Resolve dependencies between gaps based on content analysis.
 * @param {Array} gaps
 * @param {object} repoReport
 */
function resolveDependencies(gaps, repoReport) {
  // Simple heuristic: blocking gaps block critical gaps, critical block important, etc.
  const blocking = gaps.filter(g => g.priority === 'BLOCKING');
  const critical = gaps.filter(g => g.priority === 'CRITICAL');
  const important = gaps.filter(g => g.priority === 'IMPORTANT');
  const optional = gaps.filter(g => g.priority === 'OPTIONAL');

  // Blocking gaps block all critical gaps
  for (const bg of blocking) {
    for (const cg of critical) {
      if (!bg.blocks.includes(cg.id)) bg.blocks.push(cg.id);
      if (!cg.blockedBy.includes(bg.id)) cg.blockedBy.push(bg.id);
    }
  }

  // File-based dependencies: if two gaps affect the same file, order by priority
  for (let i = 0; i < gaps.length; i++) {
    for (let j = i + 1; j < gaps.length; j++) {
      const filesA = new Set(gaps[i].affectedFiles.map(f => f.file));
      const filesB = new Set(gaps[j].affectedFiles.map(f => f.file));

      const overlap = [...filesA].filter(f => filesB.has(f));
      if (overlap.length > 0) {
        const priorityOrder = ['BLOCKING', 'CRITICAL', 'IMPORTANT', 'OPTIONAL'];
        const prioA = priorityOrder.indexOf(gaps[i].priority);
        const prioB = priorityOrder.indexOf(gaps[j].priority);

        if (prioA < prioB) {
          if (!gaps[i].blocks.includes(gaps[j].id)) gaps[i].blocks.push(gaps[j].id);
          if (!gaps[j].blockedBy.includes(gaps[i].id)) gaps[j].blockedBy.push(gaps[i].id);
        } else if (prioB < prioA) {
          if (!gaps[j].blocks.includes(gaps[i].id)) gaps[j].blocks.push(gaps[i].id);
          if (!gaps[i].blockedBy.includes(gaps[j].id)) gaps[i].blockedBy.push(gaps[j].id);
        }
      }
    }
  }
}

/**
 * Topological sort of gaps based on blockedBy dependencies.
 * @param {Array} gaps
 * @returns {Array}
 */
function topologicalSort(gaps) {
  const gapMap = new Map(gaps.map(g => [g.id, g]));
  const visited = new Set();
  const result = [];

  function visit(gap) {
    if (visited.has(gap.id)) return;
    visited.add(gap.id);

    for (const blockerId of gap.blockedBy) {
      const blocker = gapMap.get(blockerId);
      if (blocker) visit(blocker);
    }

    result.push(gap);
  }

  // Visit in priority order
  const priorityOrder = ['BLOCKING', 'CRITICAL', 'IMPORTANT', 'OPTIONAL'];
  for (const priority of priorityOrder) {
    for (const gap of gaps.filter(g => g.priority === priority)) {
      visit(gap);
    }
  }

  return result;
}

/**
 * Build a text representation of the dependency graph.
 * @param {Array} orderedGaps
 * @returns {string}
 */
function buildDependencyGraph(orderedGaps) {
  const lines = ['DEPENDENCY GRAPH'];
  for (let i = 0; i < orderedGaps.length; i++) {
    const gap = orderedGaps[i];
    const blocksStr = gap.blocks.length > 0 ? ` (blocks: ${gap.blocks.join(', ')})` : '';
    lines.push(`${i + 1}. ${gap.id}${blocksStr}`);
  }
  return lines.join('\n');
}

/**
 * Format the gap analysis as structured text.
 * @param {object} analysis - From analyzeGaps()
 * @returns {string}
 */
function formatGapAnalysis(analysis) {
  const sections = [];

  sections.push('GAP ANALYSIS');
  sections.push('='.repeat(60));

  const categories = [
    { label: 'BLOCKING GAPS (MUST COMPLETE FIRST)', priority: 'BLOCKING' },
    { label: 'CRITICAL GAPS (CORE FUNCTIONALITY)', priority: 'CRITICAL' },
    { label: 'IMPORTANT GAPS (SIGNIFICANT FEATURES)', priority: 'IMPORTANT' },
    { label: 'OPTIONAL GAPS (ENHANCEMENTS)', priority: 'OPTIONAL' }
  ];

  for (const cat of categories) {
    sections.push(`\n${cat.label}`);
    sections.push('-'.repeat(40));

    const gapsInCat = analysis.gaps.filter(g => g.priority === cat.priority);
    if (gapsInCat.length === 0) {
      sections.push('None');
      continue;
    }

    for (const gap of gapsInCat) {
      sections.push(`${gap.id}: ${gap.description}`);
      sections.push(`  Requirement: ${gap.requirementId}`);
      sections.push(`  Current State: ${gap.currentState}`);
      sections.push(`  Required State: ${gap.requiredState}`);
      sections.push(`  Action: ${gap.action}`);
      sections.push(`  Files Affected:`);
      for (const af of gap.affectedFiles) {
        sections.push(`    - ${af.file} [${af.action}]`);
      }
      if (gap.blocks.length > 0) {
        sections.push(`  Blocks: ${gap.blocks.join(', ')}`);
      }
      sections.push('');
    }
  }

  sections.push('\n' + analysis.dependencyGraph);

  sections.push(`\nSUMMARY`);
  sections.push(`Blocking: ${analysis.summary.blocking}`);
  sections.push(`Critical: ${analysis.summary.critical}`);
  sections.push(`Important: ${analysis.summary.important}`);
  sections.push(`Optional: ${analysis.summary.optional}`);
  sections.push(`Total: ${analysis.summary.total}`);

  return sections.join('\n');
}

module.exports = {
  analyzeGaps,
  formatGapAnalysis,
  identifyAffectedFiles,
  topologicalSort,
  buildDependencyGraph
};
