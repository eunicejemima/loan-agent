// redFlagEngine.js

const APR_CEILING_PCT = 26; // NBFC-MFI style regulatory ceiling (adjustable)
const PROCESSING_FEE_THRESHOLD_PCT = 3; // fees above this % of principal are worth flagging

function checkHighAPR(loanAnalysis) {
  if (loanAnalysis.effectiveAnnualAPR > APR_CEILING_PCT) {
    return {
      id: 'high_apr',
      severity: 'high',
      message: `The effective APR (${loanAnalysis.effectiveAnnualAPR}%) exceeds the typical ${APR_CEILING_PCT}% regulatory ceiling for this lender category.`,
    };
  }
  return null;
}

function checkPrepaymentPenalty(terms) {
  if (terms.prepaymentPenaltyPct && terms.prepaymentPenaltyPct > 0) {
    return {
      id: 'prepayment_penalty',
      severity: 'medium',
      message: `This loan charges a ${terms.prepaymentPenaltyPct}% penalty for paying it off early — uncommon in most legitimate consumer lending.`,
    };
  }
  return null;
}

function checkHighProcessingFee(terms) {
  if (!terms.principal) return null;

  const feeAsPctOfPrincipal =
    ((terms.processingFeeFlat || 0) + (terms.principal * (terms.processingFeePct || 0)) / 100) /
    terms.principal * 100;

  if (feeAsPctOfPrincipal > PROCESSING_FEE_THRESHOLD_PCT) {
    return {
      id: 'high_processing_fee',
      severity: 'medium',
      message: `The processing fee is about ${feeAsPctOfPrincipal.toFixed(1)}% of the loan amount, above the typical ${PROCESSING_FEE_THRESHOLD_PCT}% range.`,
    };
  }
  return null;
}

function checkMissingDisclosures(terms) {
  const missingFields = [];

  if (terms.latePaymentPenalty === undefined || terms.latePaymentPenalty === null) {
    missingFields.push('late-payment penalty');
  }
  if (!terms.tenureMonths) {
    missingFields.push('repayment tenure');
  }
  if (!terms.rateType) {
    missingFields.push('interest rate type (flat/reducing)');
  }

  if (missingFields.length > 0) {
    return {
      id: 'missing_disclosures',
      severity: 'medium',
      message: `The agreement doesn't clearly disclose: ${missingFields.join(', ')}. Unclear or missing terms are themselves a warning sign.`,
    };
  }
  return null;
}


function runRedFlagChecks(terms, loanAnalysis) {
  const checks = [
    checkHighAPR(loanAnalysis),
    checkPrepaymentPenalty(terms),
    checkHighProcessingFee(terms),
    checkMissingDisclosures(terms),
  ];

  // Filter out the nulls (rules that didn't trigger) and keep only real flags
  return checks.filter((flag) => flag !== null);
}


module.exports = {
  checkHighAPR,
  checkPrepaymentPenalty,
  checkHighProcessingFee,
  checkMissingDisclosures,
  runRedFlagChecks,
  APR_CEILING_PCT,
  PROCESSING_FEE_THRESHOLD_PCT,
};