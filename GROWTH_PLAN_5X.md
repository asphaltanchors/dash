# 5x Growth Plan — Grounded in Order Data 2016–2026

*Analysis of 16,071 orders / 44,485 line items / 7,533 companies from `analytics_mart`, July 5, 2026.*

## 1. Where the business actually is

Revenue: $1.29M (2024) → $1.77M (2025) → $1.02M YTD Jul 5 2026 vs $831K same period 2025 (+23%). Run rate ≈ $2.1–2.2M for 2026.

A calibration flag before the plan: your "3x natural" assumption is above what the data shows. Historic CAGR 2019→2025 is 21.6%/yr, which compounds to ~1.8x over 3 years. Even the recent whale-driven acceleration (2024→2025 +38%, 2025→2026 tracking +20%) compounds to ~2.2x. Natural growth is closer to 2x than 3x unless whale acquisition itself keeps accelerating. 5x from a 2026 base of ~$2.1M means ~$10.5M by mid-2029, a 71%/yr CAGR. The plan below has to close a bigger gap than the framing suggests — roughly $6–8M of new annual revenue, not $4M.

## 2. What the data says about where growth comes from

**Growth is 100% whale-driven. Everything else is flat.**

| Segment | 2022 | 2023 | 2024 | 2025 | 2026 YTD |
|---|---|---|---|---|---|
| OEM | $243K | $280K | $390K | $683K | $530K |
| Distributor | $177K | $224K | $313K | $456K | $228K |
| Direct Consumer | $524K | $504K | $559K | $548K | $196K |
| B2B Direct | $40K | $34K | $13K | $60K | $127K |

Direct Consumer has been flat at ~$520–560K for four years. Amazon: flat AOV ($152–166 since 2018), $153–207K/yr since 2022. Website: $333K → $347K → $387K → $386K. These channels are a cash cow, not a growth engine.

**Whale accounts (>$20K/yr):**

| Year | Count | Revenue | Share of total |
|---|---|---|---|
| 2023 | 7 | $322K | 31% |
| 2024 | 9 | $647K | 50% |
| 2025 | 16 | $1,101K | 62% |

The entire 2024→2025 jump ($486K) is explained by new whales: Anixter/Wesco ($191K year one, $214K in 2026 YTD — your largest account within 18 months), Hillman ($36K), Summit Electric ($26K), Reynolds ($24K), plus ramping McCue ($0.2K → $31K → $79K) and A-Safe ($6K → $35K → $150K peak).

**Whales stick and grow.** Dollar retention of >$20K accounts: 2023 cohort → 148% the following year; 2024 cohort → 107%. 9/9 of 2024's whales ordered again in 2025. Once landed, a whale compounds — Anixter, McCue, A-Safe all multiplied 3–25x from year one.

**Whale acquisition is rare and founder-dependent.** You add ~750–950 new companies each year, but median first-year value is ~$250 — e-commerce noise. New companies worth >$20K in their first year: roughly 0–1 per year historically, 4 in 2025. The 2025 inflection wasn't more customers; it was you personally landing national distributors.

**Other findings that shape the plan:**

- Concentration: top 10 accounts = 53% of 2025 revenue; only 23 companies bought >$10K in 2025. This is both risk and proof that one deal moves the needle.
- SP58 (heavy-duty) validates the product-line thesis: $128K (2023) → $329K (2025) → $357K in 2026 YTD, driven almost entirely by Wesco/Anixter ($357K of SP58 lifetime) and Fortress ($43K). A new SKU family opened your biggest account.
- Fastenal is a 10-year customer worth only $5–23K/yr — a national fastener distributor buying at 1/20th of Anixter's rate. Same motion that grew Anixter applies.
- 22 lapsed accounts with >$10K lifetime ($477K combined) have not ordered since 2024: Vectura ($58K), Gadelius ($37K), Runway Safe ($28K), City of New Braunfels ($33K), Charlotte Motor Speedway ($24K), etc.
- Trade shows as currently run don't work: Fence Expo 2025 produced 51 leads, 0 new customers, ~2% even matched to existing companies.
- Paid search attributes only ~$5–10K/month of website revenue; the website's real job is inbound discovery for B2B (B2B Direct is up 4.6x YTD on small numbers).
- Costco Wholesale #691 already bought once — a warehouse-level order, which supports the corporate pipeline story.
- Validated verticals in the customer base: fastener/industrial distribution (Fasteners Plus $387K lifetime, Norfast $382K, MJC $241K, MKT, Fastco, Edmonton, Metro, Hillman), safety barriers/OEM (A-Safe, McCue, IdealShield→Costco), flood control (US Flood Control $255K, AquaFence $97K), self-storage (MJC's niche), modular ramps/structures (Upside $131K, Duo-Gard $218K), speedways/stadiums, municipal/schools (LAUSD $49K).

## 3. The 5x math

Target: ~$10.5M annual by mid-2029 from ~$2.1M today. A ramped whale is worth $69K/yr on average (2025 mean; median $44K), but the ceiling is far higher (Anixter $200K+, potential Costco $200K). The bridge:

| Lever | 2029 contribution |
|---|---|
| Base business at historic trend (~20%/yr, flat consumer + existing whale NDR) | $3.6M |
| Expand inside landed national accounts (Wesco branches, Hillman, Fastenal, Grainger) | $1.5M |
| New whale engine: 10–12 landed/yr × 3 yrs × ~$110K avg ramped | $3.6M |
| US-made line → government/DOT/municipal (Buy America unlock) | $0.8M |
| Heavy-duty line into remaining barrier/flood/storage OEMs | $0.6M |
| Reactivation + automated distributor replenishment | $0.3M |
| **Total** | **~$10.4M** |

The controlling constraint: you currently land 3–4 whales/yr, all sourced by you. 5x requires ~1/month. Every element of the plan serves that number.

## 4. The plan

### Pillar 1 — Industrialize whale acquisition (the core lever)

The Costco/IdealShield win came from you cold-calling one company in a validated vertical. The data says this is repeatable: every vertical with 2+ existing accounts is proven demand. Build the named-account machine:

1. **Build the target list from your own data.** For each validated vertical, enumerate the 20–50 other companies that look like your existing buyers (A-Safe → all bollard/barrier makers; US Flood Control → all flood-barrier vendors; MJC → all self-storage suppliers; Anixter → every national/regional electrical & industrial distributor; Upside → every modular ramp/canopy/shelter OEM; Charlotte Motor Speedway → every track and stadium facilities group). That's a 300–500 account universe. Your enrichment pipeline (`fct_companies.enriched_industry`) already half-supports this.
2. **Document your own playbook, then hire against it.** Script what you do on the IdealShield-type call: which SKU opens the door (SP58 for distributors, SP10 for OEMs), the spec-sheet/sample offer, the distributor discount structure (your data shows 35–50% tiers already standardized). Then hire 1–2 dedicated BD reps whose only metric is new accounts >$20K first year. At $110K avg ramped whale value and 100%+ retention, a rep landing 6/yr pays for themselves several times over in year one.
3. **Weekly cadence, not campaigns.** 10 first-touches/week/rep against the named list. You keep the strategic 10 (Costco-scale); reps take the 300.

### Pillar 2 — Expand inside the whales you already landed

Highest-confidence revenue in the plan, because NDR is already >100% without anyone working it:

- **Wesco/Anixter**: $214K YTD from what is presumably a slice of branches. Wesco has ~800 locations. Getting stocked as a standard catalog item across regions is a single corporate conversation worth potentially $500K–1M/yr.
- **Hillman** ($36K, year one) sells into thousands of retail/industrial doors — same motion.
- **Fastenal**: 10 years of $5–23K/yr proves the account is open but unworked. A national stocking agreement is the upside case; even 5x current run rate is $50K+.
- Add Grainger, Home Depot Pro, White Cap, Border States to the same national-distribution track — they are Anixter's peers, and Anixter took ~6 months to become your #1 account.

Assign every >$20K account a named owner (you, until hires land) with a quarterly touch. Today no one owns them — retention is good by accident.

### Pillar 3 — Product line as door-opener, not shelf-extender

The data shows new SKUs open new accounts rather than upselling old ones (SP58 → Wesco/Fortress; adhesives are steady ~$130K attach revenue):

- **Heavy-duty line**: aim it at the barrier/flood/guarding OEM list (A-Safe's competitors, highway products, dock equipment). SP58's trajectory ($128K → $357K YTD in 3 years) is the template.
- **US-made line**: its value is market access, not preference — Buy America/BABA compliance unlocks DOT, municipal, military, and school procurement you currently can't bid. You already have LAUSD ($49K), New Braunfels ($33K, lapsed), Miami Beach ($21K, lapsed) buying the import product where rules allowed. Price it at a premium (list margins of 60–75% leave room for US COGS) and hand it to the BD reps as the government-vertical opener. This also hedges the China tariff/supply concentration risk that a $10M single-source import business shouldn't carry.

### Pillar 4 — Stop the leaks (cheap, immediate)

- **Reactivation**: 22 accounts, >$10K lifetime each, silent since 2024, $477K combined history. One founder call each. Even 30% recovery ≈ $100K/yr.
- **Replenishment monitoring**: Fasteners Plus ordered 93 times in 30 months; Norfast, MKT, Fastco order monthly-ish. Build a simple alert off `fct_company_orders` when a distributor's gap exceeds 1.5x their median interval. Distributors churn silently by switching suppliers; a call at day 45 beats a post-mortem at day 180.
- **Fix trade shows or cut them**: Fence Expo produced zero new customers from 51 leads. Either wire leads into a 48-hour sample-kit follow-up owned by a rep, or spend the money on BD salary instead.

### Pillar 5 — Milk, don't feed, the consumer channels

Amazon and the website fund the payroll above — treat them as a stable $1M that needs zero growth investment. Two exceptions worth the effort: keep FBA in stock (the 2023 Amazon dip to $154K from $193K looks like availability, worth confirming), and mine web orders for corporate domains — a $150 website order from an @wesco.com address in 2024 would have been the cheapest lead you ever got. That filter is a one-day dashboard feature (`fct_orders.primary_contact_email` + `fct_companies.domain_type`).

## 5. Sequencing

**Now–Q4 2026**: Close Costco. Wesco corporate-expansion conversation. Reactivation calls (22). Build named-account list (~300) from the vertical map. Document the sales playbook. Replenishment alert + corporate-domain flag in dashboard.

**Q1–Q2 2027**: Hire BD rep #1 against the playbook. US-made line launches → government named-account track. Fastenal/Grainger national-stocking push. Target exit rate: 8 new whales landed in 2027, revenue ~$3.2–3.6M.

**2028**: Rep #2 if rep #1 hits ≥5 whales. Heavy-duty line fully in barrier/flood OEM channel. Target 10–12 new whales, ~$5.5–6.5M.

**2029**: Machine runs: 2 reps + you on strategic accounts, ~$9–10.5M. If national stocking (Wesco all-region, Fastenal, or a Costco rollout) hits, earlier.

**Leading indicator to watch monthly**: new accounts crossing $20K trailing-12-months. It needs to go from ~4/yr to ~10–12/yr. Nothing else on the dashboard predicts 5x.

## 6. Risks the data flags

Concentration gets worse before better: top 10 = 53% of revenue today, and this plan doubles down on large accounts — mitigate with the 300-account breadth, credit checks, and no account >15% of revenue by 2028. Inventory/working capital: whale POs are lumpy ($29.6K single McCue orders); $10M of revenue on China lead times means committing to inventory ahead of POs — the US line shortens this. Founder bottleneck: if the playbook doesn't transfer to a hire, the plan caps at ~$4M; test with hire #1 early. Wesco dependency: at $214K YTD it's ~20% of revenue — the expansion push and its diversification (Hillman/Fastenal/Grainger) are the hedge.

## 7. Data caveats

Margin fields in `fct_order_line_items` are unreliable at the aggregate level (weighted actual margin computes to 7–10%, contradicting product-level 50–75% — likely cost-basis gaps); I used list-margin figures only directionally. Two McCue orders are future-dated (Jul 6 and Aug 28, 2026, $29.6K each); they are excluded from the Jul-5 YTD figure but will appear in full-year 2026 totals. `B2B Direct` segment tagging looks noisy (AOV $205 vs Direct Consumer $308 — likely misclassified small web orders). Segment revenue splits by calendar year exclude a small untagged remainder.
