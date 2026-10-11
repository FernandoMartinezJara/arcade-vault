// Removes blank lines from a code file so Prettier has none to preserve.
// In JS/TS, blank lines inside template literals are kept, since there they
// are part of the string value.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const [file, projectDir] = process.argv.slice(2);
const source = readFileSync(file, "utf8");
const ext = path.extname(file).toLowerCase();
const isScript = /^\.[cm]?[jt]sx?$/.test(ext);
const protectedRanges = [];
if (isScript) {
  const ts = createRequire(path.join(projectDir, "package.json"))("typescript");
  const kind = ext.includes("x")
    ? ts.ScriptKind.TSX
    : ext.includes("t")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
    kind,
  );
  const visit = (node) => {
    if (
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      protectedRanges.push([node.getStart(sf), node.getEnd()]);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
const isProtected = (offset) =>
  protectedRanges.some(([start, end]) => offset > start && offset < end);
let offset = 0;
const kept = [];
for (const line of source.split("\n")) {
  if (line.trim() !== "" || isProtected(offset)) kept.push(line);
  offset += line.length + 1;
}
const result = kept.join("\n") + (source.endsWith("\n") ? "\n" : "");
if (result !== source) writeFileSync(file, result);
