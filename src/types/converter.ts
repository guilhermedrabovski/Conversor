export type JobStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'error';

export interface JobOptions {
  videoPreset?: 'ultrafast' | 'veryfast' | 'fast' | 'medium';
  videoQuality?: 'high' | 'balanced' | 'compact';
  resolution?: 'original' | '1080p' | '720p' | '480p';
  audioBitrate?: '128' | '192' | '256' | '320';
  dpi?: '72' | '150' | '300';
}

export interface ConversionJob {
  id: string;
  originalName: string;
  targetFormat: string;
  status: JobStatus;
  progress: number;
  speed?: string;
  duration?: number;
  inputSize: number;
  outputSize?: number;
  error?: string;
  pageCount?: number;
  options?: JobOptions;
  createdAt?: number;
  startedAt?: number;
  conversionTimeSeconds?: number;
  uploadSpeed?: string;
  uploadLoaded?: number;
  uploadTotal?: number;
  uploadEta?: number;
  clientDownloadUrl?: string;
  clientBlob?: Blob;
  clientOutputFiles?: { name: string; blob: Blob; url: string }[];
}

export type SupportedTarget = {
  format: string;
  label: string;
  category: 'video' | 'audio' | 'document' | 'image';
  description: string;
  badge?: string;
};
