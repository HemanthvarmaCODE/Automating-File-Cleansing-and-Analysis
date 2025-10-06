#!/usr/bin/env python3
import os
import sys
import json
import re
import warnings
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil

import pandas as pd
import fitz
import docx
from pptx import Presentation
from openpyxl import load_workbook
import cv2
import pytesseract
from PIL import Image
import torch
from transformers import pipeline, BlipForConditionalGeneration, BlipProcessor
import google.generativeai as genai

warnings.filterwarnings("ignore")

# -------------------------------
# Helpers for logging (stderr)
# -------------------------------
def log(msg: str):
    print(f"[INFO] {msg}", file=sys.stderr)

def error_log(msg: str):
    print(f"[ERROR] {msg}", file=sys.stderr)

# -------------------------------
# Configuration
# -------------------------------
MAX_WORKERS = min(8, (os.cpu_count() or 4))
CLEANSED_DIR = "cleansed_files"
REDACTED_IMG_DIR = "redacted_images"
OCR_CONF_THRESHOLD = 60

os.makedirs(CLEANSED_DIR, exist_ok=True)
os.makedirs(REDACTED_IMG_DIR, exist_ok=True)

# -------------------------------
# Load all three AI models
# -------------------------------
device_index = 0 if torch.cuda.is_available() else -1
log(f"torch.cuda.is_available: {torch.cuda.is_available()}, using device_index={device_index}")

try:
    # 1. Gemini API for high-level analysis
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not found.")
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel("models/gemini-2.0-flash")

    # 2. Hugging Face BERT for precise, local PII redaction
    ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple", device=device_index)

    # 3. Hugging Face BLIP for image captioning
    blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
    blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
    if device_index >= 0:
        blip_model.to(f"cuda:{device_index}")
except Exception as e:
    error_log(f"Failed to load AI models: {e}")
    sys.stderr.write(json.dumps([{"error": f"Failed to load AI models: {e}"}]))
    sys.exit(1)

# -------------------------------
# AI-Powered Analysis with Gemini
# -------------------------------
def analyze_content_with_gemini(text: str, file_type: str):
    if not text or not text.strip():
        return "No text content was found to analyze.", []

    truncated_text = text[:15000]
    prompt = f"""
    You are a professional cybersecurity analyst reviewing a .{file_type} file.
    Your task is to provide a security-focused assessment based on the text content provided.

    Return ONLY a single, valid JSON object with two keys: "file_description" and "vulnerability_analysis".

    1.  **file_description**: Write a detailed, descriptive paragraph (3-4 sentences) summarizing the document's purpose, content, and the type of information it contains from a security perspective.
    2.  **vulnerability_analysis**: Write a single, descriptive paragraph summarizing the security risks. Mention the types of PII found (names, emails, etc.) and explain the potential impact (e.g., phishing, identity theft, corporate espionage). If specific keywords like 'password' or 'api_key' are found, highlight them as critical risks. If no risks are found, state that the document appears to be clean.

    Here is the text to process:
    ---
    {truncated_text}
    ---
    """
    try:
        response = gemini_model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        result = json.loads(cleaned_response)
        description = result.get("file_description", "AI analysis failed to generate a file description.")
        vulnerability_paragraph = result.get("vulnerability_analysis", "AI analysis of vulnerabilities failed.")
        vulnerabilities = [{"description": vulnerability_paragraph, "severity": "Info"}]
        return description, vulnerabilities
    except Exception as e:
        error_log(f"Gemini API call failed: {e}")
        return "AI analysis failed.", [
            {
                "description": f"The Gemini API call failed, which prevented a vulnerability analysis. This may be due to API limits or content safety filters. Error: {e}",
                "severity": "High"
            }
        ]

# -------------------------------
# Utility helpers
# -------------------------------
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r'\b(\+?\d{1,4}[-.\s]?)?(\(?\d{3,4}\)?[-.\s]?)?\d{6,10}\b')
CREDIT_CARD_PATTERN = re.compile(r'\b(?:\d[ -]*?){13,16}\b')
IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
API_KEY_PATTERN = re.compile(r'\b[a-zA-Z0-9]{32,}\b')
SENSITIVE_KEYWORDS = ["password", "api_key", "secret", "ssn", "token", "private_key"]

def safe_read_text_blocks_from_docx(doc):
    return [p.text for p in doc.paragraphs]

def safe_read_text_blocks_from_pptx(prs):
    blocks = []
    for s in prs.slides:
        for shape in s.shapes:
            if hasattr(shape, "text") and shape.text:
                blocks.append(shape.text)
    return blocks

def safe_read_text_blocks_from_xlsx(wb):
    blocks = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str):
                    blocks.append(cell.value)
    return blocks

def redact_using_map(orig_text, redaction_map):
    return redaction_map.get(orig_text, orig_text)

# -------------------------------
# Enhanced Redaction & Vulnerability Detection
# -------------------------------
def analyze_and_redact_text_once(text: str):
    if not isinstance(text, str) or not text.strip():
        return text, {}, []

    vulnerabilities = []
    pii_counts = {"person": 0, "organization": 0, "location": 0, "email":0, "phone":0, "credit_card":0, "ip":0, "api_key":0}

    # NER
    try:
        entities = ner_pipeline(text)
    except Exception as e:
        error_log(f"NER pipeline failure: {e}")
        return text, pii_counts, [{"description": f"NER model failed: {e}", "severity": "High"}]

    redacted = list(text)
    for ent in reversed(entities):
        start, end, group = ent.get("start"), ent.get("end"), ent.get("entity_group")
        if group in ("PER", "ORG", "LOC") and all(isinstance(i,int) for i in [start,end]):
            redacted[start:end] = "[REDACTED]"
            if group=="PER": pii_counts["person"]+=1
            elif group=="ORG": pii_counts["organization"]+=1
            else: pii_counts["location"]+=1

    redacted_text = "".join(redacted)

    # Pattern-based redactions
    for pattern, key in [(EMAIL_PATTERN,"email"), (PHONE_PATTERN,"phone"), 
                         (CREDIT_CARD_PATTERN,"credit_card"), (IP_PATTERN,"ip"),
                         (API_KEY_PATTERN,"api_key")]:
        matches = pattern.findall(redacted_text)
        pii_counts[key]+=len(matches)
        if matches:
            redacted_text = pattern.sub("[REDACTED]", redacted_text)
            for m in matches:
                vulnerabilities.append({"description": f"Detected sensitive {key}: {m}", "severity":"High"})

    # Keyword-based vulnerabilities
    for kw in SENSITIVE_KEYWORDS:
        if re.search(rf"\b{kw}\b", text, re.IGNORECASE):
            vulnerabilities.append({"description": f"Keyword '{kw}' found, potential sensitive data exposure.", "severity":"High"})

    return redacted_text, pii_counts, vulnerabilities

# -------------------------------
# File processors
# -------------------------------
def process_pdf(file_path, output_path):
    doc = fitz.open(file_path)
    full_text = "\n".join(filter(None,[p.get_text() for p in doc]))
    summary, vulnerabilities = analyze_content_with_gemini(full_text,"pdf")
    _, pii_counts, local_vulns = analyze_and_redact_text_once(full_text)
    vulnerabilities.extend(local_vulns)
    for page in doc:
        entities = ner_pipeline(full_text)
        for ent in entities:
            if ent.get("entity_group") in ("PER","ORG","LOC"):
                areas = page.search_for(ent.get("word"))
                for rect in areas: page.add_redact_annot(rect, fill=(0,0,0))
        page.apply_redactions()
    doc.save(output_path, garbage=3, deflate=True)
    doc.close()
    return summary, pii_counts, vulnerabilities

def process_docx(file_path, output_path):
    doc = docx.Document(file_path)
    blocks = safe_read_text_blocks_from_docx(doc)
    full_text = "\n".join(blocks)
    summary, vulnerabilities = analyze_content_with_gemini(full_text,"docx")
    redacted_full, pii_counts, local_vulns = analyze_and_redact_text_once(full_text)
    vulnerabilities.extend(local_vulns)
    redacted_lines = redacted_full.split("\n")
    redaction_map = dict(zip(blocks, redacted_lines))
    for para in doc.paragraphs:
        if para.text and para.text.strip():
            para.text = redact_using_map(para.text, redaction_map)
    doc.save(output_path)
    return summary, pii_counts, vulnerabilities

def process_pptx(file_path, output_path):
    prs = Presentation(file_path)
    blocks = safe_read_text_blocks_from_pptx(prs)
    full_text = "\n".join(blocks)
    summary, vulnerabilities = analyze_content_with_gemini(full_text,"pptx")
    redacted_full, pii_counts, local_vulns = analyze_and_redact_text_once(full_text)
    vulnerabilities.extend(local_vulns)
    redacted_lines = redacted_full.split("\n")
    redaction_map = dict(zip(blocks, redacted_lines))
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape,"text") and shape.text and shape.text.strip():
                shape.text = redact_using_map(shape.text, redaction_map)
    prs.save(output_path)
    return summary, pii_counts, vulnerabilities

def process_xlsx(file_path, output_path):
    wb = load_workbook(file_path)
    blocks = safe_read_text_blocks_from_xlsx(wb)
    full_text = "\n".join(blocks)
    summary, vulnerabilities = analyze_content_with_gemini(full_text,"xlsx")
    redacted_full, pii_counts, local_vulns = analyze_and_redact_text_once(full_text)
    vulnerabilities.extend(local_vulns)
    redacted_lines = redacted_full.split("\n")
    redaction_map = dict(zip(blocks, redacted_lines))
    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value,str):
                    cell.value = redact_using_map(cell.value, redaction_map)
    wb.save(output_path)
    return summary, pii_counts, vulnerabilities

def process_csv(file_path, output_path):
    df = pd.read_csv(file_path,dtype=str,keep_default_na=False)
    full_text = df.to_string()
    summary, vulnerabilities = analyze_content_with_gemini(full_text,"csv")
    for col in df.columns:
        if df[col].dtype=='object':
            df[col]=df[col].astype(str).apply(lambda v: analyze_and_redact_text_once(v)[0] if v and v.strip() else v)
    df.to_csv(output_path,index=False)
    _, pii_counts, local_vulns = analyze_and_redact_text_once(full_text)
    vulnerabilities.extend(local_vulns)
    return summary, pii_counts, vulnerabilities

def process_image(file_path, output_path):
    try:
        raw_image = Image.open(file_path).convert("RGB")
        inputs = blip_processor(raw_image, return_tensors="pt")
        if device_index>=0:
            inputs={k:v.to(f"cuda:{device_index}") for k,v in inputs.items()}
        out = blip_model.generate(**inputs)
        blip_description = blip_processor.decode(out[0], skip_special_tokens=True)

        img = cv2.imread(file_path)
        ocr_text = pytesseract.image_to_string(Image.fromarray(img))
        gemini_summary, vulnerabilities = analyze_content_with_gemini(ocr_text,"image")
        redacted_text, pii_counts, local_vulns = analyze_and_redact_text_once(ocr_text)
        vulnerabilities.extend(local_vulns)

        words_to_redact = set(redacted_text.split())
        ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        redacted_count = 0
        for i,word in enumerate(ocr_data.get("text",[])):
            if word in words_to_redact:
                redacted_count+=1
                (x,y,w,h)=(ocr_data["left"][i],ocr_data["top"][i],ocr_data["width"][i],ocr_data["height"][i])
                cv2.rectangle(img,(x,y),(x+w,y+h),(0,0,0),-1)
        if redacted_count>0 and not any("OCR" in str(v) for v in vulnerabilities):
            vulnerabilities.append({"description":f"Redacted {redacted_count} sensitive words found via OCR.","severity":"Medium"})
        cv2.imwrite(output_path,img)
        final_summary=f"BLIP Analysis: '{blip_description}'.\n\nGemini Security Assessment: {gemini_summary}"
        return final_summary, {}, vulnerabilities
    except Exception as e:
        error_log(f"Failed to process image {file_path}: {e}")
        return "Could not analyze image.", {}, [{"description": f"Image processing failed: {e}", "severity":"High"}]

# -------------------------------
# Parallel Orchestrator
# -------------------------------
def process_single_file_worker(directory_to_process, filename):
    file_path = os.path.join(directory_to_process, filename)
    if not os.path.isfile(file_path): return None
    p_file = Path(file_path)
    file_type = p_file.suffix.lower().replace(".","")
    result={"originalFileName":p_file.name,"fileType":file_type,"status":"completed",
            "summary":f"A .{file_type} file.","piiDetected":{},"vulnerabilities":[],"cleansedFilePath":None}
    try:
        cleansed_name=f"cleansed_{p_file.name}"
        cleansed_path=os.path.join(CLEANSED_DIR,cleansed_name)
        if file_type=="pdf":
            summary, pii, vulns=process_pdf(file_path,cleansed_path)
        elif file_type=="docx":
            summary, pii, vulns=process_docx(file_path,cleansed_path)
        elif file_type=="pptx":
            summary, pii, vulns=process_pptx(file_path,cleansed_path)
        elif file_type in ("xlsx","xlsm"):
            summary, pii, vulns=process_xlsx(file_path,cleansed_path)
        elif file_type=="csv":
            summary, pii, vulns=process_csv(file_path,cleansed_path)
        elif file_type in ["jpg","jpeg","png","bmp"]:
            cleansed_path=os.path.join(REDACTED_IMG_DIR,cleansed_name)
            summary, pii, vulns=process_image(file_path,cleansed_path)
        else:
            shutil.copy(file_path,cleansed_path)
            summary, pii, vulns="File format not supported for deep analysis.",{},[{"description":f"File type '{file_type}' is not supported.","severity":"Low"}]
        result.update({"summary":summary,"piiDetected":pii,"vulnerabilities":vulns,"cleansedFilePath":cleansed_path})
    except Exception as e:
        error_log(f"Unexpected error processing {file_path}: {e}")
        result.update({"status":"error","vulnerabilities":[{"description":f"Critical error: {str(e)}","severity":"High"}]})
    return result

def main_parallel(directory_to_process, max_workers=MAX_WORKERS):
    all_results=[]
    files=[f for f in os.listdir(directory_to_process) if os.path.isfile(os.path.join(directory_to_process,f))]
    if not files: return []
    log(f"Starting parallel processing of {len(files)} files with {max_workers} workers")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_file={executor.submit(process_single_file_worker,directory_to_process,f):f for f in files}
        for future in as_completed(future_to_file):
            try:
                res=future.result()
                if res: all_results.append(res)
            except Exception as e:
                error_log(f"Worker raised exception: {e}")
    log("Parallel processing complete")
    return all_results

# -------------------------------
# CLI Entrypoint
# -------------------------------
if __name__=="__main__":
    if len(sys.argv)<2:
        error_log("Usage: python process.py <directory_to_process>")
        sys.exit(1)
    input_dir=sys.argv[1]
    if not os.path.isdir(input_dir):
        error_log(f"Directory not found: {input_dir}")
        sys.exit(1)
    results=main_parallel(input_dir)
    sys.stdout.write(json.dumps(results,indent=2))
    sys.stdout.flush()
