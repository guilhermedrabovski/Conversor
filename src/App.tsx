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
import { HelpModal } from './components/HelpModal';
import { ConversionJob, JobOptions } from './types/converter';
import { getDefaultTarget, getFileExtension } from './utils/formatDetector';
import { convertPdfClientSide, convertAudioClientSide, convertVideoClientSide } from './utils/clientConverter';

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
                      startedAt: data.startedAt,
                      conversionTimeSeconds: data.conversionTimeSeconds,
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

    const uploadStartTime = Date.now();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        const elapsedSec = (Date.now() - uploadStartTime) / 1000;
        const speedMB = elapsedSec > 0.3 ? (event.loaded / (1024 * 1024)) / elapsedSec : 0;
        const remainingBytes = event.total - event.loaded;
        const eta = speedMB > 0 ? Math.ceil((remainingBytes / (1024 * 1024)) / speedMB) : undefined;

        setJobs((prev) =>
          prev.map((j) =>
            tempIds.includes(j.id)
              ? {
                  ...j,
                  progress: percent,
                  uploadLoaded: event.loaded,
                  uploadTotal: event.total,
                  uploadSpeed: speedMB > 0 ? `${speedMB.toFixed(1)} MB/s` : undefined,
                  uploadEta: eta,
                }
              : j
          )
        );
      }
    };

    const runClientSideFallback = async (serverErrorMessage?: string) => {
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
          } else if (['webm', 'mp4', 'mov', 'mkv', 'avi'].includes(ext)) {
            try {
              const result = await convertVideoClientSide(file, target, (pct) => {
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
            } catch (videoErr: any) {
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === tempId
                    ? {
                        ...j,
                        status: 'error',
                        error: serverErrorMessage || videoErr.message || 'Falha na conversão do vídeo.',
                      }
                    : j
                )
              );
            }
          } else {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === tempId
                  ? {
                      ...j,
                      status: 'error',
                      error: serverErrorMessage || 'Formato não suportado para processamento local.',
                    }
                  : j
              )
            );
          }
        } catch (clientErr: any) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === tempId
                ? { ...j, status: 'error', error: serverErrorMessage || clientErr.message || 'Falha na conversão' }
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
            runClientSideFallback(`Servidor respondeu com formato inválido (${xhr.status})`);
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
          runClientSideFallback(data.error || 'Nenhum job retornado pelo servidor');
        } else {
          let errorText = `Falha no envio (HTTP ${xhr.status})`;
          if (xhr.status === 413) {
            errorText = 'Arquivo excede o limite máximo de envio (HTTP 413).';
          } else if (xhr.status === 404) {
            errorText = 'Servidor de conversão não encontrado (HTTP 404).';
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              if (errData.error) errorText = errData.error;
            } catch {}
          }
          runClientSideFallback(errorText);
        }
      } catch {
        runClientSideFallback('Erro de resposta do servidor.');
      }
    };

    xhr.onerror = () => {
      runClientSideFallback('Falha de conexão com o servidor durante o envio.');
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        activeJobsCount={jobs.filter((j) => j.status === 'processing').length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Simple Clean Hero with Logo */}
        <div className="text-center max-w-lg mx-auto space-y-3 mb-2 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="RICTV"
            className="w-14 h-14 rounded-2xl shadow-xl shadow-blue-600/20 object-contain hover:scale-105 transition-transform"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
              CONVERSOR RICTV
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Conversão rápida de vídeos, áudios e documentos em alta fidelidade.
            </p>
          </div>
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
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
        <p>CONVERSOR RICTV · Processamento ultrarrápido · Arquivos temporários excluídos automaticamente</p>
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
