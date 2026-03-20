# 🤖 Ponto Bots AI Builder

> Criador e editor de bots com IA para a plataforma [Ponto Bots](https://pontobots.com) — operações automatizadas em Índices Sintéticos da Deriv.

---

## 📌 Visão Geral

O **Ponto Bots AI Builder** é uma aplicação web desenvolvida em **React + TypeScript** que permite criar, editar e exportar bots de trading compatíveis com a plataforma Ponto Bots (formato `.ptbot`), utilizando inteligência artificial para gerar a lógica do bot a partir de uma descrição em linguagem natural.

O usuário descreve o comportamento desejado via chat, preenche as configurações na sidebar e o sistema gera automaticamente o arquivo `.ptbot` no formato JSON/Blockly compatível com a plataforma, pronto para importação.

---

## ✨ Funcionalidades

### 🗨️ Chat com IA
- Descreva sua estratégia em linguagem natural
- A IA faz perguntas esclarecedoras antes de programar
- O agente é restrito exclusivamente a tópicos de criação/edição de bots
- Suporte a múltiplos provedores de LLM (usuário fornece sua própria chave de API)

### ⚙️ Sidebar de Configuração
Todos os parâmetros operacionais do bot são configurados na sidebar:

| Campo | Descrição |
|---|---|
| Stake inicial | Valor de entrada por operação |
| Fator Martingale | Multiplicador após perda |
| Meta de lucro | Stop gain global |
| Stop Loss | Stop loss global |
| Máx. operações | Limite de operações totais |
| Tempo máx. operação | Timeout por operação (0 = infinito) |
| Máx. perdas consecutivas | Stop por sequência de perdas |
| Máx. ganhos consecutivos | Stop por sequência de ganhos |
| Tipo de contrato | 17 tipos disponíveis (ver seção abaixo) |
| Duração | Dinâmica por tipo de contrato (ticks / segundos / minutos / horas / dias) |
| Parâmetros específicos | Barreira, previsão de dígito, multiplicador, etc. (por tipo) |
| Intermercados | Seleção de 1 a 10 mercados simultâneos |
| Modo Virtual Loss | 6 modos disponíveis |

### 📋 17 Tipos de Contrato Suportados

| Tipo | Contratos | Duração |
|---|---|---|
| Digit Differs / Matches | DIGITDIFF, DIGITMATCH | Ticks fixo (1–10) |
| Digit Over / Under | DIGITOVER, DIGITUNDER | Ticks fixo (1–10) |
| Digit Even / Odd | DIGITEVEN, DIGITODD | Ticks fixo (1–10) |
| Rise / Fall | CALL, PUT, CALLE, PUTE | t / s / m / h / d (selecionável) |
| Higher / Lower | CALL, PUT | t / s / m / h / d + Barreira |
| Touch / No Touch | ONETOUCH, NOTOUCH | t / s / m / h / d + Barreira |
| Ends Between / Outside | EXPIRYRANGE, EXPIRYMISS | m / h / d + 2 Barreiras |
| Stays Between / Goes Outside | RANGE, UPORDOWN | m / h / d + 2 Barreiras |
| Asian Up / Down | ASIANU, ASIAND | Ticks fixo (5–10) |
| High-Close / Close-Low / High-Low | LBFLOATPUT, LBFLOATCALL, LBHIGHLOW | Minutos fixo (1–30) |
| High Tick / Low Tick | TICKHIGH, TICKLOW | 5 ticks fixo + Previsão (1–5) |
| Accumulator Up | ACCU | Growth Rate + Take Profit |
| Reset Call / Put | RESETCALL, RESETPUT | t / s / m / h (5–10) |
| Only Ups / Downs | RUNHIGH, RUNLOW | Ticks fixo (2–5) |
| Vanilla Long Call / Put | VANILLALONGCALL, VANILLALONGPUT | m / h / d + Barreira |
| Multiply Up / Down | MULTUP, MULTDOWN | Sem duração (Multiplicador + TP/SL) |
| Turbos Long / Short | TURBOSLONG, TURBOSSHORT | t / s / m / h / d + Barreira |

### 🌐 Mercados Disponíveis (Intermercados)
Até **10 mercados simultâneos** selecionáveis:

`1HZ10V` · `1HZ25V` · `1HZ50V` · `1HZ75V` · `1HZ100V` · `R_10` · `R_25` · `R_50` · `R_75` · `R_100`

### 🛡️ Modos Virtual Loss (6 modos)
`Desligado` · `Simples` · `Intermediário` · `Virtual Win` · `Padrão VW/VL` · `Progressivo`

### 📤 Importação / Exportação
- Importe arquivos `.ptbot` existentes para edição
- Exporte o bot gerado em formato `.ptbot` compatível com a plataforma Ponto Bots

### ✅ Validação Completa
O sistema valida **estrutura** e **lógica** do bot antes da exportação:
- Verifica blocos obrigatórios: `runonceatstart`, `purchaseloop`, `readyfortrade`, `tradeagain`
- Valida direções de compra compatíveis com o tipo de contrato
- Verifica conflitos de variáveis e IDs duplicados
- Valida unidades de duração e ranges por tipo de contrato
- Alerta sobre condições incompletas, conflitantes ou com erros

---

## 🤖 Provedores de IA Suportados

O usuário insere sua própria chave de API — nenhuma chave é armazenada em servidor.

| Provedor | Modelos disponíveis |
|---|---|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, o3-mini |
| **Anthropic** | claude-sonnet-4-20250514, claude-3-5-haiku |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro |
| **DeepSeek** | deepseek-chat, deepseek-reasoner |
| **OpenRouter** | nvidia/nemotron-3-super, qwen/qwen3-coder, google/gemma-3-27b-it e outros |

---

## 🗂️ Estrutura do Projeto

```
ptbvl-bot-builder/
├── app.tsx                    # Componente raiz — layout, estado global, orquestração
├── types.ts                   # Tipos TypeScript + mapeamento completo dos 17 contratos
├── styles.css                 # Estilos globais (DaisyUI + Tailwind)
├── index.html                 # Entry point HTML
├── package.json
├── tsconfig.json
│
├── components/
│   ├── Sidebar.tsx            # Sidebar com todos os campos de configuração (dinâmica)
│   ├── Chat.tsx               # Interface de chat com a IA
│   ├── BotPreview.tsx         # Aba de preview: validação, estatísticas e JSON
│   └── ApiKeyModal.tsx        # Modal de configuração da chave de API e provedor
│
└── utils/
    ├── botGenerator.ts        # Gerador de .ptbot — lógica central de geração JSON/Blockly
    ├── botValidator.ts        # Validador de estrutura e lógica dos bots
    ├── llmClient.ts           # Cliente LLM — system prompt + chamada aos provedores
    └── idGenerator.ts         # Gerador de IDs únicos com prefixos PB/PV
```

---

## 🚀 Como Usar

### Pré-requisitos
- Node.js 18+
- Uma chave de API de um dos provedores suportados

### Instalação e execução local
```bash
git clone https://github.com/julioeducajlle/ptbvl-bot-builder
cd ptbvl-bot-builder
npm install
npm run dev
```

### Fluxo básico de uso
1. **Configure sua API Key** — Clique no ícone de configuração e insira sua chave
2. **Preencha a sidebar** — Define stake, martingale, stops, tipo de contrato, mercados e modo VL
3. **Descreva sua estratégia** — No chat, descreva o comportamento desejado do bot
4. **Revise e valide** — Veja a aba "Preview" para validação e visualização do JSON
5. **Exporte** — Baixe o arquivo `.ptbot` e importe na plataforma Ponto Bots

### Editando um bot existente
1. Clique em **"Importar .ptbot"** e selecione o arquivo
2. As configurações são carregadas automaticamente na sidebar
3. Continue o chat para modificar ou expandir o bot

---

## 🔧 Detalhes Técnicos

### Formato `.ptbot`
Os arquivos `.ptbot` são JSON no formato Blockly da plataforma Ponto Bots. A estrutura obrigatória de um bot válido inclui:

```
runonceatstart (inicialização)
└── [blocos de configuração de variáveis]

purchaseloop (loop principal)
├── readyfortrade (aguarda condição de entrada)
│   └── [lógica de entrada]
└── tradeagain (bloco de compra)
    └── [bloco de compra específico (purchase_xxxx)]
```

### Geração de IDs únicos
Todos os IDs de variáveis e blocos são gerados com prefixos `PB` (blocos) e `PV` (variáveis) seguidos de timestamp + random para evitar conflitos ao importar/editar bots existentes.

### Contexto da IA
O system prompt inclui:
- Todo o mapeamento dos 17 tipos de contrato e suas durações
- Blocos Blockly disponíveis na plataforma (~40 blocos customizados)
- Configurações preenchidas na sidebar (injetadas automaticamente)
- Instruções para perguntas esclarecedoras antes de programar
- Restrição de escopo exclusiva a criação/edição de bots

---

## 📚 Sobre a Plataforma Ponto Bots

A plataforma **Ponto Bots** (ptbvl) é um sistema web de trading automatizado para o broker **Deriv**, especializado em **Índices Sintéticos**. 

- Interface em Português Brasileiro
- Modo Avançado com programação visual via **Google Blockly**
- Operação simultânea em até 10 mercados (sistema Intermercados)
- Sistema de **Virtual Loss** para gestão de risco virtual
- 33+ estratégias pré-prontas incluídas
- 100% client-side — conecta diretamente à API da Deriv

---

## ⚠️ Aviso

Este projeto é uma ferramenta auxiliar de criação de bots e não possui afiliação oficial com a Deriv. O uso de bots de trading envolve riscos financeiros. Teste sempre em conta demo antes de operar com dinheiro real.

---

## 📄 Licença

Uso privado — todos os direitos reservados.
