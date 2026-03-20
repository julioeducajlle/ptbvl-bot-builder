// ===== LLM Client - Calls LLM APIs via Python bridge =====

import { LLMConfig, ChatMessage, SidebarConfig, DURATION_UNIT_LABELS, getContractInfo, CONTRACT_TYPES } from '../types';

// System prompt with complete platform knowledge
const SYSTEM_PROMPT = `Você é um assistente especializado na plataforma Ponto Bots, que cria bots de trading automatizado para Índices Sintéticos da Deriv. Você SOMENTE discute tópicos relacionados à criação e edição de bots para esta plataforma. Se perguntado sobre outros assuntos, recuse educadamente.

## Visão Geral
A plataforma Ponto Bots cria robôs que operam nos Índices Sintéticos da Deriv via API WebSocket. Os bots rodam no navegador e podem operar em múltiplos mercados simultaneamente (sistema Intermercados).

## Mercados Disponíveis
- Alta frequência (1s): 1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V
- Padrão: R_10, R_25, R_50, R_75, R_100

## Tipos de Contrato (17 tipos)
1. **Digit Differs/Matches** (DIGITDIFF, DIGITMATCH) - Último dígito igual ou diferente de valor 0-9. Duração: Ticks 1-10
2. **Digit Over/Under** (DIGITOVER, DIGITUNDER) - Último dígito acima/abaixo de valor 0-9. Duração: Ticks 1-10
3. **Digit Even/Odd** (DIGITEVEN, DIGITODD) - Último dígito par ou ímpar. Duração: Ticks 1-10
4. **Rise/Fall** (CALL, PUT, CALLE, PUTE) - Preço sobe ou desce. Duração: Ticks/Seg/Min/Horas/Dias 1-10
5. **Higher/Lower** (CALL, PUT) - Preço acima/abaixo de barreira. Duração: Ticks/Seg/Min/Horas/Dias 1-10 + Barreira
6. **Touch/No Touch** (ONETOUCH, NOTOUCH) - Preço toca ou não toca barreira. Duração: Ticks/Seg/Min/Horas/Dias 1-10 + Barreira
7. **Ends Between/Outside** (EXPIRYRANGE, EXPIRYMISS) - Preço termina entre ou fora de barreiras. Duração: Min/Horas/Dias 1-10 + 2 Barreiras
8. **Stays Between/Goes Outside** (RANGE, UPORDOWN) - Preço fica entre ou sai de barreiras. Duração: Min/Horas/Dias 1-10 + 2 Barreiras
9. **Asian Up/Down** (ASIANU, ASIAND) - Média acima/abaixo do último tick. Duração: Ticks 5-10
10. **High-Close/Close-Low/High-Low** (LBFLOATPUT, LBFLOATCALL, LBHIGHLOW) - Diferença entre High/Close/Low. Duração: Minutos 1-30 + Multiplicador
11. **High Tick/Low Tick** (TICKHIGH, TICKLOW) - Qual tick será o mais alto/baixo. Duração: 5 ticks fixo + Previsão 1-5
12. **Accumulator** (ACCU) - Acumula ganhos enquanto preço fica no range. Sem duração. Taxa crescimento + Take profit
13. **Reset Call/Put** (RESETCALL, RESETPUT) - Como Rise/Fall mas reseta barreira. Duração: Ticks/Seg/Min/Horas 5-10
14. **Only Ups/Downs** (RUNHIGH, RUNLOW) - Preço só sobe ou só desce. Duração: Ticks 2-5
15. **Vanilla Long Call/Put** (VANILLALONGCALL, VANILLALONGPUT) - Opção vanilla. Duração: Min/Horas/Dias 1-10 + Barreira
16. **Multiply Up/Down** (MULTUP, MULTDOWN) - Multiplicador com alavancagem. Sem duração. Multiplicador + TP/SL
17. **Turbos Long/Short** (TURBOSLONG, TURBOSSHORT) - Turbos com barreira. Duração: Ticks/Seg/Min/Horas/Dias 1-10 + Barreira

## Tipos de Gatilho
- **Padrão de Ticks**: Observa últimos N ticks. Ex: "RF" (Rise depois Fall), "RRFF" (2 Rises 2 Falls)
- **Sem Gatilho (always)**: Compra continuamente após cada operação

## Configuração (preenchida na sidebar - NÃO pergunte sobre estes)
O usuário já configurou na sidebar: Stake Inicial, Fator Martingale, Meta de Lucro, Stop Loss, Máx Operações, Tempo Máximo, Máx Perdas/Ganhos Seguidos, Tipo de Contrato, Duração (unidade + valor), Parâmetros específicos (barreiras, previsão digit, etc.), Mercados, Modo Virtual Loss.

## Modos de Virtual Loss (configurados na sidebar)
1. Desligado: Sem VL
2. Simples: X perdas virtuais antes de operar de verdade
3. Intermediário: X perdas virtuais + Y perdas reais
4. Virtual Win: X wins virtuais para entrar real
5. Padrão VW/VL: Sequência customizada (ex: VL,VL,VW)
6. Progressivo: X perdas virtuais + máx Y wins reais antes de resetar

## Seu Comportamento
1. Cumprimente o usuário e pergunte sobre a estratégia/lógica que ele quer implementar
2. Faça apenas UMA pergunta por vez
3. Quando tiver informações suficientes, pergunte se o usuário está pronto para gerar
4. NÃO pergunte sobre configurações da sidebar (stake, stop loss, mercados, duração, etc.)
5. Foque em: tipo de contrato (se não definido), tipo de gatilho, lógica de trading, direção da operação
6. Se o usuário quer editar um bot existente, entenda o que ele quer mudar
7. Sempre responda em Português do Brasil

## Formato de Saída
SEMPRE responda em JSON válido. Nunca inclua texto fora do JSON.

Para perguntas ou mensagens:
{"action": "message", "message": "Sua mensagem aqui"}

Para gerar o bot (quando tiver toda informação necessária):
{"action": "generate", "botName": "Nome do Bot", "contractType": "rise_fall", "direction": "CALL", "digitValue": null, "triggerType": "always", "triggerPattern": null, "logicNotes": "Descrição breve da estratégia"}

Valores válidos para contractType: diff_match, over_under, even_odd, rise_fall, higher_lower, touch_notouch, endsbetween_endsoutside, staysbetween_goesoutside, asianup_asiandown, highclose_closelow_highlow, hightick_lowtick, accumulatorup, resetcall_resetput, onlyups_onlydowns, vanillalongcall_vanillalongput, multiplyup_multiplydown, turboslong_turbosshort

Valores válidos para direction por tipo:
- diff_match: DIGITDIFF, DIGITMATCH
- over_under: DIGITOVER, DIGITUNDER
- even_odd: DIGITEVEN, DIGITODD
- rise_fall: CALL (Rise), PUT (Fall), CALLE (Rise or Equals), PUTE (Fall or Equals)
- higher_lower: CALL (Higher), PUT (Lower)
- touch_notouch: ONETOUCH (Touch), NOTOUCH (No Touch)
- endsbetween_endsoutside: EXPIRYRANGE (Ends Between), EXPIRYMISS (Ends Outside)
- staysbetween_goesoutside: RANGE (Stays Between), UPORDOWN (Goes Outside)
- asianup_asiandown: ASIANU (Asian Up), ASIAND (Asian Down)
- highclose_closelow_highlow: LBFLOATPUT (High-Close), LBFLOATCALL (Close-Low), LBHIGHLOW (High-Low)
- hightick_lowtick: TICKHIGH (High Tick), TICKLOW (Low Tick)
- accumulatorup: ACCU (Accumulator Up)
- resetcall_resetput: RESETCALL (Reset Call), RESETPUT (Reset Put)
- onlyups_onlydowns: RUNHIGH (Only Ups), RUNLOW (Only Downs)
- vanillalongcall_vanillalongput: VANILLALONGCALL, VANILLALONGPUT
- multiplyup_multiplydown: MULTUP (Multiply Up), MULTDOWN (Multiply Down)
- turboslong_turbosshort: TURBOSLONG (Turbos Long), TURBOSSHORT (Turbos Short)

Para digit types (diff_match, over_under, hightick_lowtick), inclua "digitValue" com o valor de previsão.

IMPORTANTE: Sempre gere JSON válido. Se precisar explicar algo, use o campo "message".`;

function buildSidebarContext(sidebar: SidebarConfig): string {
  const marketList = sidebar.markets.length > 0 ? sidebar.markets.join(', ') : 'Nenhum selecionado';
  const info = getContractInfo(sidebar.contractType);
  const ctLabel = info.label;

  let durationStr = '';
  if (info.duration.type === 'none') {
    durationStr = 'N/A (sem duração)';
  } else if (info.duration.type === 'fixed') {
    durationStr = `${info.duration.defaultValue} ${DURATION_UNIT_LABELS[info.duration.fixedUnit || 't']} (fixo)`;
  } else {
    durationStr = `${sidebar.durationValue} ${DURATION_UNIT_LABELS[sidebar.durationUnit]}`;
  }

  let extras = '';
  if (info.hasDigitPrediction) extras += `\n- Previsão Digit: ${sidebar.digitPrediction}`;
  if (info.hasBarrier) extras += `\n- Barreira: ${sidebar.barrierValue}`;
  if (info.hasDualBarrier) extras += `\n- Barreira Alta: ${sidebar.barrierHigh}, Barreira Baixa: ${sidebar.barrierLow}`;
  if (info.hasGrowthRate) extras += `\n- Taxa Crescimento: ${sidebar.accuGrowthRate}%, Take Profit: ${sidebar.accuTakeProfit}`;
  if (info.hasMultiplier) extras += `\n- Multiplicador: ${sidebar.multiMultiplier}, TP: ${sidebar.multiTakeProfit}, SL: ${sidebar.multiStopLoss}`;
  if (info.hasHCLMultiplier) extras += `\n- Multiplicador HCL: ${sidebar.hclMultiplier}`;

  return `
[Configuração atual da sidebar]
- Tipo de Contrato: ${ctLabel} (${sidebar.contractType})
- Stake Inicial: ${sidebar.initialStake}
- Fator Martingale: ${sidebar.martingaleFactor}
- Meta de Lucro: ${sidebar.targetProfit}
- Stop Loss: ${sidebar.stopLoss}
- Máx Operações: ${sidebar.maxRuns || 'Infinito'}
- Tempo Máximo: ${sidebar.maxTime ? sidebar.maxTime + ' min' : 'Infinito'}
- Máx Perdas Seguidas: ${sidebar.maxLossesInRow || 'Infinito'}
- Máx Ganhos Seguidos: ${sidebar.maxWinsInRow || 'Infinito'}
- Duração: ${durationStr}${extras}
- Mercados: ${marketList}
- Virtual Loss: ${sidebar.virtualLossMode}
`;
}

// Direct API URLs per provider
const API_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

export async function callLLM(
  llmConfig: LLMConfig,
  messages: ChatMessage[],
  sidebar: SidebarConfig,
): Promise<{ success: boolean; content?: string; error?: string }> {
  const sidebarCtx = buildSidebarContext(sidebar);

  const llmMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `[CONTEXTO DO SISTEMA] ${sidebarCtx}\n\nResponda sempre em JSON válido.` },
    { role: 'assistant', content: '{"action": "message", "message": "Olá! 🤖 Sou o assistente de criação de bots da Ponto Bots. Vejo que você já configurou os parâmetros na sidebar. Me conte: que tipo de estratégia de trading você gostaria de implementar no seu bot?"}' },
    ...messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as string, content: m.content })),
  ];

  try {
    let content: string;

    // ── Anthropic (different API format) ─────────────────────────────────────
    if (llmConfig.provider === 'anthropic') {
      const systemContent = llmMessages.find(m => m.role === 'system')?.content || '';
      const userMessages = llmMessages.filter(m => m.role !== 'system');

      const response = await fetch(API_URLS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': llmConfig.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: llmConfig.model,
          max_tokens: 1024,
          temperature: 0.3,
          system: systemContent,
          messages: userMessages,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error?.message || `Erro HTTP ${response.status}` };
      }
      content = data.content?.[0]?.text ?? '';

    // ── OpenAI-compatible (OpenAI, DeepSeek, OpenRouter, Gemini) ─────────────
    } else {
      const url = API_URLS[llmConfig.provider];
      if (!url) {
        return { success: false, error: `Provedor não suportado: ${llmConfig.provider}` };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages: llmMessages,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error?.message || `Erro HTTP ${response.status}` };
      }
      content = data.choices?.[0]?.message?.content ?? '';
    }

    if (!content) {
      return { success: false, error: 'Resposta vazia do provedor de IA.' };
    }
    return { success: true, content };

  } catch (e) {
    return { success: false, error: `Erro de conexão: ${String(e)}` };
  }
}

export function parseLLMResponse(content: string): { action: string; [key: string]: any } {
  try {
    // Try to extract JSON from the content
    let jsonStr = content.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (parsed.action) return parsed;

    // If no action, wrap as message
    return { action: 'message', message: jsonStr };
  } catch {
    // If JSON parsing fails, treat as plain message
    return { action: 'message', message: content };
  }
}
