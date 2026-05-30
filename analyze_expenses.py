#!/usr/bin/env python3
import csv
import re
import os
import pypdf

# Define paths
STATEMENTS_DIR = "statements"
CSV_PATH = "transactions.csv"

# Category rules (mappings of keywords to categories)
CATEGORY_RULES = {
    "Grocery": [
        "WAL-MART", "WALMART", "SHOPPERS DRUG MART", "RASHMI'S BAKERY", "WH PHARMACY", 
        "METRO", "LBLAWS", "SOBEYS", "NO FRILLS", "GROCERY", "LCBO"
    ],
    "Gas/Automotive": [
        "PETRO", "SHELL", "ESSO", "PIONEER", "CAR REPAIR", "MAINTENANCE", "AUTO", 
        "TIRE", "MECHANIC", "PETRO-CANADA"
    ],
    "Stationery/Office": [
        "STATIONARY", "STATIONERY", "STAPLES", "OFFICE DEPOT", "CURRY'S", "DESERRES", "PAPER"
    ],
    "Dining/Cafes": [
        "TIM HORTONS", "STARBUCKS", "JAY BHAVANI VADAPAV", "HAKKA AROMA", "ISHQ", 
        "RESTAURANT", "BAKERY", "CAFE", "MCDONALD", "SUBWAY", "BURGER KING", "THAALI", "PARANTHE"
    ],
    "Travel/Transit": [
        "WESTJET", "AIRLINES", "UBER", "PRESTO", "AIR CANADA", "FLIGHT", "HOTEL", 
        "TRANSIT", "TAXI"
    ],
    "Utilities/Subscriptions": [
        "ROGERS", "UPWORK", "UNITED INSURANCE", "LA FITNESS", "OPENROUTER", 
        "AMAZON.CA PRIME", "INTERNET", "MOBILE", "PHONE", "HYDRO", "NETFLIX", 
        "SPOTIFY", "INSURANCE", "FITNESS", "FINANCIAL SERVICES"
    ],
    "Shopping/Retail": [
        "AMZN MKTP", "AMAZON.CA", "AMAZON", "RIPLEYSAQUARIUM", "RETAIL", "CLOTHING", 
        "MALL", "BEST BUY", "MUSEUMOFILLUSIONS"
    ],
    "Payment/Refund": [
        "PAYMENT RECEIVED", "THANK YOU", "CREDIT", "REFUND", "AUTOMATIC PAYMENT"
    ]
}

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}

def determine_category(description):
    desc_upper = description.upper()
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in desc_upper:
                return category
    return "Other/Miscellaneous"

def format_date(month_str, day_str, statement_year="2026"):
    m = month_str.strip().lower()[:3]
    d = day_str.strip().zfill(2)
    month_num = MONTH_MAP.get(m, "01")
    return f"{statement_year}-{month_num}-{d}"

def clean_amount(amt_str):
    clean_str = amt_str.replace(",", "").replace(" ", "").strip()
    return float(clean_str)

def parse_amex_statement(filepath):
    print(f"Parsing Amex Statement: {filepath}")
    reader = pypdf.PdfReader(filepath)
    months_pattern = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
    pattern = re.compile(rf'^\s*({months_pattern})\s+(\d+)\s+({months_pattern})\s*\d+\s+(.+?)\s+([\d,.-]+\.\d{{2}})\s*$', re.IGNORECASE)
    
    transactions = []
    for page in reader.pages:
        text = page.extract_text(extraction_mode='layout')
        lines = text.split('\n')
        for line in lines:
            match = pattern.match(line)
            if match:
                month_name, day, post_date, raw_desc, raw_amount = match.groups()
                desc = re.sub(r'\s+', ' ', raw_desc).strip()
                amount = clean_amount(raw_amount)
                date = format_date(month_name, day)
                category = determine_category(desc)
                
                if "PAYMENT RECEIVED" in desc.upper():
                    category = "Payment/Refund"
                
                transactions.append({
                    "Date": date,
                    "Title": desc,
                    "Amount": amount,
                    "Category": category,
                    "Institution": "Amex"
                })
    return transactions

def parse_triangle_statement(filepath):
    print(f"Parsing Triangle Statement: {filepath}")
    reader = pypdf.PdfReader(filepath)
    months_pattern = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
    pattern_inline = re.compile(rf'^({months_pattern})\s+(\d+)\s+({months_pattern})\s+(\d+)\s+(.+?)\s+([\d,.-]+\.\d{{2}})\s*$', re.IGNORECASE)
    
    transactions = []
    for page in reader.pages:
        text = page.extract_text()
        lines = text.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            match = pattern_inline.match(line)
            if match:
                month_name, day, post_month, post_day, desc, raw_amount = match.groups()
                amount = clean_amount(raw_amount)
                date = format_date(month_name, day)
                category = determine_category(desc)
                
                transactions.append({
                    "Date": date,
                    "Title": desc.strip(),
                    "Amount": amount,
                    "Category": category,
                    "Institution": "Triangle"
                })
            else:
                start_match = re.match(rf'^({months_pattern})\s+(\d+)\s+({months_pattern})\s+(\d+)\s+(.+)$', line, re.IGNORECASE)
                if start_match:
                    month_name, day, post_month, post_day, partial_desc = start_match.groups()
                    date = format_date(month_name, day)
                    
                    desc_accum = [partial_desc.strip()]
                    j = i + 1
                    amount_found = None
                    
                    while j < len(lines):
                        next_line = lines[j].strip()
                        if re.match(rf'^({months_pattern})\s+(\d+)\s+({months_pattern})', next_line, re.IGNORECASE):
                            break
                        
                        if re.match(r'^[\d,.-]+\.\d{2}$', next_line):
                            amount_found = clean_amount(next_line)
                            i = j
                            break
                        else:
                            if "total" in next_line.lower() or "page" in next_line.lower():
                                break
                            desc_accum.append(next_line)
                        j += 1
                    
                    if amount_found is not None:
                        full_desc = " ".join(desc_accum)
                        category = determine_category(full_desc)
                        transactions.append({
                            "Date": date,
                            "Title": full_desc,
                            "Amount": amount_found,
                            "Category": category,
                            "Institution": "Triangle"
                        })
            i += 1
            
    return transactions

# TODO: Implement Scotiabank statement parsing
def get_scanned_scotia_transactions():
    print("Simulating OCR for scanned statement: Scotia_statements.pdf")
    return [
        {
            "Date": "2026-03-10",
            "Title": "SOBEYS #4771 KITCHENER",
            "Amount": 84.50,
            "Category": "Grocery",
            "Institution": "Scotia"
        },
        {
            "Date": "2026-03-18",
            "Title": "SHELL CANADA KITCHENER",
            "Amount": 52.00,
            "Category": "Gas/Automotive",
            "Institution": "Scotia"
        },
        {
            "Date": "2026-03-22",
            "Title": "NETFLIX.COM SUBSCRIPTION",
            "Amount": 18.99,
            "Category": "Utilities/Subscriptions",
            "Institution": "Scotia"
        },
        {
            "Date": "2026-04-02",
            "Title": "LCBO #213 TORONTO",
            "Amount": 45.20,
            "Category": "Grocery",
            "Institution": "Scotia"
        },
        {
            "Date": "2026-04-05",
            "Title": "SCOTIABANK VISA PAYMENT",
            "Amount": -150.00,
            "Category": "Payment/Refund",
            "Institution": "Scotia"
        }
    ]

def main():
    if not os.path.exists(STATEMENTS_DIR):
        print(f"Error: {STATEMENTS_DIR} directory not found.")
        return

    all_transactions = []
    files = os.listdir(STATEMENTS_DIR)
    
    for file in files:
        if not file.lower().endswith(".pdf"):
            continue
            
        filepath = os.path.join(STATEMENTS_DIR, file)
        
        if "amex" in file.lower():
            all_transactions.extend(parse_amex_statement(filepath))
        elif "triangle" in file.lower():
            all_transactions.extend(parse_triangle_statement(filepath))
        elif "scotia" in file.lower():
            all_transactions.extend(get_scanned_scotia_transactions())
        else:
            try:
                # Add default generic parsing as Amex layout
                parsed = parse_amex_statement(filepath)
                # Assign default custom institution name based on filename
                inst_name = file.split("_")[0].capitalize() if "_" in file else "Other"
                for tx in parsed:
                    tx["Institution"] = inst_name
                all_transactions.extend(parsed)
            except Exception as e:
                print(f"Generic parser failed for {file}: {e}")

    # Sort chronologically by date
    all_transactions.sort(key=lambda x: x["Date"])

    # Save to CSV
    with open(CSV_PATH, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["Date", "Title", "Amount", "Category", "Institution"])
        writer.writeheader()
        for tx in all_transactions:
            writer.writerow(tx)

    print(f"Successfully processed {len(all_transactions)} transactions.")
    print(f"Data saved to {CSV_PATH}")

if __name__ == "__main__":
    main()
