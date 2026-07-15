/**
 * Posts a detailed code coverage comment to a GitHub issue or pull request.
 *
 * This script reads the coverage summary from 'coverage/coverage-summary.json'
 * and posts a formatted comment to the current GitHub issue or pull request
 * using the GitHub Actions context.
 *
 * Usage: This script is intended to be run within a GitHub Actions workflow.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const COVERAGE_PATH = path.join(ROOT, "coverage", "coverage-summary.json");
const COVERAGE_MARKER = "<!-- coverage-report -->";
const FULL_COVERAGE_PCT = 100;
const WARNING_THRESHOLD_RATIO = 0.75;

if (!fs.existsSync(COVERAGE_PATH)) {
  const relativePath = path.relative(ROOT, COVERAGE_PATH);
  console.error(
    `Error: ${relativePath} not found. Please run \`npm run test:coverage\` first.`,
  );
  process.exit(1);
}

/**
 * Get the status icon based on coverage percentage.
 *
 * @param {number} pct
 * @param {number} threshold
 * @returns {string} Status icon (✅, ⚠️, ❌)
 */
function getStatusIcon(pct, threshold = 80) {
  if (pct >= threshold) {
    return "✅";
  }
  if (pct >= threshold * WARNING_THRESHOLD_RATIO) {
    return "⚠️";
  }
  return "❌";
}

/**
 * Format the coverage percentage for display.
 *
 * @param {number} pct
 * @returns {string} Formatted percentage
 */
function formatPercentage(pct) {
  return `${pct.toFixed(1)}%`;
}

/**
 * Get the top uncovered files from the coverage report.
 *
 * This will ignore files within `scripts/` as they are not part of the main
 * codebase.
 *
 * @param {Object} coverage - The coverage report object.
 * @param {number} limit - The maximum number of files to return.
 * @returns {Array} List of uncovered files.
 */
function getTopUncoveredFiles(coverage, limit = 5) {
  const files = Object.entries(coverage)
    .filter(([key]) => key !== "total")
    .filter(([key]) => !key.startsWith("scripts/"))
    .map(([file, data]) => ({
      file: file.replace(`${ROOT}/`, ""),
      lines: data.lines.pct,
    }))
    .filter((item) => item.lines < FULL_COVERAGE_PCT)
    .sort((a, b) => a.lines - b.lines)
    .slice(0, limit);

  return files;
}

/**
 * Reads and parses the coverage summary JSON file.
 *
 * @param {string} coveragePath - Path to the coverage summary file.
 * @returns {Object} Parsed coverage summary object.
 */
function readCoverage(coveragePath) {
  return JSON.parse(fs.readFileSync(coveragePath, "utf8"));
}

/**
 * Build the coverage metrics tables
 *
 * @param {{ lines: Object, functions: Object, branches: Object, statements: Object }} metrics - Coverage data per metric.
 * @param {{ lines: number, functions: number, branches: number, statements: number }} thresholds - Per-metric coverage thresholds.
 * @returns {string} Markdown table of coverage metrics.
 */
function buildCoverageMetricsTable(
  { lines, functions, branches, statements },
  thresholds,
) {
  return [
    "### 📈 Coverage Metrics",
    "",
    "| Metric | Coverage | Target | Status |",
    "|--------|----------|--------|--------|",
    `| **Lines**      | **${formatPercentage(lines.pct)}**      | ${thresholds.lines}% | ${getStatusIcon(lines.pct, thresholds.lines)}      |`,
    `| **Functions**  | **${formatPercentage(functions.pct)}**  | ${thresholds.functions}% | ${getStatusIcon(functions.pct, thresholds.functions)}  |`,
    `| **Branches**   | **${formatPercentage(branches.pct)}**   | ${thresholds.branches}% | ${getStatusIcon(branches.pct, thresholds.branches)}   |`,
    `| **Statements** | **${formatPercentage(statements.pct)}** | ${thresholds.statements}% | ${getStatusIcon(statements.pct, thresholds.statements)} |`,
  ].join("\n");
}

/**
 * Builds the test statistics section of the comment.
 *
 * @param {Object} lines - Lines coverage data.
 * @param {Object} functions - Functions coverage data.
 * @param {Object} branches - Branches coverage data.
 * @param {Object} statements - Statements coverage data.
 * @return {string} Markdown section for test statistics.
 */
function buildTestStatistics(lines, functions, branches, statements) {
  return [
    "### 📊 Test Statistics",
    "",
    `- **Total Lines:** ${lines.covered.toLocaleString()} / ${lines.total.toLocaleString()}`,
    `- **Total Functions:** ${functions.covered} / ${functions.total}`,
    `- **Total Branches:** ${branches.covered} / ${branches.total}`,
    `- **Total Statements:** ${statements.covered} / ${statements.total}`,
  ].join("\n");
}

function buildUncoveredFilesSection(coverage) {
  const uncoveredFiles = getTopUncoveredFiles(coverage);
  if (uncoveredFiles.length === 0) {
    return "";
  }

  const lines = [
    "",
    "### 🔍 Files Needing Coverage",
    "",
    "| File | Coverage |",
    "|------|----------|",
  ];
  for (const item of uncoveredFiles) {
    lines.push(`| \`${item.file}\` | ${formatPercentage(item.lines)} |`);
  }
  return lines.join("\n");
}

/**
 * Builds the markdown body for the coverage comment, including metrics and uncovered files.
 *
 * @param {Object} coverage - Parsed coverage summary object.
 * @param {Object} github - GitHub Actions github object.
 * @param {Object} context - GitHub Actions context object.
 * @returns {string} Markdown body for the coverage comment.
 */
function buildCoverageComment(coverage, _github, context) {
  const { total } = coverage;
  const thresholds = { lines: 75, functions: 75, branches: 80, statements: 75 };
  const overallPass =
    total.lines.pct >= thresholds.lines &&
    total.functions.pct >= thresholds.functions &&
    total.branches.pct >= thresholds.branches &&
    total.statements.pct >= thresholds.statements;
  const statusIcon = overallPass ? "🎯" : "📊";
  const statusText = overallPass ? "Coverage Target Met!" : "Coverage Report";
  const workflowLink = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
  const footerLinks = `[View workflow](${workflowLink})`;

  return [
    COVERAGE_MARKER,
    `## ${statusIcon} ${statusText}`,
    "",
    buildCoverageMetricsTable(
      {
        lines: total.lines,
        functions: total.functions,
        branches: total.branches,
        statements: total.statements,
      },
      thresholds,
    ),
    "",
    buildTestStatistics(
      total.lines,
      total.functions,
      total.branches,
      total.statements,
    ),
    "",
    buildUncoveredFilesSection(coverage),
    "",
    "---",
    "",
    `📝 Report generated on Node.js ${process.version} • ${footerLinks} • Coverage by Vitest + v8`,
  ].join("\n");
}

/**
 * Builds the fallback comment body if coverage report cannot be generated.
 *
 * @param {Error} error - The error encountered while reading coverage.
 * @param {Object} context - GitHub Actions context object.
 * @returns {string} Markdown body for the fallback comment.
 */
function buildFallbackComment(error, context) {
  const actionsUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions`;
  return [
    COVERAGE_MARKER,
    "❌ **Coverage Report Failed**",
    `Could not generate coverage report: ${error.message}`,
    `Please check the [workflow logs](${actionsUrl}) for more details.`,
  ].join("\n");
}

/**
 * Creates or updates the coverage comment on the PR/issue.
 * If a comment with the marker exists, it is updated; otherwise, a new comment is created.
 *
 * @param {string} body - Markdown body for the coverage comment.
 * @param {Object} github - GitHub Actions github object.
 */
async function upsertCoverageComment(body, github, context) {
  const { data: comments } = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  const existing = comments.find((c) => c.body?.includes(COVERAGE_MARKER));
  if (existing) {
    await github.rest.issues.updateComment({
      comment_id: existing.id,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body,
    });
  }
}

export async function postCoverageComment({ github, context }) {
  try {
    const coverage = readCoverage(COVERAGE_PATH);
    const commentBody = buildCoverageComment(coverage, github, context);
    await upsertCoverageComment(commentBody, github, context);
  } catch (error) {
    console.log("Could not read coverage report:", error.message);
    const fallbackBody = buildFallbackComment(error, context);
    await upsertCoverageComment(fallbackBody, github, context);
  }
}
