export type OcrOptions = {
  type: 'string' | 'key-value';
  x: number;
  y: number;
  width: number;
  height: number;
  keys?: Record<string, string>;
}

export type OcrFileOptions = Record<string, OcrOptions>;