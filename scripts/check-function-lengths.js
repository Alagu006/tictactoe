import fs from 'node:fs';
import path from 'node:path';

const MAX_ALLOWED_LINES = 40;

/**
 * Recursively retrieves all JavaScript files within a directory.
 * @param {string} directoryPath - Root directory to search.
 * @returns {string[]} List of relative file paths.
 */
function getJavaScriptFiles(directoryPath) {
  let fileList = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      fileList = fileList.concat(getJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Parses a JavaScript file line-by-line and extracts all function line ranges.
 * @param {string} filePath - Path to file.
 * @returns {Array<{ name: string, startLine: number, endLine: number, length: number }>}
 */
function extractFunctionRanges(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const foundFunctions = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const currentLine = lines[lineIndex];

    // Matches standard function declarations, arrow functions with blocks, and function expressions
    const match = currentLine.match(
      /(?:(?:export\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]*)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function)/
    );

    if (match && currentLine.includes('{')) {
      const functionName = match[1] || match[2] || match[3] || 'anonymous';
      const startLine = lineIndex + 1;
      let braceDepth = 0;
      let endLine = startLine;

      for (let scanIndex = lineIndex; scanIndex < lines.length; scanIndex++) {
        const lineContent = lines[scanIndex];
        for (let charIndex = 0; charIndex < lineContent.length; charIndex++) {
          const char = lineContent[charIndex];
          if (char === '{') {
            braceDepth++;
          } else if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) {
              endLine = scanIndex + 1;
              break;
            }
          }
        }
        if (braceDepth === 0) break;
      }

      const length = endLine - startLine + 1;
      foundFunctions.push({ name: functionName, startLine, endLine, length });
    }
  }

  return foundFunctions;
}

/**
 * Audits all files in src/ directory against MAX_ALLOWED_LINES.
 */
function auditProjectFunctions() {
  const srcFiles = getJavaScriptFiles('src');
  const violations = [];
  let totalFunctionsAudited = 0;

  for (const filePath of srcFiles) {
    const functionsInFile = extractFunctionRanges(filePath);
    totalFunctionsAudited += functionsInFile.length;

    for (const fn of functionsInFile) {
      if (fn.length > MAX_ALLOWED_LINES) {
        violations.push({
          file: filePath,
          name: fn.name,
          lines: fn.length,
          start: fn.startLine,
          end: fn.endLine
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\n❌ Error: Found ${violations.length} function(s) exceeding ${MAX_ALLOWED_LINES} lines:`);
    for (const v of violations) {
      console.error(`  - ${v.file}: "${v.name}" is ${v.lines} lines (lines ${v.start}-${v.end})`);
    }
    process.exit(1);
  }

  console.log(`\n✅ Function length check passed: all ${totalFunctionsAudited} functions across ${srcFiles.length} files in src/ are ${MAX_ALLOWED_LINES} lines or fewer.`);
  process.exit(0);
}

auditProjectFunctions();
