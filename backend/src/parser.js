import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

/**
 * Extracts raw text from a PDF or DOCX file buffer.
 * @param {Buffer} buffer - The uploaded file buffer.
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} - The extracted raw text.
 */
export async function parseResumeText(buffer, mimetype) {
  try {
    let text = '';
    if (mimetype === 'application/pdf') {
      const parsed = await pdf(buffer);
      if (!parsed.text) {
        throw new Error('PDF parsed text is empty');
      }
      text = parsed.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      if (!result.value) {
        throw new Error('DOCX extracted text is empty');
      }
      text = result.value;
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimetype}. Only PDF, DOCX, and TXT are supported.`);
    }

    // Clean null bytes and control characters that break API gateways and JSON parsing
    return text.replace(/\0/g, '').replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
  } catch (error) {
    console.error('Error during file text extraction:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}
