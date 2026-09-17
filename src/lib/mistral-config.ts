/** Configuration Mistral (OCR et extraction), lisible sans importer le SDK. */
export function mistralConfigure(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

export function modeleMistralOCR(): string {
  return process.env.MISTRAL_MODEL_OCR?.trim() || "mistral-ocr-latest";
}

export function modeleMistralExtraction(): string {
  return process.env.MISTRAL_MODEL_EXTRACTION?.trim() || "mistral-medium-latest";
}
