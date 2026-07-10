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
    if (mimetype === 'application/pdf') {
      const parsed = await pdf(buffer);
      if (!parsed.text) {
        throw new Error('PDF parsed text is empty');
      }
      return parsed.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      if (!result.value) {
        throw new Error('DOCX extracted text is empty');
      }
      return result.value;
    } else if (mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimetype}. Only PDF, DOCX, and TXT are supported.`);
    }
  } catch (error) {
    console.error('Error during file text extraction:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}
