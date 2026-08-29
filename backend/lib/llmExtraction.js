/**
 * llmExtraction.js
 *
 * Sends raw loan-document text to Gemini and gets back STRICT, validated
 * JSON describing the loan's terms. This is the ONLY place the AI touches
 * numbers, and even here it never calculates anything — it just reads
 * what's written in the document. All math happens in financeEngine.js.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { z } = require("zod");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LoanTermsSchema = z.object({
  principal: z.number().positive(),
  rateType: z.enum(["flat", "reducing"]),
  annualFlatRatePct: z.number().min(0).nullable(),
  annualReducingRatePct: z.number().min(0).nullable(),
  tenureMonths: z.number().positive(),
  processingFeePct: z.number().min(0).default(0),
  processingFeeFlat: z.number().min(0).default(0),
  insuranceCharge: z.number().min(0).default(0),
  latePaymentPenalty: z.number().min(0).nullable(),
  prepaymentPenaltyPct: z.number().min(0).default(0),
});

const EXTRACTION_PROMPT = `You are a loan-document extraction engine. You will be given raw text extracted from a loan agreement, which may include OCR noise or formatting artifacts.

Extract the following fields and return ONLY a valid JSON object — no prose, no markdown code fences, no explanation before or after.

Fields to extract:
- principal: the loan amount (number, in rupees)
- rateType: either "flat" or "reducing" based on how the interest is described. If unclear, make your best judgment based on context (flat rate is far more common in informal/MFI lending).
- annualFlatRatePct: the quoted flat annual interest rate as a plain number (e.g. 12 for 12%), or null if rateType is "reducing"
- annualReducingRatePct: the quoted reducing-balance annual interest rate as a plain number, or null if rateType is "flat"
- tenureMonths: loan duration in months (convert years to months if needed)
- processingFeePct: processing fee as a percentage of principal, or 0 if not mentioned or if only a flat fee is given
- processingFeeFlat: processing fee as a flat rupee amount, or 0 if not mentioned or if only a percentage is given
- insuranceCharge: any insurance or add-on charge as a flat rupee amount, or 0 if not mentioned
- latePaymentPenalty: late payment penalty as a flat rupee amount or null if not disclosed anywhere in the document
- prepaymentPenaltyPct: prepayment/foreclosure penalty as a percentage, or 0 if not mentioned

Return ONLY the JSON object, nothing else.

Document text:
"""
{{DOCUMENT_TEXT}}
"""`;

/**
 * Call Gemini once with the extraction prompt and try to parse+validate
 * the response.
 * @param {string} documentText
 * @param {string} [errorContext] - optional feedback from a previous failed attempt
 */
async function callGeminiForExtraction(documentText, errorContext = "") {
  const prompt =
    EXTRACTION_PROMPT.replace("{{DOCUMENT_TEXT}}", documentText) +
    (errorContext
      ? `\n\nNOTE: A previous attempt failed validation with this error: ${errorContext}. Please correct it and return valid JSON only.`
      : "");

  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown code fences if Gemini added them despite instructions
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Extract and validate loan terms from raw document text.
 * Retries once if the first attempt fails schema validation.
 * @param {string} documentText
 * @returns {Promise<object>} validated loan terms matching LoanTermsSchema
 */
async function extractLoanTerms(documentText) {
  let rawResult;
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawResult = await callGeminiForExtraction(documentText, lastError);
      const validated = LoanTermsSchema.parse(rawResult);
      return validated;
    } catch (err) {
      lastError = err.message;
      if (attempt === 1) {
        throw new Error(
          `Failed to extract valid loan terms after 2 attempts. Last error: ${lastError}`
        );
      }
    }
  }
}

module.exports = { extractLoanTerms, LoanTermsSchema };