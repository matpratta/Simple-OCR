import fs from 'fs/promises';
import { existsSync as fileExists } from 'fs';
import path from 'path';
import { argv } from 'process';
import { OcrFileOptions } from './types';
import FileProcessor from './FileProcessor';

(async function main (pathToData: string) {
  const settingsFile = path.join(pathToData, 'ocr.json');
  const outputFile = path.join(pathToData, 'ocr-results.json');

  // Safety check
  if (!fileExists(settingsFile)) {
    throw new Error('OCR definitions not found!');
  }

  // Reads main metadata
  console.info('Reading settings...');
  const settings = JSON.parse((await fs.readFile(settingsFile)).toString()) as OcrFileOptions;

  // Reads file list
  console.info('Reading file list...');
  const files = (await fs.readdir(pathToData)).filter(fileName => !(['ocr.json', 'ocr-results.json'].includes(fileName)));

  // Starts processing
  console.info(`Processing ${files.length} files...`);
  const results: Record<string, any> = {};
  const processor = new FileProcessor(settings);
  for (let iFile in files) {
    const fileName = files[iFile];
    console.info(`-> [${parseInt(iFile) + 1} / ${files.length}] ${fileName}`);
    results[fileName] = await processor.processFile(path.join(pathToData, fileName));
  }

  // Clean-up
  console.info('Cleaning-up...');
  processor.cleanup();

  // Writes files
  console.info('Writing results...');
  fs.writeFile(outputFile, JSON.stringify(results, null, 2));

  // Done!
  console.info('Processing complete!');
}).call(this, argv[2]);