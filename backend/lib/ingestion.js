/**
 * ingestion.js
 *
 * Converts an uploaded file (PDF for now) into raw text.
 * Handles both old (function-based) and new (class-based) versions
 * of the pdf-parse package, since the API changed between major versions.
 */

const pdfParseModule = require("pdf-parse");

async function extractTextFromPDF(fileBuffer) {
  let text;

  if (typeof pdfParseModule === "function") {
    // Old pdf-parse API (v1.x): pdfParse(buffer) -> { text }
    const data = await pdfParseModule(fileBuffer);
    text = data.text;
  } else if (pdfParseModule.PDFParse) {
    // New pdf-parse API (v2.x): class-based
    const { PDFParse } = pdfParseModule;
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    text = result.text;
  } else {
    throw new Error(
      "Could not determine pdf-parse API shape. Check your installed pdf-parse version."
    );
  }

  if (!text || text.trim().length === 0) {
    throw new Error(
      "No text could be extracted from this PDF. It may be a scanned image — OCR support is not yet enabled."
    );
  }
  return text;
}

function extractTextFromTxt(fileBuffer) {
  return fileBuffer.toString("utf-8");
}

async function extractText(fileBuffer, mimetype, filename = "") {
  const looksLikePDF =
    mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const looksLikeTxt =
    mimetype === "text/plain" || filename.toLowerCase().endsWith(".txt");

  if (looksLikePDF) {
    return extractTextFromPDF(fileBuffer);
  }
  if (looksLikeTxt) {
    return extractTextFromTxt(fileBuffer);
  }
  throw new Error(
    `Unsupported file type: ${mimetype} (filename: ${filename}). Supported: PDF, plain text. (Image OCR not yet enabled.)`
  );
}

module.exports = { extractText, extractTextFromPDF, extractTextFromTxt };