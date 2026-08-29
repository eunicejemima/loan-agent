/**
 * app.js
 * 
 * Main controller and event handlers for the Loan Agent frontend.
 * Manages both Loan Document Audit Mode and Smart Loan Search Mode.
 */

let selectedFile = null;
let currentTab = "upload"; // 'upload' | 'text'
let currentMode = "audit";  // 'audit' | 'search'
let selectedCategory = "all";
let selectedTenure = 36;
let cachedLiveRates = null;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Setup periodic health check and live rates feed
  checkBackend();
  loadLiveBankRates();
  setInterval(checkBackend, 10000);

  // Setup event listeners
  setupModeSwitcher();
  setupTabSwitching();
  setupDropzone();
  setupSampleButtons();
  setupAnalyzeButton();
  setupAccordion();
  setupPrintButton();
  setupSearchForm();
  setupRatesModal();
});

/**
 * Check backend health status
 */
async function checkBackend() {
  const isOnline = await ApiService.checkHealth();
  UI.updateBackendStatus(isOnline);
}

/**
 * Fetch and display live bank rates and ticker
 */
async function loadLiveBankRates() {
  try {
    const data = await ApiService.getLiveBankRates();
    cachedLiveRates = data;
    UI.updateLiveTicker(data);
  } catch (err) {
    console.warn("Could not fetch live rates ticker:", err);
  }
}

/**
 * Setup Mode Switcher (Audit Mode vs Search Loans Mode)
 */
function setupModeSwitcher() {
  const btnModeAudit = document.getElementById("btnModeAudit");
  const btnModeSearch = document.getElementById("btnModeSearch");
  const viewAudit = document.getElementById("viewAudit");
  const viewSearch = document.getElementById("viewSearch");

  if (!btnModeAudit || !btnModeSearch) return;

  btnModeAudit.addEventListener("click", () => {
    currentMode = "audit";
    btnModeAudit.classList.add("active");
    btnModeSearch.classList.remove("active");
    viewAudit.classList.add("active");
    viewSearch.classList.remove("active");
  });

  btnModeSearch.addEventListener("click", () => {
    currentMode = "search";
    btnModeSearch.classList.add("active");
    btnModeAudit.classList.remove("active");
    viewSearch.classList.add("active");
    viewAudit.classList.remove("active");
  });
}

/**
 * Setup Smart Loan Search Form by Amount
 */
function setupSearchForm() {
  const amountInput = document.getElementById("searchAmountInput");
  const quickPills = document.querySelectorAll(".pill-btn[data-amount]");
  const categoryCards = document.querySelectorAll(".category-card[data-category]");
  const tenurePills = document.querySelectorAll(".pill-btn[data-tenure]");
  const searchBtn = document.getElementById("btnExecuteSearch");

  // Quick Amount Presets
  quickPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      quickPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const val = pill.getAttribute("data-amount");
      if (amountInput) amountInput.value = val;
    });
  });

  if (amountInput) {
    amountInput.addEventListener("input", () => {
      quickPills.forEach((p) => p.classList.remove("active"));
    });
  }

  // Category Selector Cards
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      categoryCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      selectedCategory = card.getAttribute("data-category") || "all";
    });
  });

  // Tenure Selector Pills
  tenurePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      tenurePills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      selectedTenure = Number(pill.getAttribute("data-tenure")) || 36;
    });
  });

  // Search Button Click
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      executeLoanSearch();
    });
  }

  // Trigger search on Enter key in amount input
  if (amountInput) {
    amountInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") executeLoanSearch();
    });
  }
}

/**
 * Execute search for bank loans matching specific amount
 */
async function executeLoanSearch() {
  const amountInput = document.getElementById("searchAmountInput");
  const amount = Number(amountInput ? amountInput.value.replace(/,/g, "") : 0);

  if (!amount || amount < 5000) {
    UI.showToast("Please enter a valid loan amount of at least ₹5,000.", "error");
    return;
  }

  const searchBtn = document.getElementById("btnExecuteSearch");
  if (searchBtn) searchBtn.disabled = true;

  try {
    UI.showToast(`Searching live bank offers for ₹${amount.toLocaleString("en-IN")}...`, "info");
    const data = await ApiService.searchLoans(amount, selectedTenure, selectedCategory);
    UI.renderBankSearchResults(data);
    UI.showToast(`Found ${data.offers.length} matching bank offers!`, "success");
  } catch (err) {
    UI.showToast(err.message || "Failed to search bank loans.", "error");
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

/**
 * Setup Live Rates Explorer Modal
 */
function setupRatesModal() {
  const modal = document.getElementById("ratesModal");
  const openBtn = document.getElementById("btnOpenRatesModal");
  const closeBtn = document.getElementById("btnCloseRatesModal");

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener("click", async () => {
      modal.classList.add("open");
      if (!cachedLiveRates) {
        cachedLiveRates = await ApiService.getLiveBankRates();
      }
      if (cachedLiveRates) {
        UI.renderLiveRatesModal(cachedLiveRates);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("open");
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      modal.classList.remove("open");
    }
  });
}

/**
 * Setup Upload vs Text Tab Switching (Audit Mode)
 */
function setupTabSwitching() {
  const tabUpload = document.getElementById("tabUpload");
  const tabText = document.getElementById("tabText");
  const uploadWrapper = document.getElementById("uploadWrapper");
  const textWrapper = document.getElementById("textWrapper");

  if (!tabUpload || !tabText) return;

  tabUpload.addEventListener("click", () => {
    currentTab = "upload";
    tabUpload.classList.add("active");
    tabText.classList.remove("active");
    uploadWrapper.style.display = "block";
    textWrapper.classList.remove("active");
  });

  tabText.addEventListener("click", () => {
    currentTab = "text";
    tabText.classList.add("active");
    tabUpload.classList.remove("active");
    uploadWrapper.style.display = "none";
    textWrapper.classList.add("active");
  });
}

/**
 * Setup Drag & Drop and File Picker
 */
function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const banner = document.getElementById("selectedFileBanner");
  const fileName = document.getElementById("selectedFileName");
  const fileSize = document.getElementById("selectedFileSize");
  const btnRemove = document.getElementById("btnRemoveFile");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  if (btnRemove) {
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelectedFile();
    });
  }

  function handleFileSelected(file) {
    const validTypes = ["application/pdf", "text/plain"];
    const isPDF = file.name.toLowerCase().endsWith(".pdf");
    const isTXT = file.name.toLowerCase().endsWith(".txt");

    if (!validTypes.includes(file.type) && !isPDF && !isTXT) {
      UI.showToast("Unsupported format. Please upload a PDF or TXT file.", "error");
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    banner.style.display = "flex";
    dropzone.style.display = "none";
    UI.showToast(`Selected: ${file.name}`, "info");
  }

  function clearSelectedFile() {
    selectedFile = null;
    fileInput.value = "";
    banner.style.display = "none";
    dropzone.style.display = "block";
  }
}

/**
 * Setup 1-Click Sample Buttons
 */
function setupSampleButtons() {
  const container = document.getElementById("sampleButtonsContainer");
  if (!container) return;

  container.innerHTML = "";

  Object.values(SAMPLE_LOANS).forEach((sample) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sample-chip";
    btn.innerHTML = `
      <span class="sample-badge ${sample.tagClass}">${sample.tag}</span>
      <div>
        <strong>${sample.title}</strong>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">${sample.description.substring(0, 55)}...</div>
      </div>
    `;

    btn.addEventListener("click", () => {
      const file = getSampleFile(sample.id);
      if (file) {
        const tabUpload = document.getElementById("tabUpload");
        if (tabUpload) tabUpload.click();

        selectedFile = file;
        const banner = document.getElementById("selectedFileBanner");
        const dropzone = document.getElementById("dropzone");
        const fileName = document.getElementById("selectedFileName");
        const fileSize = document.getElementById("selectedFileSize");

        fileName.textContent = file.name;
        fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB (Sample)`;
        banner.style.display = "flex";
        dropzone.style.display = "none";

        startAnalysis();
      }
    });

    container.appendChild(btn);
  });
}

/**
 * Setup Analysis Button & Process Flow
 */
function setupAnalyzeButton() {
  const btn = document.getElementById("analyzeBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    startAnalysis();
  });
}

/**
 * Execute Full Loan Document Analysis
 */
async function startAnalysis() {
  let fileToAnalyze = null;

  if (currentTab === "upload") {
    if (!selectedFile) {
      UI.showToast("Please select or drop a loan document first.", "error");
      return;
    }
    fileToAnalyze = selectedFile;
  } else {
    const textInput = document.getElementById("loanTextInput");
    const text = textInput ? textInput.value.trim() : "";
    if (!text || text.length < 20) {
      UI.showToast("Please paste the loan agreement text (at least a few lines).", "error");
      return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    fileToAnalyze = new File([blob], "pasted_loan_agreement.txt", { type: "text/plain" });
  }

  UI.showLoading(1, "Extracting text from document...");

  const t1 = setTimeout(() => UI.showLoading(2, "Extracting loan terms with Gemini AI..."), 1200);
  const t2 = setTimeout(() => UI.showLoading(3, "Calculating True APR and Red Flags..."), 3500);
  const t3 = setTimeout(() => UI.showLoading(4, "Matching Live Bank Alternatives & Savings..."), 5200);

  try {
    const results = await ApiService.analyzeLoan(fileToAnalyze);

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    UI.hideLoading();
    UI.renderResults(results);
    UI.showToast("Loan analysis completed with live bank comparisons!", "success");
  } catch (err) {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    UI.hideLoading();
    UI.showToast(err.message || "Failed to analyze loan document.", "error");
  }
}

/**
 * Setup Accordion for Extracted Terms
 */
function setupAccordion() {
  const header = document.getElementById("accordionHeader");
  const body = document.getElementById("accordionBody");
  const icon = document.getElementById("accordionIcon");

  if (!header || !body) return;

  header.addEventListener("click", () => {
    const isOpen = body.classList.toggle("open");
    if (icon) {
      icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
      icon.style.transition = "transform 0.2s ease";
    }
  });
}

/**
 * Setup Print Button
 */
function setupPrintButton() {
  const printBtn = document.getElementById("btnPrintReport");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}
