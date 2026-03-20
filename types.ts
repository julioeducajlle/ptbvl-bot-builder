// ===== Ponto Bots AI Builder - Types =====

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter';
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type DurationUnit = 't' | 's' | 'm' | 'h' | 'd';

export interface SidebarConfig {
  initialStake: number;
  martingaleFactor: number;
  targetProfit: number;
  stopLoss: number;
  maxRuns: number;         // 0 = infinite
  maxTime: number;         // 0 = infinite (in minutes)
  maxLossesInRow: number;  // 0 = infinite
  maxWinsInRow: number;    // 0 = infinite
  contractType: ContractType;
  markets: string[];
  durationUnit: DurationUnit;
  durationValue: number;
  // Contract-specific fields
  digitPrediction: number;     // 0-9 for digit types, 1-5 for high/low tick
  barrierValue: number;        // barrier for higher/lower, touch, vanilla, turbos
  barrierHigh: number;         // upper barrier for ends/stays between
  barrierLow: number;          // lower barrier for ends/stays between
  accuGrowthRate: number;      // growth rate % for accumulator
  accuTakeProfit: number;      // take profit for accumulator
  multiMultiplier: number;     // multiplier for multiply up/down
  multiTakeProfit: number;     // take profit for multiply
  multiStopLoss: number;       // stop loss for multiply
  hclMultiplier: number;       // multiplier for high-close/close-low/high-low
  // Virtual Loss
  virtualLossMode: VLMode;
  vlVirtualLosses: number;
  vlRealLosses: number;
  vlVirtualWins: number;
  vlPattern: string;
  vlMaxRealWins: number;
}

export type ContractType =
  | 'diff_match'
  | 'over_under'
  | 'even_odd'
  | 'rise_fall'
  | 'higher_lower'
  | 'touch_notouch'
  | 'endsbetween_endsoutside'
  | 'staysbetween_goesoutside'
  | 'asianup_asiandown'
  | 'highclose_closelow_highlow'
  | 'hightick_lowtick'
  | 'accumulatorup'
  | 'resetcall_resetput'
  | 'onlyups_onlydowns'
  | 'vanillalongcall_vanillalongput'
  | 'multiplyup_multiplydown'
  | 'turboslong_turbosshort';

export type VLMode =
  | 'nenhum'
  | 'simples'
  | 'intermediario'
  | 'virtualwin'
  | 'padrao'
  | 'progressivo';

// Duration configuration per contract type
export interface DurationConfig {
  type: 'selectable' | 'fixed_unit' | 'fixed' | 'none';
  units?: DurationUnit[];       // available units for 'selectable'
  fixedUnit?: DurationUnit;     // unit for 'fixed_unit'
  min: number;
  max: number;
  defaultUnit?: DurationUnit;
  defaultValue?: number;
}

// Contract direction options
export interface ContractDirection {
  value: string;
  label: string;
}

// Full contract type definition
export interface ContractTypeInfo {
  value: ContractType;
  label: string;
  purchaseBlock: string;
  directions: ContractDirection[];
  duration: DurationConfig;
  hasDigitPrediction?: boolean;  // digit 0-9
  digitRange?: [number, number]; // [min, max] for prediction
  hasBarrier?: boolean;          // single barrier
  hasDualBarrier?: boolean;      // two barriers (high/low)
  hasGrowthRate?: boolean;       // accumulator
  hasMultiplier?: boolean;       // multiply up/down
  hasHCLMultiplier?: boolean;    // high-close/close-low multiplier
}

export const CONTRACT_TYPES: ContractTypeInfo[] = [
  {
    value: 'diff_match',
    label: 'Digit Differs / Matches',
    purchaseBlock: 'purchase_diff_match',
    directions: [
      { value: 'DIGITDIFF', label: 'Digit Differs' },
      { value: 'DIGITMATCH', label: 'Digit Matches' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 't', min: 1, max: 10, defaultValue: 5 },
    hasDigitPrediction: true,
    digitRange: [0, 9],
  },
  {
    value: 'over_under',
    label: 'Digit Over / Under',
    purchaseBlock: 'purchase_over_under',
    directions: [
      { value: 'DIGITOVER', label: 'Digit Over' },
      { value: 'DIGITUNDER', label: 'Digit Under' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 't', min: 1, max: 10, defaultValue: 5 },
    hasDigitPrediction: true,
    digitRange: [0, 9],
  },
  {
    value: 'even_odd',
    label: 'Digit Even / Odd',
    purchaseBlock: 'purchase_even_odd',
    directions: [
      { value: 'DIGITEVEN', label: 'Digit Even' },
      { value: 'DIGITODD', label: 'Digit Odd' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 't', min: 1, max: 10, defaultValue: 5 },
  },
  {
    value: 'rise_fall',
    label: 'Rise / Fall',
    purchaseBlock: 'purchase_rise_fall',
    directions: [
      { value: 'CALL', label: 'Rise' },
      { value: 'PUT', label: 'Fall' },
      { value: 'CALLE', label: 'Rise or Equals' },
      { value: 'PUTE', label: 'Fall or Equals' },
    ],
    duration: { type: 'selectable', units: ['t', 's', 'm', 'h', 'd'], min: 1, max: 10, defaultUnit: 't', defaultValue: 5 },
  },
  {
    value: 'higher_lower',
    label: 'Higher / Lower',
    purchaseBlock: 'purchase_higher_lower',
    directions: [
      { value: 'CALL', label: 'Higher' },
      { value: 'PUT', label: 'Lower' },
    ],
    duration: { type: 'selectable', units: ['t', 's', 'm', 'h', 'd'], min: 1, max: 10, defaultUnit: 't', defaultValue: 5 },
    hasBarrier: true,
  },
  {
    value: 'touch_notouch',
    label: 'Touch / No Touch',
    purchaseBlock: 'purchase_touch_notouch',
    directions: [
      { value: 'ONETOUCH', label: 'Touch' },
      { value: 'NOTOUCH', label: 'No Touch' },
    ],
    duration: { type: 'selectable', units: ['t', 's', 'm', 'h', 'd'], min: 1, max: 10, defaultUnit: 't', defaultValue: 5 },
    hasBarrier: true,
  },
  {
    value: 'endsbetween_endsoutside',
    label: 'Ends Between / Ends Outside',
    purchaseBlock: 'purchase_endsbetween_endsoutside',
    directions: [
      { value: 'EXPIRYRANGE', label: 'Ends Between' },
      { value: 'EXPIRYMISS', label: 'Ends Outside' },
    ],
    duration: { type: 'selectable', units: ['m', 'h', 'd'], min: 1, max: 10, defaultUnit: 'm', defaultValue: 5 },
    hasDualBarrier: true,
  },
  {
    value: 'staysbetween_goesoutside',
    label: 'Stays Between / Goes Outside',
    purchaseBlock: 'purchase_staysbetween_goesoutside',
    directions: [
      { value: 'RANGE', label: 'Stays Between' },
      { value: 'UPORDOWN', label: 'Goes Outside' },
    ],
    duration: { type: 'selectable', units: ['m', 'h', 'd'], min: 1, max: 10, defaultUnit: 'm', defaultValue: 5 },
    hasDualBarrier: true,
  },
  {
    value: 'asianup_asiandown',
    label: 'Asian Up / Asian Down',
    purchaseBlock: 'purchase_asianup_asiandown',
    directions: [
      { value: 'ASIANU', label: 'Asian Up' },
      { value: 'ASIAND', label: 'Asian Down' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 't', min: 5, max: 10, defaultValue: 5 },
  },
  {
    value: 'highclose_closelow_highlow',
    label: 'High-Close / Close-Low / High-Low',
    purchaseBlock: 'purchase_highclose_closelow_highlow',
    directions: [
      { value: 'LBFLOATPUT', label: 'High-Close' },
      { value: 'LBFLOATCALL', label: 'Close-Low' },
      { value: 'LBHIGHLOW', label: 'High-Low' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 'm', min: 1, max: 30, defaultValue: 5 },
    hasHCLMultiplier: true,
  },
  {
    value: 'hightick_lowtick',
    label: 'High Tick / Low Tick',
    purchaseBlock: 'purchase_hightick_lowtick',
    directions: [
      { value: 'TICKHIGH', label: 'High Tick' },
      { value: 'TICKLOW', label: 'Low Tick' },
    ],
    duration: { type: 'fixed', fixedUnit: 't', min: 5, max: 5, defaultValue: 5 },
    hasDigitPrediction: true,
    digitRange: [1, 5],
  },
  {
    value: 'accumulatorup',
    label: 'Accumulator',
    purchaseBlock: 'purchase_accumulatorup',
    directions: [
      { value: 'ACCU', label: 'Accumulator Up' },
    ],
    duration: { type: 'none', min: 0, max: 0 },
    hasGrowthRate: true,
  },
  {
    value: 'resetcall_resetput',
    label: 'Reset Call / Put',
    purchaseBlock: 'purchase_resetcall_resetput',
    directions: [
      { value: 'RESETCALL', label: 'Reset Call' },
      { value: 'RESETPUT', label: 'Reset Put' },
    ],
    duration: { type: 'selectable', units: ['t', 's', 'm', 'h'], min: 5, max: 10, defaultUnit: 't', defaultValue: 5 },
  },
  {
    value: 'onlyups_onlydowns',
    label: 'Only Ups / Only Downs',
    purchaseBlock: 'purchase_onlyups_onlydowns',
    directions: [
      { value: 'RUNHIGH', label: 'Only Ups' },
      { value: 'RUNLOW', label: 'Only Downs' },
    ],
    duration: { type: 'fixed_unit', fixedUnit: 't', min: 2, max: 5, defaultValue: 3 },
  },
  {
    value: 'vanillalongcall_vanillalongput',
    label: 'Vanilla Long Call / Put',
    purchaseBlock: 'purchase_vanillalongcall_vanillalongput',
    directions: [
      { value: 'VANILLALONGCALL', label: 'Vanilla Long Call' },
      { value: 'VANILLALONGPUT', label: 'Vanilla Long Put' },
    ],
    duration: { type: 'selectable', units: ['m', 'h', 'd'], min: 1, max: 10, defaultUnit: 'm', defaultValue: 5 },
    hasBarrier: true,
  },
  {
    value: 'multiplyup_multiplydown',
    label: 'Multiply Up / Down',
    purchaseBlock: 'purchase_multiplyup_multiplydown',
    directions: [
      { value: 'MULTUP', label: 'Multiply Up' },
      { value: 'MULTDOWN', label: 'Multiply Down' },
    ],
    duration: { type: 'none', min: 0, max: 0 },
    hasMultiplier: true,
  },
  {
    value: 'turboslong_turbosshort',
    label: 'Turbos Long / Short',
    purchaseBlock: 'purchase_turboslong_turbosshort',
    directions: [
      { value: 'TURBOSLONG', label: 'Turbos Long' },
      { value: 'TURBOSSHORT', label: 'Turbos Short' },
    ],
    duration: { type: 'selectable', units: ['t', 's', 'm', 'h', 'd'], min: 1, max: 10, defaultUnit: 't', defaultValue: 5 },
    hasBarrier: true,
  },
];

// Helper to get contract type info
export function getContractInfo(ct: ContractType): ContractTypeInfo {
  return CONTRACT_TYPES.find(c => c.value === ct) || CONTRACT_TYPES[3]; // default rise_fall
}

// Duration unit labels
export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  t: 'Ticks',
  s: 'Segundos',
  m: 'Minutos',
  h: 'Horas',
  d: 'Dias',
};

export const VL_MODE_OPTIONS: { value: VLMode; label: string; description: string }[] = [
  { value: 'nenhum', label: 'Desligado', description: 'Virtual Loss desativado' },
  { value: 'simples', label: 'Simples', description: 'X perdas virtuais antes de entrar real' },
  { value: 'intermediario', label: 'Intermediário', description: 'X perdas virtuais + Y perdas reais' },
  { value: 'virtualwin', label: 'Virtual Win', description: 'X wins virtuais para entrar real' },
  { value: 'padrao', label: 'Padrão VW/VL', description: 'Sequência customizada (ex: VL,VL,VW)' },
  { value: 'progressivo', label: 'Progressivo', description: 'X perdas virtuais + máx Y wins reais' },
];

// All available markets for intermercados
export const AVAILABLE_MARKETS = [
  { id: '1HZ10V', label: 'Volatility 10 (1s) Index', position: 1 },
  { id: '1HZ25V', label: 'Volatility 25 (1s) Index', position: 2 },
  { id: '1HZ50V', label: 'Volatility 50 (1s) Index', position: 3 },
  { id: '1HZ75V', label: 'Volatility 75 (1s) Index', position: 4 },
  { id: '1HZ100V', label: 'Volatility 100 (1s) Index', position: 5 },
  { id: 'R_10', label: 'Volatility 10 Index', position: 6 },
  { id: 'R_25', label: 'Volatility 25 Index', position: 7 },
  { id: 'R_50', label: 'Volatility 50 Index', position: 8 },
  { id: 'R_75', label: 'Volatility 75 Index', position: 9 },
  { id: 'R_100', label: 'Volatility 100 Index', position: 10 },
] as const;

export const PROVIDER_OPTIONS: { value: LLMConfig['provider']; label: string; models: string[] }[] = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    models: [
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/llama-nemotron-embed-vl-1b-v2',
      'sourceful/riverflow-v2-pro',
      'sourceful/riverflow-v2-fast',
      'qwen/qwen3-next-80b-a3b-instruct',
      'qwen/qwen3-coder',
      'google/gemma-3-27b-it',
    ],
  },
];

export interface BotGenerationConfig {
  botName: string;
  contractType: ContractType;
  direction: string;       // CALL, PUT, DIGITOVER, DIGITUNDER, etc
  digitValue?: number;     // 0-9 for digit types, 1-5 for high/low tick
  triggerType: 'tick_pattern' | 'always';
  triggerPattern?: string; // e.g., "RF", "RRFF"
  triggerDirection?: string;
  logicNotes?: string;
  sidebar: SidebarConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_SIDEBAR: SidebarConfig = {
  initialStake: 1,
  martingaleFactor: 2,
  targetProfit: 10,
  stopLoss: 100,
  maxRuns: 0,
  maxTime: 0,
  maxLossesInRow: 5,
  maxWinsInRow: 0,
  contractType: 'rise_fall',
  markets: ['R_10'],
  durationUnit: 't',
  durationValue: 5,
  digitPrediction: 5,
  barrierValue: 0,
  barrierHigh: 0,
  barrierLow: 0,
  accuGrowthRate: 1,
  accuTakeProfit: 100,
  multiMultiplier: 100,
  multiTakeProfit: 100,
  multiStopLoss: 50,
  hclMultiplier: 1,
  virtualLossMode: 'nenhum',
  vlVirtualLosses: 3,
  vlRealLosses: 1,
  vlVirtualWins: 3,
  vlPattern: 'VL,VL,VW',
  vlMaxRealWins: 2,
};
