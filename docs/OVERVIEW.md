# MintdBrief — Product & Architecture Overview

## What Is MintdBrief?

MintdBrief is a Pokémon TCG portfolio management and market intelligence platform. It helps collectors and investors track their collection's value, understand their collector personality, discover cards that match their taste, and make smarter buy/sell decisions using real-time market data.

---

## Core Features

### 1. Portfolio Management
Users upload a CSV or enter cards manually. The app parses the data, fuzzy-matches each card against the JustTCG market catalog, and assigns live prices. From there it calculates:

- **Portfolio health score** — weighted across asset diversity (45%), era allocation (35%), and concentration risk (20%)
- **Era allocation** — breaks holdings into Vintage, Classic, Modern, Ultra-Modern, and Current
- **Insights & rebalancing** — flags concentration risks and suggests rebalancing moves
- **Historical snapshots** — daily snapshots record portfolio value over time for performance tracking

**Key files:** `PortfolioContext.tsx`, `portfolioCalculations.ts`, `dataParser.ts`, `match-prices` edge function, `snapshot-portfolio-values` edge function

---

### 2. Personality & Taste Profiling
A 30-question Likert-scale quiz identifies the user as one of 12 collector archetypes:

> Investor · Archivist · Dreamer · Flipper · Analyst · Hunter · Explorer · Curator · Monk · Gambler · Showman · Minimalist

Each archetype comes with recommended asset allocations, characteristic traits, and tailored card recommendations. Results are stored in Supabase and used to personalize the entire app experience.

**Key files:** `personalityEngine.ts`, `personalityAssets.ts`, `PersonalityTest.tsx`, `archetypes` table

---

### 3. Pull or Pass (Swipe Discovery)
A Tinder-style card discovery interface. Users swipe pull/pass/love/super on cards. The system:

- Tracks community-level voting stats per card (`card_community_stats` table)
- Enforces daily swipe limits (50 free, expandable via reviews)
- Feeds swipe data into the recommendation engine and taste profile
- Shows card details (price, rarity, grade) on demand

**Key files:** `PullOrPass.tsx`, `pullorpass.ts`, `likesService.ts`, `card_community_stats` table

---

### 4. BuyList (Market Intelligence)
Premium feature gated behind a Stripe subscription or invite code. Includes:

- **Buy/sell picks** — curated cards with target prices and analyst rationale
- **Market movers** — cards with significant recent price movement
- **Set-level analysis** — trends across entire sets
- **Watchlist** — user-managed list of cards to monitor
- **Scanner** — look up any card and get market intelligence
- **Opportunities** — automated price opportunity alerts

Access is managed via `buylist_access` and `buylist_invites` tables. Admin CRUD for picks is handled through `BuyListContext`.

**Key files:** `BuyListContext.tsx`, `BuyListMain.tsx`, `buylist_picks` table, `buylist_price_snapshots` table

---

### 5. PokeYelp (Community Tagging)
A large-scale community card tagging interface — like Yelp reviews but for card aesthetics and characteristics. Users vote on tags across categories: aesthetic, emotional, action, species, appeal. AI fills in suggestions when community votes are sparse.

**Key files:** `PokeYelp.tsx`, `card_tag_aggregates` table, `suggest-card-tags` edge function, `pokeyelp-suggest-tags` edge function

---

### 6. Smart Feed & Daily Brief
An AI-powered personalized news feed based on the user's portfolio and taste profile. Surfaces relevant market news, price movements, and card intelligence. Available in a full feed view and a brief/digest format.

**Key files:** `SmartFeed.tsx`, `SmartFeedBrief.tsx`, `smartBrief.ts`, `scrape-pokebeach` edge function

---

### 7. Tools
- **Pack Gains Calculator** — expected value calculator for sealed products using pack odds
- **Sealed vs. Singles** — comparison tool for sealed product vs. individual card investment
- **Portfolio Simulator** — scenario planning across assets, eras, and investment roadmaps
- **PDF Report Generation** — exportable portfolio analysis reports

**Key files:** `PackGainsCalculator.tsx`, `SealedVsCards.tsx`, `SimulatorOverview.tsx`, `generate-pdf` edge function

---

### 8. Payments & Premium Access
Stripe handles all payments. The flow:
1. `create-checkout` edge function creates an embedded Stripe checkout session
2. On success, `payments-webhook` records the subscription in the database
3. `useIsPremium` hook checks subscription status to gate premium UI
4. `create-portal-session` lets users manage their billing

**Key files:** `create-checkout`, `payments-webhook`, `create-portal-session` edge functions, `useIsPremium.ts`

---

## Architecture

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | TailwindCSS + shadcn/ui |
| Routing | React Router |
| Server state | React Query |
| Animations | Framer Motion |
| Charts | Recharts |
| Payments UI | Stripe React SDK |

### Backend
| Layer | Technology |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + anonymous sessions) |
| Edge Functions | Supabase Edge Functions (Deno + TypeScript) |
| Payments | Stripe |

### State Management
- **PortfolioContext** — global portfolio data, price matching, health score, CSV upload
- **BuyListContext** — premium picks, watchlist, invite redemption, admin CRUD
- **React Query** — server data caching for API calls and Supabase queries

---

## Data Flow

```
User uploads CSV
      ↓
PortfolioContext parses & validates data
      ↓
match-prices edge function fuzzy-matches cards → JustTCG API
      ↓
Matched items stored in portfolios table (Supabase)
      ↓
snapshot-portfolio-values runs daily (cron)
      ↓
portfolio_snapshots table records historical value
      ↓
Dashboard reads snapshots → renders charts, health score, insights
```

---

## External APIs

| API | Purpose |
|---|---|
| **JustTCG** (`api.justtcg.com/v1`) | Primary market pricing, catalog matching |
| **Pokemon TCG API** (`api.pokemontcg.io/v2`) | Card database, set info, images |
| **Pokemon Price Tracker** (`pokemonpricetracker.com/api/v2`) | Secondary pricing source |
| **Stripe** | Subscriptions, checkout, billing portal |
| **PokeBeach** (scraped) | News headlines for Smart Feed |
| **TCGPlayer CDN** | Card product images |

---

## Edge Functions Reference

| Function | Purpose |
|---|---|
| `match-prices` | Fuzzy-matches portfolio items to JustTCG catalog with confidence scoring |
| `sync-market-data` | Batch syncs JustTCG price data into `market_snapshots` daily |
| `sync-ppt-data` | Syncs Pokemon Price Tracker data (4-day interval) |
| `snapshot-portfolio-values` | Records daily portfolio value snapshots per user |
| `compute-market-index` | Aggregates market-wide index calculations |
| `compute-greatest-hits` | Identifies top gaining cards |
| `pokemon-tcg` | Proxies Pokemon TCG API with rate limiting (60 req/min) |
| `pokemon-price-tracker` | Proxies PPT API with rate limiting (30 req/min) |
| `suggest-card-tags` | AI tag suggestions when community votes are sparse |
| `pokeyelp-suggest-tags` | AI tags for PokeYelp (aesthetic, emotional, appeal) |
| `create-checkout` | Creates Stripe embedded checkout sessions |
| `payments-webhook` | Handles Stripe subscription/payment events |
| `create-portal-session` | Creates Stripe billing portal sessions |
| `redeem-invite` | Validates and redeems buylist invite codes |
| `generate-pdf` | Generates PDF portfolio reports |
| `scrape-pokebeach` | Scrapes PokeBeach news headlines |
| `admin-api` | Admin operations (user management, swipe counts) |
| `ingest-unified` | Processes uploaded portfolio data |
| `ingest-events` | Records user interaction events |
| `justtcg` | Direct JustTCG API wrapper |
| `collectr` | Collectr portfolio format integration |

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `portfolios` | User portfolio items and summary data |
| `portfolio_snapshots` | Historical daily portfolio values |
| `market_snapshots` | Daily market price data from external APIs |
| `card_community_stats` | Aggregated swipe/vote stats per card |
| `card_tag_aggregates` | Community-voted card tags |
| `card_embeddings` | Vector embeddings for card similarity |
| `archetypes` | 12 collector personality type definitions |
| `quiz_responses` | User personality quiz answers |
| `user_profiles` | User metadata and preferences |
| `likes` | Individual user swipe history |
| `buylist_picks` | Active buy/sell recommendations |
| `buylist_items` | Buylist catalog entries |
| `buylist_price_snapshots` | Historical buylist pricing |
| `buylist_watchlist` | User watchlist entries |
| `buylist_access` | Premium feature access records |
| `buylist_invites` | Invite codes for premium access |
