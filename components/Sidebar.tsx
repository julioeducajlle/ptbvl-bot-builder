import React from 'react';
import {
  SidebarConfig,
  AVAILABLE_MARKETS,
  CONTRACT_TYPES,
  VL_MODE_OPTIONS,
  DURATION_UNIT_LABELS,
  ContractType,
  DurationUnit,
  VLMode,
  getContractInfo,
} from '../types';

interface SidebarProps {
  config: SidebarConfig;
  onChange: (config: SidebarConfig) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange, collapsed, onToggle }) => {
  const contractInfo = getContractInfo(config.contractType);
  const dur = contractInfo.duration;

  const update = (partial: Partial<SidebarConfig>) => {
    onChange({ ...config, ...partial });
  };

  // When contract type changes, reset duration and direction to valid defaults
  const handleContractChange = (ct: ContractType) => {
    const info = getContractInfo(ct);
    const d = info.duration;
    const newDir = info.directions[0]?.value || 'CALL';
    const updates: Partial<SidebarConfig> = {
      contractType: ct,
    };
    // Reset duration to defaults for new contract type
    if (d.type === 'none') {
      updates.durationUnit = 't';
      updates.durationValue = 0;
    } else if (d.type === 'fixed') {
      updates.durationUnit = d.fixedUnit || 't';
      updates.durationValue = d.defaultValue || d.min;
    } else if (d.type === 'fixed_unit') {
      updates.durationUnit = d.fixedUnit || 't';
      updates.durationValue = d.defaultValue || d.min;
    } else {
      updates.durationUnit = d.defaultUnit || d.units![0];
      updates.durationValue = d.defaultValue || d.min;
    }
    // Reset digit prediction if applicable
    if (info.hasDigitPrediction && info.digitRange) {
      updates.digitPrediction = Math.floor((info.digitRange[0] + info.digitRange[1]) / 2);
    }
    update(updates);
  };

  const toggleMarket = (marketId: string) => {
    const markets = config.markets.includes(marketId)
      ? config.markets.filter(m => m !== marketId)
      : config.markets.length < 10 ? [...config.markets, marketId] : config.markets;
    if (markets.length === 0) return;
    update({ markets });
  };

  // Clamp duration value to valid range
  const clampDuration = (val: number) => {
    if (val < dur.min) return dur.min;
    if (val > dur.max) return dur.max;
    return val;
  };

  if (collapsed) {
    return (
      <div className="w-10 flex flex-col items-center pt-2 bg-base-200 border-r border-base-300 shrink-0">
        <button className="btn btn-ghost btn-xs" onClick={onToggle} title="Expandir configurações">
          <span className="text-lg">⚙</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col bg-base-200 border-r border-base-300 shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300">
        <span className="text-sm font-semibold text-base-content">⚙ Configurações</span>
        <button className="btn btn-ghost btn-xs" onClick={onToggle}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs">
        {/* Contract Type */}
        <Field label="Tipo de Contrato">
          <select
            className="select select-bordered select-xs w-full"
            value={config.contractType}
            onChange={e => handleContractChange(e.target.value as ContractType)}
          >
            {CONTRACT_TYPES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        {/* Direction */}
        {contractInfo.directions.length > 1 && (
          <Field label="Direção">
            <select
              className="select select-bordered select-xs w-full"
              value={contractInfo.directions.find(d => d.value === config.durationUnit) ? undefined : undefined}
            >
              {contractInfo.directions.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Stake */}
        <Field label="Stake Inicial">
          <input
            type="number"
            className="input input-bordered input-xs w-full"
            value={config.initialStake}
            min={0.35}
            step={0.01}
            onChange={e => update({ initialStake: parseFloat(e.target.value) || 0.35 })}
          />
        </Field>

        <Field label="Fator Martingale">
          <input
            type="number"
            className="input input-bordered input-xs w-full"
            value={config.martingaleFactor}
            min={1}
            step={0.1}
            onChange={e => update({ martingaleFactor: parseFloat(e.target.value) || 1 })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Meta Lucro">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.targetProfit}
              min={0}
              step={1}
              onChange={e => update({ targetProfit: parseFloat(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Stop Loss">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.stopLoss}
              min={0}
              step={1}
              onChange={e => update({ stopLoss: parseFloat(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Máx Operações" hint="0 = ∞">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.maxRuns}
              min={0}
              onChange={e => update({ maxRuns: parseInt(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Tempo Máx (min)" hint="0 = ∞">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.maxTime}
              min={0}
              onChange={e => update({ maxTime: parseInt(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Máx Perdas Seg." hint="0 = ∞">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.maxLossesInRow}
              min={0}
              onChange={e => update({ maxLossesInRow: parseInt(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Máx Ganhos Seg." hint="0 = ∞">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.maxWinsInRow}
              min={0}
              onChange={e => update({ maxWinsInRow: parseInt(e.target.value) || 0 })}
            />
          </Field>
        </div>

        {/* ===== Duration Section ===== */}
        {dur.type !== 'none' && (
          <>
            <div className="divider my-1 text-base-content/40">Duração</div>

            {dur.type === 'selectable' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Unidade">
                  <select
                    className="select select-bordered select-xs w-full"
                    value={config.durationUnit}
                    onChange={e => update({ durationUnit: e.target.value as DurationUnit })}
                  >
                    {dur.units!.map(u => (
                      <option key={u} value={u}>{DURATION_UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor" hint={`${dur.min}-${dur.max}`}>
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.durationValue}
                    min={dur.min}
                    max={dur.max}
                    onChange={e => update({ durationValue: clampDuration(parseInt(e.target.value) || dur.min) })}
                  />
                </Field>
              </div>
            )}

            {dur.type === 'fixed_unit' && (
              <Field
                label={`Duração (${DURATION_UNIT_LABELS[dur.fixedUnit || 't']})`}
                hint={`${dur.min}-${dur.max}`}
              >
                <input
                  type="number"
                  className="input input-bordered input-xs w-full"
                  value={config.durationValue}
                  min={dur.min}
                  max={dur.max}
                  onChange={e => update({ durationValue: clampDuration(parseInt(e.target.value) || dur.min) })}
                />
              </Field>
            )}

            {dur.type === 'fixed' && (
              <Field label={`Duração (${DURATION_UNIT_LABELS[dur.fixedUnit || 't']})`}>
                <input
                  type="number"
                  className="input input-bordered input-xs w-full bg-base-300"
                  value={dur.defaultValue}
                  disabled
                />
              </Field>
            )}
          </>
        )}

        {dur.type === 'none' && (
          <>
            <div className="divider my-1 text-base-content/40">Duração</div>
            <p className="text-[10px] text-base-content/40 italic">
              Este tipo de contrato não usa duração fixa.
            </p>
          </>
        )}

        {/* ===== Contract-Specific Fields ===== */}
        {(contractInfo.hasDigitPrediction || contractInfo.hasBarrier || contractInfo.hasDualBarrier ||
          contractInfo.hasGrowthRate || contractInfo.hasMultiplier || contractInfo.hasHCLMultiplier) && (
          <>
            <div className="divider my-1 text-base-content/40">Parâmetros Específicos</div>

            {contractInfo.hasDigitPrediction && contractInfo.digitRange && (
              <Field
                label="Previsão"
                hint={`${contractInfo.digitRange[0]}-${contractInfo.digitRange[1]}`}
              >
                <input
                  type="number"
                  className="input input-bordered input-xs w-full"
                  value={config.digitPrediction}
                  min={contractInfo.digitRange[0]}
                  max={contractInfo.digitRange[1]}
                  onChange={e => {
                    let v = parseInt(e.target.value) || contractInfo.digitRange![0];
                    if (v < contractInfo.digitRange![0]) v = contractInfo.digitRange![0];
                    if (v > contractInfo.digitRange![1]) v = contractInfo.digitRange![1];
                    update({ digitPrediction: v });
                  }}
                />
              </Field>
            )}

            {contractInfo.hasBarrier && (
              <Field label="Barreira" hint="offset (+/-)">
                <input
                  type="number"
                  className="input input-bordered input-xs w-full"
                  value={config.barrierValue}
                  step={0.01}
                  onChange={e => update({ barrierValue: parseFloat(e.target.value) || 0 })}
                />
              </Field>
            )}

            {contractInfo.hasDualBarrier && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Barreira Alta">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.barrierHigh}
                    step={0.01}
                    onChange={e => update({ barrierHigh: parseFloat(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="Barreira Baixa">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.barrierLow}
                    step={0.01}
                    onChange={e => update({ barrierLow: parseFloat(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            )}

            {contractInfo.hasGrowthRate && (
              <>
                <Field label="Taxa Crescimento (%)" hint="1-5">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.accuGrowthRate}
                    min={1}
                    max={5}
                    onChange={e => {
                      let v = parseInt(e.target.value) || 1;
                      if (v < 1) v = 1;
                      if (v > 5) v = 5;
                      update({ accuGrowthRate: v });
                    }}
                  />
                </Field>
                <Field label="Take Profit">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.accuTakeProfit}
                    min={0}
                    step={1}
                    onChange={e => update({ accuTakeProfit: parseFloat(e.target.value) || 0 })}
                  />
                </Field>
              </>
            )}

            {contractInfo.hasMultiplier && (
              <>
                <Field label="Multiplicador" hint="ex: 100, 200">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-full"
                    value={config.multiMultiplier}
                    min={1}
                    onChange={e => update({ multiMultiplier: parseInt(e.target.value) || 1 })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Take Profit">
                    <input
                      type="number"
                      className="input input-bordered input-xs w-full"
                      value={config.multiTakeProfit}
                      min={0}
                      step={1}
                      onChange={e => update({ multiTakeProfit: parseFloat(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Stop Loss">
                    <input
                      type="number"
                      className="input input-bordered input-xs w-full"
                      value={config.multiStopLoss}
                      min={0}
                      step={1}
                      onChange={e => update({ multiStopLoss: parseFloat(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
              </>
            )}

            {contractInfo.hasHCLMultiplier && (
              <Field label="Multiplicador" hint="ex: 1, 2, 5">
                <input
                  type="number"
                  className="input input-bordered input-xs w-full"
                  value={config.hclMultiplier}
                  min={1}
                  onChange={e => update({ hclMultiplier: parseInt(e.target.value) || 1 })}
                />
              </Field>
            )}
          </>
        )}

        {/* Virtual Loss */}
        <div className="divider my-1 text-base-content/40">Virtual Loss</div>
        <Field label="Modo VL">
          <select
            className="select select-bordered select-xs w-full"
            value={config.virtualLossMode}
            onChange={e => update({ virtualLossMode: e.target.value as VLMode })}
          >
            {VL_MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        {config.virtualLossMode !== 'nenhum' && (
          <p className="text-base-content/40 text-[10px] -mt-1">
            {VL_MODE_OPTIONS.find(o => o.value === config.virtualLossMode)?.description}
          </p>
        )}

        {/* VL-specific fields */}
        {(config.virtualLossMode === 'simples' || config.virtualLossMode === 'intermediario' || config.virtualLossMode === 'progressivo') && (
          <Field label="Perdas Virtuais">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.vlVirtualLosses}
              min={1}
              onChange={e => update({ vlVirtualLosses: parseInt(e.target.value) || 1 })}
            />
          </Field>
        )}
        {config.virtualLossMode === 'intermediario' && (
          <Field label="Perdas Reais">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.vlRealLosses}
              min={1}
              onChange={e => update({ vlRealLosses: parseInt(e.target.value) || 1 })}
            />
          </Field>
        )}
        {config.virtualLossMode === 'virtualwin' && (
          <Field label="Wins Virtuais">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.vlVirtualWins}
              min={1}
              onChange={e => update({ vlVirtualWins: parseInt(e.target.value) || 1 })}
            />
          </Field>
        )}
        {config.virtualLossMode === 'padrao' && (
          <Field label="Sequência" hint="VL,VL,VW">
            <input
              type="text"
              className="input input-bordered input-xs w-full"
              value={config.vlPattern}
              placeholder="VL,VL,VW"
              onChange={e => update({ vlPattern: e.target.value })}
            />
          </Field>
        )}
        {config.virtualLossMode === 'progressivo' && (
          <Field label="Máx Wins Reais">
            <input
              type="number"
              className="input input-bordered input-xs w-full"
              value={config.vlMaxRealWins}
              min={1}
              onChange={e => update({ vlMaxRealWins: parseInt(e.target.value) || 1 })}
            />
          </Field>
        )}

        {/* Markets - Intermercados */}
        <div className="divider my-1 text-base-content/40">Intermercados</div>
        <p className="text-[10px] text-base-content/40 mb-1">
          Mín: 1 | Máx: 10 | Selecionados: {config.markets.length}
        </p>
        <div className="space-y-1">
          {AVAILABLE_MARKETS.map(m => (
            <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-base-300 rounded px-1 py-0.5">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={config.markets.includes(m.id)}
                onChange={() => toggleMarket(m.id)}
              />
              <span className="text-[11px] text-base-content/80">{m.id}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component for form fields
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="form-control">
    <label className="label py-0.5">
      <span className="label-text text-xs">{label}</span>
      {hint && <span className="label-text-alt text-[10px] text-base-content/40">{hint}</span>}
    </label>
    {children}
  </div>
);
