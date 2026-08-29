/**
 * api.js
 * 
 * Manages all communication with the Loan Agent Express backend.
 */

const API_BASE_URL = "http://localhost:3001";

const ApiService = {
  baseUrl: API_BASE_URL,

  /**
   * Check if the backend is running and reachable
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  /**
   * Upload a loan document (PDF or TXT) to /api/analyze-loan
   * @param {File|Blob} file - The loan document
   * @param {string} [filename] - Optional filename if passing a Blob
   * @returns {Promise<object>} Complete loan audit results
   */
  async analyzeLoan(file, filename = "document.txt") {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("document", file, file.name);
    } else {
      formData.append("document", file, filename);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/analyze-loan`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error("API Error in analyzeLoan:", err);
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        throw new Error(
          `Cannot connect to backend server at ${this.baseUrl}. Make sure your backend is running ('node server.js').`
        );
      }
      throw err;
    }
  },

  /**
   * Fetch all live Indian bank rates linked to the RBI repo rate benchmark
   * @returns {Promise<object>}
   */
  async getLiveBankRates() {
    try {
      const response = await fetch(`${this.baseUrl}/api/live-bank-rates`);
      if (!response.ok) {
        throw new Error("Failed to fetch live bank rates.");
      }
      return await response.json();
    } catch (err) {
      console.error("API Error in getLiveBankRates:", err);
      throw err;
    }
  },

  /**
   * Search & rank live bank loans for a specific amount, tenure, and category
   * @param {number} amount - Loan amount in INR
   * @param {number} [tenureMonths=36] - Repayment tenure in months
   * @param {string} [category="all"] - Loan category (all, msme, mudra, personal, gold, agriculture)
   * @returns {Promise<object>}
   */
  async searchLoans(amount, tenureMonths = 36, category = "all") {
    try {
      const response = await fetch(`${this.baseUrl}/api/search-loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, tenureMonths, category }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search bank loans.");
      }

      return data;
    } catch (err) {
      console.error("API Error in searchLoans:", err);
      throw err;
    }
  }
};
