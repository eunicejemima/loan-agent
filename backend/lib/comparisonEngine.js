/**
 * comparisonEngine.js
 *
 * Compares loan amounts against live Indian bank lending rates and Government schemes
 * linked to the RBI Repo Rate benchmark.
 */

const { findLiveAlternativesForLoan } = require("./liveBankRatesEngine");

function findAlternatives(loanAmount, tenureMonths = 36, userEffectiveAPR = 21.0, limit = 3) {
  return findLiveAlternativesForLoan(loanAmount, tenureMonths, userEffectiveAPR, limit);
}

function estimateSavings(principal, tenureMonths, userEffectiveAPR, alternativeAPR) {
  const years = (tenureMonths || 36) / 12;
  const userInterest = principal * (userEffectiveAPR / 100) * years;
  const altInterest = principal * (alternativeAPR / 100) * years;
  return Math.max(0, Math.round(userInterest - altInterest));
}

module.exports = { findAlternatives, estimateSavings };