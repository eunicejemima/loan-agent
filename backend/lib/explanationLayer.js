/**
 * explanationLayer.js
 *
 * Takes the ALREADY-CALCULATED results (from financeEngine.js and
 * redFlagEngine.js) and asks Gemini to explain them in plain,
 * everyday language. This call never receives raw document text and
 * never influences the numbers — it only rephrases results we already
 * trust into something a first-time borrower can understand.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @param {object} loanAnalysis - output of financeEngine.js's analyzeLoan()
 * @param {Array} redFlags - output of redFlagEngine.js's runRedFlagChecks()
 * @param {string} [language="English"] - target language, e.g. "Tamil", "Hindi"
 * @returns {Promise<string>} plain-language explanation
 */
async function explainLoanResults(loanAnalysis, redFlags, language = "English") {
  const prompt = `You are explaining a loan analysis to a first-time borrower in India who has no financial background. Write at roughly an 8th-grade reading level, using at least one everyday analogy. Do not use financial jargon without explaining it. Write your response in ${language}.

Here is the loan analysis (already calculated by our system — do not recalculate or second-guess these numbers, just explain them):

Quoted rate: ${loanAnalysis.quotedRatePct}% (${loanAnalysis.quotedRateType})
True effective annual rate: ${loanAnalysis.effectiveAnnualAPR}%
Monthly payment (EMI): Rs. ${loanAnalysis.emi}
Total interest over the loan: Rs. ${loanAnalysis.totalInterest}
Total cost of the loan (including fees): Rs. ${loanAnalysis.totalCostOfLoan}

Red flags detected:
${redFlags.length > 0 ? redFlags.map((f) => `- ${f.message}`).join("\n") : "None detected."}

Write a short (150-200 word) plain-language explanation covering: what the borrower is really paying, why the quoted rate is misleading (if applicable), and what the red flags mean for them in practice. End with one clear, actionable sentence of advice.`;

  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
  const result = await model.generateContent(prompt);
  return result.response.text() || "Explanation unavailable.";
}

module.exports = { explainLoanResults };
