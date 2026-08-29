/**
 * samples.js
 * 
 * Pre-configured realistic loan agreements for 1-click testing & demos.
 * Converts text into File objects for seamless submission to the backend.
 */

const SAMPLE_LOANS = {
  flat_rate_trap: {
    id: "flat_rate_trap",
    title: "12% Flat Rate Trap (MFI/NBFC)",
    tag: "Hidden Trap",
    tagClass: "trap",
    fileName: "quick_credit_sanction_letter.txt",
    description: "Quoted at 12% flat rate for 36 months, but real APR jumps to ~21.8% with a 3.5% processing fee & prepayment penalty.",
    content: `SANCTION LETTER & LOAN AGREEMENT
Lender: QuickCredit Financial Services Pvt Ltd (NBFC)
Borrower: Ramesh Kumar
Date of Sanction: 15-July-2026

LOAN PARTICULARS:
1. Principal Sanctioned Amount: Rs. 2,00,000 (Rupees Two Lakhs Only)
2. Interest Rate: 12.0% Flat Annual Rate
3. Loan Tenure: 36 Months (3 Years)
4. Repayment Mode: Equated Monthly Installment (EMI)
5. Processing Fee: 3.5% of Loan Amount (Deducted upfront from disbursal)
6. Mandatory Credit Insurance Fee: Rs. 1,500
7. Prepayment / Foreclosure Charges: 4.0% penalty on outstanding balance if closed before tenure
8. Documentation Charges: Included

REPAYMENT SCHEDULE SUMMARY:
- Total Flat Interest Charged = Principal x 12% x 3 = Rs. 72,000
- Total Repayable = Rs. 2,72,000
- Monthly EMI = Rs. 7,555.55 per month for 36 months

Note: The borrower confirms having understood all terms. Pre-closure requires 30 days notice and prepayment fees.`
  },

  high_apr_microloan: {
    id: "high_apr_microloan",
    title: "32% Subprime Micro-Loan",
    tag: "High APR Flag",
    tagClass: "trap",
    fileName: "instant_cash_microloan.txt",
    description: "Instant payday/micro-lending contract with 32% reducing rate, exceeding the 26% regulatory APR ceiling.",
    content: `DIGITAL INSTANT LOAN SUMMARY
Platform: SpeedCash Micro Lending Co.
Borrower Reference ID: SC-992014

LOAN DETAILS:
- Sanctioned Principal: Rs. 50,000
- Interest Rate: 32.0% per annum on reducing balance
- Tenure: 12 Months
- Monthly EMI: Rs. 4,923
- Processing Charges: 5.0% of principal (Rs. 2,500)
- Mandatory Insurance Protection Plan: Rs. 850
- Prepayment Penalty: 2.0%
- Late Payment Fee: Rs. 500 per default instance

The borrower agrees to auto-debit of EMI on the 5th of each month.`
  },

  fair_bank_loan: {
    id: "fair_bank_loan",
    title: "8.75% Transparent Bank Loan",
    tag: "Fair Deal",
    tagClass: "fair",
    fileName: "public_sector_bank_sanction.txt",
    description: "Public sector MSME/personal loan at 8.75% reducing rate with low processing fee and zero prepayment penalty.",
    content: `NATIONAL PUBLIC SECTOR BANK
SANCTION MEMORANDUM & CREDIT FACILITY

To: Smt. Ananya Sharma
Facility: Term Loan (MSME / Personal)
Date: 10-August-2026

SANCTION DETAILS:
1. Loan Principal Amount: Rs. 5,00,000 (Rupees Five Lakhs)
2. Interest Rate: 8.75% per annum on Reducing Balance (Linked to EBLR)
3. Loan Tenure: 60 Months (5 Years)
4. Monthly EMI: Rs. 10,319
5. Upfront Processing Fee: 0.5% (Rs. 2,500)
6. Prepayment / Foreclosure Penalty: 0% (Nil charges as per RBI regulations)
7. Late Payment Interest: Rs. 200 per month
8. Insurance Requirement: Optional (Rs. 0 charged)`
  }
};

/**
 * Helper to convert a text sample into a standard File object
 */
function getSampleFile(sampleKey) {
  const sample = SAMPLE_LOANS[sampleKey];
  if (!sample) return null;
  const blob = new Blob([sample.content], { type: "text/plain" });
  return new File([blob], sample.fileName, { type: "text/plain" });
}
