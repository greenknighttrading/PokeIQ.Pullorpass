import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JUSTTCG_BASE = "https://api.justtcg.com/v1";

// ── Types ─────────────────────────────────────────────────────────────

interface MatchRequestItem {
  id: string;
  productName: string;
  category: string;      // set/series from CSV
  assetType: string;      // Slab | Raw Card | Sealed
  cardNumber?: string;
  printing?: string;      // e.g. "Unlimited Holofoil"
  condition?: string;     // e.g. "Near Mint"
  language?: string;
  grade?: string;
  originalPrice?: number; // CSV price for sanity checking
}

interface MatchResult {
  id: string;
  matchedPrice: number | null;
  matchedName: string | null;
  matchedSetName: string | null;
  matchedCardNumber: string | null;
  matchedRarity: string | null;
  tcgplayerId: string | null;
  cardId: string | null;
  variantId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  confidenceBase: number;
  confidenceVariant: number;
  matchMethod: string;
  requiresReview: boolean;
  candidateOptions?: Array<{ name: string; setName: string; cardId: string; tcgplayerId: string | null; score: number }>;
}

// ── Normalization (Spec Section B) ────────────────────────────────────

const SEALED_KEYWORDS = [
  "booster pack", "booster box", "etb", "elite trainer box", "upc",
  "collection", "tin", "bundle", "blister", "box", "pack",
  "ultra premium", "theme deck", "starter deck", "build and battle",
  "build & battle", "trainer toolkit", "prerelease", "lunchbox",
];

function detectAssetType(cardNumber: string | undefined, name: string): "CARD" | "SEALED" {
  if (cardNumber && cardNumber.trim().length > 0) return "CARD";
  const lower = name.toLowerCase();
  for (const kw of SEALED_KEYWORDS) {
    if (lower.includes(kw)) return "SEALED";
  }
  return cardNumber ? "CARD" : "SEALED";
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function parseNumberKey(raw: string | undefined): { numberPrimary: string | null; isPromo: boolean } {
  if (!raw || !raw.trim()) return { numberPrimary: null, isPromo: false };
  const trimmed = raw.trim();
  // "104/112" → "104"
  if (trimmed.includes("/")) {
    const left = trimmed.split("/")[0].trim();
    const parsed = parseInt(left, 10);
    return { numberPrimary: isNaN(parsed) ? left : String(parsed), isPromo: false };
  }
  // Alphanumeric promo (e.g. "SWSH123") — keep as-is
  if (/[a-zA-Z]/.test(trimmed)) {
    return { numberPrimary: trimmed, isPromo: true };
  }
  // Zero-padded numeric
  const parsed = parseInt(trimmed, 10);
  return { numberPrimary: isNaN(parsed) ? trimmed : String(parsed), isPromo: false };
}

function normalizeName(name: string, hasCardNumber: boolean): string {
  let n = normalizeText(name);
  // Remove trailing embedded number patterns ONLY if we already have number_raw
  if (hasCardNumber) {
    n = n.replace(/[\s-]+\d{2,4}$/, "").trim();
    n = n.replace(/#\d+$/, "").trim();
  }
  return n;
}

const CONDITION_MAP: Record<string, string> = {
  nm: "Near Mint", "near mint": "Near Mint",
  lp: "Lightly Played", "lightly played": "Lightly Played",
  mp: "Moderately Played", "moderately played": "Moderately Played",
  hp: "Heavily Played", "heavily played": "Heavily Played",
  dmg: "Damaged", damaged: "Damaged",
};

function normalizeCondition(raw: string | undefined): string {
  if (!raw) return "Near Mint";
  const lower = raw.toLowerCase().trim();
  return CONDITION_MAP[lower] || raw.trim() || "Near Mint";
}

interface PrintingEdition {
  printingNorm: string;
  editionNorm: string | null;
}

function parsePrintingEdition(raw: string | undefined): PrintingEdition {
  if (!raw) return { printingNorm: "Normal", editionNorm: null };
  const lower = raw.toLowerCase().trim();

  let editionNorm: string | null = null;
  if (lower.includes("1st edition")) editionNorm = "1st Edition";
  else if (lower.includes("unlimited")) editionNorm = "Unlimited";

  let printingNorm = "Normal";
  if (lower.includes("reverse")) printingNorm = "Reverse Holofoil";
  else if (lower.includes("holo") || lower.includes("holofoil")) printingNorm = "Holofoil";

  return { printingNorm, editionNorm };
}

function normalizeLanguage(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "English";
  const lower = raw.toLowerCase().trim();
  if (lower === "jp" || lower === "japanese" || lower === "jpn") return "Japanese";
  if (lower === "en" || lower === "english" || lower === "eng") return "English";
  return raw.trim();
}

function inferSealedCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("booster box")) return "Booster Box";
  if (lower.includes("elite trainer box") || lower.includes("etb")) return "ETB";
  if (lower.includes("upc") || lower.includes("ultra premium")) return "UPC";
  if (lower.includes("booster pack") || lower.includes("pack")) return "Booster Pack";
  if (lower.includes("bundle")) return "Bundle";
  if (lower.includes("tin")) return "Tin";
  return "Other";
}

// ── Fingerprinting (Spec Section D, Step 0) ───────────────────────────

function buildFingerprint(
  assetType: "CARD" | "SEALED",
  setNorm: string,
  numberKey: string | null,
  nameNorm: string,
  printingNorm: string,
  editionNorm: string | null,
  conditionNorm: string,
  languageNorm: string,
  categoryNorm?: string,
  productNameNorm?: string
): string {
  if (assetType === "CARD") {
    return [setNorm, numberKey || "", nameNorm, printingNorm, editionNorm || "", conditionNorm, languageNorm]
      .join("|").toLowerCase();
  }
  return [setNorm, categoryNorm || "", productNameNorm || nameNorm].join("|").toLowerCase();
}

// ── Scoring (Spec Section D, Step 3) ──────────────────────────────────

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  // Simple containment-based similarity
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aWords = a.split(" ");
  const bWords = b.split(" ");
  const matched = aWords.filter(w => bWords.includes(w));
  return matched.length / Math.max(aWords.length, bWords.length);
}

function scoreCardCandidate(
  candidate: { name: string; set_name: string | null; number: string | null },
  setNorm: string,
  numberKey: string | null,
  nameNorm: string,
  printingNorm: string,
  editionNorm: string | null,
  languageNorm: string
): number {
  let score = 0;

  // Set match: 0.40 — CRITICAL: if sets don't match at all, hard-cap the score
  const candSet = normalizeText(candidate.set_name || "");
  let setMatched = false;
  if (candSet && setNorm) {
    if (candSet === setNorm) { score += 0.40; setMatched = true; }
    else if (candSet.includes(setNorm) || setNorm.includes(candSet)) { score += 0.30; setMatched = true; }
    else {
      // Check word overlap for partial set names (e.g. "destined rivals" vs "sv destined rivals")
      const setWords = setNorm.split(" ").filter(w => w.length > 2);
      const candWords = candSet.split(" ").filter(w => w.length > 2);
      const overlap = setWords.filter(w => candWords.includes(w));
      if (overlap.length >= 2 || (setWords.length === 1 && overlap.length === 1)) {
        score += 0.20;
        setMatched = true;
      }
      // No overlap at all → set doesn't match, give 0
    }
  } else if (!setNorm) {
    // No set info from CSV — can't penalize, give partial credit
    score += 0.10;
    setMatched = true;
  }

  // Number match: 0.30
  if (numberKey && candidate.number) {
    const candNum = candidate.number.includes("/") ? candidate.number.split("/")[0].trim() : candidate.number.trim();
    const candParsed = /[a-zA-Z]/.test(candNum) ? candNum : String(parseInt(candNum, 10) || candNum);
    if (candParsed === numberKey) score += 0.30;
  } else if (!numberKey && !candidate.number) {
    score += 0.10;
  }

  // Name similarity: 0.25 (increased — name MUST matter)
  const candName = normalizeText(candidate.name);
  const nameSim = stringSimilarity(nameNorm, candName);
  score += nameSim * 0.25;

  // HARD PENALTY: if names are completely different (< 0.25 similarity), 
  // this is likely a wrong card even if set+number match (e.g. Charizard vs Lapras)
  if (nameSim < 0.25) {
    score = Math.min(score, 0.35);
  }

  // Printing: 0.03, Language: 0.02
  score += 0.03;
  score += 0.02;

  // HARD PENALTY: if set was provided but didn't match at all, cap score low
  if (setNorm && !setMatched) {
    score = Math.min(score, 0.40);
  }

  return Math.min(score, 1);
}

function scoreSealedCandidate(
  candidate: { name: string; set_name: string | null; category?: string | null },
  setNorm: string,
  categoryNorm: string,
  productNameNorm: string
): number {
  let score = 0;

  // Set: 0.45
  const candSet = normalizeText(candidate.set_name || "");
  if (candSet && setNorm) {
    if (candSet === setNorm) score += 0.45;
    else if (candSet.includes(setNorm) || setNorm.includes(candSet)) score += 0.30;
  }

  // Category: 0.35
  const candCat = normalizeText(candidate.category || "");
  if (candCat && categoryNorm) {
    if (candCat.includes(normalizeText(categoryNorm))) score += 0.35;
  }

  // Name: 0.20
  const candName = normalizeText(candidate.name);
  score += stringSimilarity(productNameNorm, candName) * 0.20;

  return Math.min(score, 1);
}

// ── Price Sanity Check ────────────────────────────────────────────────
// If matched price is >5x or <0.2x the CSV price, downgrade confidence
function applyPriceSanityCheck(result: MatchResult, originalPrice?: number): MatchResult {
  if (!originalPrice || originalPrice <= 0 || result.matchedPrice === null || result.matchedPrice <= 0) return result;
  const ratio = result.matchedPrice / originalPrice;
  // >500% higher or >80% lower than CSV price → suspicious
  if (ratio > 5 || ratio < 0.2) {
    return {
      ...result,
      confidence: result.confidence === "high" ? "medium" : result.confidence === "medium" ? "low" : result.confidence,
      requiresReview: true,
    };
  }
  return result;
}

// ── Main handler ────────────────────────────────────────────────────

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // match-prices is expensive
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Rate limiting ──
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const JUSTTCG_API_KEY = Deno.env.get("JUSTTCG_API_KEY");
  if (!JUSTTCG_API_KEY) {
    return new Response(
      JSON.stringify({ error: "JUSTTCG_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Extract user id from auth header
  let userId: string | null = null;
  {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    } catch {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const { items } = (await req.json()) as { items: MatchRequestItem[] };
    if (!items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: "items array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pre-load set aliases (single query)
    const rawSets = [...new Set(items.map(i => (i.category || "").toLowerCase().trim()).filter(Boolean))];
    const setAliasMap = new Map<string, string>();
    if (rawSets.length > 0) {
      const { data: aliases } = await supabase
        .from("set_aliases")
        .select("alias, canonical_set")
        .in("alias", rawSets);
      for (const a of aliases || []) {
        setAliasMap.set(a.alias, a.canonical_set);
      }
    }

    // Pre-load printing aliases
    const printingAliasMap = new Map<string, string>();
    {
      const { data: pAliases } = await supabase.from("printing_aliases").select("alias, canonical_printing");
      for (const a of pAliases || []) {
        printingAliasMap.set(a.alias.toLowerCase(), a.canonical_printing);
      }
    }

    const headers = {
      "x-api-key": JUSTTCG_API_KEY.replace(/[^\x20-\x7E]/g, "").trim(),
      "Content-Type": "application/json",
    };

    const results: MatchResult[] = [];
    const BATCH_SIZE = 2;
    const BATCH_DELAY = 1200;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (item): Promise<MatchResult> => {
          try {
            return await matchSingleItem(item, supabase, userId, setAliasMap, printingAliasMap, headers);
          } catch (e) {
            console.error(`Error matching "${item.productName}":`, e);
            return emptyResult(item.id);
          }
        })
      );

      results.push(...batchResults);

      if (i + BATCH_SIZE < items.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    return new Response(
      JSON.stringify({ results, matched: results.filter(r => r.matchedPrice !== null).length, total: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("match-prices error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function emptyResult(id: string): MatchResult {
  return {
    id,
    matchedPrice: null,
    matchedName: null,
    matchedSetName: null,
    matchedCardNumber: null,
    matchedRarity: null,
    tcgplayerId: null,
    cardId: null,
    variantId: null,
    confidence: "none",
    confidenceBase: 0,
    confidenceVariant: 0,
    matchMethod: "none",
    requiresReview: true,
  };
}

// ── Single Item Matching Pipeline ────────────────────────────────────

async function matchSingleItem(
  item: MatchRequestItem,
  supabase: any,
  userId: string | null,
  setAliasMap: Map<string, string>,
  printingAliasMap: Map<string, string>,
  apiHeaders: Record<string, string>
): Promise<MatchResult> {
  // B) Normalize
  const assetType = detectAssetType(item.cardNumber, item.productName);
  const setRaw = (item.category || "").trim();
  const setNorm = setAliasMap.get(setRaw.toLowerCase()) || normalizeText(setRaw);
  const { numberPrimary, isPromo } = parseNumberKey(item.cardNumber);
  const nameNorm = normalizeName(item.productName, !!numberPrimary);
  const conditionNorm = normalizeCondition(item.condition || item.grade);
  const { printingNorm, editionNorm } = parsePrintingEdition(item.printing);
  const languageNorm = normalizeLanguage(item.language);
  const sealedCategory = assetType === "SEALED" ? inferSealedCategory(item.productName) : undefined;

  // Resolve printing alias
  const resolvedPrinting = printingAliasMap.get(printingNorm.toLowerCase()) || printingNorm;

  // D) STEP 0: User mapping shortcut
  const fingerprint = buildFingerprint(
    assetType, setNorm, numberPrimary, nameNorm,
    resolvedPrinting, editionNorm, conditionNorm, languageNorm,
    sealedCategory, normalizeText(item.productName)
  );

  if (userId) {
    const { data: cached } = await supabase
      .from("user_asset_mappings")
      .select("resolved_tcgplayer_id, resolved_variant_id, confidence")
      .eq("user_id", userId)
      .eq("upload_fingerprint", fingerprint)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached && cached.confidence >= 0.75 && cached.resolved_tcgplayer_id) {
      // Fetch current price from market_snapshots
      const { data: snap } = await supabase
        .from("market_snapshots")
        .select("price, name, card_id, set_name, number, rarity")
        .eq("tcgplayer_id", cached.resolved_tcgplayer_id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snap) {
        return {
          id: item.id,
          matchedPrice: snap.price,
          matchedName: snap.name,
          matchedSetName: snap.set_name || null,
          matchedCardNumber: snap.number || null,
          matchedRarity: snap.rarity || null,
          tcgplayerId: cached.resolved_tcgplayer_id,
          cardId: snap.card_id,
          variantId: cached.resolved_variant_id,
          confidence: cached.confidence >= 0.9 ? "high" : "medium",
          confidenceBase: 1.0,
          confidenceVariant: cached.resolved_variant_id ? 1.0 : 0,
          matchMethod: "exact_id",
          requiresReview: false,
        };
      }
    }
  }

  // D) STEP 1: Deterministic base match (CARD — set+number via cards_justtcg)
  let baseCard: any = null;
  let matchMethod = "none";
  let confidenceBase = 0;

  if (assetType === "CARD") {
    // Tier 1: set + number
    if (numberPrimary && setNorm) {
      const { data: candidates } = await supabase
        .from("cards_justtcg")
        .select("id, name, set_name, number, tcgplayer_id, rarity")
        .ilike("set_name", `%${setNorm}%`)
        .limit(50);

      if (candidates && candidates.length > 0) {
        // Filter by number match
        const numberMatches = candidates.filter((c: any) => {
          if (!c.number) return false;
          const candNum = c.number.includes("/") ? c.number.split("/")[0].trim() : c.number.trim();
          const candParsed = /[a-zA-Z]/.test(candNum) ? candNum : String(parseInt(candNum, 10) || candNum);
          return candParsed === numberPrimary;
        });

        if (numberMatches.length === 1) {
          // Verify name isn't wildly different (e.g. Charizard vs Lapras with same number)
          const candName = normalizeText(numberMatches[0].name);
          const nameSim = stringSimilarity(nameNorm, candName);
          if (nameSim < 0.20) {
            // Name is completely wrong — skip this match, fall through to Tier 2
            console.log(`Rejected set+number match: "${nameNorm}" vs "${candName}" (sim=${nameSim.toFixed(2)})`);
          } else {
            baseCard = numberMatches[0];
            confidenceBase = nameSim >= 0.5 ? 0.97 : 0.80;
            matchMethod = "set_number";
          }
        } else if (numberMatches.length > 1) {
          // Multiple matches — score them
          let best: any = null;
          let bestScore = 0;
          for (const c of numberMatches) {
            const s = scoreCardCandidate(c, setNorm, numberPrimary, nameNorm, resolvedPrinting, editionNorm, languageNorm);
            if (s > bestScore) { bestScore = s; best = c; }
          }
          if (best && bestScore >= 0.75) {
            baseCard = best;
            confidenceBase = bestScore;
            matchMethod = "set_number";
          }
        }
      }
    }

    // Tier 2: set + name (if Tier 1 failed)
    if (!baseCard && setNorm) {
      const nameWords = nameNorm.split(" ").slice(0, 3).filter(Boolean);
      if (nameWords.length > 0) {
        const likePattern = `%${nameWords.join("%")}%`;
        const { data: nameCandidates } = await supabase
          .from("cards_justtcg")
          .select("id, name, set_name, number, tcgplayer_id, rarity")
          .ilike("set_name", `%${setNorm}%`)
          .ilike("name", likePattern)
          .limit(20);

        if (nameCandidates && nameCandidates.length > 0) {
          let best: any = null;
          let bestScore = 0;
          for (const c of nameCandidates) {
            const s = scoreCardCandidate(c, setNorm, numberPrimary, nameNorm, resolvedPrinting, editionNorm, languageNorm);
            if (s > bestScore) { bestScore = s; best = c; }
          }
          if (best && bestScore >= 0.60) {
            baseCard = best;
            confidenceBase = Math.min(bestScore + 0.05, 0.95); // Cap at 0.95 for name-only
            matchMethod = "set_name";
          }
        }
      }
    }
  }

  // SEALED: try local sealed_ppt or market_snapshots
  if (assetType === "SEALED" && !baseCard) {
    const sealedNameWords = nameNorm.split(" ").slice(0, 4).filter(Boolean);
    if (sealedNameWords.length > 0) {
      const { data: sealedCandidates } = await supabase
        .from("market_snapshots")
        .select("card_id, name, price, tcgplayer_id, set_name, product_type")
        .eq("product_type", "sealed")
        .ilike("name", `%${sealedNameWords.join("%")}%`)
        .order("snapshot_date", { ascending: false })
        .limit(10);

      if (sealedCandidates && sealedCandidates.length > 0) {
        let best: any = null;
        let bestScore = 0;
        for (const c of sealedCandidates) {
          const s = scoreSealedCandidate(c, setNorm, sealedCategory || "", normalizeText(item.productName));
          if (s > bestScore) { bestScore = s; best = c; }
        }
        if (best && bestScore >= 0.50) {
          let sealedResult = await buildResultFromSnapshot(item.id, best, bestScore, "local_sealed", userId, supabase, fingerprint);
          sealedResult = applyPriceSanityCheck(sealedResult, item.originalPrice);
          return sealedResult;
        }
      }
    }
  }

  // D) STEP 3: If no local match, try market_snapshots broadly (for CARD too)
  if (!baseCard) {
    const localMatch = await tryLocalSnapshotMatch(supabase, item, setNorm, nameNorm);
    if (localMatch) {
      const confStr: "high" | "medium" | "low" = localMatch.score >= 0.80 ? "high" : localMatch.score >= 0.60 ? "medium" : "low";
      const result: MatchResult = {
        id: item.id,
        matchedPrice: localMatch.price,
        matchedName: localMatch.name,
        matchedSetName: localMatch.setName || null,
        matchedCardNumber: localMatch.cardNumber || null,
        matchedRarity: localMatch.rarity || null,
        tcgplayerId: localMatch.tcgplayerId,
        cardId: localMatch.cardId,
        variantId: null,
        confidence: confStr,
        confidenceBase: localMatch.score,
        confidenceVariant: 0,
        matchMethod: "local_snapshot",
        requiresReview: localMatch.score < 0.90,
      };
      if (localMatch.score >= 0.75) {
        await saveMappingIfGood(supabase, userId, fingerprint, result);
      }
      if (confStr === "high") {
        const checked = applyPriceSanityCheck(result, item.originalPrice);
        return checked;
      }
    }
  }

  // If we have a base card from cards_justtcg, resolve variant + get price
  if (baseCard) {
    let result = await resolveVariantAndPrice(
      item.id, baseCard, conditionNorm, resolvedPrinting, editionNorm, languageNorm,
      confidenceBase, matchMethod, supabase, userId, fingerprint
    );
    result = applyPriceSanityCheck(result, item.originalPrice);
    return result;
  }

  // D) Fallback: JustTCG API search (credit-controlled)
  const apiResult = await searchJustTCGApi(item, nameNorm, setNorm, apiHeaders);
  if (apiResult) {
    const confBase = apiResult.score >= 0.70 ? apiResult.score : apiResult.score * 0.9;
    const confStr: "high" | "medium" | "low" | "none" = confBase >= 0.75 ? "high" : confBase >= 0.50 ? "medium" : confBase > 0 ? "low" : "none";
    let result: MatchResult = {
      id: item.id,
      matchedPrice: apiResult.price,
      matchedName: apiResult.name,
      matchedSetName: apiResult.setName || null,
      matchedCardNumber: apiResult.cardNumber || null,
      matchedRarity: apiResult.rarity || null,
      tcgplayerId: apiResult.tcgplayerId,
      cardId: apiResult.cardId,
      variantId: null,
      confidence: confStr,
      confidenceBase: confBase,
      confidenceVariant: 0,
      matchMethod: "search",
      requiresReview: confBase < 0.90,
      candidateOptions: apiResult.candidates,
    };
    result = applyPriceSanityCheck(result, item.originalPrice);
    await saveMappingIfGood(supabase, userId, fingerprint, result);
    return result;
  }

  return emptyResult(item.id);
}

// ── Variant Resolution (Spec D, Step 4) ──────────────────────────────

async function resolveVariantAndPrice(
  itemId: string,
  baseCard: any,
  conditionNorm: string,
  printingNorm: string,
  editionNorm: string | null,
  languageNorm: string,
  confidenceBase: number,
  matchMethod: string,
  supabase: any,
  userId: string | null,
  fingerprint: string
): Promise<MatchResult> {
  // Get variants for this card
  const { data: variants } = await supabase
    .from("variants_justtcg")
    .select("id, condition, printing, language, price_current, tcgplayer_sku_id")
    .eq("card_id", baseCard.id);

  let variantId: string | null = null;
  let price: number | null = null;
  let confidenceVariant = 0;

  if (variants && variants.length > 0) {
    // Exact match: condition + printing + language
    let bestVariant = variants.find((v: any) =>
      (v.condition || "").toLowerCase() === conditionNorm.toLowerCase() &&
      (v.printing || "").toLowerCase() === printingNorm.toLowerCase() &&
      (v.language || "English").toLowerCase() === languageNorm.toLowerCase()
    );

    if (bestVariant) {
      variantId = bestVariant.id;
      price = bestVariant.price_current;
      confidenceVariant = 1.0;
    } else {
      // Fallback: match printing+language, nearest condition (prefer NM)
      const printLangMatches = variants.filter((v: any) =>
        (v.printing || "").toLowerCase() === printingNorm.toLowerCase() &&
        (v.language || "English").toLowerCase() === languageNorm.toLowerCase()
      );
      if (printLangMatches.length > 0) {
        // Prefer Near Mint
        bestVariant = printLangMatches.find((v: any) => (v.condition || "").toLowerCase() === "near mint") || printLangMatches[0];
        variantId = bestVariant.id;
        price = bestVariant.price_current;
        confidenceVariant = 0.85;
      } else {
        // Fallback: primary/most common variant (Normal + English + NM)
        bestVariant = variants.find((v: any) =>
          (v.condition || "").toLowerCase() === "near mint" &&
          (v.language || "English").toLowerCase() === "english"
        ) || variants[0];
        variantId = bestVariant.id;
        price = bestVariant.price_current;
        confidenceVariant = 0.70;
      }
    }
  }

  // If no price from variants, try market_snapshots
  if (price === null && baseCard.tcgplayer_id) {
    const { data: snap } = await supabase
      .from("market_snapshots")
      .select("price")
      .eq("tcgplayer_id", baseCard.tcgplayer_id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snap) price = snap.price;
  }

  const confStr: "high" | "medium" | "low" = confidenceBase >= 0.80 ? "high" : confidenceBase >= 0.60 ? "medium" : "low";
  const result: MatchResult = {
    id: itemId,
    matchedPrice: price,
    matchedName: baseCard.name,
    matchedSetName: baseCard.set_name || null,
    matchedCardNumber: baseCard.number || null,
    matchedRarity: baseCard.rarity || null,
    tcgplayerId: baseCard.tcgplayer_id,
    cardId: baseCard.id,
    variantId,
    confidence: confStr,
    confidenceBase,
    confidenceVariant,
    matchMethod,
    requiresReview: confidenceBase < 0.90,
  };

  await saveMappingIfGood(supabase, userId, fingerprint, result);
  return result;
}

// ── Local snapshot match ─────────────────────────────────────────────

async function tryLocalSnapshotMatch(
  supabase: any,
  item: MatchRequestItem,
  setNorm: string,
  nameNorm: string
): Promise<{ name: string; price: number; tcgplayerId: string | null; cardId: string; setName: string | null; cardNumber: string | null; rarity: string | null; score: number } | null> {
  const nameWords = nameNorm.split(" ").slice(0, 3).filter(Boolean);
  if (nameWords.length === 0) return null;

  const { data } = await supabase
    .from("market_snapshots")
    .select("card_id, name, price, tcgplayer_id, set_name, number, rarity")
    .select("card_id, name, price, tcgplayer_id, set_name")
    .ilike("name", `%${nameWords.join("%")}%`)
    .order("snapshot_date", { ascending: false })
    .limit(15);

  if (!data || data.length === 0) return null;

  let best: any = null;
  let bestScore = 0;

  for (const row of data) {
    const candName = normalizeText(row.name);
    const nameScore = stringSimilarity(nameNorm, candName);

    // Set scoring — much more important than before
    let setScore = 0;
    let setMatched = false;
    if (setNorm && row.set_name) {
      const candSet = normalizeText(row.set_name);
      if (candSet === setNorm) { setScore = 1.0; setMatched = true; }
      else if (candSet.includes(setNorm) || setNorm.includes(candSet)) { setScore = 0.70; setMatched = true; }
      else {
        // Word overlap
        const setWords = setNorm.split(" ").filter(w => w.length > 2);
        const candWords = candSet.split(" ").filter(w => w.length > 2);
        const overlap = setWords.filter(w => candWords.includes(w));
        if (overlap.length > 0) { setScore = overlap.length / Math.max(setWords.length, 1) * 0.5; setMatched = true; }
      }
    } else if (!setNorm) {
      setScore = 0.3;
      setMatched = true;
    }

    // Weighted: 45% set, 55% name
    let score = nameScore * 0.55 + setScore * 0.45;

    // Hard penalty: if set was provided but didn't match at all
    if (setNorm && !setMatched) {
      score = Math.min(score, 0.40);
    }

    if (score > bestScore) { bestScore = score; best = row; }
  }

  if (!best || bestScore < 0.50) return null;

  return {
    name: best.name,
    price: best.price,
    tcgplayerId: best.tcgplayer_id,
    cardId: best.card_id,
    setName: best.set_name || null,
    cardNumber: best.number || null,
    rarity: best.rarity || null,
    score: bestScore,
  };
}

// ── JustTCG API search ───────────────────────────────────────────────

async function searchJustTCGApi(
  item: MatchRequestItem,
  nameNorm: string,
  setNorm: string,
  headers: Record<string, string>
): Promise<{
  name: string;
  price: number | null;
  tcgplayerId: string | null;
  cardId: string;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  score: number;
  candidates?: Array<{ name: string; setName: string; cardId: string; tcgplayerId: string | null; score: number }>;
} | null> {
  const cleanQuery = item.productName
    .replace(/\((?:jp|kr|en|english|japanese|korean)\)/gi, "")
    .replace(/\(\d+(?:\/\d+)?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const condition = item.assetType === "Sealed" ? "Sealed" : "Near Mint";
  // Detect Japanese items from language field or product name tags
  const isJP = normalizeLanguage(item.language) === "Japanese" ||
    /\((?:jp|japanese|jpn)\)/i.test(item.productName);
  const params = new URLSearchParams({
    q: cleanQuery,
    game: isJP ? "pokemon-japan" : "pokemon",
    limit: "10",
    offset: "0",
    include_price_history: "false",
    include_statistics: "7d,30d",
    condition,
  });

  try {
    let resp = await fetch(`${JUSTTCG_BASE}/cards?${params.toString()}`, { headers });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      resp = await fetch(`${JUSTTCG_BASE}/cards?${params.toString()}`, { headers });
    }

    if (!resp.ok) return null;

    const result = await resp.json();
    const cards = Array.isArray(result?.data) ? result.data : [];
    if (cards.length === 0) return null;

    // Score all candidates — include set matching
    const scored = cards.map((card: any) => {
      const cardName = normalizeText(card.name || "");
      const cardSet = normalizeText(card.set_name || "");
      let nameScore = stringSimilarity(nameNorm, cardName);
      if (cardName === nameNorm) nameScore = 1.0;
      
      // Set scoring: 40% weight for set, 60% for name
      let setScore = 0;
      if (setNorm && cardSet) {
        if (cardSet === setNorm) setScore = 1.0;
        else if (cardSet.includes(setNorm) || setNorm.includes(cardSet)) setScore = 0.75;
        else {
          const setWords = setNorm.split(" ").filter(w => w.length > 2);
          const candWords = cardSet.split(" ").filter(w => w.length > 2);
          const overlap = setWords.filter(w => candWords.includes(w));
          setScore = setWords.length > 0 ? overlap.length / setWords.length : 0;
        }
      } else if (!setNorm) {
        setScore = 0.3; // No set info — partial credit
      }

      const score = nameScore * 0.55 + setScore * 0.45;
      return { card, score };
    }).sort((a: any, b: any) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score < 0.25) return null;

    const preferredCondition = item.assetType === "Sealed" ? "Sealed" : "Near Mint";
    const variant = best.card.variants?.find((v: any) => v.condition === preferredCondition) || best.card.variants?.[0];

    return {
      name: best.card.name,
      price: variant?.price ?? null,
      tcgplayerId: best.card.tcgplayerId || null,
      cardId: best.card.id,
      setName: best.card.set_name || null,
      cardNumber: best.card.number || null,
      rarity: best.card.rarity || null,
      score: best.score,
      candidates: scored.slice(0, 3).map((s: any) => ({
        name: s.card.name,
        setName: s.card.set_name || "",
        cardId: s.card.id,
        tcgplayerId: s.card.tcgplayerId || null,
        score: s.score,
      })),
    };
  } catch (e) {
    console.error("JustTCG API search error:", e);
    return null;
  }
}

// ── Persistence ──────────────────────────────────────────────────────

async function saveMappingIfGood(
  supabase: any,
  userId: string | null,
  fingerprint: string,
  result: MatchResult
) {
  // Only persist matches that are high-confidence AND passed all sanity checks
  if (!userId || !result.tcgplayerId || result.confidenceBase < 0.90 || result.requiresReview) return;
  try {
    // Delete old then insert (avoids composite key upsert issues)
    await supabase
      .from("user_asset_mappings")
      .delete()
      .eq("user_id", userId)
      .eq("upload_fingerprint", fingerprint);

    await supabase.from("user_asset_mappings").insert({
      user_id: userId,
      upload_fingerprint: fingerprint,
      resolved_tcgplayer_id: result.tcgplayerId,
      resolved_variant_id: result.variantId || result.cardId,
      confidence: result.confidenceBase,
      method: result.matchMethod,
    });
  } catch { /* non-fatal */ }
}

async function buildResultFromSnapshot(
  itemId: string,
  snap: any,
  score: number,
  method: string,
  userId: string | null,
  supabase: any,
  fingerprint: string
): Promise<MatchResult> {
  const confStr: "high" | "medium" | "low" = score >= 0.80 ? "high" : score >= 0.60 ? "medium" : "low";
  const result: MatchResult = {
    id: itemId,
    matchedPrice: snap.price,
    matchedName: snap.name,
    matchedSetName: snap.set_name || null,
    matchedCardNumber: snap.number || null,
    matchedRarity: snap.rarity || null,
    tcgplayerId: snap.tcgplayer_id,
    cardId: snap.card_id,
    variantId: null,
    confidence: confStr,
    confidenceBase: score,
    confidenceVariant: 0,
    matchMethod: method,
    requiresReview: score < 0.90,
  };
  await saveMappingIfGood(supabase, userId, fingerprint, result);
  return result;
}
