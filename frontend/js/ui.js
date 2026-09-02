/**
 * ui.js
 * 
 * Manages all DOM rendering, animations, Chart.js visualizations,
 * live bank comparisons, and search results.
 */

let costChartInstance = null;
let currentSpeechUtterance = null;

const UI = {
  /**
   * Format numbers into Indian Rupee Currency string (e.g. ₹2,50,000)
   */
  formatCurrency(num) {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.round(num));
  },

  /**
   * Format percentage
   */
  formatPercent(val) {
    if (val === undefined || val === null || isNaN(val)) return "0%";
    return `${Number(val).toFixed(2)}%`;
  },

  /**
   * Update backend connection indicator in the navigation bar
   */
  updateBackendStatus(isOnline) {
    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusLabel");
    if (!dot || !label) return;

    if (isOnline) {
      dot.className = "status-dot online";
      label.textContent = "Backend Connected (Port 3001)";
    } else {
      dot.className = "status-dot offline";
      label.textContent = "Backend Disconnected";
    }
  },

  /**
   * Update the live ticker bar with latest RBI Repo benchmark and timestamp
   */
  updateLiveTicker(data) {
    const rbiRateEl = document.getElementById("tickerRbiRate");
    const dateEl = document.getElementById("tickerDate");
    const countEl = document.getElementById("tickerBankCount");

    if (rbiRateEl && data.rbiRepoRate) rbiRateEl.textContent = `${data.rbiRepoRate.toFixed(2)}%`;
    if (dateEl && data.lastUpdated) dateEl.textContent = data.lastUpdated;
    if (countEl && data.totalBanksCovered) countEl.textContent = `${data.totalBanksCovered} Banks`;
  },

  /**
   * Multi-step loading display for Document Analysis
   */
  showLoading(step = 1, message = "Analyzing loan document...") {
    const loadingCard = document.getElementById("loadingCard");
    const resultsContainer = document.getElementById("resultsContainer");
    const loadingMessage = document.getElementById("loadingMessage");
    const analyzeBtn = document.getElementById("analyzeBtn");

    if (resultsContainer) resultsContainer.style.display = "none";
    if (loadingCard) loadingCard.style.display = "block";
    if (loadingMessage) loadingMessage.textContent = message;
    if (analyzeBtn) analyzeBtn.disabled = true;

    // Update stepper dots
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (!stepEl) continue;
      if (i < step) {
        stepEl.className = "step-item done";
      } else if (i === step) {
        stepEl.className = "step-item active";
      } else {
        stepEl.className = "step-item";
      }
    }

    loadingCard.scrollIntoView({ behavior: "smooth", block: "center" });
  },

  hideLoading() {
    const loadingCard = document.getElementById("loadingCard");
    const analyzeBtn = document.getElementById("analyzeBtn");
    if (loadingCard) loadingCard.style.display = "none";
    if (analyzeBtn) analyzeBtn.disabled = false;
  },

  /**
   * Render complete audit results for an uploaded loan document
   */
  renderResults(data) {
    const resultsContainer = document.getElementById("resultsContainer");
    if (!resultsContainer) return;

    const { extractedTerms, loanAnalysis, redFlags, alternatives, explanation } = data;

    // 1. Render Verdict Banner
    this.renderVerdict(loanAnalysis, redFlags);

    // 2. Render AI Plain-Language Explanation
    this.renderExplanation(explanation);

    // 3. Render APR Comparison Card
    this.renderAprComparison(loanAnalysis);

    // 4. Render Stat Cards
    this.renderStatCards(extractedTerms, loanAnalysis);

    // 5. Render Cost Doughnut Chart
    this.renderCostChart(loanAnalysis);

    // 6. Render Red Flag Audit List
    this.renderRedFlags(redFlags);

    // 7. Render Alternative Loan Options
    this.renderAlternatives(alternatives);

    // 8. Render Raw Extracted Terms
    this.renderExtractedTerms(extractedTerms, loanAnalysis);

    resultsContainer.style.display = "block";
    resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  /**
   * Render Verdict Banner
   */
  renderVerdict(loanAnalysis, redFlags) {
    const banner = document.getElementById("verdictBanner");
    const icon = document.getElementById("verdictIcon");
    const title = document.getElementById("verdictTitle");
    const desc = document.getElementById("verdictDesc");
    if (!banner) return;

    const hasHighFlag = redFlags.some(f => f.severity === "high");
    const hasMedFlag = redFlags.some(f => f.severity === "medium");
    const aprGap = loanAnalysis.effectiveAnnualAPR - loanAnalysis.quotedRatePct;

    if (hasHighFlag || loanAnalysis.effectiveAnnualAPR > 26 || aprGap > 6) {
      banner.className = "verdict-banner danger";
      icon.textContent = "🚨";
      title.textContent = "High Risk Loan Detected — Hidden Costs & Regulatory Flags";
      desc.textContent = `This agreement has an effective APR of ${loanAnalysis.effectiveAnnualAPR}% (vs quoted ${loanAnalysis.quotedRatePct}% ${loanAnalysis.quotedRateType}) along with ${redFlags.length} flagged risk items. Review verified bank alternatives before signing.`;
    } else if (hasMedFlag || aprGap > 1.5) {
      banner.className = "verdict-banner warning";
      icon.textContent = "⚠️";
      title.textContent = "Caution Recommended — Notable Gap Between Quoted & Real APR";
      desc.textContent = `The true APR is ${loanAnalysis.effectiveAnnualAPR}%, which is higher than the quoted ${loanAnalysis.quotedRatePct}%. Check the red flag warnings and extra fee disclosures below.`;
    } else {
      banner.className = "verdict-banner safe";
      icon.textContent = "✅";
      title.textContent = "Transparent & Fair Loan Terms";
      desc.textContent = `The loan appears to have transparent reducing-balance pricing at ${loanAnalysis.effectiveAnnualAPR}% APR with standard market charges and no hidden traps detected.`;
    }
  },

  /**
   * Render AI Explanation with text-to-speech & copy feature
   */
  renderExplanation(text) {
    const body = document.getElementById("aiExplanationBody");
    if (body) {
      body.textContent = text || "No explanation provided.";
    }

    const ttsBtn = document.getElementById("btnSpeakExplanation");
    if (ttsBtn) {
      ttsBtn.onclick = () => {
        if ('speechSynthesis' in window) {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            ttsBtn.innerHTML = '<i data-lucide="volume-2"></i> Listen';
            lucide.createIcons();
          } else {
            currentSpeechUtterance = new SpeechSynthesisUtterance(text);
            currentSpeechUtterance.rate = 0.95;
            currentSpeechUtterance.onend = () => {
              ttsBtn.innerHTML = '<i data-lucide="volume-2"></i> Listen';
              lucide.createIcons();
            };
            window.speechSynthesis.speak(currentSpeechUtterance);
            ttsBtn.innerHTML = '<i data-lucide="square"></i> Stop';
            lucide.createIcons();
          }
        } else {
          UI.showToast("Speech synthesis not supported in this browser.", "error");
        }
      };
    }

    const copyBtn = document.getElementById("btnCopyExplanation");
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(text).then(() => {
          UI.showToast("Explanation copied to clipboard!", "success");
        });
      };
    }
  },

  /**
   * Render APR comparison box
   */
  renderAprComparison(loanAnalysis) {
    const quotedRateEl = document.getElementById("quotedRateDisplay");
    const quotedTypeEl = document.getElementById("quotedTypeDisplay");
    const realAprEl = document.getElementById("realAprDisplay");
    const gapBadgeEl = document.getElementById("aprGapBadge");

    if (quotedRateEl) quotedRateEl.textContent = `${loanAnalysis.quotedRatePct}%`;
    if (quotedTypeEl) quotedTypeEl.textContent = `Quoted ${loanAnalysis.quotedRateType.toUpperCase()} Rate`;
    if (realAprEl) {
      realAprEl.textContent = `${loanAnalysis.effectiveAnnualAPR}%`;
      realAprEl.className = loanAnalysis.effectiveAnnualAPR <= 12 ? "rate-value real good" : "rate-value real";
    }

    if (gapBadgeEl) {
      const diff = loanAnalysis.effectiveAnnualAPR - loanAnalysis.quotedRatePct;
      if (diff > 0.1) {
        gapBadgeEl.className = "apr-gap-badge";
        gapBadgeEl.innerHTML = `⚠️ <strong>+${diff.toFixed(1)}%</strong> True Rate Gap (Flat Rate Illusion)`;
      } else {
        gapBadgeEl.className = "apr-gap-badge clean";
        gapBadgeEl.innerHTML = `✅ Transparent Rate (True APR matches quoted reducing rate)`;
      }
    }
  },

  /**
   * Render metric stat cards
   */
  renderStatCards(extractedTerms, loanAnalysis) {
    document.getElementById("statPrincipal").textContent = this.formatCurrency(extractedTerms.principal);
    document.getElementById("statTenure").textContent = `${extractedTerms.tenureMonths} Months (${(extractedTerms.tenureMonths / 12).toFixed(1)} yrs)`;
    document.getElementById("statEmi").textContent = this.formatCurrency(loanAnalysis.emi);
    document.getElementById("statTotalInterest").textContent = this.formatCurrency(loanAnalysis.totalInterest);
    document.getElementById("statTotalFees").textContent = this.formatCurrency(loanAnalysis.processingFeeTotal + loanAnalysis.insuranceCharge);
    document.getElementById("statTotalCost").textContent = this.formatCurrency(loanAnalysis.totalCostOfLoan);
  },

  /**
   * Render Cost Breakdown Chart using Chart.js
   */
  renderCostChart(loanAnalysis) {
    const ctx = document.getElementById("costChart");
    if (!ctx) return;

    if (costChartInstance) {
      costChartInstance.destroy();
    }

    const principal = loanAnalysis.totalCostOfLoan - loanAnalysis.totalInterest - loanAnalysis.processingFeeTotal - loanAnalysis.insuranceCharge;
    const interest = loanAnalysis.totalInterest;
    const fees = loanAnalysis.processingFeeTotal + loanAnalysis.insuranceCharge;

    costChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Principal Borrowed", "Total Interest", "Upfront Fees & Add-ons"],
        datasets: [{
          data: [principal, interest, fees],
          backgroundColor: ["#3b82f6", "#f43f5e", "#f59e0b"],
          borderColor: "#1e293b",
          borderWidth: 3,
          hoverOffset: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#94a3b8",
              font: { family: "Inter", size: 12 },
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${context.label}: ${UI.formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        },
        cutout: "68%"
      }
    });
  },

  /**
   * Render Red Flags List
   */
  renderRedFlags(redFlags) {
    const listEl = document.getElementById("redFlagsList");
    const countBadge = document.getElementById("redFlagCountBadge");
    if (!listEl) return;

    if (countBadge) countBadge.textContent = `${redFlags.length} Flagged`;

    listEl.innerHTML = "";

    if (!redFlags || redFlags.length === 0) {
      listEl.innerHTML = `
        <div class="no-flags-box">
          <i data-lucide="check-circle-2"></i>
          <span>No predatory clauses or compliance red flags detected in this agreement.</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    redFlags.forEach((flag) => {
      const item = document.createElement("div");
      item.className = `flag-item ${flag.severity || 'medium'}`;

      const icon = flag.severity === "high" ? "alert-triangle" : "info";
      const title = flag.id ? flag.id.replace(/_/g, " ").toUpperCase() : "WARNING";

      item.innerHTML = `
        <div class="flag-icon">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="flag-text">
          <h5>${title} &bull; <span style="text-transform: capitalize; font-size: 0.8rem;">${flag.severity} severity</span></h5>
          <p>${flag.message}</p>
        </div>
      `;
      listEl.appendChild(item);
    });

    lucide.createIcons();
  },

  /**
   * Render Alternative Live Bank Loans Cards in Audit Results
   */
  renderAlternatives(alternatives) {
    const container = document.getElementById("alternativesGrid");
    if (!container) return;

    container.innerHTML = "";

    if (!alternatives || alternatives.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">No alternative options found for this loan amount.</p>`;
      return;
    }

    alternatives.forEach((alt) => {
      const card = document.createElement("div");
      card.className = "alt-card";

      const savingsHtml = alt.estimatedSavings && alt.estimatedSavings > 0
        ? `<div class="alt-savings-badge">Save ${UI.formatCurrency(alt.estimatedSavings)}</div>`
        : "";

      const icon = alt.icon || "🏦";

      card.innerHTML = `
        ${savingsHtml}
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 1.2rem;">${icon}</span>
            <h4 style="margin: 0; padding-right: 70px;">${alt.name}</h4>
          </div>
          <div class="alt-type">${alt.type} &bull; ${alt.baseRateType || "Repo-Linked"}</div>
          <div class="alt-metrics">
            <div class="alt-metric-item">
              <span>Verified APR</span>
              <strong>${alt.typicalAnnualRatePct}% p.a.</strong>
            </div>
            <div class="alt-metric-item">
              <span>Processing Fee</span>
              <strong>${alt.processingFeePct}%</strong>
            </div>
          </div>
          <p class="alt-notes">${alt.notes || ""}</p>
        </div>
      `;
      container.appendChild(card);
    });
  },

  /**
   * Render Extracted JSON / Terms Table
   */
  renderExtractedTerms(terms, analysis) {
    const grid = document.getElementById("termsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const items = [
      { label: "Principal Sanctioned", value: this.formatCurrency(terms.principal) },
      { label: "Quoted Interest Rate", value: `${terms.rateType === "flat" ? terms.annualFlatRatePct : terms.annualReducingRatePct}% (${terms.rateType})` },
      { label: "Repayment Tenure", value: `${terms.tenureMonths} Months` },
      { label: "Upfront Processing Fee", value: `${terms.processingFeePct}% (Flat ₹${terms.processingFeeFlat || 0})` },
      { label: "Insurance / Add-on Charge", value: this.formatCurrency(terms.insuranceCharge) },
      { label: "Prepayment Penalty", value: `${terms.prepaymentPenaltyPct || 0}%` },
      { label: "Late Payment Penalty", value: terms.latePaymentPenalty !== null && terms.latePaymentPenalty !== undefined ? this.formatCurrency(terms.latePaymentPenalty) : "Not disclosed" },
      { label: "Calculated True APR", value: `${analysis.effectiveAnnualAPR}%` },
    ];

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "term-item";
      div.innerHTML = `
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      `;
      grid.appendChild(div);
    });
  },

  /**
   * Render Live Bank Search Results (For Search by Amount Mode)
   */
  renderBankSearchResults(data) {
    const container = document.getElementById("searchResultsSection");
    const grid = document.getElementById("bankOffersGrid");
    const countEl = document.getElementById("searchSummaryText");

    if (!container || !grid) return;

    const { searchedPrincipal, tenureMonths, offers, rbiRepoRate } = data;

    if (countEl) {
      countEl.innerHTML = `Found <strong>${offers.length} verified bank loan offers</strong> for <strong>${this.formatCurrency(searchedPrincipal)}</strong> over <strong>${tenureMonths} months</strong> (RBI Repo Rate: ${rbiRepoRate}%):`;
    }

    grid.innerHTML = "";

    if (offers.length === 0) {
      grid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
          <p style="color: var(--text-secondary); font-size: 1.1rem;">No matching bank loans found for this amount. Try a different amount or category.</p>
        </div>
      `;
      container.style.display = "block";
      return;
    }

    offers.forEach((offer) => {
      const card = document.createElement("div");
      card.className = `bank-offer-card ${offer.isBestValue ? 'best-value' : ''}`;

      const bestValueBadge = offer.isBestValue
        ? `<div class="best-value-badge">⭐ Best Value Offer</div>`
        : "";

      const featureTags = offer.features
        ? offer.features.map(f => `<span class="feature-tag">${f}</span>`).join("")
        : "";

      card.innerHTML = `
        ${bestValueBadge}
        <div>
          <div class="bank-header-row">
            <div class="bank-logo-icon">${offer.icon || '🏦'}</div>
            <div class="bank-title-box">
              <h4>${offer.schemeName}</h4>
              <span class="bank-type-tag">${offer.bankName} &bull; ${offer.bankType}</span>
            </div>
          </div>

          <div class="offer-rate-highlight">
            <div class="rate-stat-box">
              <h5>Verified Interest Rate</h5>
              <div class="rate-num">${offer.annualRatePct}% <span style="font-size: 0.8rem; font-weight: 500;">p.a.</span></div>
            </div>
            <div class="rate-stat-box">
              <h5>Monthly EMI</h5>
              <div class="emi-num">${this.formatCurrency(offer.monthlyEMI)}</div>
            </div>
          </div>

          <div class="offer-breakdown-list">
            <div class="breakdown-row">
              <span>Benchmark Type:</span>
              <strong>${offer.baseRateType}</strong>
            </div>
            <div class="breakdown-row">
              <span>Total Interest:</span>
              <strong>${this.formatCurrency(offer.totalInterest)}</strong>
            </div>
            <div class="breakdown-row">
              <span>Processing Fee:</span>
              <strong>${offer.processingFeePct}% (${this.formatCurrency(offer.processingFeeTotal)})</strong>
            </div>
            <div class="breakdown-row">
              <span>Prepayment Penalty:</span>
              <strong>${offer.prepaymentPenaltyPct === 0 ? '0% (Nil charges)' : offer.prepaymentPenaltyPct + '%'}</strong>
            </div>
            <div class="breakdown-row">
              <span>Total Repayment Cost:</span>
              <strong style="color: var(--text-primary);">${this.formatCurrency(offer.totalCostOfLoan)}</strong>
            </div>
          </div>

          ${featureTags ? `<div class="features-tags">${featureTags}</div>` : ""}
          ${offer.eligibility ? `<div class="eligibility-box"><strong>Eligibility:</strong> ${offer.eligibility}</div>` : ""}
        </div>
      `;

      grid.appendChild(card);
    });

    container.style.display = "block";
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  /**
   * Render Live Rates in the Explorer Modal Table
   */
  renderLiveRatesModal(data) {
    const tableBody = document.getElementById("ratesTableBody");
    const repoRateEl = document.getElementById("modalRepoRate");
    const lastUpdateEl = document.getElementById("modalLastUpdate");

    if (!tableBody) return;

    if (repoRateEl) repoRateEl.textContent = `${data.rbiRepoRate}%`;
    if (lastUpdateEl) lastUpdateEl.textContent = data.lastUpdated;

    tableBody.innerHTML = "";

    data.rates.forEach((bank) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${bank.icon || '🏦'} ${bank.bankName}</strong><br/><small style="color: var(--text-secondary);">${bank.schemeName || bank.bankType}</small></td>
        <td><span style="text-transform: capitalize; color: var(--accent-cyan);">${bank.category}</span></td>
        <td><strong style="color: var(--accent-emerald); font-size: 1rem;">${bank.annualRatePct}%</strong></td>
        <td>${bank.baseRateType}</td>
        <td>${bank.processingFeePct}%</td>
        <td>${bank.prepaymentPenaltyPct === 0 ? '<span style="color: var(--accent-emerald);">0% (Nil)</span>' : bank.prepaymentPenaltyPct + '%'}</td>
        <td>${UI.formatCurrency(bank.minAmount)} - ${UI.formatCurrency(bank.maxAmount)}</td>
      `;
      tableBody.appendChild(row);
    });
  },

  /**
   * Display floating toast notifications
   */
  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = type === "error" ? "alert-circle" : type === "success" ? "check-circle" : "info";

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.animation = "slideIn 0.3s ease reverse";
      setTimeout(() => toast.remove(), 280);
    }, 4500);
  }
};
