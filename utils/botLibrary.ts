// ===== Ponto Bots — Bot Library (Triagem) =====

export interface BotMetadata {
  filename: string;
  name: string;
  description: string;
  contractTypes: string[];
  markets: string[];
  keywords: string[];
  hasVirtualLoss: boolean;
  hasMultiMarket: boolean;
  blockCount: number;
  variableCount: number;
}

export interface BotMatch extends BotMetadata {
  score: number;
  matchedTerms: string[];
}

let cachedLibrary: BotMetadata[] | null = null;

/**
 * Load the bot library index from bots-index.json (static asset).
 * Returns empty array if not available.
 */
export async function loadBotLibrary(): Promise<BotMetadata[]> {
  if (cachedLibrary !== null) return cachedLibrary;
  try {
    const res = await fetch('/bots-index.json');
    if (!res.ok) { cachedLibrary = []; return []; }
    cachedLibrary = await res.json();
    return cachedLibrary!;
  } catch {
    cachedLibrary = [];
    return [];
  }
}

/**
 * Search the bot library for bots matching the user query.
 * Uses keyword overlap scoring.
 * Returns top N matches with score >= minScore.
 */
export function searchBots(
  query: string,
  library: BotMetadata[],
  limit = 3,
  minScore = 1
): BotMatch[] {
  const q = query.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents

  // Extract meaningful terms (length >= 3)
  const terms = q.split(/\s+/).filter(t => t.length >= 3);
  if (terms.length === 0) return [];

  const results: BotMatch[] = [];

  for (const bot of library) {
    const searchText = [
      bot.name,
      bot.description,
      ...bot.keywords,
      ...bot.contractTypes,
      ...bot.markets,
    ].join(' ').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const matchedTerms: string[] = [];
    let score = 0;

    for (const term of terms) {
      if (searchText.includes(term)) {
        matchedTerms.push(term);
        score += 1;
        // Bonus: term in name is worth more
        const nameNorm = bot.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (nameNorm.includes(term)) score += 0.5;
      }
    }

    if (score >= minScore) {
      results.push({ ...bot, score, matchedTerms });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fetch a full .ptbot bot JSON from the /bots/ static folder.
 */
export async function loadBotFile(filename: string): Promise<object> {
  const res = await fetch(`/bots/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Bot "${filename}" não encontrado.`);
  return res.json();
}

/**
 * Calculate a human-readable similarity label from score.
 */
export function similarityLabel(score: number, terms: number): string {
  const pct = Math.min(100, Math.round((score / Math.max(terms, 1)) * 100));
  if (pct >= 80) return 'Alta compatibilidade';
  if (pct >= 50) return 'Boa compatibilidade';
  return 'Compatibilidade parcial';
}
