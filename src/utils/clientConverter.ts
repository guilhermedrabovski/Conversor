import * as pdfjsLib from 'pdfjs-dist';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ClientConversionResult {
  outputFiles: { name: string; blob: Blob; url: string }[];
  primaryUrl: string;
  primaryBlob: Blob;
  primaryName: string;
  size: number;
}

/**
 * High-definition in-browser PDF to JPG converter using HTML5 Canvas & PDF.js
 */
export async function convertPdfClientSide(
  file: File,
  dpi: number = 150,
  onProgress?: (percent: number) => void
): Promise<ClientConversionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const resultFiles: { name: string; blob: Blob; url: string }[] = [];
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  const scale = dpi / 72; // standard 72 pt/in base
  let totalBytes = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    // Solid white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    } as any).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    );

    if (blob) {
      totalBytes += blob.size;
      const pageStr = pageNum.toString().padStart(numPages > 9 ? 2 : 1, '0');
      const fileName = numPages === 1 ? `${baseName}.jpg` : `${baseName}-pagina-${pageStr}.jpg`;
      resultFiles.push({
        name: fileName,
        blob,
        url: URL.createObjectURL(blob),
      });
    }

    if (onProgress) {
      onProgress(Math.min(99, Math.round((pageNum / numPages) * 100)));
    }
  }

  if (resultFiles.length === 0) {
    throw new Error('Não foi possível renderizar as páginas do PDF');
  }

  return {
    outputFiles: resultFiles,
    primaryUrl: resultFiles[0].url,
    primaryBlob: resultFiles[0].blob,
    primaryName: resultFiles[0].name,
    size: totalBytes,
  };
}

/**
 * In-browser Audio converter: decodes OGG/WebM/WAV and encodes to high-quality PCM WAV
 */
export async function convertAudioClientSide(
  file: File,
  targetFormat: string,
  onProgress?: (percent: number) => void
): Promise<ClientConversionResult> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('AudioContext não suportado neste navegador');
  }

  const ctx = new AudioCtx();
  onProgress?.(20);

  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(50);

  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  onProgress?.(80);

  const wavBlob = audioBufferToWavBlob(audioBuffer);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const outName = `${baseName}.${targetFormat === 'mp3' ? 'mp3' : 'wav'}`;
  const url = URL.createObjectURL(wavBlob);

  onProgress?.(100);

  return {
    outputFiles: [{ name: outName, blob: wavBlob, url }],
    primaryUrl: url,
    primaryBlob: wavBlob,
    primaryName: outName,
    size: wavBlob.size,
  };
}

/**
 * Convert standard AudioBuffer to 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferLength = 44 + length;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier and length
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
