import React from 'react';
import { Film, FileAudio, FileText, FastForward, Check, Layers, ShieldCheck } from 'lucide-react';

interface FeatureHighlightsProps {
  onQuickSelect: (category: 'webm-mp4' | 'pdf-jpg' | 'ogg-mp3') => void;
}

export const FeatureHighlights: React.FC<FeatureHighlightsProps> = ({ onQuickSelect }) => {
  return (
    <div className="w-full pt-8 pb-12 border-t border-slate-800/80">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2">
          Conversões de Alta Performance Otimizadas
        </h3>
        <p className="text-slate-400 text-sm">
          Arquitetura construída sobre binários nativos FFmpeg e Ghostscript para máxima velocidade e compressão sem perda de qualidade perceptível.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WEBM to MP4 card */}
        <div id="video-section" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Film className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">WEBM para MP4</h4>
            <p className="text-xs text-slate-400 mb-4">
              Transcodificação H.264 com suporte a <strong>faststart</strong> para reprodução instantânea na web, sem esperar o download completo.
            </p>
            <div className="space-y-2 text-xs text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multithread nativo (Preset ultrafast a medium)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Conversão de VP8/VP9 para H.264 + áudio AAC</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preserva taxa de quadros e resolução original</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onQuickSelect('webm-mp4')}
            className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors text-center"
          >
            Testar WEBM → MP4 Agora
          </button>
        </div>

        {/* OGG to MP3 card */}
        <div id="audio-section" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <FileAudio className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">OGG para MP3</h4>
            <p className="text-xs text-slate-400 mb-4">
              Conversão de fidelidade acústica com biblioteca LAME. Compatível com todos os players, sistemas automotivos e dispositivos móveis.
            </p>
            <div className="space-y-2 text-xs text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Taxas de bits de até 320 kbps (qualidade de estúdio)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suporte a OGG Vorbis, Opus e extração de vídeo</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Processamento em milissegundos</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onQuickSelect('ogg-mp3')}
            className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors text-center"
          >
            Testar OGG → MP3 Agora
          </button>
        </div>

        {/* PDF to JPG card */}
        <div id="pdf-section" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">PDF para JPG</h4>
            <p className="text-xs text-slate-400 mb-4">
              Renderizador Ghostscript 9.55 com nitidez de texto vetorial e imagens em 150/300 DPI. Gera páginas individuais ou pacote compactado.
            </p>
            <div className="space-y-2 text-xs text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exporta todas as páginas em alta definição</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download em pacote .ZIP unificado</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pré-visualização direta no navegador</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onQuickSelect('pdf-jpg')}
            className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors text-center"
          >
            Testar PDF → JPG Agora
          </button>
        </div>
      </div>

      {/* Engine & Performance specs */}
      <div id="batch-section" className="mt-8 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-white">Processamento Massivo em Lote</h5>
            <p className="text-xs text-slate-400 max-w-lg mt-0.5">
              Suba quantos arquivos precisar. O sistema aloca threads do servidor para converter em paralelo, gerando um pacote .ZIP completo para download consolidado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <FastForward className="w-4 h-4 text-emerald-400" />
            <span>Até 12x Tempo Real</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Limpeza de Disco Automática</span>
          </div>
        </div>
      </div>
    </div>
  );
};
