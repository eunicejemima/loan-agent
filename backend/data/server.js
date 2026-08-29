/**
 * server.js
 *
 * The full pipeline, wired together behind one endpoint:
 * POST /api/analyze-loan
 *
 * Upload -> extract text -> Claude extraction -> finance engine ->
 * red-flag engine -> comparison engine -> Claude explanation -> JSON response.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { extractText } = require("./lib/ingestion");
const { extractLoanTerms } = require("./lib/llmExtraction");
const { analyzeLoan } = require("./lib/financeEngine");
const { runRedFlagChecks } = require("./lib/redFlagEngine");
const { findAlternatives, estimateSavings } = require("./lib/comparisonEngine");
const { explainLoanResults } = require("./lib/explanationLayer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post("/api/analyze-loan", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Field name must be 'document'." });
    }

    // Step 1: OCR / text extraction
    const documentText = await extractText(req.file.buffer, req.file.mimetype);

    // Step 2: LLM extraction (Claude reads the text, returns structured JSON)
    const terms = await extractLoanTerms(documentText);

    // Step 3: Deterministic finance calculation (no AI)
    const loanAnalysis = analyzeLoan({
      principal: terms.principal,
      rateType: terms.rateType,
      annualFlatRatePct: terms.annualFlatRatePct || 0,
      annualReducingRatePct: terms.annualReducingRatePct || 0,
      tenureMonths: terms.tenureMonths,
      processingFeePct: terms.processingFeePct,
      processingFeeFlat: terms.processingFeeFlat,
      insuranceCharge: terms.insuranceCharge,
      latePaymentPenalty: terms.latePaymentPenalty,
      prepaymentPenaltyPct: terms.prepaymentPenaltyPct,
    });

    // Step 4: Red-flag rule checks (no AI)
    const redFlags = runRedFlagChecks(terms, loanAnalysis);

    // Step 5: Comparison engine (no AI)
    const alternatives = findAlternatives(terms.principal);
    const alternativesWithSavings = alternatives.map((alt) => ({
      ...alt,
      estimatedSavings: estimateSavings(
        terms.principal,
        terms.tenureMonths,
        loanAnalysis.effectiveAnnualAPR,
        alt.typicalAnnualRatePct
      ),
    }));

    // Step 6: Plain-language explanation (Claude, isolated from the numbers)
    const explanation = await explainLoanResults(loanAnalysis, redFlags);

    // Final combined report
    res.json({
      extractedTerms: terms,
      loanAnalysis,
      redFlags,
      alternatives: alternativesWithSavings,
      explanation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Loan Agent backend running on http://localhost:${PORT}`);
});