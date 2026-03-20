import React, { useState } from 'react';
import { Download, Upload, CheckCircle, AlertTriangle, XCircle, FileCode, Trash2, Copy } from 'lucide-react';
import { ValidationResult } from '../types';
import { validateBot } from '../utils/botValidator';

interface BotPreviewProps {
  botJson: object | null;
  onImport: (json: object) => void;
  onClear: () => void;
}

export const BotPreview: React.FC<BotPreviewProps> = ({ botJson, onImport, onClear }) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Validate whenever bot changes
  React.useEffect(() => {
    if (botJson) {
      const result = validateBot(botJson);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [botJson]);

  const handleExport = () => {
    if (!botJson) return;
    const jsonStr = JSON.stringify(botJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = (botJson as any)?.blocks?.blocks?.[0]?.inputs?.statement_runonceatstart?.block?.inputs?.TEXT?.shadow?.fields?.TEXT || 'meu_bot';
    a.download = `bot_pontobots.ptbot`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ptbot';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string;
          const json = JSON.parse(content);
          if (!json.blocks?.blocks) {
            setImportError('Arquivo .ptbot inválido: estrutura de blocos não encontrada');
            return;
          }
          onImport(json);
          setImportError(null);
        } catch (err) {
          setImportError('Erro ao ler arquivo: JSON inválido');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCopy = () => {
    if (!botJson) return;
    navigator.clipboard.writeText(JSON.stringify(botJson, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-base-200 border-t border-base-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
        <span className="text-xs font-semibold text-base-content flex items-center gap-1">
          <FileCode size={14} /> Bot Preview
        </span>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-xs" onClick={handleImport} title="Importar .ptbot">
            <Upload size={12} /> Importar
          </button>
          {botJson && (
            <>
              <button className="btn btn-ghost btn-xs" onClick={handleCopy} title="Copiar JSON">
                <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button className="btn btn-primary btn-xs" onClick={handleExport} title="Exportar .ptbot">
                <Download size={12} /> Exportar
              </button>
              <button className="btn btn-ghost btn-xs text-error" onClick={onClear} title="Limpar">
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {importError && (
          <div className="alert alert-error text-xs mb-2">
            <XCircle size={14} />
            <span>{importError}</span>
          </div>
        )}

        {!botJson ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-40">
            <FileCode size={32} />
            <p className="text-sm">Nenhum bot gerado ainda</p>
            <p className="text-[10px]">Converse com a IA ou importe um .ptbot</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Validation Results */}
            {validation && (
              <div className="space-y-1">
                {validation.valid ? (
                  <div className="flex items-center gap-1 text-success">
                    <CheckCircle size={14} />
                    <span className="font-medium">Estrutura válida</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error">
                    <XCircle size={14} />
                    <span className="font-medium">Erros encontrados</span>
                  </div>
                )}

                {validation.errors.map((err, i) => (
                  <div key={`e${i}`} className="flex items-start gap-1 text-error/80 text-[11px] pl-4">
                    <XCircle size={10} className="shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}

                {validation.warnings.map((warn, i) => (
                  <div key={`w${i}`} className="flex items-start gap-1 text-warning/80 text-[11px] pl-4">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bot Stats */}
            <div className="bg-base-300 rounded-lg p-2 mt-2">
              <BotStats botJson={botJson} />
            </div>

            {/* Toggle JSON view */}
            <button
              className="btn btn-ghost btn-xs w-full"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? '▲ Ocultar JSON' : '▼ Ver JSON completo'}
            </button>

            {showJson && (
              <pre className="bg-base-300 rounded-lg p-2 overflow-x-auto text-[10px] text-base-content/70 max-h-60 overflow-y-auto">
                {JSON.stringify(botJson, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Show bot statistics
const BotStats: React.FC<{ botJson: object }> = ({ botJson }) => {
  const bot = botJson as any;
  const topBlocks = bot.blocks?.blocks?.length || 0;
  const variables = bot.variables?.length || 0;

  // Count all blocks
  let totalBlocks = 0;
  const countBlocks = (block: any) => {
    if (!block) return;
    totalBlocks++;
    if (block.next?.block) countBlocks(block.next.block);
    if (block.inputs) {
      for (const key of Object.keys(block.inputs)) {
        if (block.inputs[key]?.block) countBlocks(block.inputs[key].block);
      }
    }
  };
  bot.blocks?.blocks?.forEach((b: any) => countBlocks(b));

  // Find purchase type
  const findPurchaseType = (block: any): string | null => {
    if (!block) return null;
    if (block.type?.startsWith('purchase_')) return block.fields?.selcontract_nya || block.type;
    let found: string | null = null;
    if (block.next?.block) found = findPurchaseType(block.next.block);
    if (!found && block.inputs) {
      for (const key of Object.keys(block.inputs)) {
        found = findPurchaseType(block.inputs[key]?.block);
        if (found) break;
      }
    }
    return found;
  };

  let purchaseType = 'N/A';
  for (const b of (bot.blocks?.blocks || [])) {
    const found = findPurchaseType(b);
    if (found) { purchaseType = found; break; }
  }

  return (
    <div className="grid grid-cols-2 gap-1 text-[11px]">
      <div className="text-base-content/60">Blocos principais:</div>
      <div className="text-base-content font-medium">{topBlocks}</div>
      <div className="text-base-content/60">Total de blocos:</div>
      <div className="text-base-content font-medium">{totalBlocks}</div>
      <div className="text-base-content/60">Variáveis:</div>
      <div className="text-base-content font-medium">{variables}</div>
      <div className="text-base-content/60">Tipo operação:</div>
      <div className="text-base-content font-medium">{purchaseType}</div>
    </div>
  );
};
