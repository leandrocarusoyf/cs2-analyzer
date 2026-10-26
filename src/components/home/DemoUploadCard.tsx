'use client';

import React, { useState, useRef } from 'react';

export function DemoUploadCard() {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processUploads = async (filesToUpload: File[]) => {
    if (!filesToUpload || filesToUpload.length === 0) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('playedAt', new Date().toISOString());

      for (const file of filesToUpload) {
        formData.append('files', file);
      }

      let res: Response;
      try {
        res = await fetch('/api/demos/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.status === 404) {
          res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        }
      } catch {
        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha no upload (Status ${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      setUploadStatus('success');
      setUploadMessage(
        data.message ||
          (filesToUpload.length > 1
            ? `${filesToUpload.length} arquivos enviados com sucesso!`
            : 'Demo enviada com sucesso!')
      );
    } catch (err: any) {
      console.error('[DemoUploadCard] Erro no upload de demo:', err);
      setUploadStatus('error');
      setUploadMessage(err?.message || 'Erro ao enviar demo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      processUploads(selectedFiles);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const hasFiles = files.length > 0;

  return (
    <div className="relative bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-sm overflow-hidden group select-none">
      {/* Glowing animated pulse backdrop */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-container/20 to-secondary-container/20 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 pointer-events-none"></div>

      <div className="relative flex flex-col gap-space-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <span className="font-card-header text-card-header uppercase tracking-wider text-primary-container font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">file_upload</span>
            PARTICIPAR DO ANALYZER
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-stat-mono-md text-benchmark-label">
            PARSER v2.4
          </span>
        </div>

        {/* Dropzone Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`bg-surface-container rounded-lg p-space-lg flex flex-col items-center text-center cursor-pointer transition group/drop ${
            isUploading ? 'cursor-wait opacity-90' : ''
          } ${
            isDragOver
              ? 'bg-surface-container-high ring-2 ring-primary-container shadow-[0_0_20px_rgba(0,229,255,0.4)]'
              : 'hover:bg-surface-container-high'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".dem,.gz,.zip,.rar"
            multiple
            disabled={isUploading}
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary-container mb-space-sm shadow-[0_0_16px_rgba(0,229,255,0.25)] group-hover/drop:scale-110 transition-transform">
            <span
              className={`material-symbols-outlined text-[26px] ${
                isUploading ? 'animate-spin text-primary-container' : ''
              }`}
            >
              {isUploading
                ? 'sync'
                : uploadStatus === 'success' || hasFiles
                ? 'check_circle'
                : 'cloud_upload'}
            </span>
          </div>

          <span className="font-card-header text-card-header font-bold text-on-surface group-hover/drop:text-primary-container transition-colors uppercase">
            {isUploading
              ? 'ENVIANDO ARQUIVOS...'
              : hasFiles
              ? 'ARQUIVO SELECIONADO'
              : 'UPLOAD .DEM (DRAG-AND-DROP)'}
          </span>

          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mt-1 mb-space-md truncate">
            {isUploading
              ? files.length > 1
                ? `Enviando ${files.length} arquivos...`
                : `Enviando ${files[0]?.name}...`
              : uploadMessage
              ? uploadMessage
              : hasFiles
              ? files.length === 1
                ? files[0].name
                : `${files.length} arquivos selecionados`
              : 'Arraste seu arquivo .dem do CS2 (Matchmaking, Gamers Club, FACEIT) ou selecione para análise de sub-tick automatizada instantânea.'}
          </p>

          {/* Simple progress indicator during upload */}
          {isUploading && (
            <div className="w-full max-w-xs bg-surface-container-highest rounded-full h-1.5 overflow-hidden mb-space-md">
              <div className="bg-primary-container h-full rounded-full animate-pulse w-3/4"></div>
            </div>
          )}

          {/* Substituir / Selecionar Arquivo button (removido durante envio) */}
          {!isUploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-space-lg py-space-sm rounded bg-primary-container text-on-primary-container font-card-header text-card-header font-bold hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.3)] transition w-full uppercase"
            >
              {hasFiles ? 'SUBSTITUIR ARQUIVO' : 'SELECIONAR ARQUIVO'}
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-space-xs font-benchmark-label text-benchmark-label text-outline uppercase tracking-wider">
          <span className="px-1.5 py-0.5 rounded bg-surface-container">GC</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container">MM</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container">FACEIT 128-TICK &amp; SUB-TICK</span>
        </div>
      </div>
    </div>
  );
}

export default DemoUploadCard;
