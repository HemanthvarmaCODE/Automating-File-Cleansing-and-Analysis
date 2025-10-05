import os
import sys
import json
import re
import warnings
import pandas as pd
import fitz  # PyMuPDF
import docx
import openpyxl
import cv2
import pytesseract
from pathlib import Path
import shutil
from transformers import pipeline, BlipForConditionalGeneration, BlipProcessor
from PIL import Image

# --- 1. SCRIPT INITIALIZATION & MODEL LOADING ---
warnings.filterwarnings('ignore')

try:
    # Load the powerful Hugging Face model for PII detection
    ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
    
    # Load the BLIP model for image descriptions
    blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
    blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
except Exception as e:
    print(json.dumps([{"error": f"Failed to load AI models: {e}"}]), file=sys.stderr)
    sys.exit(1)

# --- 2. ADVANCED VULNERABILITY & PII ANALYSIS ENGINE ---
def analyze_and_redact_text(text: str):
    if not isinstance(text, str) or not text.strip():
        return text, {}, []

    pii_entities = ner_pipeline(text)
    redacted_text = list(text)
    vulnerabilities = []
    pii_counts = {'person': 0, 'organization': 0, 'location': 0, 'email': 0, 'phone': 0}

    for entity in reversed(pii_entities):
        start, end = entity['start'], entity['end']
        if entity['entity_group'] in ['PER', 'ORG', 'LOC']:
            redacted_text[start:end] = '[REDACTED]'
            if entity['entity_group'] == 'PER': pii_counts['person'] += 1
            elif entity['entity_group'] == 'ORG': pii_counts['organization'] += 1
            else: pii_counts['location'] += 1

    redacted_text = "".join(redacted_text)
    
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    pii_counts['email'] = len(re.findall(email_pattern, redacted_text))
    redacted_text = re.sub(email_pattern, '[REDACTED]', redacted_text)

    # Generate vulnerability descriptions
    if pii_counts['person'] > 0:
        vulnerabilities.append({"description": f"Detected {pii_counts['person']} person names.", "severity": "High"})
    if pii_counts['organization'] > 0:
        vulnerabilities.append({"description": f"Detected {pii_counts['organization']} organization names.", "severity": "Medium"})
    if pii_counts['email'] > 0:
        vulnerabilities.append({"description": f"Found {pii_counts['email']} email addresses.", "severity": "High"})

    return redacted_text, pii_counts, vulnerabilities

# --- 3. DEDICATED FILE REDACTION FUNCTIONS ---

def process_pdf(file_path, output_path):
    doc = fitz.open(file_path)
    total_vulns = []
    for page in doc:
        text = page.get_text()
        if not text.strip(): continue
        
        pii_entities = ner_pipeline(text)
        for entity in pii_entities:
            if entity['entity_group'] in ['PER', 'ORG', 'LOC']:
                areas = page.search_for(entity['word'])
                for inst in areas:
                    page.add_redact_annot(inst, fill=(0, 0, 0))
        page.apply_redactions()

    full_text = "".join(p.get_text() for p in doc)
    _, pii_counts, vulnerabilities = analyze_and_redact_text(full_text)
    doc.save(output_path, garbage=3, deflate=True)
    doc.close()
    return pii_counts, vulnerabilities

def process_docx(file_path, output_path):
    doc = docx.Document(file_path)
    full_text = "\n".join([p.text for p in doc.paragraphs])
    _, pii_counts, vulnerabilities = analyze_and_redact_text(full_text)
    
    for para in doc.paragraphs:
        if para.text.strip():
            para.text = analyze_and_redact_text(para.text)[0]
    doc.save(output_path)
    return pii_counts, vulnerabilities

def process_image(file_path, output_path):
    try:
        raw_image = Image.open(file_path).convert('RGB')
        
        # Generate description with BLIP
        inputs = blip_processor(raw_image, return_tensors="pt")
        out = blip_model.generate(**inputs)
        description = blip_processor.decode(out[0], skip_special_tokens=True)

        # OCR and Redact
        img = cv2.imread(file_path)
        ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        pii_counts = {}
        vulnerabilities = []
        redacted_words = 0
        
        for i in range(len(ocr_data['text'])):
            if int(ocr_data['conf'][i]) > 60:
                word = ocr_data['text'][i]
                redacted_word, pii, vulns = analyze_and_redact_text(word)
                if redacted_word != word:
                    redacted_words += 1
                    (x, y, w, h) = (ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i])
                    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 0), -1)
        
        if redacted_words > 0:
            vulnerabilities.append({"description": f"Redacted {redacted_words} sensitive words found via OCR.", "severity": "Medium"})
        
        cv2.imwrite(output_path, img)
        return pii_counts, vulnerabilities, description
    except Exception as e:
        return {}, [{"description": f"Failed to process image: {e}", "severity": "High"}], "Could not analyze image."


# --- 4. MAIN BATCH PROCESSING LOGIC ---
def main(directory_to_process):
    all_results = []
    for filename in os.listdir(directory_to_process):
        file_path = os.path.join(directory_to_process, filename)
        if not os.path.isfile(file_path): continue

        p_file = Path(file_path)
        file_type = p_file.suffix.lower().replace('.', '')
        
        result = {"originalFileName": p_file.name, "fileType": file_type, "status": "completed", "summary": f"A .{file_type} file.", "piiDetected": {}, "vulnerabilities": [], "cleansedFilePath": file_path}

        try:
            cleansed_name = f"cleansed_{p_file.name}"
            cleansed_path = os.path.join('cleansed_files', cleansed_name)

            if file_type == 'pdf':
                pii, vulns = process_pdf(file_path, cleansed_path)
                result['summary'] = "PDF document analyzed and redacted."
            elif file_type == 'docx':
                pii, vulns = process_docx(file_path, cleansed_path)
                result['summary'] = "Word document analyzed and redacted."
            elif file_type in ['jpg', 'jpeg', 'png', 'bmp']:
                cleansed_path = os.path.join('redacted_images', cleansed_name)
                pii, vulns, description = process_image(file_path, cleansed_path)
                result['summary'] = description
            else:
                shutil.copy(file_path, cleansed_path)
                pii, vulns = {}, [{"description": f"File type '{file_type}' is not supported for redaction. File copied.", "severity": "Low"}]
                result['summary'] = "File format not supported for deep analysis."
            
            result['piiDetected'] = pii
            result['vulnerabilities'] = vulns
            result['cleansedFilePath'] = cleansed_path

        except Exception as e:
            result['status'] = 'error'
            result['summary'] = "An error occurred during processing."
            result['vulnerabilities'] = [{"description": f"Critical error: {str(e)}", "severity": "High"}]
        
        all_results.append(result)
        
    return all_results

# --- 5. SCRIPT EXECUTION ---
if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_directory = sys.argv[1]
        final_results = main(input_directory)
        print(json.dumps(final_results, indent=2))
    else:
        sys.exit(1)