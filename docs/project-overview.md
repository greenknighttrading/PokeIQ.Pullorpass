# PokeIQ — Project Documentation

## What Is PokeIQ?

PokeIQ is a Pokémon TCG portfolio management and market intelligence platform. It helps collectors and investors track their card collections, understand their market value, discover new cards that match their taste, and make smarter buying and selling decisions.

The app combines four core pillars:
- **Community discovery** — swipe on cards, vote on tags, and explore what the community loves
- **Portfolio management** — upload and track your collection with live pricing
- **Personality profiling** — understand your collector identity and get personalized recommendations
- **Market intelligence** — access buy/sell picks, price movers, and market trends

---

## Features

### Swipe / Card Discovery (`/`, `/swipe`, `/matches`)

A Tinder-style card discovery interface where users swipe on cards to express interest:

- **Pull** — I'd buy this
- **Pass** — not for me
- **Love** — strong yes
- **Super** — must have

Each swipe is recorded and contributes to the **community stats** for that card (pull %, popularity score, hover time). The swipe engine uses these stats plus the user's taste profile to surface relevant cards.

Free users get 50 swipes per day. Additional swipes can be earned by leaving reviews.

Match history is accessible via `/matches`, organised by category in `/matches/:category`.

### Dashboard & Portfolio (`/home`, `/collection`, `/report`)

The dashboard gives users a real-time snapshot of their portfolio. When a user uploads their collection (via CSV), the app parses the data, fuzzy-matches each card against live market pricing from JustTCG, and calculates a multi-dimensional **portfolio health score**:

- **Asset diversity** (45% of score) — how well-spread the collection is across different cards
- **Era allocation** (35%) — balance across vintage, classic, modern, ultra-modern, and current era cards
- **Concentration risk** (20%) — whether too much value is tied up in a single card or set

The `/collection` page shows the full inventory with grid and table views, manual card entry, and live price refresh. The `/report` page generates a detailed printable/PDF report with charts, breakdowns, and investment analysis.

---

### Personality Test & Archetypes (`/test`, `/personality-types`)

A 30-question Likert-scale quiz that identifies which of 12 collector archetypes best describes the user:

| Archetype | Description |
|---|---|
| Investor | Focused on ROI and long-term value |
| Archivist | Wants to own complete sets and catalogues |
| Dreamer | Collects based on nostalgia and emotion |
| Flipper | Buys and sells for short-term profit |
| Analyst | Data-driven, tracks everything |
| Hunter | Loves the thrill of the chase |
| Explorer | Always looking for new sets and formats |
| Curator | Selects only the most beautiful or iconic cards |
| Monk | Minimalist — few cards, all meaningful |
| Gambler | Loves sealed product and pack opening |
| Showman | Collects to display and impress |
| Minimalist | Quality over quantity, strict criteria |

Each archetype comes with recommended portfolio asset allocations (e.g. what % vintage vs. modern) and influences the recommendation engine.

Public collector profiles can be shared via `/collector/:slug`.

---

---

### BuyList & Market Intelligence (`/buylist/*`)

A premium feature set giving users access to curated buy/sell intelligence:

- **BuyList picks** — specific cards with target prices, rationale, and confidence scores
- **Market movers** — cards showing significant price movement across the tracked catalog
- **Set analysis** — set-level trends and opportunities
- **Watchlist** — user-defined watch list with price alerts
- **Scanner** — look up any card and get a full market intelligence report
- **Opportunities** — algorithmically identified price opportunities

Access is gated behind either a Stripe subscription or an invite code redemption.

---

### PokeYelp (`/pokeyelp`)

A large-scale community card tagging system, similar to Yelp reviews but for card attributes. Users vote on tags across several categories:

- **Aesthetic** — beautiful art, dark vibe, cute, nostalgic
- **Emotional** — hype, calm, iconic, underrated
- **Action** — buy the dip, overpriced, hold, flip candidate
- **Species** — the Pokémon featured
- **Appeal** — collector appeal, investor appeal

When votes are low on a card, an AI edge function suggests tags based on the card's known attributes. Tag aggregates are stored per card and used to power the recommendation engine.

---

### Pack Gains Calculator (`/pack-gains`, `/tools/sealed-vs-cards`)

Tools for evaluating sealed product:

- **Pack EV calculator** — calculates expected value of opening a pack based on pull rates and current card prices
- **Sealed vs. Singles** — side-by-side comparison of buying sealed product vs. buying individual cards

---

### Smart Feed (`/smart-feed`, `/smart-feed/brief`)

An AI-powered personalised news and market feed based on:
- The user's portfolio holdings
- Their personality archetype
- Their swipe history and taste profile

Surfaces relevant market news, price movements on owned cards, and recommendations tailored to the user's collector identity.

---

### Portfolio Simulator (`/simulator/*`)

A multi-screen planning tool for modelling portfolio changes:

- **Overview** — projected portfolio value over time
- **Assets** — simulate adding/removing specific cards
- **Eras** — adjust era allocation targets
- **Roadmap** — step-by-step investment plan
- **Insights** — projected health score and diversification
- **Plans** — save and compare multiple scenarios

---

### Daily Report (`/daily-report`, `/mintd-daily`)

A daily brief format summarising:
- Portfolio value changes from the previous day
- Top movers in the market
- New buy list picks or alerts
- Personalised insights based on holdings

---

### Admin Panel (`/admin`)

Accessible only to the admin user (`bryantjen06@gmail.com`). Provides:
- User management and profile viewing
- DNA swipe count management
- Admin CRUD for buylist picks and pricing
- Access to the `admin-api` edge function for privileged operations

---

## Backend Architecture

### Supabase

The entire backend runs on Supabase, which provides:
- **PostgreSQL database** — all user data, portfolio data, market data, community stats
- **Auth** — email/password authentication with anonymous session support and auto token refresh
- **Edge Functions** — 22 serverless Deno functions handling business logic, API proxying, and scheduled jobs
- **Realtime** — live subscriptions for community stats and swipe data

### Key Database Tables

| Table | Purpose |
|---|---|
| `portfolios` | User portfolio items and summary metrics |
| `portfolio_snapshots` | Daily snapshots of portfolio value over time |
| `market_snapshots` | Daily synced card pricing from JustTCG and PPT |
| `card_community_stats` | Aggregated swipe data per card (pull %, popularity) |
| `card_embeddings` | Vector embeddings for AI-powered card similarity |
| `card_tag_aggregates` | Community-voted tags per card |
| `buylist_picks` | Active buy/sell recommendations |
| `buylist_items` | Individual items within buy list picks |
| `buylist_price_snapshots` | Historical pricing for buylist cards |
| `buylist_watchlist` | User watchlist entries |
| `buylist_access` | Tracks which users have premium buylist access |
| `buylist_invites` | Invite codes for feature access |
| `archetypes` | 12 collector personality types with embeddings |
| `quiz_responses` | Personality test answers per user |
| `user_profiles` | User metadata and preferences |
| `likes` | User swipe history (pull/pass/love/super) |

---

## Edge Functions

All edge functions are Deno-based TypeScript serverless functions deployed to Supabase.

### Data Sync (Scheduled / Admin)

| Function | What It Does |
|---|---|
| `sync-market-data` | Syncs card price data from JustTCG into `market_snapshots`. Runs in batches with 350ms delays. Admin/cron only. |
| `sync-ppt-data` | Syncs market data from Pokemon Price Tracker. Runs on a 4-day interval. |
| `snapshot-portfolio-values` | Daily job that records current portfolio values for all users. Creates entries in `portfolio_snapshots`. |
| `compute-market-index` | Calculates aggregate market index values across the tracked card catalog. Admin only. |
| `compute-greatest-hits` | Identifies the biggest price gainers. Used on the dashboard and landing page. |

### User-Facing Data

| Function | What It Does |
|---|---|
| `match-prices` | Takes a user's portfolio items and fuzzy-matches them against the JustTCG catalog. Returns matched product names, prices, TCGPlayer IDs, and rarities. Core of the portfolio price update flow. |
| `pokemon-tcg` | Proxies requests to the Pokemon TCG API. Supports card search by name, set+name, card ID, and set listings. Rate limited to 60 req/min per IP. |
| `pokemon-price-tracker` | Proxies requests to the PPT API for real-time card pricing. Rate limited to 30 req/min due to credit costs. |
| `justtcg` | Direct access wrapper for the JustTCG API. |
| `ingest-unified` | Processes uploaded portfolio data. Integrates with the Collectr format. |
| `ingest-events` | Records user interaction events (swipes, scans, tag votes, impressions). |
| `collectr` | Handles the Collectr portfolio import format. |

### AI / Intelligence

| Function | What It Does |
|---|---|
| `suggest-card-tags` | When community votes on a card are too low, generates tag suggestions using AI against a constrained taxonomy stored in `public.tags`. |
| `pokeyelp-suggest-tags` | AI-powered tag suggestions specifically for the PokeYelp interface. Covers aesthetic, emotional, action, species, and appeal categories. |

### Payments (Stripe)

| Function | What It Does |
|---|---|
| `create-checkout` | Creates a Stripe embedded checkout session. Resolves or creates a Stripe customer and links it to the Supabase user ID. Supports one-time payments and subscriptions. |
| `payments-webhook` | Handles incoming Stripe webhook events. On successful payment, grants or updates the user's premium subscription in the database. Also handles cancellations. |
| `create-portal-session` | Creates a Stripe customer billing portal session so users can manage their subscription. |
| `redeem-invite` | Validates a buylist invite code and grants the user access to premium features. |

### Content & Reports

| Function | What It Does |
|---|---|
| `generate-pdf` | Generates portfolio reports as PDFs from HTML. Includes HTML sanitisation to prevent SSRF attacks. 5MB size limit. |
| `scrape-pokebeach` | Public news scraper for PokeBeach headlines. No authentication required. |
| `admin-api` | Admin gateway for privileged operations — user management, swipe count overrides, etc. Restricted to the admin email. |

---

## External APIs

| API | Used For |
|---|---|
| **Pokemon TCG API** (`api.pokemontcg.io/v2`) | Card database, set info, card images, pricing reference |
| **JustTCG API** (`api.justtcg.com/v1`) | Primary market pricing source. Batch-synced daily. Used in portfolio price matching. |
| **Pokemon Price Tracker (PPT)** (`pokemonpricetracker.com/api/v2`) | Alternative/supplementary market data. Rate-limited due to credit costs. |
| **Stripe** | Subscription billing, checkout, customer portal, webhook processing |
| **TCGPlayer CDN** (`tcgplayer-cdn.tcgplayer.com`) | Card product images |
| **PokeBeach** | News headlines scraped for the smart feed |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| Styling | TailwindCSS + shadcn/ui |
| Routing | React Router |
| Server state | React Query |
| Animations | Framer Motion |
| Charts | Recharts |
| Payments | Stripe React SDK |
| Auth | Supabase Auth + Lovable.dev cloud auth SDK |
| Database | Supabase (PostgreSQL) |
| Edge functions | Deno + TypeScript (Supabase Edge Functions) |
| Mobile | Capacitor (iOS) |

---

## How Data Flows

1. **User uploads a CSV** → `PortfolioContext` parses it and stores items in the `portfolios` table
2. **Price matching** → `match-prices` edge function fuzzy-matches portfolio items against JustTCG catalog → matched prices stored back to `portfolios`
3. **Daily sync** → `sync-market-data` and `sync-ppt-data` cron jobs update `market_snapshots` with fresh pricing
4. **Daily snapshots** → `snapshot-portfolio-values` records each user's total portfolio value in `portfolio_snapshots` for historical tracking
5. **Swipes** → recorded in `likes` table → `ingest-events` logs the interaction → `card_community_stats` updated with aggregated pull %
6. **Personality quiz** → answers stored in `quiz_responses` → archetype computed → influences recommendation engine and smart feed
7. **Premium access** → user pays via Stripe → `payments-webhook` grants access → `buylist_access` updated → premium features unlocked
