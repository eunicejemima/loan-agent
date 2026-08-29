# Loan Agent

Loan Agent is a web application for reviewing loan agreements and exploring loan offers in India. It is designed to make the cost and terms of a loan easier to understand before a borrower commits.

The application accepts a text-based PDF or plain-text loan document, extracts key terms with Gemini, runs deterministic loan-cost calculations and rule-based checks, and returns a borrower-friendly report. It also provides a searchable bank-rate catalogue for comparing offers by loan amount, tenure, and category.

> **Important:** Loan Agent is an educational decision-support tool. It is not financial, legal, or lending advice. Always verify rates, fees, eligibility, and agreement terms with the lender before making a decision.

## Problem

Loan agreements can be difficult to compare. A quoted flat interest rate can obscure the effective annual cost of a loan, while processing fees, insurance charges, prepayment penalties, and missing disclosures can materially affect what a borrower pays.

## Solution

Loan Agent separates document interpretation from calculation:

1. Extract text from an uploaded PDF or TXT agreement.
2. Use Gemini to identify structured loan terms, then validate them with a schema.
3. Calculate EMI, interest, fees, total payable amount, and the effective annual rate using deterministic code.
4. Apply rule-based red-flag checks.
5. Compare the loan with the application's bundled Indian bank and government-scheme rate catalogue.
6. Generate a plain-language explanation of the already-calculated results.

## Features

- **Loan document audit:** Upload a PDF or TXT document, or paste agreement text in the browser.
- **PDF and text ingestion:** Supports text-based PDFs and UTF-8 plain-text files. PDF text extraction uses `pdf-parse`.
- **LLM term extraction:** Gemini extracts the principal, rate type, rate, tenure, processing fees, insurance charge, late-payment penalty, and prepayment penalty. Zod validates the returned structure.
- **Finance engine:** Calculates flat-rate and reducing-balance loan EMIs, total interest, fees, total payable amount, and an effective annual rate. The calculation code is separate from the LLM.
- **Red-flag engine:** Flags high effective APRs, prepayment penalties, high processing fees, and selected missing disclosures.
- **Alternative comparison:** Ranks matching offers and calculates estimated savings against the applicant's effective APR.
- **Bank-rate explorer and loan finder:** Lets users browse and search the application's rate catalogue by amount, tenure, and category.
- **Explanation layer:** Uses Gemini to explain the calculated results and detected flags in plain language. It receives calculated data, not the raw document text.
- **Browser UI:** Includes audit and loan-search modes, sample loan documents, live-rate display, health checks, and printable reports.

## Architecture

```text
Browser UI (frontend/)
        |
        | HTTP requests
        v
Express server (backend/server.js)
        |
        +-- Ingestion: PDF/TXT -> raw text
        +-- Gemini extraction -> validated loan terms
        +-- Finance engine -> reproducible cost analysis
        +-- Red-flag engine -> rule-based warnings
        +-- Comparison engine -> matching offers and savings
        +-- Gemini explanation -> borrower-friendly summary
```

`backend/server.js` serves the frontend and exposes these endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/analyze-loan` | Accepts a file in the `document` field and returns extracted terms, analysis, flags, alternatives, and explanation. |
| `GET /api/live-bank-rates` | Returns the application's bundled bank-rate data. |
| `GET` or `POST /api/search-loans` | Searches offers by amount, optional tenure, and category. |
| `GET /health` | Returns `{ "status": "ok" }`. |

## Project structure

```text
loan-agent/
├── frontend/
│   ├── index.html              # Browser interface
│   ├── css/styles.css           # Styles
│   └── js/                     # API client, UI, sample data, and controller
├── backend/
│   ├── server.js               # Express entry point and API routes
│   ├── package.json            # Backend dependencies
│   ├── data/
│   │   └── alternatives.json   # Alternative loan data
│   └── lib/
│       ├── ingestion.js        # PDF/TXT text extraction
│       ├── llmExtraction.js    # Gemini extraction and Zod validation
│       ├── financeEngine.js    # Deterministic loan calculations
│       ├── redFlagEngine.js    # Rule-based red-flag checks
│       ├── comparisonEngine.js # Alternative-offer comparison
│       ├── liveBankRatesEngine.js # Bundled rate catalogue and ranking
│       ├── explanationLayer.js # Gemini explanation generation
│       └── *.test.js           # Plain Node test scripts
├── .gitignore
└── README.md
```

## Tech stack

- Node.js and Express
- Vanilla HTML, CSS, and JavaScript
- Google Generative AI SDK (Gemini)
- `pdf-parse` for PDF text extraction
- Multer for in-memory file uploads
- Zod for extracted-data validation
- CORS and dotenv

`package-lock.json` includes `pdf-parse` 2.4.5, which requires Node.js `>=20.16.0 <21` or `>=22.3.0`. Use a compatible Node release.

## Setup

1. Open PowerShell in the project’s root folder, then move into the backend folder.

   ```powershell
   cd backend
   ```

2. Install the backend dependencies.

   ```powershell
   npm install
   ```

3. Create `backend/.env` with your Gemini API key. Do not commit this file.

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # Optional: PORT=3001
   ```

4. Start the application.

   ```powershell
   node server.js
   ```

5. Open [http://localhost:3001](http://localhost:3001) in a browser.

The server defaults to port `3001`; set `PORT` in `backend/.env` to use another port. The frontend API client currently targets `http://localhost:3001`, so if you change the server port, update `frontend/js/api.js` to match.

## Testing

The repository contains standalone Node test files. The current `package.json` test script is only a placeholder, so run the tests directly from `backend`:

```powershell
node lib/financeEngine.test.js
node lib/redFlagEngine.test.js
```

## Environment variables and secrets

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes for document analysis | Authenticates Gemini calls used for term extraction and explanations. |
| `PORT` | No | Overrides the server port; defaults to `3001`. |

The root `.gitignore` excludes `.env` and `.env.*` while allowing a future `.env.example`. Keep real API keys only in local environment files or a secure secret manager.

## Limitations

- PDFs must contain extractable text; scanned/image-only PDFs are not supported because OCR is not implemented.
- The bank-rate data is bundled in the project. Despite the UI wording, it is not fetched live from bank or RBI APIs and must be manually maintained.
- Gemini extraction can be affected by ambiguous, incomplete, or poorly extracted document text; results should be verified against the agreement.
- Red-flag thresholds are rule-based and intended as prompts for further review, not regulatory determinations.
- Calculations do not include late-payment penalties or prepayment penalties in the baseline total cost; they are reported for review.
- The application does not currently provide authentication, persistent storage, document retention, or automated lender-data updates.
- The frontend assumes the backend is available at `http://localhost:3001`.

## Future improvements

- Add OCR for scanned agreements and image uploads.
- Replace or supplement the bundled rate catalogue with verified, timestamped data sources.
- Add unit and integration test commands to `package.json` and automate them in CI.
- Add clearer source/date information and eligibility validation for alternative offers.
- Support multilingual explanations selected from the interface.
- Add authentication, secure storage policies, audit logs, and production-grade upload controls.
- Improve financial modelling for lender-specific charges, amortisation schedules, and penalty scenarios.


