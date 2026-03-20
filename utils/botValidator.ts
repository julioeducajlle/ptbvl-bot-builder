// ===== Bot Validator - Structure + Logic Validation =====

import { ValidationResult, CONTRACT_TYPES } from '../types';

const REQUIRED_TOP_BLOCKS = ['runonceatstart'];
const IMPORTANT_TOP_BLOCKS = ['restarttradingconditions', 'purchaseconditions_continuousindices'];

// Build a set of all valid contract directions from all 17 types
const VALID_CONTRACT_DIRECTIONS = CONTRACT_TYPES.flatMap(ct => ct.directions.map(d => d.value));

// Map purchase block type -> contract type info for duration validation
const PURCHASE_BLOCK_MAP = new Map(CONTRACT_TYPES.map(ct => [ct.purchaseBlock, ct]));

// Valid duration units per contract type (for blocks that have seldurationunit_nya)
const VALID_DURATION_UNITS: Record<string, string[]> = {};
CONTRACT_TYPES.forEach(ct => {
  if (ct.duration.type === 'selectable' && ct.duration.units) {
    VALID_DURATION_UNITS[ct.purchaseBlock] = [...ct.duration.units];
  }
});

function findAllBlocks(block: any, results: any[] = []): any[] {
  if (!block) return results;
  results.push(block);
  if (block.next?.block) findAllBlocks(block.next.block, results);
  if (block.inputs) {
    for (const key of Object.keys(block.inputs)) {
      if (block.inputs[key]?.block) findAllBlocks(block.inputs[key].block, results);
      if (block.inputs[key]?.shadow) findAllBlocks(block.inputs[key].shadow, results);
    }
  }
  return results;
}

export function validateBot(ptbot: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic structure check
  if (!ptbot) {
    errors.push('Arquivo .ptbot vazio ou inválido');
    return { valid: false, errors, warnings };
  }

  if (!ptbot.blocks?.blocks || !Array.isArray(ptbot.blocks.blocks)) {
    errors.push('Estrutura de blocos inválida: falta blocks.blocks[]');
    return { valid: false, errors, warnings };
  }

  if (ptbot.blocks.languageVersion === undefined) {
    warnings.push('Campo languageVersion ausente');
  }

  // 2. Check required top-level blocks
  const topTypes = ptbot.blocks.blocks.map((b: any) => b.type);

  for (const req of REQUIRED_TOP_BLOCKS) {
    if (!topTypes.includes(req)) {
      errors.push(`Bloco obrigatório "${req}" não encontrado no nível principal`);
    }
  }

  for (const imp of IMPORTANT_TOP_BLOCKS) {
    if (!topTypes.includes(imp)) {
      warnings.push(`Bloco importante "${imp}" não encontrado. O bot pode não funcionar corretamente.`);
    }
  }

  // 3. Check for purchase blocks
  const allBlocks = ptbot.blocks.blocks.flatMap((b: any) => findAllBlocks(b));
  const purchaseBlocks = allBlocks.filter((b: any) =>
    b.type?.startsWith('purchase_')
  );

  if (purchaseBlocks.length === 0) {
    errors.push('Nenhum bloco de compra (purchase) encontrado. O bot precisa de pelo menos um bloco de compra.');
  }

  // 4. Validate purchase block directions
  for (const pb of purchaseBlocks) {
    const direction = pb.fields?.selcontract_nya;
    if (direction && !VALID_CONTRACT_DIRECTIONS.includes(direction)) {
      warnings.push(`Direção de contrato desconhecida: "${direction}" no bloco ${pb.type}`);
    }
  }

  // 5. Validate duration per contract type
  for (const pb of purchaseBlocks) {
    const ctInfo = PURCHASE_BLOCK_MAP.get(pb.type);
    if (!ctInfo) continue;

    const dur = ctInfo.duration;

    // Check duration unit if present
    const unitField = pb.fields?.seldurationunit_nya;
    if (dur.type === 'selectable' && unitField) {
      const validUnits = VALID_DURATION_UNITS[pb.type];
      if (validUnits && !validUnits.includes(unitField)) {
        errors.push(`Unidade de duração "${unitField}" inválida para ${ctInfo.label}. Válidas: ${validUnits.join(', ')}`);
      }
    }

    // Check duration value
    const durationInput = pb.inputs?.inpduration_nya;
    const durationBlock = durationInput?.block || durationInput?.shadow;
    if (durationBlock && durationBlock.fields?.NUM !== undefined) {
      const val = durationBlock.fields.NUM;
      if (dur.type !== 'none') {
        if (val < dur.min || val > dur.max) {
          errors.push(`Duração ${val} inválida para ${ctInfo.label}. Range: ${dur.min}-${dur.max}.`);
        }
      }
    }

    // Check if accumulator/multiply have no duration (should not have inpduration_nya)
    if (dur.type === 'none' && durationInput) {
      warnings.push(`Bloco ${ctInfo.label} não deveria ter campo de duração.`);
    }
  }

  // 6. Check for readyfortrade in runonceatstart
  const startBlock = ptbot.blocks.blocks.find((b: any) => b.type === 'runonceatstart');
  if (startBlock) {
    const startChildren = findAllBlocks(startBlock);
    const hasReady = startChildren.some((b: any) => b.type === 'readyfortrade');
    if (!hasReady) {
      errors.push('Bloco "readyfortrade" não encontrado dentro de "runonceatstart". O bot não iniciará operações.');
    }
  }

  // 7. Check for tradeagain in restarttradingconditions
  const restartBlock = ptbot.blocks.blocks.find((b: any) => b.type === 'restarttradingconditions');
  if (restartBlock) {
    const restartChildren = findAllBlocks(restartBlock);
    const hasTradeAgain = restartChildren.some((b: any) => b.type === 'tradeagain');
    const hasStopBot = restartChildren.some((b: any) => b.type === 'stopbot');
    if (!hasTradeAgain && !hasStopBot) {
      warnings.push('Bloco "tradeagain" ou "stopbot" não encontrado em "restarttradingconditions". O bot pode parar após a primeira operação.');
    }
  }

  // 8. Check variables
  if (!ptbot.variables || !Array.isArray(ptbot.variables)) {
    warnings.push('Array de variáveis não encontrado');
  } else {
    const varIds = ptbot.variables.map((v: any) => v.id);
    const uniqueIds = new Set(varIds);
    if (uniqueIds.size !== varIds.length) {
      errors.push('IDs de variáveis duplicados encontrados. Isso pode causar conflitos.');
    }

    const varNames = ptbot.variables.map((v: any) => v.name);
    const uniqueNames = new Set(varNames);
    if (uniqueNames.size !== varNames.length) {
      warnings.push('Nomes de variáveis duplicados encontrados. Considere renomear para evitar confusão.');
    }
  }

  // 9. Check block IDs for duplicates
  const blockIds = allBlocks.map((b: any) => b.id).filter((id: any) => id);
  const uniqueBlockIds = new Set(blockIds);
  if (uniqueBlockIds.size !== blockIds.length) {
    warnings.push('IDs de blocos duplicados encontrados. Isso pode causar comportamento inesperado.');
  }

  // 10. Check settarget / stop conditions
  const targetBlocks = allBlocks.filter((b: any) => b.type === 'settarget');
  if (targetBlocks.length === 0) {
    warnings.push('Bloco "settarget" (metas/stops) não encontrado. O bot operará sem limites de ganho/perda.');
  } else {
    const target = targetBlocks[0];
    const hasAnyStop = ['check_targetprofit_nya', 'check_stoploss_nya', 'check_numberofruns_nya',
      'check_numberoflossesinarow_nya', 'check_numberofwinsinarow_nya']
      .some(f => target.fields?.[f] === true);
    if (!hasAnyStop) {
      warnings.push('Todas as condições de parada estão desativadas no settarget. O bot operará indefinidamente.');
    }
  }

  // 11. Martingale logic check
  const hasVarSet = allBlocks.some((b: any) => b.type === 'variables_set');
  if (!hasVarSet) {
    warnings.push('Nenhuma atribuição de variável encontrada. Verifique se a lógica de gerenciamento de stake está implementada.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
