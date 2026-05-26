// PokeIQ taste graph — shared types for the service layer.
// All read APIs return { data, source, confidence } so the UI never branches
// on "do we have data?" — it branches on confidence.

export type DataSource = "community" | "ai_estimate" | "hybrid";

export interface IntelEnvelope<T> {
  data: T;
  source: DataSource;
  confidence: number; // 0..1
}

export type EventType =
  | "card_view"
  | "card_hover"
  | "card_swipe"
  | "tag_vote"
  | "tag_reject"
  | "tag_custom"
  | "scan"
  | "recommendation_shown"
  | "recommendation_click"
  | "profile_view"
  | "binder_view"
  | "session_start"
  | "session_end";

export type SwipeAction = "pull" | "pass" | "love" | "super_like";

export interface TrackedEvent {
  event_type: EventType;
  card_id?: string | null;
  tag_id?: string | null;
  payload?: Record<string, unknown>;
  source_page?: string | null;
  session_id?: string | null;
  client_ts?: string | null;
}

export interface CommunityTag {
  slug: string;
  display_name: string;
  category: string;
  weight: number;       // 0..1 (decayed_weight normalized)
  vote_count: number;
  source: DataSource;
}

export interface CardCommunityStats {
  views: number;
  pull_pct: number | null;
  popularity_score: number;
  trending_score_7d: number;
  swipes_pull: number;
  swipes_pass: number;
  swipes_love: number;
}

export interface CardIntelligence {
  card_id: string;
  stats: CardCommunityStats;
  tags: CommunityTag[];
  similar_card_ids: string[];
  reactions_summary: string;     // e.g. "Loved by art-focused collectors"
}

export interface CollectorProfile {
  user_id: string;
  archetype_slug: string | null;
  archetype_name: string | null;
  archetype_confidence: number;
  stage: "seedling" | "sprouting" | "established" | "master";
  signal_count: number;
  top_artists: Array<{ key: string; count: number; pct: number }>;
  top_sets: Array<{ key: string; count: number; pct: number }>;
  top_eras: Array<{ key: string; count: number; pct: number }>;
  top_types: Array<{ key: string; count: number; pct: number }>;
  top_pokemon: Array<{ key: string; count: number; pct: number }>;
  top_rarities: Array<{ key: string; count: number; pct: number }>;
  scalars: {
    nostalgia_score: number;
    chaos_score: number;
    art_focus_score: number;
    grail_appetite: number;
    rarity_lean: number;
    value_lean: number;
    jp_lean: number;
    sealed_lean: number;
  };
}

export interface RecommendationItem {
  card_id: string;
  score: number;
  reason_codes: string[];
}

export interface CollectorNeighbor {
  neighbor_id: string;
  similarity: number;
  method: "jaccard" | "cosine" | "hybrid";
}

export type RecSurface = "home" | "scanner" | "binder" | "pulse" | "matches";
