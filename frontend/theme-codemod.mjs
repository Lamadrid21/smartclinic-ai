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
  "#64748b": "var(--text-muted)",
  "#334155": "var(--text-body)",
  "#93c5fd": "var(--text-link)",
  "#60a5fa": "var(--text-link)",
  "#1e40af": "var(--text-link)",
  "#fda4af": "var(--danger-text)",
  "#6ee7b7": "var(--success-text)",
  "#4ade80": "var(--success-text)",
  "#16a34a": "var(--success)",
  "#f87171": "var(--danger-text)",
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
  "#fff7ed": "var(--warning-bg)",
  "#ecfdf5": "var(--success-bg)",
  "#dcfce7": "var(--success-bg)",
  "#dbeafe": "var(--surface-2)",
  "#f0f7ff": "var(--surface-2)",
  "#2563eb": "var(--primary)",
  "#16a34a": "var(--success)",
  "#dc2626": "var(--danger)",
};

// inside border* values
const BORDER_COLOR_RE =
  /#(?:eef0f4|edf0f4|e5e7eb|d1d5db|e2e8f0|fed7aa|a7f3d0|86efac|dbe3ed|dce5ef|d5dee9|cbd5e1|edf2f7|eee)\b|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.\d+\s*\)/gi;

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

  // Tailwind class transformations
  out = out.replace(/\btext-slate-[12]00\b/g, () => { counts.text++; return "text-heading"; });
  out = out.replace(/\btext-slate-300\b/g, () => { counts.text++; return "text-body"; });
  out = out.replace(/\btext-slate-[4567]00\b/g, () => { counts.text++; return "text-muted-c"; });
  out = out.replace(/\bbg-slate-(?:900|950|800)(?:\/[0-9]+)?\b/g, () => { counts.bg++; return "bg-[var(--card-bg)]"; });
  out = out.replace(/\bbg-white\/(?:5|10|20|\[0\.03\])\b/g, () => { counts.bg++; return "bg-[var(--surface-2)]"; });
  out = out.replace(/\bborder-white\/(?:5|10|20)\b/g, () => { counts.border++; return "border-[var(--card-border)]"; });

  // box-shadows -> var(--shadow-card)
  out = out.replace(/\b(boxShadow|box-shadow)(\s*:\s*)(["'])([^"']*)\3/g, (m, prop, sep) => {
    counts.border++;
    return `${prop}${sep}"var(--shadow-card)"`;
  });

  out = out.replace(/bg-\[#090d16\]/g, "bg-[var(--background)]");
  out = out.replace(/bg-\[#0f172a\]/g, "bg-[var(--card-bg)]");
  out = out.replace(/bg-emerald-500\b/g, "bg-[var(--success)]");
  out = out.replace(/bg-slate-500\/15\b/g, "bg-[var(--surface-2)]");
  out = out.replace(/bg-slate-500\b/g, "bg-[var(--surface-2)]");
  out = out.replace(/bg-slate-50 dark:bg-black\/20/g, "bg-[var(--surface-2)]");
  out = out.replace(/#22c55e\b/g, "var(--success)");

  out = out.replace(/rgba\(59,\s*130,\s*246,\s*0\.25\)/g, "var(--card-border)");
  out = out.replace(/rgba\(59,\s*130,\s*246,\s*0\.3\)/g, "var(--card-border)");
  out = out.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "var(--surface-2)");
  out = out.replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, "var(--surface-2)");
  out = out.replace(/rgba\(255,\s*255,\s*255,\s*0\.12\)/g, "var(--card-border)");
  out = out.replace(/rgba\(16,\s*185,\s*129,\s*0\.35\)/g, "var(--success-bg)");
  out = out.replace(/rgba\(245,\s*158,\s*11,\s*0\.45\)/g, "var(--warning-bg)");
  out = out.replace(/rgba\(16,\s*185,\s*129,\s*0\.10\)/g, "var(--success-bg)");
  out = out.replace(/rgba\(245,\s*158,\s*11,\s*0\.10\)/g, "var(--warning-bg)");
  out = out.replace(/rgba\(16,\s*185,\s*129,\s*0\.25\)/g, "var(--card-border)");
  out = out.replace(/rgba\(16,\s*185,\s*129,\s*0\.3\)/g, "var(--card-border)");
  out = out.replace(/rgba\(244,\s*63,\s*94,\s*0\.3\)/g, "var(--danger-border)");
  out = out.replace(/rgba\(34,\s*197,\s*94,\s*0\.15\)/g, "var(--success-bg)");
  out = out.replace(/rgba\(15,\s*23,\s*42,\s*0\.6\)/g, "var(--surface-2)");
  out = out.replace(/rgba\(34,\s*197,\s*94,\s*0\.25\)/g, "var(--card-border)");
  out = out.replace(/rgba\(34,\s*197,\s*94,\s*0\.25\)/g, "var(--card-border)");

  out = out.replace(/#34d399\b/g, "var(--success-text)");
  out = out.replace(/#fbbf24\b/g, "var(--warning-text)");
  out = out.replace(/#1e293b\b/g, "var(--text-heading)");
  out = out.replace(/#e5e7eb\b/g, "var(--card-border)");
  out = out.replace(/#111827\b/g, "var(--text-heading)");
  out = out.replace(/#93c5fd\b/g, "var(--text-link)");
  out = out.replace(/#cbd5e1\b/g, "var(--card-border)");
  out = out.replace(/#94a3b8\b/g, "var(--text-muted)");
  out = out.replace(/#dcfce7\b/g, "var(--success-bg)");
  out = out.replace(/#f1f5f9\b/g, "var(--surface-2)");
  out = out.replace(/bg-\[#090d16\]/g, "bg-[var(--background)]");
  out = out.replace(/bg-\[#0f172a\]/g, "bg-[var(--card-bg)]");

  out = out.replace(/\b(backgroundColor|background)(\s*:\s*)(["'])rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[0-9.]+\s*\)\3/g, (m, prop, sep) => {
    counts.bg++;
    return `${prop}${sep}"var(--surface-2)"`;
  });
  out = out.replace(/\b(backgroundColor|background)(\s*:\s*)(["'])rgba\(\s*59\s*,\s*130\s*,\s*246\s*,\s*[0-9.]+\s*\)\3/g, (m, prop, sep) => {
    counts.bg++;
    return `${prop}${sep}"var(--surface-2)"`;
  });

  out = out.replace(/\btext-white\b/g, (m, offset, full) => {
    const lineStart = full.lastIndexOf("\n", offset);
    const lineEnd = full.indexOf("\n", offset);
    const line = full.slice(lineStart === -1 ? 0 : lineStart, lineEnd === -1 ? full.length : lineEnd);
    if (!SATURATED.test(line)) {
      counts.text++;
      return "text-heading";
    }
    return m;
  });

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

// Anything matching these is a literal color still in the code.
// Classes prefixed with dark: are ignored (they are the intended dark-mode half of a pair).
const LITERAL_RES = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\(|\bhsla?\(/,
  /\b(?:color|background|backgroundColor|borderColor|border\w*)\s*:\s*["'](?:white|black|red|blue|green|gray|grey|orange|yellow)["']/,
  /(?<![:\w-])(?:text-(?:slate|gray|zinc)-\d+|bg-slate-\d+|bg-\[#[^\]]*\]|border-white)/,
];

// text-white is fine on saturated backgrounds (primary buttons, avatars, active nav, badges)
  const SATURATED =
  /\bbg-(?:blue|indigo|cyan|sky|emerald|green|rose|red|violet|purple|teal)-[5-9]00|bg-gradient|bg-linear|\bfrom-(?:blue|cyan|indigo|sky|emerald|rose)-[3-6]00|btn-primary|nav-item-active|bg-\[var\(--success\)\]/;

function isFlagged(rawLine) {
  const line = rawLine.replace(/dark:[^\s"'`]+/g, "");
  if (LITERAL_RES.some((re) => re.test(line))) return true;
  if (/(?<![:\w-])text-white\b/.test(line) && !SATURATED.test(line)) return true;
  return false;
}

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
      if (isFlagged(line)) {
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
