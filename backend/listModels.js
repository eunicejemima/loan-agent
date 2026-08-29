/**
 * listModels.js
 *
 * Run this once to see exactly which Gemini models YOUR API key can
 * currently use — this is more reliable than any blog post or search
 * result, since Google renames/retires models frequently and this
 * queries your account directly.
 *
 * Usage: node listModels.js
 */

require("dotenv").config();

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await response.json();

  if (!data.models) {
    console.error("Could not fetch models. Response:", data);
    return;
  }

  console.log("Models available to your API key that support generateContent:\n");
  data.models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .forEach((m) => console.log(" -", m.name.replace("models/", "")));
}

listAvailableModels();