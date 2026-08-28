/**
 * redFlagEngine.test.js
 *
 * Plain-node test runner, same pattern as financeEngine.test.js.
 * Run with: node lib/redFlagEngine.test.js
 */

const {
  checkHighAPR,
  checkPrepaymentPenalty,
  checkHighProcessingFee,
  checkMissingDisclosures,
  runRedFlagChecks,
} = require("./redFlagEngine");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ---- checkHighAPR ----
test("checkHighAPR: flags a loan with APR above 26%", () => {
  const result = checkHighAPR({ effectiveAnnualAPR: 28.4 });
  assert(result !== null, "expected a flag, got null");
  assert(result.id === "high_apr", `expected id 'high_apr', got ${result.id}`);
});

test("checkHighAPR: does NOT flag a loan with APR below 26%", () => {
  const result = checkHighAPR({ effectiveAnnualAPR: 15 });
  assert(result === null, "expected null, got a flag");
});

// ---- checkPrepaymentPenalty ----
test("checkPrepaymentPenalty: flags when a penalty percentage is present", () => {
  const result = checkPrepaymentPenalty({ prepaymentPenaltyPct: 2 });
  assert(result !== null, "expected a flag, got null");
  assert(
    result.id === "prepayment_penalty",
    `expected id 'prepayment_penalty', got ${result.id}`
  );
});

test("checkPrepaymentPenalty: does NOT flag when there is no penalty", () => {
  const result = checkPrepaymentPenalty({ prepaymentPenaltyPct: 0 });
  assert(result === null, "expected null, got a flag");
});

// ---- checkHighProcessingFee ----
test("checkHighProcessingFee: flags a fee above 3% of principal (percentage form)", () => {
  const result = checkHighProcessingFee({
    principal: 100000,
    processingFeePct: 4,
  });
  assert(result !== null, "expected a flag, got null");
  assert(
    result.id === "high_processing_fee",
    `expected id 'high_processing_fee', got ${result.id}`
  );
});

test("checkHighProcessingFee: flags a fee above 3% of principal (flat amount form)", () => {
  const result = checkHighProcessingFee({
    principal: 50000,
    processingFeeFlat: 2500, // 5% of principal
  });
  assert(result !== null, "expected a flag, got null");
});

test("checkHighProcessingFee: does NOT flag a fee within the normal range", () => {
  const result = checkHighProcessingFee({
    principal: 100000,
    processingFeePct: 2,
  });
  assert(result === null, "expected null, got a flag");
});

// ---- checkMissingDisclosures ----
test("checkMissingDisclosures: flags when tenure and rateType are missing", () => {
  const result = checkMissingDisclosures({
    latePaymentPenalty: 500,
    // tenureMonths and rateType intentionally omitted
  });
  assert(result !== null, "expected a flag, got null");
  assert(
    result.message.includes("repayment tenure"),
    "expected message to mention repayment tenure"
  );
  assert(
    result.message.includes("interest rate type"),
    "expected message to mention interest rate type"
  );
});

test("checkMissingDisclosures: does NOT flag when everything is disclosed", () => {
  const result = checkMissingDisclosures({
    latePaymentPenalty: 500,
    tenureMonths: 12,
    rateType: "flat",
  });
  assert(result === null, "expected null, got a flag");
});

// ---- runRedFlagChecks (integration) ----
test("runRedFlagChecks: a clean, fair loan produces zero flags", () => {
  const terms = {
    principal: 100000,
    processingFeePct: 1,
    prepaymentPenaltyPct: 0,
    latePaymentPenalty: 500,
    tenureMonths: 12,
    rateType: "reducing",
  };
  const loanAnalysis = { effectiveAnnualAPR: 15 };
  const flags = runRedFlagChecks(terms, loanAnalysis);
  assert(flags.length === 0, `expected 0 flags, got ${flags.length}`);
});

test("runRedFlagChecks: a bad loan (like our 12% flat example) produces multiple flags", () => {
  const terms = {
    principal: 100000,
    processingFeePct: 4,
    prepaymentPenaltyPct: 2,
    latePaymentPenalty: undefined,
    tenureMonths: 12,
    rateType: "flat",
  };
  const loanAnalysis = { effectiveAnnualAPR: 28.4 }; // our worked example's real APR range
  const flags = runRedFlagChecks(terms, loanAnalysis);
  assert(flags.length >= 3, `expected at least 3 flags, got ${flags.length}`);

  const ids = flags.map((f) => f.id);
  assert(ids.includes("high_apr"), "expected high_apr flag");
  assert(ids.includes("prepayment_penalty"), "expected prepayment_penalty flag");
  assert(ids.includes("high_processing_fee"), "expected high_processing_fee flag");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);