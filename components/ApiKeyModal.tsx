import React, { useState } from 'react';
import { Settings, Eye, EyeOff, Check } from 'lucide-react';
import { LLMConfig, PROVIDER_OPTIONS } from '../types';

interface ApiKeyModalProps {
  llmConfig: LLMConfig | null;
  onSave: (config: LLMConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ llmConfig, onSave, onClose, isOpen }) => {
  const [provider, setProvider] = useState<LLMConfig['provider']>(llmConfig?.provider || 'openai');
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey || '');
  const [model, setModel] = useState(llmConfig?.model || '');
  const [showKey, setShowKey] = useState(false);

  const currentProvider = PROVIDER_OPTIONS.find(p => p.value === provider);
  const models = currentProvider?.models || [];

  const handleSave = () => {
    if (!apiKey.trim()) return;
    onSave({
      provider,
      apiKey: apiKey.trim(),
      model: model || models[0] || '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card bg-base-200 w-full max-w-md mx-4">
        <div className="card-body gap-4">
          <h2 className="card-title text-base-content">
            <Settings size={20} /> Configurar LLM
          </h2>
          <p className="text-sm text-base-content/60">
            Insira sua chave de API para o modelo de linguagem. A chave é usada apenas para gerar os bots.
          </p>

          {/* Provider */}
          <div className="form-control">
            <label className="label"><span className="label-text">Provedor</span></label>
            <select
              className="select select-bordered w-full"
              value={provider}
              onChange={e => {
                const p = e.target.value as LLMConfig['provider'];
                setProvider(p);
                const prov = PROVIDER_OPTIONS.find(x => x.value === p);
                setModel(prov?.models[0] || '');
              }}
            >
              {PROVIDER_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="form-control">
            <label className="label"><span className="label-text">API Key</span></label>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                className="grow"
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button className="btn btn-ghost btn-xs" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </label>
          </div>

          {/* Model */}
          <div className="form-control">
            <label className="label"><span className="label-text">Modelo</span></label>
            <select
              className="select select-bordered w-full"
              value={model || models[0]}
              onChange={e => setModel(e.target.value)}
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="card-actions justify-end mt-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={!apiKey.trim()}
            >
              <Check size={16} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
