require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const { extractText } = require("./lib/ingestion");
const { extractLoanTerms } = require("./lib/llmExtraction");
const { analyzeLoan } = require("./lib/financeEngine");
const { runRedFlagChecks } = require("./lib/redFlagEngine");
const { findAlternatives } = require("./lib/comparisonEngine");
const { explainLoanResults } = require("./lib/explanationLayer");
const { getLiveBankRatesData, searchLoansByAmount } = require("./lib/liveBankRatesEngine");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

/**
 * Audit and analyze an uploaded loan agreement document
 */
app.post("/api/analyze-loan", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Field name must be 'document'." });
    }

    const documentText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const terms = await extractLoanTerms(documentText);

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

    const redFlags = runRedFlagChecks(terms, loanAnalysis);

    // Live bank alternatives with dynamic savings calculation
    const alternatives = findAlternatives(
      terms.principal,
      terms.tenureMonths,
      loanAnalysis.effectiveAnnualAPR
    );

    const explanation = await explainLoanResults(loanAnalysis, redFlags);

    res.json({
      extractedTerms: terms,
      loanAnalysis,
      redFlags,
      alternatives,
      explanation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Live Bank Rates Feed (SBI, HDFC, ICICI, PNB, BOB, Mudra, etc.)
 */
app.get("/api/live-bank-rates", (req, res) => {
  try {
    const liveData = getLiveBankRatesData();
    res.json(liveData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Smart Loan Finder: Search & rank live bank offers for a specific amount, tenure, and category
 */
app.all("/api/search-loans", (req, res) => {
  try {
    const amount = (req.body && req.body.amount) || req.query.amount;
    const tenureMonths = (req.body && req.body.tenureMonths) || req.query.tenureMonths || 36;
    const category = (req.body && req.body.category) || req.query.category || "all";

    if (!amount) {
      return res.status(400).json({ error: "Loan amount is required (e.g. ?amount=300000)." });
    }

    const results = searchLoansByAmount(amount, tenureMonths, category);
    res.json(results);
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