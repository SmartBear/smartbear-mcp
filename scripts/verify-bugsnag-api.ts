/**
 * Structural diff of two versions of the BugSnag api.ts file.
 *
 * Usage:
 *   npx tsx scripts/verify-bugsnag-api.ts
 *   npx tsx scripts/verify-bugsnag-api.ts --old src/bugsnag/client/api/api.ts.bak --new src/bugsnag/client/api/api.ts
 *
 * Exits 0 if no exports were removed; exits 1 if any previously exported
 * name is absent in the new file (potential breaking change).
 */

import * as fs from "fs";
import { Project, type SourceFile, SyntaxKind } from "ts-morph";

const DEFAULT_OLD = "src/bugsnag/client/api/api.ts.bak";
const DEFAULT_NEW = "src/bugsnag/client/api/api.ts";

function parseArgs(): { oldPath: string; newPath: string } {
  const args = process.argv.slice(2);
  let oldPath = DEFAULT_OLD;
  let newPath = DEFAULT_NEW;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--old" && args[i + 1]) oldPath = args[++i];
    if (args[i] === "--new" && args[i + 1]) newPath = args[++i];
  }
  return { oldPath, newPath };
}

/** Returns a map of exported declaration name → kind from a source file. */
function getExportedNames(sourceFile: SourceFile): Map<string, string> {
  const result = new Map<string, string>();
  for (const [name, decls] of sourceFile.getExportedDeclarations()) {
    const kind = decls[0]?.getKindName() ?? "Unknown";
    result.set(name, kind);
  }
  return result;
}

/**
 * Returns a map of FetchParamCreator name → sorted list of method names.
 * Methods are the keys of the returned object literal.
 */
function getFetchParamCreatorMethods(
  sourceFile: SourceFile,
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const name = varDecl.getName();
    if (!name.endsWith("ApiFetchParamCreator")) continue;

    // Old swagger-codegen arrow-function style:
    //   (configuration?) => ({ method1(...) {...}, ... })
    // New swagger-codegen function-expression style:
    //   function(configuration?) { return { method1(...) {...}, ... }; }
    const initializer = varDecl.getInitializer();

    // Arrow function with parenthesized object literal body
    const arrowFn = initializer?.asKind(SyntaxKind.ArrowFunction);
    const arrowBody = arrowFn?.getBody();

    let objLiteral =
      arrowBody
        ?.asKind(SyntaxKind.ParenthesizedExpression)
        ?.getExpression()
        ?.asKind(SyntaxKind.ObjectLiteralExpression) ?? undefined;

    // Arrow function with block body containing a return statement
    if (!objLiteral && arrowBody?.isKind(SyntaxKind.Block)) {
      const returnStmt = arrowBody
        .asKind(SyntaxKind.Block)
        ?.getStatements()
        .find((s) => s.isKind(SyntaxKind.ReturnStatement));
      objLiteral = returnStmt
        ?.asKind(SyntaxKind.ReturnStatement)
        ?.getExpression()
        ?.asKind(SyntaxKind.ObjectLiteralExpression);
    }

    // FunctionExpression with a block body containing a return statement
    if (!objLiteral) {
      const fnExpr = initializer?.asKind(SyntaxKind.FunctionExpression);
      const returnStmt = fnExpr
        ?.getBody()
        ?.getStatements()
        .find((s) => s.isKind(SyntaxKind.ReturnStatement));
      objLiteral = returnStmt
        ?.asKind(SyntaxKind.ReturnStatement)
        ?.getExpression()
        ?.asKind(SyntaxKind.ObjectLiteralExpression);
    }

    if (!objLiteral) {
      result.set(name, []);
      continue;
    }

    const methods = objLiteral
      .getProperties()
      .map((p) => {
        if (
          p.isKind(SyntaxKind.MethodDeclaration) ||
          p.isKind(SyntaxKind.ShorthandPropertyAssignment) ||
          p.isKind(SyntaxKind.PropertyAssignment)
        ) {
          return p.getName();
        }
        return null;
      })
      .filter((n): n is string => n !== null)
      .sort();

    result.set(name, methods);
  }

  return result;
}

function setDiff<T>(a: Map<T, unknown>, b: Map<T, unknown>) {
  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  return { added, removed };
}

function setDiffSet<T>(a: Set<T>, b: Set<T>) {
  return {
    added: [...b].filter((k) => !a.has(k)),
    removed: [...a].filter((k) => !b.has(k)),
  };
}

function printSection(title: string) {
  console.log(`\n${title}`);
  console.log("─".repeat(title.length));
}

function printList(label: string, items: string[]) {
  if (items.length === 0) {
    console.log(`  ${label}: (none)`);
  } else {
    console.log(`  ${label}:`);
    for (const item of items) console.log(`    + ${item}`);
  }
}

function printRemovedList(label: string, items: string[]) {
  if (items.length === 0) {
    console.log(`  ${label}: (none)`);
  } else {
    console.log(`  ${label}:`);
    for (const item of items) console.log(`    - ${item}`);
  }
}

async function main() {
  const { oldPath, newPath } = parseArgs();

  console.log("BugSnag API Verification Report");
  console.log("================================");
  console.log(`Comparing: ${oldPath} → ${newPath}`);

  const project = new Project({ tsConfigFilePath: "tsconfig.json" });

  // Non-.ts extensions (e.g. .bak) aren't recognised by TypeScript.
  // Load as in-memory virtual source files with unique .ts paths.
  function loadAsVirtual(filePath: string, tag: string): SourceFile {
    const content = fs.readFileSync(filePath, "utf-8");
    const virtualPath = filePath.replace(/(\.[^./\\]+)?$/, "") + `__${tag}.ts`;
    return project.createSourceFile(virtualPath, content, { overwrite: true });
  }

  const oldFile = loadAsVirtual(oldPath, "old");
  const newFile = loadAsVirtual(newPath, "new");

  // --- Exported declarations ---
  const oldExports = getExportedNames(oldFile);
  const newExports = getExportedNames(newFile);
  const exportDiff = setDiff(oldExports, newExports);

  printSection("EXPORTED DECLARATIONS");
  printList("Added", exportDiff.added);
  printRemovedList("Removed", exportDiff.removed);
  const unchangedExports = [...oldExports.keys()].filter((k) =>
    newExports.has(k),
  ).length;
  console.log(`  Unchanged: ${unchangedExports}`);

  // --- FetchParamCreator methods ---
  const oldMethods = getFetchParamCreatorMethods(oldFile);
  const newMethods = getFetchParamCreatorMethods(newFile);
  const creatorDiff = setDiff(oldMethods, newMethods);

  printSection("FETCH PARAM CREATORS");

  if (creatorDiff.added.length > 0) {
    console.log("  New creators:");
    for (const c of creatorDiff.added) console.log(`    + ${c}`);
  }
  if (creatorDiff.removed.length > 0) {
    console.log("  Removed creators:");
    for (const c of creatorDiff.removed) console.log(`    - ${c}`);
  }

  const allCreators = new Set([...oldMethods.keys(), ...newMethods.keys()]);
  for (const creator of allCreators) {
    const oldM = new Set(oldMethods.get(creator) ?? []);
    const newM = new Set(newMethods.get(creator) ?? []);
    const mDiff = setDiffSet(oldM, newM);
    console.log(`\n  ${creator}`);
    printList("Added", mDiff.added);
    printRemovedList("Removed", mDiff.removed);
    const same = [...oldM].filter((m) => newM.has(m)).length;
    console.log(`    Unchanged: ${same}`);
  }

  // --- Summary ---
  printSection("SUMMARY");

  const hasRemovedExports = exportDiff.removed.length > 0;
  const hasRemovedCreators = creatorDiff.removed.length > 0;
  const hasRemovedMethods = [...allCreators].some((c) => {
    const oldM = new Set(oldMethods.get(c) ?? []);
    const newM = new Set(newMethods.get(c) ?? []);
    return [...oldM].some((m) => !newM.has(m));
  });

  if (!hasRemovedExports && !hasRemovedCreators && !hasRemovedMethods) {
    console.log("  ✓ No breaking changes detected");
    process.exit(0);
  } else {
    if (hasRemovedExports) {
      console.log(
        `  ⚠  ${exportDiff.removed.length} export(s) removed — check if still needed in index.ts`,
      );
    }
    if (hasRemovedCreators) {
      console.log(
        `  ⚠  ${creatorDiff.removed.length} FetchParamCreator(s) removed`,
      );
    }
    if (hasRemovedMethods) {
      console.log("  ⚠  API methods removed from one or more creators");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error running verification:", err);
  process.exit(2);
});
