/**
 * financeEngine.js
 *
 * Deterministic loan-cost calculation engine.
 * NO LLM calls belong in this file. Every function here must be
 * pure, unit-testable, and reproducible — this is the part judges
 * (and real borrowers) need to be able to trust.
 *
 * Core idea:
 *  - Lenders often quote a "flat rate" (interest calculated on the
 *    original principal for the whole tenure) but the borrower repays
 *    in equal installments (EMIs) that reduce the outstanding balance.
 *  - That mismatch means the EFFECTIVE annual rate is much higher than
 *    the quoted flat rate.
 *  - We compute the EMI implied by the flat-rate loan, then solve for
 *    the reducing-balance interest rate that would produce that same
 *    EMI. That solved rate is the "true" effective APR.
 */

/**
 * Compute the flat-rate EMI.
 * Flat-rate total interest = principal * annualRate * years
 * EMI = (principal + totalFlatInterest) / numberOfInstallments
 *
 * @param {number} principal - loan amount
 * @param {number} annualFlatRatePct - quoted flat rate, e.g. 12 for 12%
 * @param {number} tenureMonths - loan tenure in months
 * @returns {{ totalFlatInterest: number, emi: number }}
 */
function computeFlatRateEMI(principal, annualFlatRatePct, tenureMonths) {
  const years = tenureMonths / 12;
  const totalFlatInterest = principal * (annualFlatRatePct / 100) * years;
  const emi = (principal + totalFlatInterest) / tenureMonths;
  return { totalFlatInterest, emi };
}

/**
 * Given a fixed EMI, principal, and number of months, solve for the
 * monthly reducing-balance interest rate that makes the EMI formula
 * balance out. Uses Newton-Raphson on the standard EMI formula:
 *
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * where r = monthly interest rate (decimal), n = tenure in months.
 *
 * @param {number} principal
 * @param {number} emi
 * @param {number} tenureMonths
 * @returns {number} monthly rate as a decimal (e.g. 0.018 = 1.8%/month)
 */
function solveMonthlyRateFromEMI(principal, emi, tenureMonths) {
  const n = tenureMonths;
  const P = principal;

  // EMI-as-a-function-of-r, and we want f(r) = EMI(r) - emi = 0
  function emiForRate(r) {
    if (Math.abs(r) < 1e-9) {
      // Degenerate case: 0% interest, EMI is just P/n
      return P / n;
    }
    const factor = Math.pow(1 + r, n);
    return (P * r * factor) / (factor - 1);
  }

  // Derivative approximated numerically (safe + simple for this scale)
  function derivative(r, h = 1e-6) {
    return (emiForRate(r + h) - emiForRate(r - h)) / (2 * h);
  }

  // Initial guess: rough monthly rate estimate
  let r = 0.02; // 2%/month starting guess
  const maxIterations = 100;
  const tolerance = 1e-8;

  for (let i = 0; i < maxIterations; i++) {
    const f = emiForRate(r) - emi;
    if (Math.abs(f) < tolerance) break;
    const fPrime = derivative(r);
    if (fPrime === 0) break;
    r = r - f / fPrime;
    // Keep r in a sane range to avoid divergence
    if (r < -0.99) r = -0.5;
    if (r > 2) r = 1;
  }

  return r;
}

/**
 * Convert a monthly decimal rate to an annual effective percentage rate.
 * Uses simple compounding convention (monthly rate * 12) for readability
 * in the report — this matches how most Indian lenders quote "annual %".
 * If you want true compounded APR, use: (Math.pow(1+r,12)-1)*100
 */
function monthlyRateToAnnualPct(monthlyRate) {
  return monthlyRate * 12 * 100;
}

/**
 * Full pipeline: given the extracted loan terms, compute the true
 * effective APR and total cost of the loan.
 *
 * @param {object} terms
 * @param {number} terms.principal
 * @param {number} terms.annualFlatRatePct - quoted flat rate (only used if rateType === 'flat')
 * @param {number} terms.annualReducingRatePct - quoted reducing rate (only used if rateType === 'reducing')
 * @param {'flat'|'reducing'} terms.rateType
 * @param {number} terms.tenureMonths
 * @param {number} [terms.processingFeePct=0] - processing fee as % of principal
 * @param {number} [terms.processingFeeFlat=0] - processing fee as flat amount
 * @param {number} [terms.insuranceCharge=0] - one-time or total insurance/add-on charge
 * @param {number} [terms.latePaymentPenalty=0] - informational only, not included in baseline cost
 * @param {number} [terms.prepaymentPenaltyPct=0] - informational only, not included in baseline cost
 *
 * @returns {object} full cost breakdown
 */
function analyzeLoan(terms) {
  const {
    principal,
    annualFlatRatePct = 0,
    annualReducingRatePct = 0,
    rateType,
    tenureMonths,
    processingFeePct = 0,
    processingFeeFlat = 0,
    insuranceCharge = 0,
    latePaymentPenalty = 0,
    prepaymentPenaltyPct = 0,
  } = terms;

  if (!principal || !tenureMonths) {
    throw new Error("principal and tenureMonths are required");
  }

  let emi, effectiveAnnualPct, totalInterestReducingEquivalent;

  if (rateType === "flat") {
    const { emi: flatEmi } = computeFlatRateEMI(
      principal,
      annualFlatRatePct,
      tenureMonths
    );
    emi = flatEmi;
    const monthlyRate = solveMonthlyRateFromEMI(principal, emi, tenureMonths);
    effectiveAnnualPct = monthlyRateToAnnualPct(monthlyRate);
    totalInterestReducingEquivalent = emi * tenureMonths - principal;
  } else if (rateType === "reducing") {
    // Already quoted as reducing-balance annual rate; compute EMI directly
    const monthlyRate = annualReducingRatePct / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    emi =
      monthlyRate === 0
        ? principal / tenureMonths
        : (principal * monthlyRate * factor) / (factor - 1);
    effectiveAnnualPct = annualReducingRatePct;
    totalInterestReducingEquivalent = emi * tenureMonths - principal;
  } else {
    throw new Error("rateType must be 'flat' or 'reducing'");
  }

  const processingFeeTotal =
    processingFeeFlat + principal * (processingFeePct / 100);

  const totalCost =
    principal +
    totalInterestReducingEquivalent +
    processingFeeTotal +
    insuranceCharge;

  const totalPayable = emi * tenureMonths + processingFeeTotal + insuranceCharge;

  return {
    quotedRateType: rateType,
    quotedRatePct: rateType === "flat" ? annualFlatRatePct : annualReducingRatePct,
    effectiveAnnualAPR: round2(effectiveAnnualPct),
    emi: round2(emi),
    totalInterest: round2(totalInterestReducingEquivalent),
    processingFeeTotal: round2(processingFeeTotal),
    insuranceCharge: round2(insuranceCharge),
    totalCostOfLoan: round2(totalCost),
    totalPayable: round2(totalPayable),
    // Passed through for the red-flag engine, not used in cost math above
    latePaymentPenalty,
    prepaymentPenaltyPct,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  computeFlatRateEMI,
  solveMonthlyRateFromEMI,
  monthlyRateToAnnualPct,
  analyzeLoan,
};