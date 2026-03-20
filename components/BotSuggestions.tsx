import React from 'react';
import { Bot, Zap, Edit, PlusCircle, X } from 'lucide-react';
import { BotMatch, similarityLabel } from '../utils/botLibrary';

const CONTRACT_LABELS: Record<string, string> = {
  diff_match: "Digit Difere/Igual",
  over_under: "Digit Acima/Abaixo",
  even_odd: "Digit Par/Ímpar",
  rise_fall: "Sobe/Desce",
  higher_lower: "Maior/Menor",
  touch_notouch: "Toca/Não Toca",
  endsbetween_endsoutside: "Termina Entre/Fora",
  staysbetween_goesoutside: "Fica Entre/Vai Fora",
  asianup_asiandown: "Asian Sobe/Desce",
  highclose_closelow_highlow: "High-Close/Close-Low",
  hightick_lowtick: "High Tick/Low Tick",
  accumulatorup: "Acumulador",
  resetcall_resetput: "Reset Call/Put",
  onlyups_onlydowns: "Only Ups/Downs",
  vanillalongcall_vanillalongput: "Vanilla Long Call/Put",
  multiplyup_multiplydown: "Multiply Up/Down",
  turboslong_turbosshort: "Turbos Long/Short",
};

interface BotSuggestionsProps {
  matches: BotMatch[];
  queryTermCount: number;
  onUseBot: (match: BotMatch) => void;
  onUseAsBase: (match: BotMatch) => void;
  onCreateNew: () => void;
  isLoading: boolean;
}

export const BotSuggestions: React.FC<BotSuggestionsProps> = ({
  matches, queryTermCount, onUseBot, onUseAsBase, onCreateNew, isLoading
}) => {
  if (matches.length === 0) return null;

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Zap size={13} />
        <span>Encontrei {matches.length} bot{matches.length > 1 ? 's' : ''} similar{matches.length > 1 ? 'es' : ''} na biblioteca:</span>
      </div>

      {matches.map((match) => (
        <div key={match.filename} className="bg-base-100 rounded-lg p-2.5 border border-base-300 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot size={13} className="text-primary shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-base-content truncate">{match.name}</span>
            </div>
            <span className="badge badge-xs badge-primary shrink-0">
              {similarityLabel(match.score, queryTermCount)}
            </span>
          </div>

          {match.description && match.description !== match.name && (
            <p className="text-xs text-base-content/60 line-clamp-2">{match.description}</p>
          )}

          <div className="flex flex-wrap gap-1">
            {match.contractTypes.slice(0, 2).map(ct => (
              <span key={ct} className="badge badge-xs badge-outline">
                {CONTRACT_LABELS[ct] || ct}
              </span>
            ))}
            {match.hasVirtualLoss && (
              <span className="badge badge-xs badge-warning badge-outline">VL</span>
            )}
            {match.hasMultiMarket && (
              <span className="badge badge-xs badge-info badge-outline">Multi</span>
            )}
          </div>

          <div className="flex gap-1.5 pt-0.5">
            <button
              className="btn btn-xs btn-primary gap-1 flex-1"
              onClick={() => onUseBot(match)}
              disabled={isLoading}
            >
              <Zap size={10} /> Usar
            </button>
            <button
              className="btn btn-xs btn-outline gap-1 flex-1"
              onClick={() => onUseAsBase(match)}
              disabled={isLoading}
            >
              <Edit size={10} /> Adaptar
            </button>
          </div>
        </div>
      ))}

      <button
        className="btn btn-xs btn-ghost gap-1 w-full text-base-content/50"
        onClick={onCreateNew}
        disabled={isLoading}
      >
        <PlusCircle size={11} /> Ignorar e criar bot do zero
      </button>
    </div>
  );
};
