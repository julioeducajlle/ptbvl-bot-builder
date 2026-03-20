# 📁 Biblioteca de Bots — Ponto Bots AI Builder

Adicione seus arquivos `.ptbot` nesta pasta para criar a base de conhecimento do AI Builder.

## Como funciona

1. Coloque seus arquivos `.ptbot` aqui (qualquer subpasta também funciona)
2. Me avise e eu executo a análise para gerar o índice de busca
3. O app usa o índice para sugerir bots existentes antes de criar novos

## Estrutura após análise

```
bots/
├── README.md              ← este arquivo
├── meu-bot.ptbot          ← seus bots aqui
├── outro-bot.ptbot
└── ...
bots-index.json            ← gerado automaticamente pela análise
```

## Sistema de Triagem

Quando um usuário descreve uma estratégia no chat, o app:
1. Compara com todos os bots do índice por similaridade de palavras-chave
2. Se encontrar match ≥ 60%, exibe sugestões com opções:
   - **Usar este bot** → carrega direto no Preview
   - **Usar como base** → usa como template e chama a IA para adaptar
   - **Criar novo** → ignora sugestões e gera do zero

## Script de análise

Execute após adicionar novos bots:
```bash
python3 scripts/generate_index.py
```
