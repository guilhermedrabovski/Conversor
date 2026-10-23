/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { ConversionQueue } from './components/ConversionQueue';
import { SettingsModal } from './components/SettingsModal';
import { PreviewModal } from './components/PreviewModal';
import { FeatureHighlights } from './components/FeatureHighlights';
import { HelpModal } from './components/HelpModal';
import { ConversionJob, JobOptions } from './types/converter';
import { getDefaultTarget, getFileExtension } from './utils/formatDetector';
import { convertPdfClientSide, convertAudioClientSide } from './utils/clientConverter';

export default function App() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [selectedJobForSettings, setSelectedJobForSettings] = useState<ConversionJob | null>(null);
  const [selectedJobForPreview, setSelectedJobForPreview] = useState<ConversionJob | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [systemOnline, setSystemOnline] = useState(true);

  const activePollingRef = useRef<Set<string>>(new Set());

  // Polling loop for active jobs (ignoring temporary client IDs)
  useEffect(() => {
    const activeJobs = jobs.filter(
      (j) => (j.status === 'processing' || j.status === 'queued') && !j.id.startsWith('temp-')
    );
    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        if (activePollingRef.current.has(job.id)) continue;
        activePollingRef.current.add(job.id);

        try {
          const res = await fetch(`/api/job/${job.id}`);
          if (res.ok) {
            const data = await res.json();
            setJobs((prevJobs) =>
              prevJobs.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: data.status,
                      progress: data.progress,
                      speed: data.speed,
                      duration: data.duration,
                      outputSize: data.outputSize,
                      error: data.error,
                      pageCount: data.pageCount,
                    }
                  : j
              )
            );
          }
        } catch {
          // Network hiccup, skip silently
        } finally {
          activePollingRef.current.delete(job.id);
        }
      }
    }, 600);

    return () => clearInterval(interval);
  }, [jobs]);

  // Handle files selected via dropzone or picker with instant visual feedback and upload progress
  const handleFilesSelected = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    // 1. Immediately create optimistic temporary jobs for instant feedback (0ms delay)
    const tempJobs: ConversionJob[] = filesArray.map((file) => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      originalName: file.name,
      targetFormat: getDefaultTarget(file.name),
      status: 'uploading' as const,
      progress: 0,
      inputSize: file.size,
      createdAt: Date.now(),
    }));

    const tempIds = tempJobs.map((j) => j.id);
    setJobs((prev) => [...tempJobs, ...prev]);
    setIsUploading(true);

    const formData = new FormData();
    filesArray.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('autoDetectTarget', 'true');

    // 2. Track real upload progress via XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/convert');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        setJobs((prev) =>
          prev.map((j) => (tempIds.includes(j.id) ? { ...j, progress: percent } : j))
        );
      }
    };

    const runClientSideFallback = async () => {
      setIsUploading(false);
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const tempId = tempIds[i];
        const ext = getFileExtension(file.name);
        const target = getDefaultTarget(file.name);

        setJobs((prev) =>
          prev.map((j) => (j.id === tempId ? { ...j, status: 'processing', progress: 20 } : j))
        );

        try {
          if (ext === 'pdf') {
            const result = await convertPdfClientSide(file, 150, (pct) => {
              setJobs((prev) =>
                prev.map((j) => (j.id === tempId ? { ...j, progress: pct } : j))
              );
            });

            setJobs((prev) =>
              prev.map((j) =>
                j.id === tempId
                  ? {
                      ...j,
                      status: 'completed',
                      progress: 100,
                      outputSize: result.size,
                      pageCount: result.outputFiles.length,
                      clientDownloadUrl: result.primaryUrl,
                      clientBlob: result.primaryBlob,
                      clientOutputFiles: result.outputFiles,
                    }
                  : j
              )
            );
          } else if (['ogg', 'mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) {
            const result = await convertAudioClientSide(file, target, (pct) => {
              setJobs((prev) =>
                prev.map((j) => (j.id === tempId ? { ...j, progress: pct } : j))
              );
            });

            setJobs((prev) =>
              prev.map((j) =>
                j.id === tempId
                  ? {
                      ...j,
                      status: 'completed',
                      progress: 100,
                      outputSize: result.size,
                      clientDownloadUrl: result.primaryUrl,
                      clientBlob: result.primaryBlob,
                    }
                  : j
              )
            );
          } else {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === tempId
                  ? {
                      ...j,
                      status: 'error',
                      error: 'Servidor temporariamente indisponível para este formato de vídeo. Teste com PDF ou Áudio!',
                    }
                  : j
              )
            );
          }
        } catch (clientErr: any) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === tempId
                ? { ...j, status: 'error', error: clientErr.message || 'Falha na conversão' }
                : j
            )
          );
        }
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const contentType = xhr.getResponseHeader('content-type') || '';
          if (!contentType.includes('application/json')) {
            runClientSideFallback();
            return;
          }
          const data = JSON.parse(xhr.responseText);
          if (data.jobs && Array.isArray(data.jobs)) {
            // Replace temporary placeholder jobs with the real server jobs
            setJobs((prev) => {
              const filtered = prev.filter((j) => !tempIds.includes(j.id));
              return [...data.jobs, ...filtered];
            });
            return;
          }
          runClientSideFallback();
        } else {
          // If server returned 404 or failed, seamlessly convert directly in browser
          runClientSideFallback();
        }
      } catch {
        runClientSideFallback();
      }
    };

    xhr.onerror = () => {
      runClientSideFallback();
    };

    xhr.send(formData);
  };

  // Generate instant test sample file
  const handleGenerateSample = async (sampleType: 'webm' | 'ogg' | 'pdf') => {
    setIsLoadingSample(true);
    try {
      const res = await fetch('/api/create-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleType }),
      });

      if (!res.ok) {
        throw new Error('Erro ao gerar amostra no servidor');
      }

      const data = await res.json();
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Retry job conversion
  const handleRetry = async (jobId: string, newFormat?: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              targetFormat: newFormat || j.targetFormat,
              status: 'processing',
              progress: 5,
              error: undefined,
            }
          : j
      )
    );

    try {
      const res = await fetch(`/api/retry/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFormat: newFormat }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao reiniciar conversão');
      }
    } catch (err: any) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'error', error: err.message } : j))
      );
    }
  };

  // Change target format for single job
  const handleChangeTargetFormat = async (jobId: string, format: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // If job was completed or errored, re-trigger conversion with the new target
    if (targetJob.status === 'completed' || targetJob.status === 'error') {
      await handleRetry(jobId, format);
    } else {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, targetFormat: format } : j))
      );
    }
  };

  // Apply format to all compatible jobs
  const handleApplyFormatToAll = (format: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.status === 'queued') {
          return { ...j, targetFormat: format };
        }
        return j;
      })
    );
  };

  // Remove single job
  const handleRemoveJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  // Clear all completed jobs
  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed'));
  };

  // Save options from modal
  const handleSaveOptions = (options: JobOptions) => {
    if (!selectedJobForSettings) return;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobForSettings.id
          ? { ...j, options: { ...j.options, ...options } }
          : j
      )
    );
    setSelectedJobForSettings(null);
  };

  // Download single job (supports both client-side and server-side)
  const handleDownload = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job?.clientOutputFiles && job.clientOutputFiles.length > 1) {
      job.clientOutputFiles.forEach((file, idx) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = file.url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 250);
      });
      return;
    }

    if (job?.clientDownloadUrl) {
      const a = document.createElement('a');
      a.href = job.clientDownloadUrl;
      const baseName = job.originalName.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}.${job.targetFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    window.location.href = `/api/download/${jobId}`;
  };

  // Download all completed jobs in ZIP
  const handleDownloadAllZip = async () => {
    const completedIds = jobs.filter((j) => j.status === 'completed').map((j) => j.id);
    if (completedIds.length === 0) return;

    try {
      const res = await fetch('/api/download-all-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: completedIds }),
      });

      if (!res.ok) throw new Error('Falha ao empacotar arquivos');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyperconvert-arquivos-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erro ao baixar ZIP: ${err.message}`);
    }
  };

  // Quick select trigger from bottom feature cards
  const handleQuickSelectFeature = (type: 'webm-mp4' | 'pdf-jpg' | 'ogg-mp3') => {
    if (type === 'webm-mp4') handleGenerateSample('webm');
    if (type === 'pdf-jpg') handleGenerateSample('pdf');
    if (type === 'ogg-mp3') handleGenerateSample('ogg');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        activeJobsCount={jobs.filter((j) => j.status === 'processing').length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Conversor Multiformato de <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Altíssima Performance
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Especializado na conversão rápida e fiel de <strong>WEBM para MP4</strong>, <strong>OGG para MP3</strong>, <strong>PDF para JPG</strong> e dezenas de formatos com aceleração multithread nativa.
          </p>
        </div>

        {/* Dropzone Area */}
        <Dropzone
          onFilesSelected={handleFilesSelected}
          onGenerateSample={handleGenerateSample}
          isLoadingSample={isLoadingSample}
          isUploading={isUploading}
        />

        {/* Conversion Queue (Shown when there are items) */}
        {jobs.length > 0 && (
          <div className="pt-2">
            <ConversionQueue
              jobs={jobs}
              onRemoveJob={handleRemoveJob}
              onChangeTargetFormat={handleChangeTargetFormat}
              onOpenSettings={(job) => setSelectedJobForSettings(job)}
              onPreview={(job) => setSelectedJobForPreview(job)}
              onDownload={handleDownload}
              onDownloadAllZip={handleDownloadAllZip}
              onClearCompleted={handleClearCompleted}
              onApplyFormatToAll={handleApplyFormatToAll}
              onRetry={handleRetry}
            />
          </div>
        )}

        {/* Feature Highlights & Specifications */}
        <FeatureHighlights onQuickSelect={handleQuickSelectFeature} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">HyperConvert Studio</span>
            <span>·</span>
            <span>Motor nativo C/Assembly com aceleração por hardware</span>
          </div>
          <div>
            <span>Privacidade garantida: arquivos temporários eliminados automaticamente do disco.</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedJobForSettings && (
        <SettingsModal
          isOpen={true}
          onClose={() => setSelectedJobForSettings(null)}
          targetFormat={selectedJobForSettings.targetFormat}
          initialOptions={selectedJobForSettings.options}
          onSave={handleSaveOptions}
          title={`Opções: ${selectedJobForSettings.originalName}`}
        />
      )}

      {selectedJobForPreview && (
        <PreviewModal
          job={selectedJobForPreview}
          onClose={() => setSelectedJobForPreview(null)}
          onDownload={handleDownload}
        />
      )}

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
