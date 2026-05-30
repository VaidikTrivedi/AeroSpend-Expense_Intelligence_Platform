#!/usr/bin/env python3
import os
import subprocess
import csv
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder=".")

UPLOAD_FOLDER = 'statements'
ALLOWED_EXTENSIONS = {'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16MB max

# Ensure statements directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Serve index.html as main page
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Serve other static files (styles.css, app.js, transactions.csv)
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('.', path)

# Get current transactions as JSON
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    csv_path = 'transactions.csv'
    if not os.path.exists(csv_path):
        return jsonify([])
        
    transactions = []
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                transactions.append({
                    "id": idx + 1,
                    "date": row["Date"],
                    "title": row["Title"],
                    "amount": float(row["Amount"]),
                    "category": row["Category"],
                    "institution": row.get("Institution", "Unknown")
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
    return jsonify(transactions)

# Upload statement PDF file
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected for upload"}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        print(f"New statement saved to {filepath}. Re-running parser...")
        
        # Re-run parser
        try:
            # Activate venv if it exists, otherwise run direct python
            python_exec = ".venv/bin/python3" if os.path.exists(".venv/bin/python3") else "python3"
            result = subprocess.run([python_exec, "analyze_expenses.py"], capture_output=True, text=True)
            if result.returncode == 0:
                return jsonify({
                    "success": True, 
                    "message": f"Successfully parsed and merged '{filename}'!",
                    "parser_output": result.stdout
                })
            else:
                return jsonify({
                    "success": False, 
                    "message": "File uploaded but parser encountered an error.",
                    "error": result.stderr
                }), 500
        except Exception as e:
            return jsonify({"success": False, "message": f"System error running parser: {e}"}), 500
            
    return jsonify({"success": False, "message": "Allowed file types: PDF only"}), 400

if __name__ == '__main__':
    print("Starting Expense Analysis Backend Server on http://localhost:8000...")
    app.run(host='0.0.0.0', port=8000, debug=True)
