// Replaces hardcoded colors in inline styles with theme CSS variables,
// and checks that no literal colors remain.
//
// Run from the /frontend folder:
//   node theme-codemod.mjs           dry run: shows what WOULD change
//   node theme-codemod.mjs --write   applies the changes
//   node theme-codemod.mjs --check   only reports literal colors still in the code
//                                    (exit code 1 if any, so you can use it as a lint step)
//
// Commit or back up your code before using --write.

import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

// property `color`
const TEXT_COLORS = {
  "#f1f5f9": "var(--text-heading)",
  "#e2e8f0": "var(--text-body)",
  "#cbd5e1": "var(--text-body)",
  "#94a3b8": "var(--text-muted)",
  "#c2410c": "var(--warning-text)",
  "#047857": "var(--success-text)",
  "#dc2626": "var(--danger-text)",
  "#ffffff": "var(--on-primary)",
  "#fff": "var(--on-primary)",
  white: "var(--on-primary)",
};

// properties `backgroundColor` / `background` with a solid value
const BG_SOLIDS = {
  "#0f172a": "var(--card-bg)",
  "#1e293b": "var(--surface-2)",
  "#ffffff": "var(--card-bg)",
  "#fff": "var(--card-bg)",
  white: "var(--card-bg)",
  "#f8fafc": "var(--surface-2)",
  "#f1f5f9": "var(--surface-2)",
  "#f9fafb": "var(--surface-2)",
  "#2563eb": "var(--primary)",
  "#16a34a": "var(--success)",
  "#dc2626": "var(--danger)",
};

// inside border* values
const BORDER_COLOR_RE =
  /#(?:eef0f4|edf0f4|e5e7eb|d1d5db|e2e8f0)\b|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.\d+\s*\)/gi;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function transform(src) {
  const counts = { text: 0, bg: 0, border: 0 };
  let out = src;

  // 1) text colors
  out = out.replace(/\bcolor(\s*:\s*)(["'])(#[0-9a-fA-F]{3,6}|white)\2/g, (m, sep, q, val) => {
    const v = TEXT_COLORS[val.toLowerCase()];
    if (!v) return m;
    counts.text++;
    return `color${sep}"${v}"`;
  });

  // 2) translucent navy backgrounds
  out = out.replace(
    /\b(backgroundColor|background)(\s*:\s*)(["'])rgba\(\s*(?:15\s*,\s*23\s*,\s*42|30\s*,\s*41\s*,\s*59)\s*,\s*([0-9.]+)\s*\)\3/g,
    (m, prop, sep, q, alpha) => {
      counts.bg++;
      const v = parseFloat(alpha) >= 0.6 ? "var(--card-bg)" : "var(--surface-2)";
      return `${prop}${sep}"${v}"`;
    }
  );

  // 3) translucent red (danger) backgrounds
  out = out.replace(
    /\b(backgroundColor|background)(\s*:\s*)(["'])rgba\(\s*244\s*,\s*63\s*,\s*94\s*,\s*[0-9.]+\s*\)\3/g,
    (m, prop, sep) => {
      counts.bg++;
      return `${prop}${sep}"var(--danger-bg)"`;
    }
  );

  // 4) solid backgrounds
  out = out.replace(/\b(backgroundColor|background)(\s*:\s*)(["'])(#[0-9a-fA-F]{3,6}|white)\3/g, (m, prop, sep, q, val) => {
    const v = BG_SOLIDS[val.toLowerCase()];
    if (!v) return m;
    counts.bg++;
    return `${prop}${sep}"${v}"`;
  });

  // 5) borders
  out = out.replace(/\b(border\w*)(\s*:\s*)(["'])([^"']*)\3/g, (m, prop, sep, q, value) => {
    let v = value.replace(/#fecaca\b/gi, "var(--danger-border)");
    v = v.replace(BORDER_COLOR_RE, "var(--card-border)");
    if (v === value) return m;
    counts.border++;
    return `${prop}${sep}"${v}"`;
  });

  return { out, counts };
}

// Anything matching these is a literal color still in the code
const LITERAL_RES = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\(|\bhsla?\(/,
  /\b(?:color|background|backgroundColor|borderColor|border\w*)\s*:\s*["'](?:white|black|red|blue|green|gray|grey|orange|yellow)["']/,
  /\btext-white\b|\btext-(?:slate|gray|zinc)-\d+\b|\bbg-slate-\d+|\bbg-\[#|\bborder-white/,
];

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

let totalFiles = 0;
const leftovers = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, "utf8");
    let out = src;

    if (!CHECK) {
      const res = transform(src);
      out = res.out;
      const changed = res.counts.text + res.counts.bg + res.counts.border;
      if (changed > 0) {
        totalFiles++;
        console.log(
          `${WRITE ? "UPDATED" : "WOULD UPDATE"}  ${file}  (text ${res.counts.text}, backgrounds ${res.counts.bg}, borders ${res.counts.border})`
        );
        if (WRITE) fs.writeFileSync(file, out, "utf8");
      }
    }

    out.split("\n").forEach((line, i) => {
      if (isComment(line) || line.includes("eslint-disable")) return;
      if (LITERAL_RES.some((re) => re.test(line))) {
        leftovers.push(`${file}:${i + 1}  ${line.trim().slice(0, 110)}`);
      }
    });
  }
}

if (!CHECK) {
  console.log(`\n${WRITE ? "Updated" : "Would update"} ${totalFiles} file(s).`);
}

if (leftovers.length) {
  console.log(`\nLiteral colors still in the code (${leftovers.length} lines). Fix these by hand or send them to me:`);
  leftovers.forEach((l) => console.log("  " + l));
} else {
  console.log("\nNo literal colors left. Every page now follows the theme.");
}

if (!CHECK && !WRITE) console.log("\nDry run only. Re-run with --write to apply.");
if (CHECK && leftovers.length) process.exit(1);
