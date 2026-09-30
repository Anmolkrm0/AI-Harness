import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import officeParser from 'officeparser';
import Papa from 'papaparse';

export interface ParsedDocument {
  text: string;
  metadata: Record<string, any>;
}

export class DocumentParser {
  static async parseFile(filePath: string, originalName: string, mimeType: string): Promise<ParsedDocument> {
    const ext = path.extname(originalName).toLowerCase();

    try {
      // 1. PDF
      if (ext === '.pdf' || mimeType.includes('pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return {
          text: data.text.trim(),
          metadata: {
            pageCount: data.numpages,
            info: data.info,
            parser: 'pdf-parse',
          },
        };
      }

      // 2. DOCX / DOC
      if (ext === '.docx' || ext === '.doc' || mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) {
        try {
          const result = await mammoth.extractRawText({ path: filePath });
          if (result.value.trim()) {
            return {
              text: result.value.trim(),
              metadata: { parser: 'mammoth', warnings: result.messages },
            };
          }
        } catch {
          // Fallback to officeParser if mammoth fails on older .doc
        }

        const text = await officeParser.parseOfficeAsync(filePath);
        return {
          text: (typeof text === 'string' ? text : String(text)).trim(),
          metadata: { parser: 'officeparser' },
        };
      }

      // 3. PPTX / PPT
      if (ext === '.pptx' || ext === '.ppt' || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        const text = await officeParser.parseOfficeAsync(filePath);
        return {
          text: (typeof text === 'string' ? text : String(text)).trim(),
          metadata: { parser: 'officeparser' },
        };
      }

      // 4. CSV
      if (ext === '.csv' || mimeType.includes('csv')) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        
        // Format CSV into human & LLM readable text table/records
        const rows = parsed.data as Record<string, any>[];
        const fields = parsed.meta.fields || [];
        
        let text = `CSV File: ${originalName} (${rows.length} rows)\nColumns: ${fields.join(', ')}\n\n`;
        rows.slice(0, 1000).forEach((row, i) => {
          text += `Row ${i + 1}:\n`;
          for (const [key, val] of Object.entries(row)) {
            text += `  ${key}: ${val}\n`;
          }
          text += '\n';
        });

        return {
          text: text.trim(),
          metadata: {
            rowCount: rows.length,
            columns: fields,
            parser: 'papaparse',
          },
        };
      }

      // 5. Plain text, Markdown, JSON, Code
      const textExtensions = [
        '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py',
        '.html', '.css', '.scss', '.yaml', '.yml', '.xml', '.sql', '.sh'
      ];
      if (textExtensions.includes(ext) || mimeType.startsWith('text/')) {
        const text = fs.readFileSync(filePath, 'utf-8');
        return {
          text: text.trim(),
          metadata: { parser: 'utf8-text' },
        };
      }

      // 6. Image formats (.png, .jpg, .jpeg, .webp)
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
      if (imageExtensions.includes(ext) || mimeType.startsWith('image/')) {
        const stats = fs.statSync(filePath);
        return {
          text: `[Image Document: ${originalName} (Size: ${(stats.size / 1024).toFixed(1)} KB)]\nUploaded image file is available for vision analysis and reference.`,
          metadata: {
            isImage: true,
            sizeBytes: stats.size,
            parser: 'image-info',
          },
        };
      }

      // Fallback
      const buffer = fs.readFileSync(filePath);
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\t\n\r]/g, '');
      return {
        text: text.trim() || `[File ${originalName} uploaded successfully]`,
        metadata: { parser: 'binary-fallback' },
      };
    } catch (err: any) {
      console.error(`Error parsing document ${originalName}:`, err);
      return {
        text: `[Document ${originalName} uploaded. Error extracting text: ${err.message}]`,
        metadata: { error: err.message },
      };
    }
  }
}
