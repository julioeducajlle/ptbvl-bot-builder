#!/usr/bin/env python3
"""
rename_bots.py
--------------
Renomeia arquivos .ptbot com base no contrato que executam,
na previsao (ldp_nya) e no mercado ativo.

Formato resultante:
  {contrato1}_{previsao1}_{contrato2}_{previsao2}_..._[intermercados|MERCADO].ptbot

Exemplos:
  digitover_1_digitunder_8_intermercados.ptbot
  digitmatch_5_R_75.ptbot
  digitdiff_x_1HZ100V.ptbot   (ldp dinamico)
  rise_fall_1HZ100V.ptbot

USO:
  python rename_bots.py              -> modo real (renomeia os arquivos)
  python rename_bots.py --dry-run    -> modo simulacao (nao altera nada)
"""

import os
import json
import sys

# ---------------------------------------------
# CONFIGURACAO
# ---------------------------------------------

# Caminho para a pasta /bots - ajuste se necessario
BOTS_DIR = "./bots"

# Modo simulacao: True = apenas mostra o que seria feito, sem renomear
DRY_RUN = "--dry-run" in sys.argv

# ---------------------------------------------
# MAPEAMENTO DE CONTRATOS
# Chave: (tipo_do_bloco_purchase, valor_de_selcontract_nya)
# Valor: (nome_no_arquivo, usa_ldp_nya)
# ---------------------------------------------

CONTRACT_MAP = {
    # Digit Over / Under
    ("purchase_over_under",               "DIGITOVER"):          ("digitover",     True),
    ("purchase_over_under",               "DIGITUNDER"):         ("digitunder",    True),

    # Digit Match / Differ
    ("purchase_diff_match",               "DIGITMATCH"):         ("digitmatch",    True),
    ("purchase_diff_match",               "DIGITDIFF"):          ("digitdiff",     True),

    # Digit Even / Odd
    ("purchase_even_odd",                 "DIGITEVEN"):          ("digiteven",     False),
    ("purchase_even_odd",                 "DIGITODD"):           ("digitodd",      False),

    # Rise / Fall
    ("purchase_rise_fall",                "CALL"):               ("rise",          False),
    ("purchase_rise_fall",                "PUT"):                ("fall",          False),

    # Higher / Lower
    ("purchase_higher_lower",             "CALL"):               ("higher",        False),
    ("purchase_higher_lower",             "PUT"):                ("lower",         False),

    # Touch / No Touch
    ("purchase_touch_notouch",            "ONETOUCH"):           ("touch",         False),
    ("purchase_touch_notouch",            "NOTOUCH"):            ("notouch",       False),

    # Ends Between / Outside
    ("purchase_endsbetween_endsoutside",  "EXPIRYRANGE"):        ("endsbetween",   False),
    ("purchase_endsbetween_endsoutside",  "EXPIRYMISS"):         ("endsoutside",   False),

    # Stays Between / Goes Outside
    ("purchase_staysbetween_goesoutside", "RANGE"):              ("staysbetween",  False),
    ("purchase_staysbetween_goesoutside", "UPORDOWN"):           ("goesoutside",   False),

    # Asian Up / Down
    ("purchase_asian",                    "ASIANU"):             ("asianup",       False),
    ("purchase_asian",                    "ASIAND"):             ("asiandown",     False),

    # High-Close / Close-Low / High-Low
    ("purchase_high_close_low",           "CLOSEHIGH"):          ("closehigh",     False),
    ("purchase_high_close_low",           "CLOSELOW"):           ("closelow",      False),
    ("purchase_high_close_low",           "HIGHCLOSE"):          ("highclose",     False),
    ("purchase_high_close_low",           "HIGHLOWCLOSE"):       ("highlowclose",  False),

    # High Tick / Low Tick
    ("purchase_hightick_lowtick",         "TICKHIGH"):           ("tickhigh",      True),
    ("purchase_hightick_lowtick",         "TICKLOW"):            ("ticklow",       True),

    # Accumulator
    ("purchase_accumulatorup",            "ACCU"):               ("accumulator",   False),

    # Reset Call / Put
    ("purchase_resetcall_resetput",       "RESETCALL"):          ("resetcall",     False),
    ("purchase_resetcall_resetput",       "RESETPUT"):           ("resetput",      False),

    # Only Ups / Downs
    ("purchase_onlyups_onlydowns",        "RUNHIGH"):            ("onlyups",       False),
    ("purchase_onlyups_onlydowns",        "RUNLOW"):             ("onlydowns",     False),

    # Vanilla Long Call / Put
    ("purchase_vanilla",                  "VANILLALONGCALL"):    ("vanillacall",   False),
    ("purchase_vanilla",                  "VANILLALONGPUT"):     ("vanillaput",    False),

    # Multiply Up / Down
    ("purchase_multiplier",               "MULTUP"):             ("multiplyup",    False),
    ("purchase_multiplier",               "MULTDOWN"):           ("multiplydown",  False),

    # Turbos Long / Short
    ("purchase_turbos",                   "TURBOSLONG"):         ("turboslong",    False),
    ("purchase_turbos",                   "TURBOSSHORT"):        ("turbosshort",   False),
}


# ---------------------------------------------
# TRAVERSAL DO JSON BLOCKLY
# ---------------------------------------------

def collect_blocks(block, result):
    if not block or not isinstance(block, dict):
        return
    result.append(block)
    for input_val in block.get("inputs", {}).values():
        if isinstance(input_val, dict):
            collect_blocks(input_val.get("block"),  result)
            collect_blocks(input_val.get("shadow"), result)
    if "next" in block:
        collect_blocks(block["next"].get("block"), result)


def get_all_blocks(bot_data):
    all_blocks = []
    for top_block in bot_data.get("blocks", {}).get("blocks", []):
        collect_blocks(top_block, all_blocks)
    return all_blocks


# ---------------------------------------------
# EXTRACAO DE INFORMACOES
# ---------------------------------------------

def extract_info(all_blocks):
    purchase_blocks = []
    has_intermercados = False
    market = None

    for block in all_blocks:
        btype  = block.get("type", "")
        fields = block.get("fields", {})

        if btype.startswith("purchase_"):
            purchase_blocks.append(block)

        if btype == "setactive_continuousindices":
            has_intermercados = True

        if btype == "setmarket" and market is None:
            market_nya = fields.get("market_nya", "")
            if market_nya:
                market = market_nya.split("|")[0].strip()

    return purchase_blocks, has_intermercados, market


def get_input_number(block, input_name):
    input_slot = block.get("inputs", {}).get(input_name, {})
    inner = input_slot.get("block") or input_slot.get("shadow")
    if not inner:
        return ""
    if inner.get("type") != "math_number":
        return ""
    num = inner.get("fields", {}).get("NUM", "")
    return str(num).strip() if num != "" else ""


def build_contract_parts(purchase_blocks):
    parts = []
    seen  = set()

    for block in purchase_blocks:
        btype       = block.get("type", "")
        fields      = block.get("fields", {})
        selcontract = fields.get("selcontract_nya", "").strip()
        ldp = get_input_number(block, "ldp_nya")

        key = (btype, selcontract)
        if key in seen:
            continue
        seen.add(key)

        if key in CONTRACT_MAP:
            name, uses_ldp = CONTRACT_MAP[key]
            if uses_ldp:
                digit = ldp if ldp != "" else "x"
                parts.append(f"{name}_{digit}")
            else:
                parts.append(name)
        else:
            if selcontract:
                parts.append(selcontract.lower())
            elif btype.startswith("purchase_"):
                parts.append(btype.replace("purchase_", ""))

    return parts


# ---------------------------------------------
# GERACAO DO NOVO NOME
# ---------------------------------------------

def generate_new_name(bot_data):
    all_blocks = get_all_blocks(bot_data)
    purchase_blocks, has_intermercados, market = extract_info(all_blocks)

    if not purchase_blocks:
        return None

    contract_parts = build_contract_parts(purchase_blocks)

    if not contract_parts:
        return None

    parts = contract_parts.copy()

    if has_intermercados:
        parts.append("intermercados")
    elif market:
        parts.append(market)

    return "_".join(parts) + ".ptbot"


# ---------------------------------------------
# TRATAMENTO DE CONFLITOS DE NOME
# ---------------------------------------------

def resolve_conflict(new_filepath, bots_dir, new_name):
    if not os.path.exists(new_filepath):
        return new_filepath, new_name

    base = new_name[:-6]
    counter = 2
    while True:
        candidate_name = f"{base}_{counter}.ptbot"
        candidate_path = os.path.join(bots_dir, candidate_name)
        if not os.path.exists(candidate_path):
            return candidate_path, candidate_name
        counter += 1


# ---------------------------------------------
# MAIN
# ---------------------------------------------

def main():
    if not os.path.isdir(BOTS_DIR):
        print(f"Diretorio nao encontrado: {BOTS_DIR}")
        print("   Ajuste a variavel BOTS_DIR no inicio do script.")
        sys.exit(1)

    if DRY_RUN:
        print("MODO SIMULACAO (--dry-run) - nenhum arquivo sera renomeado\n")
    else:
        print("MODO REAL - arquivos serao renomeados\n")

    files   = sorted(f for f in os.listdir(BOTS_DIR) if f.endswith(".ptbot"))
    total   = len(files)
    renamed = 0
    skipped = 0
    errors  = 0
    unknown = 0

    print(f"{total} arquivos .ptbot encontrados em '{BOTS_DIR}'\n")
    print("-" * 70)

    for filename in files:
        filepath = os.path.join(BOTS_DIR, filename)

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                bot_data = json.load(f)
        except Exception as e:
            print(f"ERRO ao ler: {filename}\n   {e}")
            errors += 1
            continue

        new_name = generate_new_name(bot_data)

        if new_name is None:
            print(f"SEM CONTRATO: {filename}")
            unknown += 1
            continue

        if new_name == filename:
            skipped += 1
            continue

        new_filepath, new_name = resolve_conflict(
            os.path.join(BOTS_DIR, new_name), BOTS_DIR, new_name
        )

        print(f"{filename}")
        print(f"   -> {new_name}")

        if not DRY_RUN:
            os.rename(filepath, new_filepath)

        renamed += 1

    print("-" * 70)
    print(f"\nResumo:")
    print(f"   Renomeados : {renamed}")
    print(f"   Sem mudanca: {skipped}")
    print(f"   Sem contrato: {unknown}")
    print(f"   Erros      : {errors}")
    print(f"   Total      : {total}")

    if DRY_RUN:
        print("\nExecute sem --dry-run para aplicar as renomeacoes.")


if __name__ == "__main__":
    main()