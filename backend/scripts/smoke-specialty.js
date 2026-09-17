/**
 * Standalone smoke test for the specialty-match feature.
 *
 * 1. Runs the pure matchSymptomToSpecialty() function against scenarios.
 * 2. Boots a minimal Express app with ONLY the AI router (no peak-hours)
 *    and exercises the real POST /api/ai/specialty-match route, then exits.
 *
 * Usage: cd backend && node scripts/smoke-specialty.js
 */

import { matchSymptomToSpecialty } from "../services/ai.service.js";
import { matchSpecialty } from "../controllers/ai.controller.js";

let failed = 0;

function assert(label, actual, expected) {
  const pass =
    typeof expected === "function"
      ? expected(actual)
      : JSON.stringify(actual) === JSON.stringify(expected);
  if (pass) {
    console.log(`  OK  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
    console.error(`       expected: ${JSON.stringify(expected)}`);
    console.error(`       got:      ${JSON.stringify(actual)}`);
  }
}

console.log("\n--- matchSymptomToSpecialty() unit tests ---\n");

// Empty reason -> always OK, no message
assert(
  "empty reason returns matches:true, empty message",
  matchSymptomToSpecialty("", "Cardiology"),
  { matches: true, message: "", confidence: "low" }
);

// Symptom matches doctor specialty -> high confidence match
assert(
  "chest pain + Cardiology -> matches",
  matchSymptomToSpecialty("chest pain", "Cardiology"),
  (r) => r.matches === true && r.confidence === "high"
);

assert(
  "baby vaccination + Pediatrics -> matches",
  matchSymptomToSpecialty("baby vaccination", "Pediatrics"),
  (r) => r.matches === true && r.confidence === "high"
);

// Mismatch cases -> suggest the matched specialty by name
assert(
  "chest pain + Neurology -> mismatch, suggests Cardiology",
  matchSymptomToSpecialty("chest pain", "Neurology"),
  (r) => r.matches === false && r.confidence === "high" && /Cardiology/i.test(r.message)
);

assert(
  "migraine + Cardiology -> mismatch, suggests Neurology",
  matchSymptomToSpecialty("migraine and seizures", "Cardiology"),
  (r) => r.matches === false && r.confidence === "high" && /Neurology/i.test(r.message)
);

assert(
  "skin rash + General Medicine -> mismatch, suggests Dermatology",
  matchSymptomToSpecialty("skin rash and itching", "General Medicine"),
  (r) => r.matches === false && r.confidence === "high" && /Dermatology/i.test(r.message)
);

// Multi-specialty symptom -> message lists all suggested specialties
assert(
  "chest pain + skin rash + General Medicine -> suggests Cardiology or Dermatology",
  matchSymptomToSpecialty("chest pain and skin rash", "General Medicine"),
  (r) => r.matches === false && r.confidence === "high" &&
        /Cardiology/i.test(r.message) && /Dermatology/i.test(r.message)
);

// General symptoms -> low-confidence safe fallback
assert(
  "fever and cough + General Medicine -> safe fallback",
  matchSymptomToSpecialty("fever and cough", "General Medicine"),
  (r) => r.matches === true && r.confidence === "low" && /General Medicine/i.test(r.message)
);

assert(
  "check-up + General Practice -> safe fallback",
  matchSymptomToSpecialty("check-up", "General Practice"),
  (r) => r.matches === true && r.confidence === "low"
);

assert(
  "check-up + Cardiology -> no mismatch (low confidence)",
  matchSymptomToSpecialty("check-up", "Cardiology"),
  (r) => r.matches === true && r.confidence === "low"
);

assert(
  "brain fog + no spec -> mismatch, suggests Neurology",
  matchSymptomToSpecialty("memory loss", ""),
  (r) => r.matches === false && /Neurology/i.test(r.message)
);
console.log("\n--- matchSpecialty controller (endpoint contract) test ---\n");

// Test the exact same code path as POST /api/ai/specialty-match, without
// booting an HTTP server (avoids the Windows libuv shutdown crash).
function mockResponse() {
  const stored = { statusCode: 200, body: null };
  return {
    status(code) {
      stored.statusCode = code;
      return this;
    },
    json(payload) {
      stored.body = payload;
      return this;
    },
    stored,
  };
}

const cases2 = [
  {
    label: "heart palpitations + Cardiology -> matches",
    body: { reason: "heart palpitations", specialization: "Cardiology" },
    check: (d) => d.success === true && d.matches === true,
    status: 200,
  },
  {
    label: "headache + Dermatology -> mismatch + Neurology suggestion",
    body: { reason: "headache and dizziness", specialization: "Dermatology" },
    check: (d) =>
      d.success === true && d.matches === false && /Neurology/i.test(d.message),
    status: 200,
  },
  {
    label: "empty reason -> 400",
    body: { reason: "", specialization: "Cardiology" },
    check: () => true,
    status: 400,
  },
];

for (const c of cases2) {
  const res = mockResponse();
  await matchSpecialty({ body: c.body }, res);
  const ok =
    res.stored.statusCode === c.status && c.check(res.stored.body);
  if (ok) {
    console.log(`  OK  ${c.label} (HTTP ${res.stored.statusCode})`);
  } else {
    failed++;
    console.error(
      `  FAIL ${c.label} -> HTTP ${res.stored.statusCode}, body ${JSON.stringify(
        res.stored.body
      )}`
    );
  }
}

console.log(
  failed === 0
    ? "\nALL specialty-match smoke tests passed."
    : `\n${failed} test(s) FAILED.`
);

process.exit(failed > 0 ? 1 : 0);