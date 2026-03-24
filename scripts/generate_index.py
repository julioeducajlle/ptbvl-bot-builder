#!/usr/bin/env python3
"""
Ponto Bots AI Builder — Bot Library Index Generator (v2)
Lê todos os .ptbot da pasta /bots/ e gera bots-index.json com metadados para busca.
"""
import os, json, re, sys
from pathlib import Path
from collections import OrderedDict

ROOT = Path(__file__).parent.parent
BOTS_DIR = ROOT / "bots"
OUTPUT = ROOT / "bots-index.json"

# ---------------------------------------------------------------------------
# MERCADOS — usados para remover do nome amigável
# ---------------------------------------------------------------------------
MARKET_IDS = [
    "1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V",
    "R_10", "R_25", "R_50", "R_75", "R_100",
]

# Tokens do filename que correspondem a mercados.
# Estratégia: um mercado como "R_10" vira dois tokens ["r", "10"] após split("_").
# Precisamos detectar e pular ambos. Fazemos isso com look-ahead no loop de friendly_name.
# Conjunto de pares (token_anterior, token_atual) que formam um mercado:
MARKET_PAIRS = set()
MARKET_SINGLE = set()
for m in MARKET_IDS:
    parts = m.lower().split("_")
    if len(parts) == 2:
        MARKET_PAIRS.add((parts[0], parts[1]))
    else:
        MARKET_SINGLE.add(m.lower())

# ---------------------------------------------------------------------------
# MAPEAMENTO DE CONTRATOS
# ---------------------------------------------------------------------------
CONTRACT_TYPE_MAP = {
    "purchase_diff_match":                    "diff_match",
    "purchase_over_under":                    "over_under",
    "purchase_even_odd":                      "even_odd",
    "purchase_rise_fall":                     "rise_fall",
    "purchase_higher_lower":                  "higher_lower",
    "purchase_touch_notouch":                 "touch_notouch",
    "purchase_endsbetween_endsoutside":       "endsbetween_endsoutside",
    "purchase_staysbetween_goesoutside":      "staysbetween_goesoutside",
    "purchase_asianup_asiandown":             "asianup_asiandown",
    "purchase_asian":                         "asianup_asiandown",
    "purchase_highclose_closelow_highlow":    "highclose_closelow_highlow",
    "purchase_high_close_low":               "highclose_closelow_highlow",
    "purchase_hightick_lowtick":              "hightick_lowtick",
    "purchase_accumulatorup":                 "accumulatorup",
    "purchase_resetcall_resetput":            "resetcall_resetput",
    "purchase_onlyups_onlydowns":             "onlyups_onlydowns",
    "purchase_vanillalongcall_vanillalongput":"vanillalongcall_vanillalongput",
    "purchase_vanilla":                       "vanillalongcall_vanillalongput",
    "purchase_multiplyup_multiplydown":       "multiplyup_multiplydown",
    "purchase_multiplier":                    "multiplyup_multiplydown",
    "purchase_turboslong_turbosshort":        "turboslong_turbosshort",
    "purchase_turbos":                        "turboslong_turbosshort",
}

CONTRACT_LABELS = {
    "diff_match":                       "Digit Differ/Match",
    "over_under":                       "Digit Over/Under",
    "even_odd":                         "Digit Even/Odd",
    "rise_fall":                        "Rise/Fall",
    "higher_lower":                     "Higher/Lower",
    "touch_notouch":                    "Touch/No Touch",
    "endsbetween_endsoutside":          "Ends Between/Ends Outside",
    "staysbetween_goesoutside":         "Stays Between/Goes Outside",
    "asianup_asiandown":                "Asian Up/Down",
    "highclose_closelow_highlow":       "High-Close/Close-Low/High-Low",
    "hightick_lowtick":                 "High Tick/Low Tick",
    "accumulatorup":                    "Accumulator",
    "resetcall_resetput":               "Reset Call/Put",
    "onlyups_onlydowns":                "Only Ups/Downs",
    "vanillalongcall_vanillalongput":   "Vanilla Long Call/Put",
    "multiplyup_multiplydown":          "Multiply Up/Down",
    "turboslong_turbosshort":           "Turbos Long/Short",
}

# Descrição legível por selcontract_nya
SELCONTRACT_LABELS = {
    "DIGITDIFF":        "DIFF",
    "DIGITMATCH":       "MATCH",
    "DIGITOVER":        "OVER",
    "DIGITUNDER":       "UNDER",
    "DIGITEVEN":        "EVEN",
    "DIGITODD":         "ODD",
    "CALL":             "RISE",
    "PUT":              "FALL",
    "CALLE":            "RISE or Equals",
    "PUTE":             "FALL or Equals",
    "ONETOUCH":         "TOUCH",
    "NOTOUCH":          "NO TOUCH",
    "EXPIRYRANGE":      "ENDS BETWEEN",
    "EXPIRYMISS":       "ENDS OUTSIDE",
    "RANGE":            "STAYS BETWEEN",
    "UPORDOWN":         "GOES OUTSIDE",
    "ASIANU":           "ASIAN UP",
    "ASIAND":           "ASIAN DOWN",
    "CLOSEHIGH":        "CLOSE-HIGH",
    "CLOSELOW":         "CLOSE-LOW",
    "HIGHCLOSE":        "HIGH-CLOSE",
    "HIGHLOWCLOSE":     "HIGH-LOW-CLOSE",
    "TICKHIGH":         "HIGH TICK",
    "TICKLOW":          "LOW TICK",
    "ACCU":             "ACCUMULATOR",
    "RESETCALL":        "RESET CALL",
    "RESETPUT":         "RESET PUT",
    "RUNHIGH":          "ONLY UPS",
    "RUNLOW":           "ONLY DOWNS",
    "VANILLALONGCALL":  "VANILLA CALL",
    "VANILLALONGPUT":   "VANILLA PUT",
    "MULTUP":           "MULTIPLY UP",
    "MULTDOWN":         "MULTIPLY DOWN",
    "TURBOSLONG":       "TURBOS LONG",
    "TURBOSSHORT":      "TURBOS SHORT",
}

# Para purchase_higher_lower, CALL/PUT significam HIGHER/LOWER
SELCONTRACT_LABELS_HIGHER_LOWER = {
    "CALL": "HIGHER",
    "PUT":  "LOWER",
}

# Normalização de tokens de contrato compostos encontrados nos filenames
# Ex: "digitdiff" → "Digit Diff", "digitover" → "Digit Over", etc.
TOKEN_NORMALIZE = {
    "digitdiff":      "Digit Diff",
    "digitmatch":     "Digit Match",
    "digitover":      "Digit Over",
    "digitunder":     "Digit Under",
    "digiteven":      "Digit Even",
    "digitodd":       "Digit Odd",
    "endsbetween":    "Ends Between",
    "endsoutside":    "Ends Outside",
    "staysbetween":   "Stays Between",
    "goesoutside":    "Goes Outside",
    "asianup":        "Asian Up",
    "asiandown":      "Asian Down",
    "tickhigh":       "Tick High",
    "ticklow":        "Tick Low",
    "resetcall":      "Reset Call",
    "resetput":       "Reset Put",
    "onlyups":        "Only Ups",
    "onlydowns":      "Only Downs",
    "multiplyup":     "Multiply Up",
    "multiplydown":   "Multiply Down",
    "turboslong":     "Turbos Long",
    "turbosshort":    "Turbos Short",
    "vanillacall":    "Vanilla Call",
    "vanillaput":     "Vanilla Put",
    "accumulator":    "Accumulator",
    "intermercados":  "Intermercados",
    "higher":         "Higher",
    "lower":          "Lower",
    "rise":           "Rise",
    "fall":           "Fall",
    "calle":          "Calle",
    "pute":           "Pute",
    "touch":          "Touch",
    "notouch":        "No Touch",
}
CONTRACTS_WITH_DIGIT = {
    "DIGITDIFF", "DIGITMATCH", "DIGITOVER", "DIGITUNDER",
    "TICKHIGH", "TICKLOW",
}

# Unidades de duração
DURATION_UNIT_LABELS = {
    "t": "tick",
    "s": "segundo",
    "m": "minuto",
    "h": "hora",
    "d": "dia",
}

STRATEGY_KEYWORDS = {
    "martingale":   ["martingale", "multiplicador", "dobrar", "dobrando", "multiplica", "dobra"],
    "pattern":      ["padrão", "gatilho", "sequência", "sequencia", "pattern"],
    "soros":        ["soros", "soros system", "mão de soros"],
    "tick":         ["tick", "ticks", "tique", "tique taque"],
    "digit":        ["digit", "dígito", "numero", "número"],
    "last_digit":   ["last digit", "último dígito", "ultimo numero", "último número"],
    "trend":        ["tendência", "tendencia", "trend", "sobe", "desce", "rise", "fall"],
    "over_under":   ["acima", "abaixo", "over", "under"],
    "even_odd":     ["par", "ímpar", "impar", "even", "odd"],
    "multi_market": ["multi", "mercado", "mercados", "multimarket", "intermercados",
                     "inter mercados", "multi mercados"],
    "virtual_loss": ["virtual", "vl", "perda virtual", "virtual loss", "loss virtual"],
}


# ---------------------------------------------------------------------------
# TRAVERSAL
# ---------------------------------------------------------------------------

def collect_blocks(block, result):
    """Percorre recursivamente a árvore Blockly acumulando todos os blocos."""
    if not block or not isinstance(block, dict):
        return
    result.append(block)
    for input_val in block.get("inputs", {}).values():
        if isinstance(input_val, dict):
            collect_blocks(input_val.get("block"),  result)
            collect_blocks(input_val.get("shadow"), result)
    if "next" in block:
        collect_blocks(block["next"].get("block"), result)


def get_all_blocks(data):
    all_blocks = []
    for top in data.get("blocks", {}).get("blocks", []):
        collect_blocks(top, all_blocks)
    return all_blocks


# ---------------------------------------------------------------------------
# LEITURA DE INPUTS
# ---------------------------------------------------------------------------

def read_input_number(block, input_name):
    """
    Lê o valor numérico de um input_value do tipo math_number.
    Prefere o bloco conectado ao shadow (default).
    Retorna (valor_int_ou_float, "static") ou (None, "dynamic").
    """
    slot = block.get("inputs", {}).get(input_name, {})
    inner = slot.get("block") or slot.get("shadow")
    if not inner:
        return None, "missing"
    if inner.get("type") == "math_number":
        num = inner.get("fields", {}).get("NUM", None)
        if num is not None:
            return num, "static"
    return None, "dynamic"


def read_field(block, field_name):
    return block.get("fields", {}).get(field_name, "")


# ---------------------------------------------------------------------------
# NOME AMIGÁVEL
# ---------------------------------------------------------------------------

def friendly_name(stem: str) -> str:
    """
    Converte o stem do filename em nome legível:
    - Separa por "_"
    - Remove tokens que formam IDs de mercado (ex: "R" + "10", "1HZ100V")
    - Capitaliza cada palavra
    - Não adiciona o nome do mercado ao final (apenas "Intermercados" se presente)
    """
    tokens = stem.lower().split("_")
    kept = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        # Detecta par de mercado (ex: "r" + "10" → R_10)
        if i + 1 < len(tokens):
            pair = (tok, tokens[i + 1])
            if pair in MARKET_PAIRS:
                i += 2
                continue
        # Detecta mercado de token único (ex: "1hz100v")
        if tok in MARKET_SINGLE:
            i += 1
            continue
        kept.append(tok)
        i += 1

    # Aplica normalização de tokens compostos e capitaliza o restante
    result = []
    for w in kept:
        if w in TOKEN_NORMALIZE:
            result.append(TOKEN_NORMALIZE[w])
        else:
            result.append(w.capitalize())
    return " ".join(result)


# ---------------------------------------------------------------------------
# EXTRAÇÃO DE CONTRATOS PARA DESCRIÇÃO
# ---------------------------------------------------------------------------

def extract_purchase_info(all_blocks):
    """
    Retorna lista de dicts com informações de cada bloco purchase único.
    Deduplicação por (selcontract_nya, ldp_value) — ignora mercado e conta.

    Retorna também has_intermercados, first_market e duration_info.
    """
    seen_contracts = OrderedDict()  # chave: (selcontract, ldp_repr) → info
    has_intermercados = False
    first_market = None
    duration_info = None  # (value_or_None, unit_or_None, is_dynamic)

    for block in all_blocks:
        btype = block.get("type", "")
        fields = block.get("fields", {})

        if btype == "setactive_continuousindices":
            has_intermercados = True

        if btype == "setmarket" and first_market is None:
            raw = fields.get("market_nya", "")
            if raw:
                first_market = raw.split("|")[0].strip()

        if not btype.startswith("purchase_"):
            continue

        selcontract = fields.get("selcontract_nya", "").strip()
        if not selcontract:
            continue

        # Duração — captura da primeira ocorrência com dado real
        if duration_info is None:
            dur_val, dur_type = read_input_number(block, "inpduration_nya")
            # seldurationunit_nya pode estar no fields do próprio bloco purchase
            unit = fields.get("seldurationunit_nya", "")
            if dur_type == "static" or dur_type == "dynamic":
                duration_info = (dur_val, unit if unit else None, dur_type == "dynamic")

        # ldp_nya
        ldp_val, ldp_type = read_input_number(block, "ldp_nya")
        uses_digit = selcontract in CONTRACTS_WITH_DIGIT

        if uses_digit:
            if ldp_type == "static":
                ldp_repr = str(int(ldp_val)) if ldp_val == int(ldp_val) else str(ldp_val)
            else:
                ldp_repr = "x"  # dinâmico
        else:
            ldp_repr = None

        # Usa label contextual: CALL/PUT em higher_lower → HIGHER/LOWER
        if btype == "purchase_higher_lower":
            display_label = SELCONTRACT_LABELS_HIGHER_LOWER.get(selcontract,
                                SELCONTRACT_LABELS.get(selcontract, selcontract))
        else:
            display_label = SELCONTRACT_LABELS.get(selcontract, selcontract)

        key = (selcontract, ldp_repr, btype)
        if key not in seen_contracts:
            seen_contracts[key] = {
                "selcontract":   selcontract,
                "ldp_repr":      ldp_repr,
                "uses_digit":    uses_digit,
                "display_label": display_label,
            }

    return list(seen_contracts.values()), has_intermercados, first_market, duration_info


# ---------------------------------------------------------------------------
# CONSTRUÇÃO DA DESCRIÇÃO
# ---------------------------------------------------------------------------

def build_description(contracts, has_intermercados, first_market, duration_info):
    """
    Gera a descrição legível do bot com base nos contratos extraídos.
    Ex: "Este bot opera em DIFF 0 e UNDER 8, 7 ou 6 em 1 tick no R_10"
    """
    if not contracts:
        return ""

    # Agrupa contratos pelo tipo de selcontract (para listar múltiplos dígitos juntos)
    # Ex: DIGITUNDER com ldp 8, 7, 6 → "UNDER 8, 7 ou 6"
    contract_groups = OrderedDict()
    for c in contracts:
        # Agrupa por (display_label base sem dígito) para consolidar múltiplos dígitos
        label_key = c["display_label"]
        contract_groups.setdefault(label_key, []).append(c["ldp_repr"])

    parts = []
    for label, ldp_list in contract_groups.items():
        if ldp_list[0] is not None:  # usa dígito
            # Remove duplicatas mantendo ordem
            unique_ldps = list(OrderedDict.fromkeys(ldp_list))
            if len(unique_ldps) == 1:
                parts.append(f"{label} {unique_ldps[0]}")
            elif len(unique_ldps) == 2:
                parts.append(f"{label} {unique_ldps[0]} ou {unique_ldps[1]}")
            else:
                joined = ", ".join(unique_ldps[:-1]) + f" ou {unique_ldps[-1]}"
                parts.append(f"{label} {joined}")
        else:
            parts.append(label)

    # Une as partes de contrato
    if len(parts) == 1:
        contracts_str = parts[0]
    elif len(parts) == 2:
        contracts_str = f"{parts[0]} e {parts[1]}"
    else:
        contracts_str = ", ".join(parts[:-1]) + f" e {parts[-1]}"

    desc = f"Opera em {contracts_str}"

    # Duração
    if duration_info:
        dur_val, unit, is_dynamic = duration_info
        if is_dynamic:
            desc += " com duração variável"
        else:
            unit_label = DURATION_UNIT_LABELS.get(unit, unit) if unit else "tick"
            if dur_val is not None:
                val = int(dur_val) if isinstance(dur_val, float) and dur_val == int(dur_val) else dur_val
                # Plural simples
                plural = "s" if val != 1 else ""
                desc += f" em {val} {unit_label}{plural}"
            else:
                plural = "s"
                desc += f" em {unit_label}{plural}"

    # Mercado / intermercados
    if has_intermercados:
        desc += " em Intermercados"
    elif first_market:
        desc += f" no {first_market}"

    return desc + "."


# ---------------------------------------------------------------------------
# EXTRAÇÃO DE MERCADOS
# ---------------------------------------------------------------------------

def extract_markets(all_blocks):
    """Coleta mercados únicos encontrados em blocos setmarket."""
    seen = []
    market_ids = [
        "1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V",
        "R_10", "R_25", "R_50", "R_75", "R_100",
    ]
    found = set()
    for block in all_blocks:
        if block.get("type") == "setmarket":
            raw = block.get("fields", {}).get("market_nya", "")
            mid = raw.split("|")[0].strip()
            if mid in market_ids and mid not in found:
                found.add(mid)
                seen.append(mid)
    return seen


# ---------------------------------------------------------------------------
# ANÁLISE PRINCIPAL
# ---------------------------------------------------------------------------

def analyze_bot(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  SKIP {filepath.name}: {e}")
        return None

    all_blocks = get_all_blocks(data)
    all_block_types = {b.get("type", "") for b in all_blocks}

    # Contratos
    contract_types = []
    for block_type, contract_key in CONTRACT_TYPE_MAP.items():
        if block_type in all_block_types and contract_key not in contract_types:
            contract_types.append(contract_key)

    # Mercados
    markets = extract_markets(all_blocks)

    # Info para descrição
    contracts, has_intermercados, first_market, duration_info = extract_purchase_info(all_blocks)

    # Nome amigável
    stem = filepath.stem
    name = friendly_name(stem)

    # Descrição
    description = build_description(contracts, has_intermercados, first_market, duration_info)
    if not description:
        description = name  # fallback

    # Keywords — baseadas em variáveis e nome do arquivo (sem textos internos do bot)
    variables = [v.get("name", "") for v in data.get("variables", []) if v.get("name")]
    search_text = (name + " " + " ".join(variables)).lower()
    keywords = []
    for k, terms in STRATEGY_KEYWORDS.items():
        for term in terms:
            if term in search_text:
                keywords.append(k)
                break

    for ct in contract_types:
        label = CONTRACT_LABELS.get(ct, ct)
        keywords.extend(label.lower().split())

    fname_words = re.split(r"[-_\s]+", stem.lower())
    keywords.extend([w for w in fname_words if len(w) > 2])
    keywords = list(dict.fromkeys(keywords))[:20]

    has_vl = "setvirtuallose" in all_block_types
    has_multimarket = "setactive_continuousindices" in all_block_types

    return {
        "filename":       filepath.name,
        "name":           name,          # será ajustado para duplicatas no main()
        "description":    description,
        "contractTypes":  contract_types,
        "markets":        markets,
        "keywords":       keywords,
        "hasVirtualLoss": has_vl,
        "hasMultiMarket": has_multimarket,
        "blockCount":     len(all_block_types),
        "variableCount":  len(variables),
    }


# ---------------------------------------------------------------------------
# DESDUPLICAÇÃO DE NOMES
# ---------------------------------------------------------------------------

def deduplicate_names(index):
    """
    Se dois ou mais bots gerarem o mesmo nome amigável,
    adiciona sufixo " 2", " 3", etc. a partir do segundo.
    """
    name_count = {}
    for entry in index:
        name_count[entry["name"]] = name_count.get(entry["name"], 0) + 1

    # Segunda passagem: renomeia duplicatas
    name_seen = {}
    for entry in index:
        n = entry["name"]
        if name_count[n] > 1:
            name_seen[n] = name_seen.get(n, 0) + 1
            if name_seen[n] > 1:
                entry["name"] = f"{n} {name_seen[n]}"
    return index


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    if not BOTS_DIR.exists():
        print(f"Pasta /bots/ não encontrada em {BOTS_DIR}")
        sys.exit(1)

    ptbot_files = list(BOTS_DIR.rglob("*.ptbot"))
    print(f"Encontrados {len(ptbot_files)} arquivos .ptbot")

    index = []
    for i, filepath in enumerate(sorted(ptbot_files)):
        if i % 50 == 0:
            print(f"  Processando {i}/{len(ptbot_files)}...")
        meta = analyze_bot(filepath)
        if meta:
            index.append(meta)

    # Ordena por nome antes de deduplicar
    index.sort(key=lambda x: x["name"].lower())

    # Resolve nomes duplicados
    index = deduplicate_names(index)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Índice gerado: {OUTPUT}")
    print(f"   {len(index)} bots indexados")

    contract_counts = {}
    for bot in index:
        for ct in bot["contractTypes"]:
            contract_counts[ct] = contract_counts.get(ct, 0) + 1
    print("\nDistribuição por tipo de contrato:")
    for ct, count in sorted(contract_counts.items(), key=lambda x: -x[1]):
        print(f"  {CONTRACT_LABELS.get(ct, ct)}: {count}")


if __name__ == "__main__":
    main()
