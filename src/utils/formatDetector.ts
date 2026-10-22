import { SupportedTarget } from '../types/converter';

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function getCompatibleTargets(filename: string): SupportedTarget[] {
  const ext = getFileExtension(filename);

  // WEBM and Video formats
  if (['webm', 'mp4', 'mov', 'mkv', 'avi', 'flv', 'wmv', 'm4v', '3gp'].includes(ext)) {
    return [
      { format: 'mp4', label: 'MP4 (H.264 / AAC)', category: 'video', description: 'Universal, ultra-compatível, otimizado para web streaming', badge: ext === 'webm' ? 'Recomendado' : undefined },
      { format: 'webm', label: 'WEBM (VP9 / Opus)', category: 'video', description: 'Formato aberto de alta compressão para web', badge: ext === 'mp4' ? 'Recomendado' : undefined },
      { format: 'mp3', label: 'MP3 (Extrair Áudio)', category: 'audio', description: 'Extrai a trilha sonora com codec LAME' },
      { format: 'wav', label: 'WAV (Áudio Sem Perdas)', category: 'audio', description: 'Áudio PCM descompactado' },
      { format: 'gif', label: 'GIF Animado', category: 'video', description: 'Clipe animado de alta fidelidade com paleta inteligente' },
      { format: 'mkv', label: 'MKV Matroska', category: 'video', description: 'Contêiner multimídia flexível' },
      { format: 'mov', label: 'MOV QuickTime', category: 'video', description: 'Padrão Apple QuickTime' },
    ];
  }

  // Audio formats (OGG, MP3, etc.)
  if (['ogg', 'mp3', 'wav', 'aac', 'flac', 'm4a', 'wma', 'opus', 'weba'].includes(ext)) {
    return [
      { format: 'mp3', label: 'MP3 (MPEG-3)', category: 'audio', description: 'O padrão universal de áudio comprimido', badge: ext === 'ogg' ? 'Recomendado' : undefined },
      { format: 'wav', label: 'WAV (Sem Perdas)', category: 'audio', description: 'Áudio não comprimido de estúdio' },
      { format: 'ogg', label: 'OGG Vorbis', category: 'audio', description: 'Formato livre de alta fidelidade' },
      { format: 'aac', label: 'AAC', category: 'audio', description: 'Excelente relação fidelidade/tamanho' },
    ];
  }

  // PDF
  if (ext === 'pdf') {
    return [
      { format: 'jpg', label: 'JPG / JPEG (Alta Resolução)', category: 'image', description: 'Renderização nítida via Ghostscript (todas as páginas)', badge: 'Recomendado' },
      { format: 'png', label: 'PNG (Sem perdas)', category: 'image', description: 'Imagens com máxima nitidez de texto' },
    ];
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'svg'].includes(ext)) {
    return [
      { format: 'pdf', label: 'PDF (Documento)', category: 'document', description: 'Encapsula a imagem em documento PDF', badge: 'Recomendado' },
      { format: 'jpg', label: 'JPG / JPEG', category: 'image', description: 'Padrão fotográfico comprimido' },
      { format: 'png', label: 'PNG', category: 'image', description: 'Compressão sem perdas com transparência' },
      { format: 'webp', label: 'WEBP', category: 'image', description: 'Novo padrão moderno de alta eficiência' },
    ];
  }

  // Generic fallback
  return [
    { format: 'mp4', label: 'MP4', category: 'video', description: 'Vídeo MP4' },
    { format: 'mp3', label: 'MP3', category: 'audio', description: 'Áudio MP3' },
    { format: 'jpg', label: 'JPG', category: 'image', description: 'Imagem JPG' },
  ];
}

export function getDefaultTarget(filename: string): string {
  const ext = getFileExtension(filename);
  if (ext === 'webm') return 'mp4';
  if (ext === 'ogg') return 'mp3';
  if (ext === 'pdf') return 'jpg';
  if (ext === 'mp4') return 'webm';
  if (ext === 'mp3') return 'wav';
  if (['wav', 'flac', 'aac', 'm4a', 'opus'].includes(ext)) return 'mp3';
  if (['mov', 'mkv', 'avi'].includes(ext)) return 'mp4';
  if (['png', 'webp', 'bmp'].includes(ext)) return 'jpg';
  if (['jpg', 'jpeg'].includes(ext)) return 'png';
  return 'mp4';
}
