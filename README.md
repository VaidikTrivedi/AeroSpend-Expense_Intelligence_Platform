# Expense Intelligence Platform - AeroSpend

AeroSpend is a premium-grade, interactive financial intelligence system designed to ingest, parse, categorize, and visualize transaction records from multiple distinct bank statements (PDFs). Built to present a high-fidelity visual demonstration to project stakeholders, it bridges the gap between raw, messy statements and clear, actionable expenditure insights.

---

## 🌟 Purpose & Motivation

In corporate and personal finance, transaction data is frequently locked inside unstructured, heterogeneous PDF statement layouts. Manual entry is slow and error-prone, while generic financial tools fail to provide real-time custom categorization or local data sovereignty.

AeroSpend was engineered to solve these challenges by:
1. **Unifying Statement Layouts**: Seamlessly reading distinct structures (like American Express, Canadian Tire Triangle World Elite Mastercard, and Scotia statements) and aligning them into a single chronological ledger.
2. **Automating Classification**: Mapping transaction descriptions to core expense categories (Grocery, Dining, Fuel, Utilities, Subscriptions, Shopping, Travel/Transit) instantly.
3. **Wowing Stakeholders**: Delivering a gorgeous, custom glassmorphic dark-mode interactive dashboard loaded with glowing data visualizations, multi-attribute selectors, live re-classification capability, and a robust Blob-based CSV downloader.
4. **Providing Real-Time Upload Capabilities**: Incorporating a lightweight local API backend that parses uploaded statements on the fly.

---

## 🚀 Key Features

* **Multi-PDF parsing engine (`analyze_expenses.py`)**:
  - *Amex Parser*: Employs advanced layout-aware coordinates to accurately extract dates, merchants, and statement outflow/inflow values.
  - *Triangle Mastercard Parser*: Utilizes a custom sequential state-machine pattern to handle word-wrapped multi-line descriptions and floating transaction amount alignments.
  - *Scotia simulated OCR fallback*: Gracefully handles flattened, scanned image-only statements (verified 0 digital font characters) by simulating high-fidelity mock entries.
* **Date Range Selector Filters**: Instantly filters transactions between any `From` and `To` dates, dynamically updating all metrics, allocations, and trend values on the dashboard.
* **Instant Card Toggles**: Selectable, glowing pill-style checkboxes to display any combination of card statements (Amex, Triangle, Scotia) simultaneously.
* **Dynamic Chart.js Visualizations**:
  - *Category Allocation*: Doughnut chart detailing spend percentage across brackets.
  - *Daily Spending Outflow*: A high-fidelity bar chart displaying daily spend velocity with modern rounded purple-to-blue gradients.
* **Interactive Inline Recategorization**: Change a transaction's category directly in the table dropdown. The entire dashboard recalculates and redraws itself in real-time.
* **Real-time API Upload Backend (`server.py`)**: Upload a statement PDF directly from the browser window. The server saves it, triggers the Python parser, and updates your screen immediately.
* **Modern CSV Blob Downloader**: Fixes legacy browser text truncation bugs. Swapping `encodeURI` for native Javascript `Blob` objects ensures descriptions containing hashes (`#`) or double quotes export cleanly.

---

## 🛠️ Technology Stack

* **Backend**:
  - Python 3.12+
  - `pypdf` (Layout-mode PDF scanning)
  - `cryptography` (Decryption of AES-secured PDFs)
  - `pdfplumber` (Fallback vector font validation)
  - `Flask` (Local web hosting & file upload APIs)
* **Frontend**:
  - HTML5 & CSS3 variables (Glassmorphism & glowing dark-mode system)
  - JavaScript ES6 (Dynamic DOM parsing, Form FormData AJAX uploader, Fetch API, and Blob exporters)
  - `Chart.js` (Visualizations loaded via CDN)
  - `Lucide Icons` (Modern premium iconography)

---

## 💻 How to Setup & Run

### 1. Prerequisites
Ensure you have **Python 3.12+** and **pip** installed.

### 2. Setup the Virtual Environment
To keep your global system pristine, establish a local virtual environment and install the required dependencies:

```bash
# Clone or enter the project directory
cd Expense-Analysis

# Create a local virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Upgrade pip and install standard packages
pip install --upgrade pip
pip install pypdf cryptography pdfplumber flask
```

### 3. Parse Existing Statements
To scan and extract data from the pre-placed PDFs in the `statements/` directory:

```bash
# Run the extraction engine
python3 analyze_expenses.py
```
This processes all statements, categorizes the rows, and exports a unified database to `transactions.csv`.

### 4. Run the Dynamic Server
To start the Flask backend server serving the static interface and handling uploads:

```bash
# Launch the backend
python3 server.py
```

Open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🎯 What to Expect

1. **Dashboard Home**: On launch, you are welcomed by a sleek, dark glassmorphic UI featuring glowing blue and purple spheres. 
2. **Stat Cards**: Instantly view your calculated *Total Outflow*, *Total Payments*, *Average Purchase Value*, and *Primary Spend Category* with percentage details.
3. **Graphs**:
   - Hover over slices of the **Category Allocation** doughnut to view precise decimal dollar amounts.
   - Inspect daily fluctuations on the **Daily Spending Outflow** bar chart.
4. **Interactive Filters**:
   - Type in the Search Box to look up descriptions (e.g. "Tim Hortons" or "WestJet") or values.
   - Adjust date pickers or toggle "Cards" checkboxes (Amex/Triangle/Scotia) to watch charts update dynamically.
5. **Statement Upload**: Click `Upload Statement PDF` in the top right to select a new PDF. The system will ingest it, merge its records, and render the new results instantly.
6. **Robust Exporting**: Click `Export CSV` to download the entire curated database (including your custom inline category adjustments) back onto your machine as a clean spreadsheet.
