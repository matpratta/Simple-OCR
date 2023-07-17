import sharp from "sharp";
import { OcrFileOptions, OcrOptions } from "./types";
import tmp, { DirResult } from 'tmp';
import path from "path";
import Tesseract, { RecognizeResult } from "tesseract.js";
import fs from 'fs/promises';

export default class FileProcessor {
  private readonly tmpDir: DirResult;

  constructor(
    private ocrSchema: OcrFileOptions,
  ) {
    // Validates our schema
    Object.keys(ocrSchema).forEach(schemaName => {
      const schema = ocrSchema[schemaName];
      if (schema.type == 'key-value' && !schema.keys) {
        throw new Error(`Schema "${schemaName} is missing the property "keys", required for key-value types!`);
      }
    });

    // Creates a temporary directory for us
    this.tmpDir = tmp.dirSync();
  }

  private extractString(ocrResult: RecognizeResult): string {
    return ocrResult.data.text.trim();
  }

  private extractKeyValue(ocrResult: RecognizeResult, keys: Record<string, string>): any {
    const result: any = {};

    // Builds a RegExp cache for increasing speed, also initializes values as null
    const keysRegex: Record<string, RegExp> = {};
    for (let key in keys) {
      keysRegex[key] = new RegExp(`${keys[key]}(.*)`, 'i');
      result[key] = {
        search: keys[key],
        value: null,
      };
    }
    
    // Processes each of the lines against our RegExp
    ocrResult.data.lines.forEach(line => {
      for (let key in keysRegex) {
        const matches = keysRegex[key].exec(line.text);
        if (matches) {
          result[key].value = matches[1].trim();
        }
      }
    });

    return result;
  }

  /**
   * Processes a file
   * @param file 
   */
  async processFile(file: string): Promise<any> {
    const result: any = {};
    const fileName = path.basename(file);

    // Extracts pieces of the image
    for (let piece in this.ocrSchema) {
      const schema = this.ocrSchema[piece];
      const pieceFileName = `${piece}_${fileName}`;
      const pieceFile = path.join(this.tmpDir.name, pieceFileName);

      // Crops that specific part of the image
      await sharp(file).extract({
        top: schema.y,
        left: schema.x,
        width: schema.width,
        height: schema.height,
      }).toFile(pieceFile);

      // Now, let's OCR it
      const ocrResult = await Tesseract.recognize(pieceFile, 'eng');

      // Clean-up
      await fs.unlink(pieceFile);
      
      // With the OCR complete, now we do the final processing
      switch (schema.type) {
        case 'string':
          result[piece] = this.extractString(ocrResult);
          break;
        case 'key-value':
          result[piece] = this.extractKeyValue(ocrResult, schema.keys!);
          break;
      }
    }

    return result;
  }

  /**
   * Clean-up our temporary files
   */
  cleanup() {
    this.tmpDir.removeCallback();
  }
}