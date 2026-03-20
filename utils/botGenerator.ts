// ===== Ponto Bots - .ptbot Generator =====
// Generates valid Blockly JSON for the Ponto Bots platform

import { BotGenerationConfig, AVAILABLE_MARKETS, getContractInfo } from '../types';
import { newBlockId, newVarId, resetIdCounter } from './idGenerator';

// Shorthand type for any blockly JSON node
type B = Record<string, any>;

// Market label mapping for setmarket block
const MARKET_LABELS: Record<string, string> = {};
AVAILABLE_MARKETS.forEach(m => { MARKET_LABELS[m.id] = `${m.id}|${m.label}`; });

// Market position mapping for setactive_continuousindices
const MARKET_POSITIONS: Record<string, number> = {};
AVAILABLE_MARKETS.forEach(m => { MARKET_POSITIONS[m.id] = m.position; });

// ===== Helper builders =====

function num(value: number): B {
  return { type: 'math_number', id: newBlockId(), fields: { NUM: value } };
}

function txt(value: string): B {
  return { type: 'text', id: newBlockId(), fields: { TEXT: value } };
}

function bool(value: boolean): B {
  return { type: 'logic_boolean', id: newBlockId(), fields: { BOOL: value ? 'TRUE' : 'FALSE' } };
}

function varGet(varId: string): B {
  return { type: 'variables_get', id: newBlockId(), fields: { VAR: { id: varId } } };
}

function varSet(varId: string, value: B): B {
  return { type: 'variables_set', id: newBlockId(), fields: { VAR: { id: varId } }, inputs: { VALUE: { block: value } } };
}

function shadow(value: B): { shadow: B } {
  return { shadow: value };
}

function compare(op: string, a: B, b: B): B {
  return {
    type: 'logic_compare', id: newBlockId(),
    fields: { OP: op },
    inputs: { A: { block: a }, B: { block: b } }
  };
}

function mathOp(op: string, a: B, b: B): B {
  return {
    type: 'math_arithmetic', id: newBlockId(),
    fields: { OP: op },
    inputs: {
      A: { shadow: num(1), block: a },
      B: { shadow: num(1), block: b }
    }
  };
}

function logicOp(op: string, a: B, b: B): B {
  return {
    type: 'logic_operation', id: newBlockId(),
    fields: { OP: op },
    inputs: { A: { block: a }, B: { block: b } }
  };
}

function ifBlock(condition: B, doBlocks: B, elseBlocks?: B): B {
  const block: B = {
    type: 'controls_if', id: newBlockId(),
    inputs: {
      IF0: { block: condition },
      DO0: { block: doBlocks }
    }
  };
  if (elseBlocks) {
    block.extraState = { hasElse: true };
    block.inputs.ELSE = { block: elseBlocks };
  }
  return block;
}

function printBlock(message: string): B {
  return {
    type: 'text_print', id: newBlockId(),
    inputs: { TEXT: { shadow: txt(message) } }
  };
}

function writeLog(message: B | string, color: string = '', sound: string = 'silent'): B {
  const logInput = typeof message === 'string' ? { shadow: txt(message) } : { shadow: txt('log'), block: message };
  return {
    type: 'write_log', id: newBlockId(),
    fields: { color_nya: color, sound_nya: sound },
    inputs: { log_nya: logInput }
  };
}

function textJoin(items: B[]): B {
  const inputs: B = {};
  items.forEach((item, i) => { inputs[`ADD${i}`] = { block: item }; });
  return {
    type: 'text_join', id: newBlockId(),
    extraState: { itemCount: items.length },
    inputs
  };
}

// Chain blocks via .next
function chain(...blocks: B[]): B {
  if (blocks.length === 0) throw new Error('chain needs at least 1 block');
  if (blocks.length === 1) return blocks[0];
  const result = { ...blocks[0] };
  let current = result;
  for (let i = 1; i < blocks.length; i++) {
    current.next = { block: { ...blocks[i] } };
    current = current.next.block;
  }
  return result;
}

// ===== Block generators =====

function generateSetMarket(config: BotGenerationConfig): B {
  const primary = config.sidebar.markets[0] || 'R_10';
  return {
    type: 'setmarket', id: newBlockId(),
    fields: { market_nya: MARKET_LABELS[primary] || `${primary}|${primary}` }
  };
}

function generateSetActiveMarkets(config: BotGenerationConfig): B {
  const fields: B = {};
  for (let i = 1; i <= 10; i++) {
    const marketAtPosition = AVAILABLE_MARKETS.find(m => m.position === i);
    const isActive = marketAtPosition ? config.sidebar.markets.includes(marketAtPosition.id) : false;
    fields[`check_market${i}_nya`] = isActive;
  }
  return { type: 'setactive_continuousindices', id: newBlockId(), fields };
}

function generateSetTarget(config: BotGenerationConfig): B {
  const s = config.sidebar;
  return {
    type: 'settarget', id: newBlockId(),
    fields: {
      check_targetprofit_nya: s.targetProfit > 0,
      check_stoploss_nya: s.stopLoss > 0,
      check_numberofwins_nya: false,
      check_numberoflosses_nya: false,
      check_numberofruns_nya: s.maxRuns > 0,
      check_numberofwinsinarow_nya: s.maxWinsInRow > 0,
      check_numberoflossesinarow_nya: s.maxLossesInRow > 0,
    },
    inputs: {
      targetprofit_nya: shadow(num(s.targetProfit || 10)),
      stoploss_nya: shadow(num(s.stopLoss || 100)),
      numberofwins_nya: shadow(num(0)),
      numberoflosses_nya: shadow(num(0)),
      numberofruns_nya: shadow(num(s.maxRuns || 0)),
      numberofwinsinarow_nya: shadow(num(s.maxWinsInRow || 0)),
      numberoflossesinarow_nya: shadow(num(s.maxLossesInRow || 0)),
    }
  };
}

function generateVirtualLoss(config: BotGenerationConfig): B {
  const s = config.sidebar;
  const vlEnabled = s.virtualLossMode !== 'nenhum';

  const block: B = {
    type: 'setvirtuallose', id: newBlockId(),
    fields: {
      check_virtuallose_nya: vlEnabled,
      virtuallose_tipo: vlEnabled ? 'avancado' : 'simples',
    },
    inputs: {
      virtuallose_nya: shadow(num(vlEnabled && s.virtualLossMode === 'simples' ? s.vlVirtualLosses : 0)),
    }
  };

  if (vlEnabled && s.virtualLossMode !== 'simples') {
    let vlConfigBlock: B | null = null;

    switch (s.virtualLossMode) {
      case 'intermediario':
        vlConfigBlock = {
          type: 'setvirtuallose_intermediario', id: newBlockId(),
          inputs: {
            intermediario_loss_virtual: { shadow: num(1), block: num(s.vlVirtualLosses) },
            intermediario_loss_real: { shadow: num(1), block: num(s.vlRealLosses) },
          }
        };
        break;
      case 'virtualwin':
        vlConfigBlock = {
          type: 'setvirtuallose_win', id: newBlockId(),
          inputs: {
            win_virtual_qtde: { shadow: num(1), block: num(s.vlVirtualWins) },
          }
        };
        break;
      case 'padrao':
        vlConfigBlock = {
          type: 'setvirtuallose_padrao', id: newBlockId(),
          fields: { padrao_sequencia: s.vlPattern || 'VL,VL,VW' }
        };
        break;
      case 'progressivo':
        vlConfigBlock = {
          type: 'setvirtuallose_progressivo', id: newBlockId(),
          inputs: {
            progressivo_virtual_losses: { shadow: num(1), block: num(s.vlVirtualLosses) },
            progressivo_real_wins: { shadow: num(1), block: num(s.vlMaxRealWins) },
          }
        };
        break;
    }

    if (vlConfigBlock) {
      block.inputs.virtuallose_config = { block: vlConfigBlock };
    }
  }

  return block;
}

function generateSetDelays(): B {
  return {
    type: 'setadditionalsettings', id: newBlockId(),
    fields: { check_delayafterwin_nya: false, check_delayafterlose_nya: false },
    inputs: {
      delayafterwin_nya: shadow(num(0)),
      delayafterlose_nya: shadow(num(0)),
    }
  };
}

// ===== Purchase Block Generator for ALL 17 contract types =====

function generatePurchaseBlock(config: BotGenerationConfig, stakeVarId: string, account: string): B {
  const info = getContractInfo(config.contractType);
  const s = config.sidebar;
  const dur = info.duration;

  const block: B = {
    type: info.purchaseBlock, id: newBlockId(),
    fields: {
      selcontract_nya: config.direction,
      account_nya: account,
      market_nya: 'mainMarket_continuousindices',
      stakeAM_nya: 'manual',
    },
    inputs: {
      stake_nya: { shadow: num(1), block: varGet(stakeVarId) },
    }
  };

  // === Duration ===
  if (dur.type === 'selectable') {
    block.fields.seldurationunit_nya = s.durationUnit;
    block.inputs.inpduration_nya = { shadow: num(1), block: num(s.durationValue) };
  } else if (dur.type === 'fixed_unit') {
    // Fixed unit - don't add seldurationunit_nya field (block uses ticks or minutes internally)
    block.inputs.inpduration_nya = { shadow: num(1), block: num(s.durationValue) };
  } else if (dur.type === 'fixed') {
    block.inputs.inpduration_nya = { shadow: num(dur.defaultValue || dur.min) };
  }
  // 'none' type: no duration fields needed (accumulator, multiply)

  // === Digit Prediction ===
  if (info.hasDigitPrediction) {
    block.inputs.ldp_nya = { shadow: num(0), block: num(s.digitPrediction) };
  }

  // === Single Barrier ===
  if (info.hasBarrier) {
    block.inputs.inpbarrier_nya = { shadow: num(0), block: num(s.barrierValue) };
  }

  // === Dual Barriers ===
  if (info.hasDualBarrier) {
    block.inputs.inpbarrier_high_nya = { shadow: num(0), block: num(s.barrierHigh) };
    block.inputs.inpbarrier_low_nya = { shadow: num(0), block: num(s.barrierLow) };
  }

  // === Accumulator-specific fields ===
  if (info.hasGrowthRate) {
    block.inputs.growthrate_nya = { shadow: num(1), block: num(s.accuGrowthRate) };
    block.inputs.takeprofit_nya = { shadow: num(0), block: num(s.accuTakeProfit) };
  }

  // === Multiplier-specific fields (Multiply Up/Down) ===
  if (info.hasMultiplier) {
    block.inputs.multiplier_nya = { shadow: num(100), block: num(s.multiMultiplier) };
    block.inputs.takeprofit_nya = { shadow: num(0), block: num(s.multiTakeProfit) };
    block.inputs.stoploss_nya = { shadow: num(0), block: num(s.multiStopLoss) };
  }

  // === HCL Multiplier (High-Close/Close-Low/High-Low) ===
  if (info.hasHCLMultiplier) {
    block.inputs.multiplier_nya = { shadow: num(1), block: num(s.hclMultiplier) };
  }

  return block;
}

// ===== Main bot structure generators =====

interface VarDefs {
  stakeInicial: { name: string; id: string };
  stakeAtual: { name: string; id: string };
  fatorMartingale: { name: string; id: string };
  ganhosSeguidos: { name: string; id: string };
  perdasSeguidas: { name: string; id: string };
  totalOperacoes: { name: string; id: string };
  [key: string]: { name: string; id: string };
}

function createVarDefs(): VarDefs {
  return {
    stakeInicial: { name: 'stakeInicial', id: newVarId() },
    stakeAtual: { name: 'stakeAtual', id: newVarId() },
    fatorMartingale: { name: 'fatorMartingale', id: newVarId() },
    ganhosSeguidos: { name: 'ganhosSeguidos', id: newVarId() },
    perdasSeguidas: { name: 'perdasSeguidas', id: newVarId() },
    totalOperacoes: { name: 'totalOperacoes', id: newVarId() },
  };
}

function generateRunOnceAtStart(config: BotGenerationConfig, vars: VarDefs): B {
  const initBlocks: B[] = [
    printBlock(`${config.botName} - Ponto Bots AI Builder`),
    generateSetMarket(config),
    generateSetActiveMarkets(config),
    generateSetTarget(config),
    generateVirtualLoss(config),
    generateSetDelays(),
    // Initialize variables
    varSet(vars.stakeInicial.id, num(config.sidebar.initialStake)),
    varSet(vars.stakeAtual.id, num(config.sidebar.initialStake)),
    varSet(vars.fatorMartingale.id, num(config.sidebar.martingaleFactor)),
    varSet(vars.ganhosSeguidos.id, num(0)),
    varSet(vars.perdasSeguidas.id, num(0)),
    varSet(vars.totalOperacoes.id, num(0)),
    { type: 'readyfortrade', id: newBlockId() },
  ];

  return {
    type: 'runonceatstart', id: newBlockId(),
    x: 0, y: 0,
    inputs: {
      statement_runonceatstart: { block: chain(...initBlocks) }
    }
  };
}

function generatePurchaseConditions(config: BotGenerationConfig, vars: VarDefs): B {
  const purchaseCall = generatePurchaseBlock(config, vars.stakeAtual.id, 'master');

  const logTrade = writeLog(
    textJoin([
      txt('Comprando '),
      txt(config.direction),
      txt(' | Stake: '),
      varGet(vars.stakeAtual.id),
    ]),
    'ffbf00',
    'silent'
  );

  const innerContent = chain(logTrade, purchaseCall);

  return {
    type: 'purchaseconditions_continuousindices', id: newBlockId(),
    x: 0, y: 900,
    inputs: {
      statement_purchaseconditions: { block: innerContent }
    }
  };
}

function generateRestartConditions(config: BotGenerationConfig, vars: VarDefs): B {
  // Win branch: reset stake, increment wins counter
  const winBranch = chain(
    varSet(vars.ganhosSeguidos.id, mathOp('ADD', varGet(vars.ganhosSeguidos.id), num(1))),
    varSet(vars.perdasSeguidas.id, num(0)),
    varSet(vars.stakeAtual.id, varGet(vars.stakeInicial.id)),
    writeLog(
      textJoin([
        txt('✅ WIN | Ganhos seguidos: '),
        varGet(vars.ganhosSeguidos.id),
        txt(' | Lucro total: '),
        { type: 'summary', id: newBlockId(), fields: { data_nya: 'totalprofitloss' } },
      ]),
      '00ff00',
      'silent'
    ),
  );

  // Loss branch: apply martingale, increment losses counter
  const lossBranch = chain(
    varSet(vars.perdasSeguidas.id, mathOp('ADD', varGet(vars.perdasSeguidas.id), num(1))),
    varSet(vars.ganhosSeguidos.id, num(0)),
    varSet(vars.stakeAtual.id,
      mathOp('MULTIPLY', varGet(vars.stakeAtual.id), varGet(vars.fatorMartingale.id))
    ),
    writeLog(
      textJoin([
        txt('❌ LOSS | Perdas seguidas: '),
        varGet(vars.perdasSeguidas.id),
        txt(' | Próximo stake: '),
        varGet(vars.stakeAtual.id),
      ]),
      'ff0000',
      'silent'
    ),
  );

  // Main if: check if last trade was win or loss
  const mainIf = ifBlock(
    compare('GTE',
      { type: 'lastcontractdetail', id: newBlockId(), fields: { dropdown_lastcontractdetail_A: 'profit' } },
      num(0)
    ),
    winBranch,
    lossBranch
  );

  const content = chain(
    varSet(vars.totalOperacoes.id, mathOp('ADD', varGet(vars.totalOperacoes.id), num(1))),
    mainIf,
    { type: 'tradeagain', id: newBlockId() }
  );

  return {
    type: 'restarttradingconditions', id: newBlockId(),
    x: 0, y: 2000,
    inputs: {
      statement_restarttradingconditions: { block: content }
    }
  };
}

// ===== Main export =====

export function generateBot(config: BotGenerationConfig): object {
  resetIdCounter();
  const vars = createVarDefs();

  const blocks: B[] = [
    generateRunOnceAtStart(config, vars),
    generatePurchaseConditions(config, vars),
    generateRestartConditions(config, vars),
  ];

  const variables = Object.values(vars).map(v => ({ name: v.name, id: v.id }));

  return {
    blocks: {
      languageVersion: 0,
      blocks: blocks,
    },
    variables,
  };
}

// Parse existing .ptbot to extract basic config info
export function parsePtbotConfig(ptbot: any): Partial<BotGenerationConfig> | null {
  try {
    if (!ptbot?.blocks?.blocks || !Array.isArray(ptbot.blocks.blocks)) return null;

    const result: Partial<BotGenerationConfig> = {};

    // Find runonceatstart to extract settings
    const startBlock = ptbot.blocks.blocks.find((b: any) => b.type === 'runonceatstart');
    if (startBlock) {
      const findBlockType = (block: any, type: string): any => {
        if (!block) return null;
        if (block.type === type) return block;
        if (block.next?.block) return findBlockType(block.next.block, type);
        if (block.inputs) {
          for (const key of Object.keys(block.inputs)) {
            const found = findBlockType(block.inputs[key]?.block, type);
            if (found) return found;
          }
        }
        return null;
      };

      const innerBlock = startBlock.inputs?.statement_runonceatstart?.block;
      const marketBlock = findBlockType(innerBlock, 'setmarket');
      if (marketBlock?.fields?.market_nya) {
        const marketId = marketBlock.fields.market_nya.split('|')[0];
        result.sidebar = { markets: [marketId] } as any;
      }
    }

    return result;
  } catch {
    return null;
  }
}
