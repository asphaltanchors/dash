# Dashboard Enrichment Enhancements

This document tracks potential enhancements to incorporate the new enrichment data from the DBT pipeline.

## Available Enrichment Data

### Company Enrichment (`fct_companies`)
- **Industry Intelligence**: Industry classification, employee count, annual revenue estimates
- **Company Profile**: Founded year, company descriptions, enrichment source tracking
- **External Data**: Sourced from coresignal.com and other providers

### Health & Risk Analysis (`dim_company_health`)
- **Health Scoring**: 0-100 health scores with categorization (Excellent/Good/Fair/Poor)
- **Customer Archetypes**: HF (High Frequency), REG (Regular), HVLF (High Value Low Frequency)
- **Engagement Metrics**: Activity status, engagement levels, growth trend analysis
- **Risk Flags**: At-risk and growth opportunity identification
- **Performance Metrics**: Revenue percentile rankings, days since last order

### Time Series Analytics (`fct_company_orders_time_series`)
- **Trend Analysis**: Quarterly performance tracking with YoY/QoQ growth calculations
- **Activity Classification**: Revenue tiers and activity levels by quarter
- **Exception Detection**: Exceptional growth and concerning decline flags
- **Performance Evolution**: Revenue tier changes over time

### Product-Level Insights (`fct_company_products`)
- **Purchase Behavior**: Buyer status, purchase frequency/volume categories
- **Pricing Analysis**: Price variance, margin analysis by product-company combination
- **Relationship Depth**: Product diversity and purchase patterns

## Enhancement Roadmap

### Phase 1: Company Detail Page (HIGH PRIORITY)
- [x] Plan enhancements to company detail page
- [ ] **Industry Intelligence Section**
  - Display enriched industry, employee count, annual revenue
  - Show company description and founded year
  - Compare company size vs industry benchmarks
- [ ] **Enhanced Health Metrics**
  - Detailed health score breakdown with visual indicators
  - Customer archetype explanation with tooltips
  - Revenue percentile visualization (progress bar)
  - Risk alerts with actionable recommendations
- [ ] **Quarterly Performance Charts**
  - Revenue/order trends with growth indicators
  - YoY/QoQ growth visualization
  - Activity level changes over time
  - Exception highlighting (growth spikes, declines)

### Phase 2: Companies List Page (MEDIUM PRIORITY)
- [ ] **Enhanced Filtering Options**
  - Industry filtering (from enrichment data)
  - Employee count ranges
  - Health score ranges
  - Customer archetype selection
  - At-risk/growth opportunity flags
- [ ] **Enriched Table Display**
  - Industry and employee count columns
  - Health score with visual indicators
  - Growth trend badges
  - Revenue percentile ranking

### Phase 3: Company Analytics Dashboard (MEDIUM PRIORITY)
- [ ] **Executive Summary Cards**
  - Health score distribution across customer base
  - Industry breakdown and concentration
  - Risk vs opportunity company counts
  - Revenue concentration by customer archetype
- [ ] **Risk Management Views**
  - At-risk companies with specific issues identified
  - Declining growth trends requiring immediate attention
  - Growth opportunity identification for targeted upselling
- [ ] **Performance Analytics**
  - Industry benchmarking and comparison
  - Customer lifecycle analysis
  - Revenue concentration and diversification metrics

### Phase 4: Product Intelligence (LOW PRIORITY)
- [ ] **Product-Customer Relationship Analysis**
  - Product affinity and cross-sell opportunities
  - Price sensitivity analysis by customer segment
  - Purchase pattern insights for inventory planning

## Technical Implementation Notes

### Database Schema Updates
- All new tables are available in `lib/db/schema.ts`
- Primary relationships: `company_domain_key` links across tables
- Time series data uses `quarter_label` and date fields for trend analysis

### Query Patterns
- Health data should be left-joined to avoid missing companies
- Time series queries need careful date filtering for current vs historical
- Enrichment data may be null/incomplete - always provide fallbacks

### UI/UX Considerations
- Health scores need color coding and visual hierarchy
- Growth trends should use directional indicators (arrows, colors)
- Risk alerts require clear visual distinction and actionable messaging
- Industry data should be formatted consistently across components

## Success Metrics
- Increased engagement with company detail pages
- Faster identification of at-risk customers
- Improved sales team utilization of customer insights
- Better customer segmentation for targeted outreach