# Secure-38: AI-Powered Document Redaction & Analysis

Secure-38 is a full-stack web application designed for Data Loss Prevention (DLP). It allows users to upload documents (PDFs, Office files, images), which are then analyzed by a powerful AI pipeline. The system detects and redacts Personally Identifiable Information (PII), provides AI-generated security summaries, and presents the findings in a clean, professional dashboard.

![Dashboard](https://i.imgur.com/your-dashboard-image-url.png) ## Features

* **Secure Authentication:** JWT-based user registration and login.
* **Multi-File Upload:** Supports individual files and `.zip` archive extraction.
* **Multi-Format Processing:** Analyzes `.pdf`, `.docx`, `.pptx`, `.xlsx`, and images (`.png`, `.jpg`).
* **AI-Powered PII Redaction:** Uses a Hugging Face BERT (NER) model to find and redact names, locations, and organizations.
* **Sensitive Data Detection:** Uses regex to find and redact emails, phone numbers, IPs, and keywords (e.g., `token`, `password`).
* **AI Security Analysis:** Uses the **Google Gemini API** to provide natural language descriptions and key security findings for each file.
* **Image Analysis (OCR):** Uses **Tesseract** to extract text from images for analysis.
* **Image Description:** Uses a **BLIP** model to generate descriptions of images.
* **Functional Dashboard:** Real-time stats on files processed, PII instances found, and system health.
* **Downloadable Reports:** Users can download the "cleansed" (redacted) versions of their files.

## Tech Stack

* **Frontend:** React, Vite, TypeScript, Shadcn/UI, Tailwind CSS, TanStack Query
* **Backend:** Node.js, Express, Bun Runtime, Mongoose, JWT, bcryptjs
* **Database:** MongoDB Atlas
* **AI Pipeline (Python):**
    * PyTorch
    * Transformers (BERT & BLIP)
    * Google Generative AI (Gemini)
    * Tesseract (pytesseract)
    * OpenCV
    * Pandas

---

## Setup & Installation

Follow these steps to get the project running locally.

### Prerequisites

* **Node.js** (v18+)
* **Bun**
* **Python** (v3.11 recommended)
* **Tesseract OCR:** Download and install from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki).
    * **CRITICAL:** During installation, check the box to **"Add Tesseract to the system PATH"**.
* **MongoDB Atlas Account:** A free cluster is sufficient.
* **Google AI Studio Account:** To get a **Gemini API Key**.

### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create an environment file:
    ```bash
    touch .env
    ```
3.  Open `.env` and paste in the template (see **Environment Variables** below). Fill it with your secret keys.
4.  Install Node.js dependencies:
    ```bash
    bun install
    ```

### 2. Python AI Setup

1.  Navigate to the Python model directory:
    ```bash
    cd python_model
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the environment:
    * **Windows:** `.\venv\Scripts\activate`
    * **macOS/Linux:** `source venv/bin/activate`
4.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### 3. Frontend Setup

1.  Navigate back to the root `Optiv-38` directory.
2.  Install Node.js dependencies:
    ```bash
    bun install
    ```

---

## Running the Application

You must run two separate terminals.

### Terminal 1: Run the Backend

```bash
# From the root 'Optiv-38' folder
# 1. Activate the Python environment
.\backend\python_model\venv\Scripts\activate

# 2. Navigate to the backend
cd backend

# 3. Start the server
bun run server.js
