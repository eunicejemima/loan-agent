/**
 * financeEngine.test.js
 *
 * Plain-node test runner (no framework needed) so you can run this
 * with just `node financeEngine.test.js`. Swap in Jest later if you want.
 */

const {
  computeFlatRateEMI,
  analyzeLoan,
} = require("./financeEngine");

let passed = 0;
let failed = 0;

function approxEqual(a, b, tolerance = 0.5) {
  return Math.abs(a - b) <= tolerance;
}

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

// ---- Test 1: Flat rate EMI matches hand calculation ----
test("computeFlatRateEMI: ₹100,000 at 12% flat for 12 months", () => {
  // Hand calc: interest = 100000 * 0.12 * 1 = 12000
  // EMI = (100000 + 12000) / 12 = 9333.33
  const { totalFlatInterest, emi } = computeFlatRateEMI(100000, 12, 12);
  assert(
    approxEqual(totalFlatInterest, 12000, 1),
    `expected totalFlatInterest ~12000, got ${totalFlatInterest}`
  );
  assert(approxEqual(emi, 9333.33, 1), `expected emi ~9333.33, got ${emi}`);
});

// ---- Test 2: The headline claim from the demo script ----
// "This flat 12% rate is actually a ~22% effective annual rate."
// A 12% flat rate over 12 months is a well-known example that converts
// to roughly 21-23% effective APR depending on rounding convention.
test("analyzeLoan: 12% flat over 12 months converts to ~21-23% effective APR", () => {
  const result = analyzeLoan({
    principal: 100000,
    annualFlatRatePct: 12,
    rateType: "flat",
    tenureMonths: 12,
  });
  assert(
    result.effectiveAnnualAPR > 20 && result.effectiveAnnualAPR < 24,
    `expected effective APR between 20-24%, got ${result.effectiveAnnualAPR}`
  );
});

// ---- Test 3: Reducing-balance loan's effective rate should equal quoted rate ----
test("analyzeLoan: reducing-balance rate passes through unchanged", () => {
  const result = analyzeLoan({
    principal: 100000,
    annualReducingRatePct: 15,
    rateType: "reducing",
    tenureMonths: 24,
  });
  assert(
    approxEqual(result.effectiveAnnualAPR, 15, 0.1),
    `expected effective APR ~15%, got ${result.effectiveAnnualAPR}`
  );
});

// ---- Test 4: Processing fee and insurance are added to total cost ----
test("analyzeLoan: processing fee % and insurance charge increase total cost", () => {
  const withoutFees = analyzeLoan({
    principal: 100000,
    annualFlatRatePct: 12,
    rateType: "flat",
    tenureMonths: 12,
  });
  const withFees = analyzeLoan({
    principal: 100000,
    annualFlatRatePct: 12,
    rateType: "flat",
    tenureMonths: 12,
    processingFeePct: 2, // 2% of principal = 2000
    insuranceCharge: 1500,
  });
  assert(
    withFees.totalCostOfLoan > withoutFees.totalCostOfLoan,
    "total cost with fees should exceed total cost without fees"
  );
  assert(
    approxEqual(
      withFees.totalCostOfLoan - withoutFees.totalCostOfLoan,
      3500,
      1
    ),
    `expected fee difference ~3500, got ${
      withFees.totalCostOfLoan - withoutFees.totalCostOfLoan
    }`
  );
});

// ---- Test 5: Zero-interest edge case doesn't crash ----
test("analyzeLoan: 0% reducing rate loan doesn't throw and gives sane EMI", () => {
  const result = analyzeLoan({
    principal: 12000,
    annualReducingRatePct: 0,
    rateType: "reducing",
    tenureMonths: 12,
  });
  assert(approxEqual(result.emi, 1000, 0.5), `expected emi 1000, got ${result.emi}`);
  assert(
    approxEqual(result.totalInterest, 0, 0.5),
    `expected ~0 interest, got ${result.totalInterest}`
  );
});

// ---- Test 6: Missing required fields throws clearly ----
test("analyzeLoan: throws on missing principal", () => {
  let threw = false;
  try {
    analyzeLoan({ rateType: "flat", tenureMonths: 12, annualFlatRatePct: 10 });
  } catch (e) {
    threw = true;
  }
  assert(threw, "expected analyzeLoan to throw when principal is missing");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);