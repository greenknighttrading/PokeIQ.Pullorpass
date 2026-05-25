export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      buylist_access: {
        Row: {
          granted_at: string
          id: string
          invite_code: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          invite_code: string
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          invite_code?: string
          user_id?: string
        }
        Relationships: []
      }
      buylist_invites: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Relationships: []
      }
      buylist_items: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string | null
          language: string
          name: string
          notes: string | null
          set_name: string
          tcg_api_id: string | null
          updated_at: string
          url_reference: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          language?: string
          name: string
          notes?: string | null
          set_name?: string
          tcg_api_id?: string | null
          updated_at?: string
          url_reference?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          language?: string
          name?: string
          notes?: string | null
          set_name?: string
          tcg_api_id?: string | null
          updated_at?: string
          url_reference?: string | null
        }
        Relationships: []
      }
      buylist_picks: {
        Row: {
          active: boolean
          allocation_pct: number | null
          buy_high: number | null
          buy_low: number | null
          buy_price: number | null
          buy_zone_type: string
          category: string | null
          commentary: string | null
          confidence: number | null
          created_at: string
          entry_style: string | null
          id: string
          image_url: string | null
          item_id: string | null
          language: string | null
          name: string
          rank: number
          rationale: Json | null
          set_name: string | null
          tcg_api_id: string | null
          updated_at: string
          url_reference: string | null
        }
        Insert: {
          active?: boolean
          allocation_pct?: number | null
          buy_high?: number | null
          buy_low?: number | null
          buy_price?: number | null
          buy_zone_type?: string
          category?: string | null
          commentary?: string | null
          confidence?: number | null
          created_at?: string
          entry_style?: string | null
          id?: string
          image_url?: string | null
          item_id?: string | null
          language?: string | null
          name: string
          rank: number
          rationale?: Json | null
          set_name?: string | null
          tcg_api_id?: string | null
          updated_at?: string
          url_reference?: string | null
        }
        Update: {
          active?: boolean
          allocation_pct?: number | null
          buy_high?: number | null
          buy_low?: number | null
          buy_price?: number | null
          buy_zone_type?: string
          category?: string | null
          commentary?: string | null
          confidence?: number | null
          created_at?: string
          entry_style?: string | null
          id?: string
          image_url?: string | null
          item_id?: string | null
          language?: string | null
          name?: string
          rank?: number
          rationale?: Json | null
          set_name?: string | null
          tcg_api_id?: string | null
          updated_at?: string
          url_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buylist_picks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "buylist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      buylist_price_snapshots: {
        Row: {
          id: string
          item_id: string
          price: number
          recorded_at: string
          source: string | null
        }
        Insert: {
          id?: string
          item_id: string
          price: number
          recorded_at?: string
          source?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          price?: number
          recorded_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buylist_price_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "buylist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      buylist_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      buylist_watchlist: {
        Row: {
          added_at: string
          card_id: string
          id: string
          name: string
          product_type: string | null
          rarity: string | null
          set_name: string | null
          tcgplayer_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          card_id: string
          id?: string
          name: string
          product_type?: string | null
          rarity?: string | null
          set_name?: string | null
          tcgplayer_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          card_id?: string
          id?: string
          name?: string
          product_type?: string | null
          rarity?: string | null
          set_name?: string | null
          tcgplayer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      card_tag_aggregates: {
        Row: {
          card_id: string
          last_voted_at: string
          tag: string
          unique_users: number
          vote_count: number
        }
        Insert: {
          card_id: string
          last_voted_at?: string
          tag: string
          unique_users?: number
          vote_count?: number
        }
        Update: {
          card_id?: string
          last_voted_at?: string
          tag?: string
          unique_users?: number
          vote_count?: number
        }
        Relationships: []
      }
      card_tag_votes: {
        Row: {
          card_id: string
          created_at: string
          id: string
          source: string
          tag: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          source?: string
          tag: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          source?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      cards_justtcg: {
        Row: {
          created_at: string
          game: string
          id: string
          is_sealed: boolean
          name: string
          number: string | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          tcgplayer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          game?: string
          id: string
          is_sealed?: boolean
          name: string
          number?: string | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          tcgplayer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          is_sealed?: boolean
          name?: string
          number?: string | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          tcgplayer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cards_ppt: {
        Row: {
          artist: string | null
          card_number: string | null
          card_type: string | null
          energy_type: string[] | null
          flavor_text: string | null
          hp: number | null
          image_cdn_url: string | null
          image_cdn_url_200: string | null
          image_cdn_url_400: string | null
          image_cdn_url_800: string | null
          name: string
          pokemon_type: string | null
          ppt_id: string
          rarity: string | null
          set_name: string | null
          stage: string | null
          tcgplayer_id: string | null
          tcgplayer_url: string | null
          total_set_number: string | null
          updated_at: string
        }
        Insert: {
          artist?: string | null
          card_number?: string | null
          card_type?: string | null
          energy_type?: string[] | null
          flavor_text?: string | null
          hp?: number | null
          image_cdn_url?: string | null
          image_cdn_url_200?: string | null
          image_cdn_url_400?: string | null
          image_cdn_url_800?: string | null
          name: string
          pokemon_type?: string | null
          ppt_id: string
          rarity?: string | null
          set_name?: string | null
          stage?: string | null
          tcgplayer_id?: string | null
          tcgplayer_url?: string | null
          total_set_number?: string | null
          updated_at?: string
        }
        Update: {
          artist?: string | null
          card_number?: string | null
          card_type?: string | null
          energy_type?: string[] | null
          flavor_text?: string | null
          hp?: number | null
          image_cdn_url?: string | null
          image_cdn_url_200?: string | null
          image_cdn_url_400?: string | null
          image_cdn_url_800?: string | null
          name?: string
          pokemon_type?: string | null
          ppt_id?: string
          rarity?: string | null
          set_name?: string | null
          stage?: string | null
          tcgplayer_id?: string | null
          tcgplayer_url?: string | null
          total_set_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      greatest_hits_cache: {
        Row: {
          avg_change_7d: number
          card_count: number
          created_at: string
          id: string
          pokemon_name: string
          snapshot_date: string
        }
        Insert: {
          avg_change_7d?: number
          card_count?: number
          created_at?: string
          id?: string
          pokemon_name: string
          snapshot_date?: string
        }
        Update: {
          avg_change_7d?: number
          card_count?: number
          created_at?: string
          id?: string
          pokemon_name?: string
          snapshot_date?: string
        }
        Relationships: []
      }
      market_index: {
        Row: {
          created_at: string
          date: string
          id: string
          sp500_close: number | null
          total_cards: number
          total_market_value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          sp500_close?: number | null
          total_cards?: number
          total_market_value?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          sp500_close?: number | null
          total_cards?: number
          total_market_value?: number
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          artist: string | null
          avg_price_30d: number | null
          avg_price_7d: number | null
          card_id: string
          condition: string | null
          cov_price_30d: number | null
          cov_price_7d: number | null
          energy_type: string[] | null
          game: string
          hp: string | null
          id: string
          image_url: string | null
          listings: number | null
          max_price_30d: number | null
          max_price_7d: number | null
          min_price_30d: number | null
          min_price_7d: number | null
          name: string
          number: string | null
          pokemon_type: string | null
          ppt_id: string | null
          price: number | null
          price_change_24h: number | null
          price_change_30d: number | null
          price_change_7d: number | null
          price_change_90d: number | null
          price_dmg: number | null
          price_hp: number | null
          price_lp: number | null
          price_mp: number | null
          price_nm: number | null
          primary_printing: string | null
          printing: string | null
          product_type: string
          rarity: string | null
          sellers: number | null
          set_id: string | null
          set_name: string | null
          snapshot_date: string
          source: string
          stage: string | null
          synced_at: string
          tcgplayer_id: string | null
          trend_slope_30d: number | null
          trend_slope_7d: number | null
        }
        Insert: {
          artist?: string | null
          avg_price_30d?: number | null
          avg_price_7d?: number | null
          card_id: string
          condition?: string | null
          cov_price_30d?: number | null
          cov_price_7d?: number | null
          energy_type?: string[] | null
          game?: string
          hp?: string | null
          id?: string
          image_url?: string | null
          listings?: number | null
          max_price_30d?: number | null
          max_price_7d?: number | null
          min_price_30d?: number | null
          min_price_7d?: number | null
          name: string
          number?: string | null
          pokemon_type?: string | null
          ppt_id?: string | null
          price?: number | null
          price_change_24h?: number | null
          price_change_30d?: number | null
          price_change_7d?: number | null
          price_change_90d?: number | null
          price_dmg?: number | null
          price_hp?: number | null
          price_lp?: number | null
          price_mp?: number | null
          price_nm?: number | null
          primary_printing?: string | null
          printing?: string | null
          product_type?: string
          rarity?: string | null
          sellers?: number | null
          set_id?: string | null
          set_name?: string | null
          snapshot_date?: string
          source?: string
          stage?: string | null
          synced_at?: string
          tcgplayer_id?: string | null
          trend_slope_30d?: number | null
          trend_slope_7d?: number | null
        }
        Update: {
          artist?: string | null
          avg_price_30d?: number | null
          avg_price_7d?: number | null
          card_id?: string
          condition?: string | null
          cov_price_30d?: number | null
          cov_price_7d?: number | null
          energy_type?: string[] | null
          game?: string
          hp?: string | null
          id?: string
          image_url?: string | null
          listings?: number | null
          max_price_30d?: number | null
          max_price_7d?: number | null
          min_price_30d?: number | null
          min_price_7d?: number | null
          name?: string
          number?: string | null
          pokemon_type?: string | null
          ppt_id?: string | null
          price?: number | null
          price_change_24h?: number | null
          price_change_30d?: number | null
          price_change_7d?: number | null
          price_change_90d?: number | null
          price_dmg?: number | null
          price_hp?: number | null
          price_lp?: number | null
          price_mp?: number | null
          price_nm?: number | null
          primary_printing?: string | null
          printing?: string | null
          product_type?: string
          rarity?: string | null
          sellers?: number | null
          set_id?: string | null
          set_name?: string | null
          snapshot_date?: string
          source?: string
          stage?: string | null
          synced_at?: string
          tcgplayer_id?: string | null
          trend_slope_30d?: number | null
          trend_slope_7d?: number | null
        }
        Relationships: []
      }
      market_sync_status: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          last_offset: number
          product_type: string
          started_at: string | null
          status: string
          total_synced: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_offset?: number
          product_type?: string
          started_at?: string | null
          status?: string
          total_synced?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_offset?: number
          product_type?: string
          started_at?: string | null
          status?: string
          total_synced?: number
          updated_at?: string
        }
        Relationships: []
      }
      metrics_snapshots_justtcg: {
        Row: {
          as_of_date: string
          avg_price: number | null
          cov: number | null
          created_at: string
          id: string
          iqr: number | null
          max_price: number | null
          min_price: number | null
          period: string
          price_change_pct: number | null
          price_changes_count: number | null
          price_relative_to_30d_range: number | null
          stddev: number | null
          trend_slope: number | null
          variant_id: string
        }
        Insert: {
          as_of_date?: string
          avg_price?: number | null
          cov?: number | null
          created_at?: string
          id?: string
          iqr?: number | null
          max_price?: number | null
          min_price?: number | null
          period: string
          price_change_pct?: number | null
          price_changes_count?: number | null
          price_relative_to_30d_range?: number | null
          stddev?: number | null
          trend_slope?: number | null
          variant_id: string
        }
        Update: {
          as_of_date?: string
          avg_price?: number | null
          cov?: number | null
          created_at?: string
          id?: string
          iqr?: number | null
          max_price?: number | null
          min_price?: number | null
          period?: string
          price_change_pct?: number | null
          price_changes_count?: number | null
          price_relative_to_30d_range?: number | null
          stddev?: number | null
          trend_slope?: number | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshots_justtcg_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants_justtcg"
            referencedColumns: ["id"]
          },
        ]
      }
      pokeiq_credits: {
        Row: {
          credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pokeiq_likes: {
        Row: {
          artist: string | null
          card_id: string
          card_name: string
          card_number: string | null
          card_type: string | null
          created_at: string
          era: string | null
          id: string
          image_url: string | null
          language: string | null
          liked_at: string
          pokemon_name: string | null
          pokemon_type: string | null
          price: number | null
          price_tier: string | null
          product_category: string | null
          rarity: string | null
          release_year: number | null
          set_id: string | null
          set_name: string | null
          source: string
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          artist?: string | null
          card_id: string
          card_name: string
          card_number?: string | null
          card_type?: string | null
          created_at?: string
          era?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          liked_at?: string
          pokemon_name?: string | null
          pokemon_type?: string | null
          price?: number | null
          price_tier?: string | null
          product_category?: string | null
          rarity?: string | null
          release_year?: number | null
          set_id?: string | null
          set_name?: string | null
          source?: string
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          artist?: string | null
          card_id?: string
          card_name?: string
          card_number?: string | null
          card_type?: string | null
          created_at?: string
          era?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          liked_at?: string
          pokemon_name?: string | null
          pokemon_type?: string | null
          price?: number | null
          price_tier?: string | null
          product_category?: string | null
          rarity?: string | null
          release_year?: number | null
          set_id?: string | null
          set_name?: string | null
          source?: string
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      pokeyelp_reviews: {
        Row: {
          card_id: string
          card_image: string | null
          card_name: string
          card_price: number | null
          card_set: string | null
          created_at: string
          credits_awarded: number
          custom_tags: string[]
          id: string
          tags: string[]
          user_id: string
        }
        Insert: {
          card_id: string
          card_image?: string | null
          card_name: string
          card_price?: number | null
          card_set?: string | null
          created_at?: string
          credits_awarded?: number
          custom_tags?: string[]
          id?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          card_id?: string
          card_image?: string | null
          card_name?: string
          card_price?: number | null
          card_set?: string | null
          created_at?: string
          credits_awarded?: number
          custom_tags?: string[]
          id?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      portfolio_value_snapshots: {
        Row: {
          created_at: string
          id: string
          item_count: number
          snapshot_date: string
          total_cost_basis: number
          total_market_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_count?: number
          snapshot_date?: string
          total_cost_basis?: number
          total_market_value?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_count?: number
          snapshot_date?: string
          total_cost_basis?: number
          total_market_value?: number
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          allocation: Json | null
          created_at: string
          id: string
          items: Json
          raw_csv: string
          session_id: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          allocation?: Json | null
          created_at?: string
          id?: string
          items?: Json
          raw_csv: string
          session_id: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          allocation?: Json | null
          created_at?: string
          id?: string
          items?: Json
          raw_csv?: string
          session_id?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      printing_aliases: {
        Row: {
          alias: string
          canonical_printing: string
          created_at: string
          id: string
        }
        Insert: {
          alias: string
          canonical_printing: string
          created_at?: string
          id?: string
        }
        Update: {
          alias?: string
          canonical_printing?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      pullorpass_dna: {
        Row: {
          archetype: string | null
          pass_count: number
          pull_count: number
          rounds_completed: number
          tag_counts: Json
          traits: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          archetype?: string | null
          pass_count?: number
          pull_count?: number
          rounds_completed?: number
          tag_counts?: Json
          traits?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          archetype?: string | null
          pass_count?: number
          pull_count?: number
          rounds_completed?: number
          tag_counts?: Json
          traits?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pullorpass_swipes: {
        Row: {
          card_id: string
          card_image: string | null
          card_name: string
          card_price: number | null
          card_rarity: string | null
          card_set: string | null
          created_at: string
          decision: string
          id: string
          round_id: string
          tags: string[]
          user_id: string
        }
        Insert: {
          card_id: string
          card_image?: string | null
          card_name: string
          card_price?: number | null
          card_rarity?: string | null
          card_set?: string | null
          created_at?: string
          decision: string
          id?: string
          round_id: string
          tags?: string[]
          user_id: string
        }
        Update: {
          card_id?: string
          card_image?: string | null
          card_name?: string
          card_price?: number | null
          card_rarity?: string | null
          card_set?: string | null
          created_at?: string
          decision?: string
          id?: string
          round_id?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      sealed_ppt: {
        Row: {
          category: string | null
          id: string
          image_cdn_url: string | null
          low_price: number | null
          market_price: number | null
          name: string
          set_name: string | null
          tcgplayer_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          id: string
          image_cdn_url?: string | null
          low_price?: number | null
          market_price?: number | null
          name: string
          set_name?: string | null
          tcgplayer_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          id?: string
          image_cdn_url?: string | null
          low_price?: number | null
          market_price?: number | null
          name?: string
          set_name?: string | null
          tcgplayer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sentiment_cache: {
        Row: {
          cards_down: number
          cards_total: number
          cards_up: number
          cards_up_pct: number
          created_at: string
          id: string
          snapshot_date: string
        }
        Insert: {
          cards_down?: number
          cards_total?: number
          cards_up?: number
          cards_up_pct?: number
          created_at?: string
          id?: string
          snapshot_date: string
        }
        Update: {
          cards_down?: number
          cards_total?: number
          cards_up?: number
          cards_up_pct?: number
          created_at?: string
          id?: string
          snapshot_date?: string
        }
        Relationships: []
      }
      set_aliases: {
        Row: {
          alias: string
          canonical_set: string
          created_at: string
          id: string
          source: string
        }
        Insert: {
          alias: string
          canonical_set: string
          created_at?: string
          id?: string
          source?: string
        }
        Update: {
          alias?: string
          canonical_set?: string
          created_at?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      set_value_daily: {
        Row: {
          avg_card_price: number | null
          cards_count: number
          created_at: string
          id: string
          set_name: string
          snapshot_date: string
          total_value: number
        }
        Insert: {
          avg_card_price?: number | null
          cards_count?: number
          created_at?: string
          id?: string
          set_name: string
          snapshot_date: string
          total_value?: number
        }
        Update: {
          avg_card_price?: number | null
          cards_count?: number
          created_at?: string
          id?: string
          set_name?: string
          snapshot_date?: string
          total_value?: number
        }
        Relationships: []
      }
      sets_ppt: {
        Row: {
          id: string
          logo_url: string | null
          name: string
          release_date: string | null
          series: string | null
          tcgplayer_id: string | null
          total_cards: number | null
          updated_at: string
        }
        Insert: {
          id: string
          logo_url?: string | null
          name: string
          release_date?: string | null
          series?: string | null
          tcgplayer_id?: string | null
          total_cards?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          name?: string
          release_date?: string | null
          series?: string | null
          tcgplayer_id?: string | null
          total_cards?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_asset_mappings: {
        Row: {
          confidence: number
          created_at: string
          id: string
          method: string
          resolved_tcgplayer_id: string | null
          resolved_variant_id: string | null
          upload_fingerprint: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          method?: string
          resolved_tcgplayer_id?: string | null
          resolved_variant_id?: string | null
          upload_fingerprint: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          method?: string
          resolved_tcgplayer_id?: string | null
          resolved_variant_id?: string | null
          upload_fingerprint?: string
          user_id?: string
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variants_justtcg: {
        Row: {
          card_id: string
          condition: string | null
          created_at: string
          id: string
          language: string | null
          last_updated: number | null
          price_current: number | null
          printing: string | null
          tcgplayer_sku_id: string | null
          updated_at: string
          variant_key: string | null
        }
        Insert: {
          card_id: string
          condition?: string | null
          created_at?: string
          id: string
          language?: string | null
          last_updated?: number | null
          price_current?: number | null
          printing?: string | null
          tcgplayer_sku_id?: string | null
          updated_at?: string
          variant_key?: string | null
        }
        Update: {
          card_id?: string
          condition?: string | null
          created_at?: string
          id?: string
          language?: string | null
          last_updated?: number | null
          price_current?: number | null
          printing?: string | null
          tcgplayer_sku_id?: string | null
          updated_at?: string
          variant_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_justtcg_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_justtcg"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_set_stats: {
        Args: never
        Returns: {
          cards_count: number
          median_30d: number
          median_7d: number
          median_90d: number
          set_name: string
          total_value: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
