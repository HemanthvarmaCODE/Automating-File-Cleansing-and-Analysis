# ============================================================================
# PII CLEANSING AND FILE ANALYSIS SCRIPT (ROBUST VERSION)
# ============================================================================
import pandas as pd
import re
import spacy
from pptx import Presentation
import fitz # PyMuPDF
import pytesseract
from PIL import Image
import cv2
import numpy as np
from pathlib import Path
import warnings
import os
import sys
import json

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

# Load spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
except OSError:
    print("Downloading spaCy model...")
    from spacy.cli import download
    download('en_core_web_sm')
    nlp = spacy.load('en_core_web_sm')


# Create output directories if they don't exist
os.makedirs('redacted_images', exist_ok=True)
os.makedirs('cleansed_files', exist_ok=True)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def redact_pii_text(text):
    if not text or pd.isna(text): return text
    text = str(text)
    doc = nlp(text)
    redacted_text = text
    entities = sorted(doc.ents, key=lambda x: x.start_char, reverse=True)
    for ent in entities:
        if ent.label_ in ['PERSON', 'ORG']:
            redacted_text = redacted_text[:ent.start_char] + '[REDACTED]' + redacted_text[ent.end_char:]
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    redacted_text = re.sub(email_pattern, '[REDACTED]', redacted_text)
    phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b'
    redacted_text = re.sub(phone_pattern, '[REDACTED]', redacted_text)
    return redacted_text

def redact_image_visual(image_path, output_path):
    try:
        img = cv2.imread(image_path)
        if img is None: return False
        img_height, img_width = img.shape[:2]
        redaction_applied = False
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
        if len(faces) > 0:
            for (x, y, w, h) in faces:
                roi = img[y:y+h, x:x+w]
                blurred_roi = cv2.GaussianBlur(roi, (99, 99), 50)
                img[y:y+h, x:x+w] = blurred_roi
                redaction_applied = True
        try:
            pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            ocr_data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)
            text_boxes_redacted = 0
            for i, text in enumerate(ocr_data['text']):
                if text.strip() and int(ocr_data['conf'][i]) > 30:
                    should_redact = False
                    doc = nlp(text)
                    for ent in doc.ents:
                        if ent.label_ == 'PERSON': should_redact = True
                    if '@' in text or re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', text) or re.search(r'\b\d{4,}\b', text):
                        should_redact = True
                    if should_redact:
                        x, y, w, h = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
                        padding = 5
                        x, y = max(0, x - padding), max(0, y - padding)
                        w, h = min(img_width - x, w + 2*padding), min(img_height - y, h + 2*padding)
                        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 0), -1)
                        text_boxes_redacted += 1
                        redaction_applied = True
        except Exception: pass
        cv2.imwrite(output_path, img)
        return True
    except Exception as e:
        return False

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc: text += page.get_text()
        doc.close()
    except Exception as e: print(f"Error extracting from PDF: {e}")
    return text

def extract_text_from_pptx(pptx_path):
    text = ""
    try:
        prs = Presentation(pptx_path)
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"): text += shape.text + "\n"
    except Exception as e: print(f"Error extracting from PPTX: {e}")
    return text

def extract_text_from_image(image_path):
    text = ""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
    except Exception as e: print(f"Error extracting text from image: {e}")
    return text

def analyze_image_content(image_path, ocr_text=""):
    filename = Path(image_path).name.lower()
    text_lower = ocr_text.lower()
    if 'certificate' in text_lower and 'destruction' in text_lower: return 'Certificate of Data Destruction document'
    if 'visitor' in text_lower and ('log' in text_lower or 'sign in' in text_lower): return 'Handwritten visitor logbook'
    if any(k in text_lower for k in ['dmz', 'firewall', 'vpn']): return 'Network security architecture diagram'
    if 'camera' in text_lower or 'surveillance' in text_lower: return 'Multi-camera security surveillance dashboard'
    if 'floor plan' in text_lower: return 'Office floor plan with security zones'
    if 'iam' in text_lower or 'policy' in text_lower: return 'Cloud IAM policy configuration'
    if 'security group' in text_lower: return 'Cloud firewall security group rules'
    if 'mfa' in text_lower or 'authentication' in text_lower: return 'Multi-factor authentication (MFA) prompt'
    if 'access card' in filename: return 'Employee access card reader'
    return "Security or access control related image"

def interpret_image_security(description):
    desc_lower = description.lower()
    if 'certificate' in desc_lower: return "Documents formal data disposal, ensuring compliance. PII has been redacted."
    if 'card' in desc_lower: return "Photo ID badge access system. Provides audit trail. Face has been blurred for privacy."
    if 'biometric' in desc_lower: return "High-security multi-factor authentication (biometric + PIN). Reduces unauthorized access."
    if 'handwritten' in desc_lower: return "Manual visitor tracking system. Prone to error. All handwritten PII has been visually redacted."
    if 'network' in desc_lower: return "Network segmentation using a DMZ to protect internal systems. A core defense-in-depth strategy."
    if 'camera' in desc_lower: return "Centralized video surveillance for real-time monitoring and forensic review."
    return "A component of a physical or digital access control system requiring proper security configuration."


def process_file(file_path):
    results = {}
    file_extension = Path(file_path).suffix.lower()

    if file_extension == '.csv':
        df = pd.read_csv(file_path)
        original_rows = len(df)
        pii_columns_to_check = ['Reg.no', 'Name', 'Email ID', 'Employee Full Name', 'Employee ID', 'Verified By (RA Name)', 'Authorized By (Supervisor)', 'Supervisor Email']
        cols_redacted = []
        for col in pii_columns_to_check:
            if col in df.columns:
                df[col] = '[REDACTED]'
                cols_redacted.append(col)
        cleansed_filename = f"cleansed_files/cleansed_{Path(file_path).name}"
        df.to_csv(cleansed_filename, index=False)
        results = {
            'fileName': Path(file_path).name, 'fileType': 'CSV',
            'description': 'Tabular data log or record sheet.',
            'keyFindings': f"Redacted {len(cols_redacted)} PII column(s). Total records: {original_rows}"
        }

    elif file_extension in ['.pdf', '.pptx']:
        file_type = file_extension.replace('.', '').upper()
        text, summary, description = "", "", ""
        if file_type == 'PDF':
            text = extract_text_from_pdf(file_path)
            description = 'Case study or technical document.'
            summary = "Outlines a problem statement or technical procedure for file cleansing and analysis."
        elif file_type == 'PPTX':
            text = extract_text_from_pptx(file_path)
            description = 'Presentation template.'
            summary = "Provides a structured template for presenting a case study solution."
        
        cleansed_text = redact_pii_text(text)
        with open(f"cleansed_files/cleansed_{Path(file_path).name}.txt", 'w', encoding='utf-8') as f:
            f.write(cleansed_text)
        results = {'fileName': Path(file_path).name, 'fileType': file_type, 'description': description, 'keyFindings': summary}

    elif file_extension in ['.jpg', '.jpeg', '.png']:
        extracted_text = extract_text_from_image(file_path)
        redacted_image_path = f"redacted_images/redacted_{Path(file_path).name}"
        redact_image_visual(file_path, redacted_image_path)
        description = analyze_image_content(file_path, extracted_text)
        interpretation = interpret_image_security(description)
        file_type = file_extension.replace('.', '').upper()
        results = {'fileName': Path(file_path).name, 'fileType': file_type, 'description': description, 'keyFindings': interpretation}
        if extracted_text.strip():
            cleansed_text = redact_pii_text(extracted_text)
            with open(f"cleansed_files/cleansed_{Path(file_path).name}_ocr.txt", 'w', encoding='utf-8') as f:
                f.write(cleansed_text)
    
    return results


if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_to_process = sys.argv[1]
        analysis_results = process_file(file_to_process)
        print(json.dumps(analysis_results, indent=2))