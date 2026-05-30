// Initialize global state
let transactions = [];
let categoryChart = null;
let trendChart = null;

// Date range states
let minDate = "";
let maxDate = "";

// Categories for select menus
const CATEGORIES = [
    "Grocery",
    "Gas/Automotive",
    "Stationery/Office",
    "Dining/Cafes",
    "Travel/Transit",
    "Utilities/Subscriptions",
    "Shopping/Retail",
    "Payment/Refund",
    "Other/Miscellaneous"
];

// Color mapping for premium gradients & UI elements
const CATEGORY_COLORS = {
    "Grocery": { border: "#10b981", bg: "rgba(16, 185, 129, 0.75)" },           // Green
    "Gas/Automotive": { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.75)" },     // Orange
    "Stationery/Office": { border: "#ec4899", bg: "rgba(236, 72, 153, 0.75)" },  // Pink
    "Dining/Cafes": { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.75)" },       // Blue
    "Travel/Transit": { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.75)" },     // Neon violet
    "Utilities/Subscriptions": { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.75)" }, // Cyan
    "Shopping/Retail": { border: "#f43f5e", bg: "rgba(244, 63, 94, 0.75)" },     // Rose
    "Payment/Refund": { border: "#10b981", bg: "rgba(16, 185, 129, 0.25)" },      // Light Green
    "Other/Miscellaneous": { border: "#6b7280", bg: "rgba(107, 114, 128, 0.75)" } // Gray
};

document.addEventListener("DOMContentLoaded", () => {
    // Initialize icons
    lucide.createIcons();
    
    // Load and parse transactions
    loadTransactions();

    // Hook up filter and search events
    document.getElementById("searchFilter").addEventListener("input", filterAndRender);
    document.getElementById("categoryFilter").addEventListener("change", filterAndRender);
    document.getElementById("fromDateFilter").addEventListener("change", filterAndRender);
    document.getElementById("toDateFilter").addEventListener("change", filterAndRender);
    
    // Hook up dynamic Card checkboxes
    document.getElementById("instAmex").addEventListener("change", filterAndRender);
    document.getElementById("instTriangle").addEventListener("change", filterAndRender);
    document.getElementById("instScotia").addEventListener("change", filterAndRender);
    
    // Hook up interactive action buttons
    document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
    
    // Hook up PDF statement upload
    const uploadInput = document.getElementById("pdfUploadInput");
    const uploadBtn = document.getElementById("uploadPdfBtn");
    
    uploadBtn.addEventListener("click", () => {
        uploadInput.click();
    });
    
    uploadInput.addEventListener("change", handlePdfUpload);
});

// Load transactions from API or fallback CSV
async function loadTransactions() {
    try {
        const response = await fetch("/api/transactions");
        if (response.ok) {
            transactions = await response.json();
            console.log("Loaded transactions via API server:", transactions.length);
        } else {
            await loadStaticCsvFallback();
        }
        
        initializeDateRanges();
        updateDashboard();
    } catch (error) {
        console.warn("API Server not active, falling back to static CSV file reader:", error);
        await loadStaticCsvFallback();
        initializeDateRanges();
        updateDashboard();
    }
}

// Fallback loader if Flask server isn't running
async function loadStaticCsvFallback() {
    const csvResponse = await fetch("transactions.csv");
    if (!csvResponse.ok) {
        throw new Error("Could not load transactions.csv");
    }
    const csvData = await csvResponse.text();
    parseCsv(csvData);
}

// Simple CSV parser
function parseCsv(csvText) {
    transactions = [];
    const lines = csvText.split("\n");
    if (lines.length < 2) return;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(",");
        if (parts.length >= 5) {
            transactions.push({
                id: i,
                date: parts[0],
                title: parts[1],
                amount: parseFloat(parts[2]),
                category: parts[3],
                institution: parts[4]
            });
        }
    }
}

// Initialize date range filter inputs
function initializeDateRanges() {
    if (transactions.length === 0) return;
    
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    minDate = sorted[0].date;
    maxDate = sorted[sorted.length - 1].date;
    
    const fromInput = document.getElementById("fromDateFilter");
    const toInput = document.getElementById("toDateFilter");
    
    fromInput.min = minDate;
    fromInput.max = maxDate;
    toInput.min = minDate;
    toInput.max = maxDate;
    
    fromInput.value = minDate;
    toInput.value = maxDate;
}

// Show toast notifications
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    
    toastMsg.innerText = message;
    
    if (isError) {
        toast.style.borderColor = "rgba(239, 68, 68, 0.4)";
        toast.style.boxShadow = "0 10px 30px rgba(239, 68, 68, 0.25)";
        toast.querySelector("i").setAttribute("data-lucide", "alert-circle");
    } else {
        toast.style.borderColor = "var(--border-color-glow)";
        toast.style.boxShadow = "0 10px 30px rgba(139, 92, 246, 0.25)";
        toast.querySelector("i").setAttribute("data-lucide", "check-circle");
    }
    
    lucide.createIcons();
    toast.classList.remove("hidden");
    
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}

// PDF Upload Handler
async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Error: Please select a PDF file.", true);
        return;
    }
    
    showToast(`Uploading and analyzing statement: ${file.name}...`);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(result.message);
            await loadTransactions();
        } else {
            showToast(result.message || "Failed to process statement.", true);
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast("Server not responding. Running client-side demonstration...", true);
    }
    
    e.target.value = "";
}

// Update dashboard with currently filtered data
function updateDashboard() {
    const filtered = getFilteredTransactions();
    calculateMetrics(filtered);
    renderCharts(filtered);
    renderLedger(filtered);
}

// Retrieve filtered transactions based on UI state
function getFilteredTransactions() {
    const searchVal = document.getElementById("searchFilter").value.toLowerCase().trim();
    const categoryVal = document.getElementById("categoryFilter").value;
    const fromVal = document.getElementById("fromDateFilter").value;
    const toVal = document.getElementById("toDateFilter").value;
    
    // Checkboxes
    const showAmex = document.getElementById("instAmex").checked;
    const showTriangle = document.getElementById("instTriangle").checked;
    const showScotia = document.getElementById("instScotia").checked;
    
    return transactions.filter(tx => {
        // Text matching
        const matchesSearch = tx.title.toLowerCase().includes(searchVal) || 
                              tx.amount.toString().includes(searchVal) || 
                              tx.date.includes(searchVal) || 
                              tx.institution.toLowerCase().includes(searchVal);
        
        // Category selection
        const matchesCategory = categoryVal === "all" || tx.category === categoryVal;
        
        // Date range
        let matchesDate = true;
        if (fromVal) matchesDate = matchesDate && tx.date >= fromVal;
        if (toVal) matchesDate = matchesDate && tx.date <= toVal;
        
        // Card Institution filter check
        let matchesInstitution = false;
        if (tx.institution.toLowerCase() === "amex" && showAmex) matchesInstitution = true;
        if (tx.institution.toLowerCase() === "triangle" && showTriangle) matchesInstitution = true;
        if (tx.institution.toLowerCase() === "scotia" && showScotia) matchesInstitution = true;
        // Generic fallback if user uploads custom
        if (!["amex", "triangle", "scotia"].includes(tx.institution.toLowerCase())) {
            matchesInstitution = true; 
        }
        
        return matchesSearch && matchesCategory && matchesDate && matchesInstitution;
    });
}

// Triggered when filters change
function filterAndRender() {
    updateDashboard();
}

// Calculate top-line metrics
function calculateMetrics(list) {
    let totalOutflow = 0;
    let totalPayments = 0;
    let outflowCount = 0;
    
    const categoryTotals = {};
    
    list.forEach(tx => {
        if (tx.category === "Payment/Refund" || tx.amount < 0) {
            totalPayments += Math.abs(tx.amount);
        } else {
            totalOutflow += tx.amount;
            outflowCount++;
            
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        }
    });

    const avgTransaction = outflowCount > 0 ? (totalOutflow / outflowCount) : 0;
    
    let topCategory = "-";
    let topCategoryAmt = 0;
    
    Object.keys(categoryTotals).forEach(cat => {
        if (categoryTotals[cat] > topCategoryAmt) {
            topCategoryAmt = categoryTotals[cat];
            topCategory = cat;
        }
    });
    
    const topCategoryPercent = totalOutflow > 0 ? ((topCategoryAmt / totalOutflow) * 100).toFixed(0) : 0;

    document.getElementById("totalOutflowVal").innerText = `$${totalOutflow.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("totalPaymentsVal").innerText = `$${totalPayments.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("avgTransactionVal").innerText = `$${avgTransaction.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("avgTransactionCount").innerText = `${outflowCount} purchase transactions`;
    
    if (topCategory !== "-") {
        document.getElementById("topCategoryVal").innerText = topCategory;
        document.getElementById("topCategorySubtext").innerText = `${topCategoryPercent}% of total spend ($${topCategoryAmt.toFixed(2)})`;
    } else {
        document.getElementById("topCategoryVal").innerText = "-";
        document.getElementById("topCategorySubtext").innerText = "0% of total spend";
    }
}

// Generate premium datasets and render visual charts
function renderCharts(list) {
    // 1. Prepare Category Allocations
    const categoryAllocations = {};
    list.forEach(tx => {
        if (tx.category !== "Payment/Refund" && tx.amount > 0) {
            categoryAllocations[tx.category] = (categoryAllocations[tx.category] || 0) + tx.amount;
        }
    });

    const sortedCategories = Object.keys(categoryAllocations).sort((a, b) => categoryAllocations[b] - categoryAllocations[a]);
    const chartLabels = sortedCategories;
    const chartData = sortedCategories.map(cat => categoryAllocations[cat].toFixed(2));
    const chartBackgrounds = sortedCategories.map(cat => CATEGORY_COLORS[cat]?.bg || "#6b7280");
    const chartBorders = sortedCategories.map(cat => CATEGORY_COLORS[cat]?.border || "#4b5563");

    const categoryCtx = document.getElementById("categoryChart").getContext("2d");
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartBackgrounds,
                borderColor: chartBorders,
                borderWidth: 1.5,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = parseFloat(context.raw).toFixed(2);
                            return ` ${context.label}: $${val}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });

    // 2. DAILY EXPENSE OUTFLOW (Instead of Cumulative) - Renders as a beautiful Bar chart
    const dailySpend = {};
    list.forEach(tx => {
        if (tx.category !== "Payment/Refund" && tx.amount > 0) {
            dailySpend[tx.date] = (dailySpend[tx.date] || 0) + tx.amount;
        }
    });

    // Sort dates ascending
    const sortedDates = Object.keys(dailySpend).sort();
    const trendLabels = [];
    const trendValues = [];

    sortedDates.forEach(date => {
        const dateParts = date.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedDate = dateParts.length === 3 ? `${monthNames[parseInt(dateParts[1]) - 1]} ${dateParts[2]}` : date;
        
        trendLabels.push(formattedDate);
        trendValues.push(dailySpend[date].toFixed(2));
    });

    // Render/Update Bar Chart
    const trendCtx = document.getElementById("trendChart").getContext("2d");
    if (trendChart) {
        trendChart.destroy();
    }

    const purpleGradient = trendCtx.createLinearGradient(0, 0, 0, 300);
    purpleGradient.addColorStop(0, 'rgba(167, 139, 250, 0.85)'); // Vibrant violet
    purpleGradient.addColorStop(1, 'rgba(139, 92, 246, 0.15)');

    trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Daily Spending ($)',
                data: trendValues,
                borderColor: '#a78bfa',
                borderWidth: 1,
                borderRadius: 5,
                backgroundColor: purpleGradient,
                hoverBackgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Spent: $${parseFloat(context.raw).toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans', size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans', size: 9 } }
                }
            }
        }
    });
}

// Render ledger list to table
function renderLedger(list) {
    const tableBody = document.getElementById("ledgerTableBody");
    tableBody.innerHTML = "";
    
    if (list.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    No transactions match your search or filter filters.
                </td>
            </tr>
        `;
        document.getElementById("ledgerCountText").innerText = `Showing 0 of ${transactions.length} transactions`;
        return;
    }

    list.forEach(tx => {
        const row = document.createElement("tr");
        
        // Date cell
        const dateCell = document.createElement("td");
        dateCell.className = "col-date";
        const dateParts = tx.date.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedDate = dateParts.length === 3 ? `${monthNames[parseInt(dateParts[1]) - 1]} ${dateParts[2]}, ${dateParts[0]}` : tx.date;
        dateCell.innerText = formattedDate;

        // Institution column
        const instCell = document.createElement("td");
        instCell.className = "col-institution";
        instCell.innerText = tx.institution || "Other";
        
        // Title cell
        const titleCell = document.createElement("td");
        titleCell.className = "col-title";
        titleCell.innerText = tx.title;

        // Category cell
        const categoryCell = document.createElement("td");
        categoryCell.className = "col-category";
        
        const select = document.createElement("select");
        select.className = "table-category-select";
        select.style.borderLeft = `3px solid ${CATEGORY_COLORS[tx.category]?.border || "#6b7280"}`;
        
        CATEGORIES.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.innerText = cat;
            if (cat === tx.category) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        // Inline update handler
        select.addEventListener("change", (e) => {
            const newCat = e.target.value;
            tx.category = newCat;
            select.style.borderLeft = `3px solid ${CATEGORY_COLORS[newCat]?.border || "#6b7280"}`;
            
            const currentFiltered = getFilteredTransactions();
            calculateMetrics(currentFiltered);
            renderCharts(currentFiltered);
            showToast(`Re-classified transaction to: ${newCat}`);
        });
        
        categoryCell.appendChild(select);

        // Amount cell
        const amountCell = document.createElement("td");
        amountCell.className = `col-amount text-right ${tx.category === "Payment/Refund" || tx.amount < 0 ? "amount-payment" : "amount-outflow"}`;
        
        const sign = tx.amount < 0 ? "-" : "";
        amountCell.innerText = `${sign}$${Math.abs(tx.amount).toFixed(2)}`;

        row.appendChild(dateCell);
        row.appendChild(instCell);
        row.appendChild(titleCell);
        row.appendChild(categoryCell);
        row.appendChild(amountCell);
        
        tableBody.appendChild(row);
    });

    document.getElementById("ledgerCountText").innerText = `Showing ${list.length} of ${transactions.length} transactions`;
}

// Client-side CSV Exporter using modern Blob mechanism
function exportCsv() {
    let csvContent = "Date,Title,Amount,Category,Institution\n";
    
    transactions.forEach(tx => {
        const safeTitle = tx.title.includes(",") || tx.title.includes("\"") 
            ? `"${tx.title.replace(/"/g, '""')}"` 
            : tx.title;
        csvContent += `${tx.date},${safeTitle},${tx.amount},${tx.category},${tx.institution || 'Other'}\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV file successfully exported!");
}
