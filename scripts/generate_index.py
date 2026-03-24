#!/usr/bin/env python3
"""
Ponto Bots AI Builder — Bot Library Index Generator
Lê todos os .ptbot da pasta /bots/ e gera bots-index.json com metadados para busca.
"""
import os, json, re, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
BOTS_DIR = ROOT / "bots"
OUTPUT = ROOT / "bots-index.json"

CONTRACT_TYPE_MAP = {
    "purchase_diff_match": "diff_match",
    "purchase_over_under": "over_under",
    "purchase_even_odd": "even_odd",
    "purchase_rise_fall": "rise_fall",
    "purchase_higher_lower": "higher_lower",
    "purchase_touch_notouch": "touch_notouch",
    "purchase_endsbetween_endsoutside": "endsbetween_endsoutside",
    "purchase_staysbetween_goesoutside": "staysbetween_goesoutside",
    "purchase_asianup_asiandown": "asianup_asiandown",
    "purchase_highclose_closelow_highlow": "highclose_closelow_highlow",
    "purchase_hightick_lowtick": "hightick_lowtick",
    "purchase_accumulatorup": "accumulatorup",
    "purchase_resetcall_resetput": "resetcall_resetput",
    "purchase_onlyups_onlydowns": "onlyups_onlydowns",
    "purchase_vanillalongcall_vanillalongput": "vanillalongcall_vanillalongput",
    "purchase_multiplyup_multiplydown": "multiplyup_multiplydown",
    "purchase_turboslong_turbosshort": "turboslong_turbosshort",
}

CONTRACT_LABELS = {
    "diff_match": "Digit Differ/Match",
    "over_under": "Digit Over/Under",
    "even_odd": "Digit Even/Odd",
    "rise_fall": "Rise/Fall",
    "higher_lower": "Higher/Lower",
    "touch_notouch": "Touch/No Touch",
    "endsbetween_endsoutside": "Ends Between/Ends Outside",
    "staysbetween_goesoutside": "Stays Between/Goes Outside",
    "asianup_asiandown": "Asian Up/Down",
    "highclose_closelow_highlow": "High-Close/Close-Low/High-Low",
    "hightick_lowtick": "High Tick/Low Tick",
    "accumulatorup": "Accumulator",
    "resetcall_resetput": "Reset Call/Put",
    "onlyups_onlydowns": "Only Ups/Downs",
    "vanillalongcall_vanillalongput": "Vanilla Long Call/Put",
    "multiplyup_multiplydown": "Multiply Up/Down",
    "turboslong_turbosshort": "Turbos Long/Short",
}

STRATEGY_KEYWORDS = {
    "martingale": ["martingale", "multiplicador", "dobrar", "dobrando", "multiplica", "dobra"],
    "pattern": ["padrão", "gatilho", "sequência", "sequencia", "pattern"],
    "soros": ["soros", "soros system", "mão de soros"],
    "tick": ["tick", "ticks", "tique", "tique taque"],
    "digit": ["digit", "dígito", "numero", "número"],
    "last_digit": ["last digit", "último dígito", "ultimo numero", "último número"],
    "trend": ["tendência", "tendencia", "trend", "sobe", "desce", "rise", "fall"],
    "over_under": ["acima", "abaixo", "over", "under"],
    "even_odd": ["par", "ímpar", "impar", "even", "odd"],
    "multi_market": ["multi", "mercado", "mercados", "multimarket", "intermercados", "inter mercados", "multi mercados"],
    "virtual_loss": ["virtual", "vl", "perda virtual", "virtual loss", "loss virtual"],
}

def extract_text_from_blocks(blocks_data):
    """Recursively extract text/print content from blocks."""
    texts = []
    if isinstance(blocks_data, dict):
        if blocks_data.get("type") == "text_print":
            inp = blocks_data.get("inputs", {}).get("TEXT", {})
            shadow = inp.get("shadow", {})
            if shadow.get("type") == "text":
                texts.append(shadow.get("fields", {}).get("TEXT", ""))
        for v in blocks_data.values():
            texts.extend(extract_text_from_blocks(v))
    elif isinstance(blocks_data, list):
        for item in blocks_data:
            texts.extend(extract_text_from_blocks(item))
    return texts

def extract_block_types(blocks_data, found=None):
    """Recursively collect all block types."""
    if found is None:
        found = set()
    if isinstance(blocks_data, dict):
        if "type" in blocks_data:
            found.add(blocks_data["type"])
        for v in blocks_data.values():
            extract_block_types(v, found)
    elif isinstance(blocks_data, list):
        for item in blocks_data:
            extract_block_types(item, found)
    return found

def extract_variables(data):
    """Extract variable names from variables array."""
    if isinstance(data, dict):
        variables = data.get("variables", [])
        return [v.get("name", "") for v in variables if v.get("name")]
    return []

def analyze_bot(filepath):
    """Analyze a single .ptbot file and return metadata."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  SKIP {filepath.name}: {e}")
        return None

    blocks_root = data.get("blocks", data)
    all_block_types = extract_block_types(blocks_root)
    all_texts = extract_text_from_blocks(blocks_root)
    variables = extract_variables(data)

    # Detect contract types
    contract_types = []
    for block_type, contract_key in CONTRACT_TYPE_MAP.items():
        if block_type in all_block_types:
            if contract_key not in contract_types:
                contract_types.append(contract_key)

    # Detect markets
    markets = []
    market_ids = ["1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V", "R_10", "R_25", "R_50", "R_75", "R_100"]
    content_str = json.dumps(data).lower()
    for m in market_ids:
        if m.lower() in content_str:
            markets.append(m)

    # Infer name from first text_print or filename
    name = filepath.stem
    for t in all_texts:
        if t and len(t) > 3:
            # Clean up - take first line only
            name = t.split("\n")[0].strip()[:80]
            break

    # Build description from texts
    description = " | ".join([t for t in all_texts[:3] if t and len(t) > 5])[:200]

    # Build keywords
    search_text = (name + " " + description + " " + " ".join(variables)).lower()
    keywords = []
    for k, terms in STRATEGY_KEYWORDS.items():
        for term in terms:
            if term in search_text:
                keywords.append(k)
                break

    # Add contract type names as keywords
    for ct in contract_types:
        label = CONTRACT_LABELS.get(ct, ct)
        keywords.extend(label.lower().split())

    # Add filename words as keywords
    fname_words = re.split(r"[-_\s]+", filepath.stem.lower())
    keywords.extend([w for w in fname_words if len(w) > 2])

    # Deduplicate keywords
    keywords = list(dict.fromkeys(keywords))[:20]

    has_vl = any(t in all_block_types for t in ["setvirtuallose"])
    has_multimarket = "setactive_continuousindices" in all_block_types

    return {
        "filename": filepath.name,
        "name": name,
        "description": description or filepath.stem,
        "contractTypes": contract_types,
        "markets": markets,
        "keywords": keywords,
        "hasVirtualLoss": has_vl,
        "hasMultiMarket": has_multimarket,
        "blockCount": len(all_block_types),
        "variableCount": len(variables),
    }

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

    # Sort by name
    index.sort(key=lambda x: x["name"].lower())

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Índice gerado: {OUTPUT}")
    print(f"   {len(index)} bots indexados")

    # Print summary stats
    contract_counts = {}
    for bot in index:
        for ct in bot["contractTypes"]:
            contract_counts[ct] = contract_counts.get(ct, 0) + 1
    print("\nDistribuição por tipo de contrato:")
    for ct, count in sorted(contract_counts.items(), key=lambda x: -x[1]):
        print(f"  {CONTRACT_LABELS.get(ct, ct)}: {count}")

if __name__ == "__main__":
    main()
