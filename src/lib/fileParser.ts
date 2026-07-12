import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser';

// Set PDF.js worker path to a CDN so we don't have to configure Vite static assets for it.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    return await extractFromPDF(file);
  } else if (ext === 'docx') {
    return await extractFromDocx(file);
  } else if (ext === 'txt' || ext === 'csv') {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${ext}. Please upload a PDF, DOCX, or TXT file.`);
}

async function extractFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
    }

    return text;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to parse the PDF document.");
  }
}

async function extractFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("DOCX Parsing Error:", error);
    throw new Error("Failed to parse the DOCX document.");
  }
}
