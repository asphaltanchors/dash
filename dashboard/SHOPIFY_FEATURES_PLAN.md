# Shopify Dashboard Features Implementation Plan

## Overview
This document outlines 10 high-value dashboard features leveraging new Shopify data in the analytics warehouse. Features are prioritized by business value and implementation complexity.

---

## Data Architecture Summary

### New Shopify Tables Available

#### `fct_customer_marketing`
- Customer ID, email, full name, company
- Email/SMS subscriber flags and consent dates
- Shopify order count & lifetime value
- Discount usage metrics (count, rate)
- Customer segment & status
- First/last order dates, days since last order

#### `fct_order_attribution`
- Order ID, customer ID, order date/month
- Acquisition channel
- UTM parameters (source, medium, campaign)
- Landing site & referring site
- Revenue, discount, shipping, tax amounts
- Marketing acceptance flag
- User agent data

#### `mart_marketing_performance`
- Monthly aggregation by channel/UTM
- Order count, customer count, revenue
- Discount metrics
- Marketing opt-in rates

---

## Feature Roadmap

### Priority 1: Core Marketing Insights

#### 1. **Marketing Attribution Dashboard** 📊
**Business Value**: Answers "Where do our customers come from?" - Critical for marketing ROI

**Key Metrics**:
- Total revenue by acquisition channel
- Customer acquisition cost (if cost data added)
- Lifetime value by channel
- Conversion rates by channel

**Visualizations**:
- Revenue attribution pie/bar chart (by acquisition_channel)
- UTM campaign performance table (campaign → revenue, orders, AOV)
- Acquisition funnel (visitors → orders → revenue)
- Time-series: Monthly attributed revenue by top 5 channels
- Attribution comparison: First-touch vs last-touch revenue

**Tables Used**:
- `fct_order_attribution` (primary)
- `mart_marketing_performance` (aggregates)
- `fct_customer_marketing` (LTV data)

**Implementation**:
- Page: `app/marketing-attribution/page.tsx`
- Queries: `lib/queries/marketing.ts`
- Components:
  - `AttributionMetricCards.tsx`
  - `ChannelRevenueChart.tsx`
  - `CampaignPerformanceTable.tsx`

---

#### 2. **Email Marketing Performance** 📧
**Business Value**: Shopify email/SMS subscriber data shows marketing consent effectiveness

**Key Metrics**:
- Total email subscribers vs non-subscribers
- Total SMS subscribers
- Subscriber revenue vs non-subscriber revenue
- Consent-to-purchase conversion rate
- Average LTV: subscribers vs non-subscribers

**Visualizations**:
- Subscriber growth chart over time (email + SMS trends)
- Revenue comparison: Subscribers vs Non-subscribers
- Email consent funnel (consented → purchased → repeat customer)
- Segmented subscriber table (by customer segment)
- Discount usage correlation with email subscription

**Tables Used**:
- `fct_customer_marketing` (primary)
- `fct_orders` (joined on customer for revenue)

**Implementation**:
- Page: `app/email-marketing/page.tsx`
- Queries: `lib/queries/email-marketing.ts`
- Components:
  - `SubscriberMetrics.tsx`
  - `SubscriberGrowthChart.tsx`
  - `SubscriberRevenueComparison.tsx`
  - `ConsentFunnel.tsx`

---

#### 3. **Customer Lifetime Value (LTV) Analytics** 💰
**Business Value**: `fct_customer_marketing` contains Shopify LTV - critical for retention strategy

**Key Metrics**:
- Average LTV across all customers
- LTV distribution (quartiles)
- LTV by acquisition channel
- Average LTV by customer segment
- LTV vs order frequency correlation

**Visualizations**:
- LTV distribution histogram
- LTV by acquisition channel comparison (box plot or bar chart)
- LTV cohort analysis (by first order month)
- Scatter plot: Order count vs LTV
- High-LTV customer characteristics table (top 10%)

**Tables Used**:
- `fct_customer_marketing` (shopify_lifetime_value)
- `fct_order_attribution` (acquisition_channel)

**Implementation**:
- Page: `app/customer-ltv/page.tsx`
- Queries: `lib/queries/ltv.ts`
- Components:
  - `LTVMetricCards.tsx`
  - `LTVDistributionChart.tsx`
  - `LTVByChannelChart.tsx`
  - `HighValueCustomersTable.tsx`

---

### Priority 2: Optimization & Strategy

#### 4. **Discount & Promotion Analysis** 🎟️
**Business Value**: Optimize promotion strategy using discount usage patterns

**Key Metrics**:
- Overall discount usage rate
- Revenue from discounted vs non-discounted orders
- Average discount amount
- Customers by discount dependency (high/medium/low usage)
- Discount ROI

**Visualizations**:
- Discount usage rate trend over time
- Revenue split: Discounted vs Non-discounted
- Customer segments by discount dependency
- Products most frequently discounted (from line items)
- Discount effectiveness: Revenue generated vs discount cost

**Tables Used**:
- `fct_customer_marketing` (discount metrics)
- `fct_order_line_items` (product-level discounts)
- `fct_orders` (order totals)

**Implementation**:
- Page: `app/discounts-analysis/page.tsx`
- Queries: `lib/queries/discounts.ts`
- Components:
  - `DiscountMetricCards.tsx`
  - `DiscountTrendChart.tsx`
  - `RevenueByDiscountChart.tsx`
  - `DiscountDependencyTable.tsx`

---

#### 5. **Marketing Campaign ROI Dashboard** 📈
**Business Value**: Prove marketing value with aggregated campaign performance

**Key Metrics**:
- Revenue per campaign
- Orders per campaign
- Marketing opt-in rate per campaign
- Customer acquisition per campaign
- Average order value per campaign

**Visualizations**:
- Monthly campaign performance table (UTM campaign → metrics)
- Campaign trend charts (revenue over time by top campaigns)
- Opt-in rate by UTM source/medium/campaign
- Revenue per marketing opt-in
- Campaign comparison: UTM source performance

**Tables Used**:
- `mart_marketing_performance` (primary - monthly aggregates)

**Implementation**:
- Page: `app/marketing-roi/page.tsx`
- Queries: `lib/queries/campaign-roi.ts`
- Components:
  - `CampaignROIMetrics.tsx`
  - `CampaignTrendChart.tsx`
  - `CampaignPerformanceTable.tsx`
  - `OptInRateChart.tsx`

---

### Priority 3: Enhanced Existing Features

#### 6. **Enhanced Customer Detail Page** 👤
**Business Value**: Add Shopify insights to existing company detail views

**New Sections for Company Detail Page**:
- Marketing Profile card:
  - Email subscriber status (yes/no + consent date)
  - SMS subscriber status
  - Marketing consent timeline
- Acquisition card:
  - First acquisition channel
  - First UTM campaign
  - Referring site
  - Landing page
- Shopify Metrics card:
  - Shopify order count vs QuickBooks order count
  - Shopify lifetime value
  - Discount usage rate
  - Average order value (Shopify)

**Tables Used**:
- `fct_customer_marketing` (join to company)
- `fct_order_attribution` (join to orders)

**Implementation**:
- Modify: `app/companies/[domain]/page.tsx`
- Update queries: `lib/queries/companies.ts`
- New components:
  - `MarketingProfileCard.tsx`
  - `AcquisitionCard.tsx`
  - `ShopifyMetricsCard.tsx`

---

### Priority 4: Deep-Dive Analysis

#### 7. **Acquisition Source Analysis** 🔍
**Business Value**: Understand customer discovery paths for SEO/marketing optimization

**Key Metrics**:
- Top landing pages by conversion rate
- Top referring sites by revenue
- Mobile vs desktop conversion rates
- Geographic correlation with acquisition sources

**Visualizations**:
- Landing pages ranked by revenue
- Referring sites table (site → orders, revenue, AOV)
- User agent breakdown (mobile/desktop/tablet)
- Acquisition path Sankey diagram (referring → landing → purchase)
- Geographic heat map with acquisition source overlay

**Tables Used**:
- `fct_order_attribution` (landing_site, referring_site, user_agent)
- `fct_orders` (geography data)

**Implementation**:
- Page: `app/acquisition-sources/page.tsx`
- Queries: `lib/queries/acquisition.ts`
- Components:
  - `LandingPageTable.tsx`
  - `ReferringSiteChart.tsx`
  - `UserAgentBreakdown.tsx`
  - `AcquisitionPathFlow.tsx`

---

#### 8. **First-Time vs Repeat Customer Analysis** 🔄
**Business Value**: Understand retention patterns and new customer behavior

**Key Metrics**:
- New customer revenue vs repeat customer revenue
- Average time to second purchase
- Repeat purchase rate by cohort
- Retention rate (30/60/90 day)

**Visualizations**:
- Revenue split: New vs Repeat customers
- Time-to-second-purchase histogram
- Repeat purchase rate by acquisition channel
- Cohort retention curves (by first order month)
- First order AOV vs subsequent order AOV

**Tables Used**:
- `fct_customer_marketing` (first_order_date, last_order_date, shopify_order_count)
- `fct_orders`

**Implementation**:
- Page: `app/customer-retention/page.tsx`
- Queries: `lib/queries/retention.ts`
- Components:
  - `RetentionMetricCards.tsx`
  - `NewVsRepeatChart.tsx`
  - `TimeToRepeatHistogram.tsx`
  - `CohortRetentionChart.tsx`

---

#### 9. **Marketing Consent Compliance Dashboard** ✅
**Business Value**: Track GDPR/marketing law compliance and subscriber quality

**Key Metrics**:
- Total consented customers (email/SMS)
- Consent rate over time
- Days since consent for active subscribers
- At-risk subscribers (consented but no recent orders)

**Visualizations**:
- Consent timeline chart (consent dates over time)
- Consent rates by acquisition channel
- Subscriber engagement: Days since last order distribution
- At-risk subscriber table (consent but no order in 90+ days)
- Consent status distribution pie chart

**Tables Used**:
- `fct_customer_marketing` (email_consent_date, is_email_subscriber, is_sms_subscriber)

**Implementation**:
- Page: `app/marketing-compliance/page.tsx`
- Queries: `lib/queries/compliance.ts`
- Components:
  - `ConsentMetricCards.tsx`
  - `ConsentTimelineChart.tsx`
  - `SubscriberEngagementChart.tsx`
  - `AtRiskSubscribersTable.tsx`

---

#### 10. **Multi-Channel Customer Journey Map** 🗺️
**Business Value**: Understand how Shopify and QuickBooks channels interact

**Key Metrics**:
- Cross-channel customer count
- Revenue by channel combination
- Average touches before purchase
- Channel preference by customer segment

**Visualizations**:
- Customer journey flow diagram (UTM → Shopify/QBO channel → segment)
- Channel crossover matrix (started in X, purchased in Y)
- Multi-touch attribution (first touch vs last touch vs linear)
- Customer lifecycle: Shopify → Invoice conversion
- Revenue by attribution model comparison

**Tables Used**:
- `fct_order_attribution` (acquisition_channel)
- `fct_orders` (sales_channel from QuickBooks)
- `fct_customer_marketing`

**Implementation**:
- Page: `app/customer-journey/page.tsx`
- Queries: `lib/queries/customer-journey.ts`
- Components:
  - `JourneyFlowDiagram.tsx`
  - `ChannelCrossoverMatrix.tsx`
  - `AttributionModelComparison.tsx`
  - `ChannelPreferenceTable.tsx`

---

## Implementation Guidelines

### Standard Pattern for Each Feature

1. **Query File** (`lib/queries/[feature].ts`):
   ```typescript
   // ABOUTME: [Feature] queries and metrics
   // ABOUTME: [Brief description]

   export interface [Feature]Metric { ... }
   export async function get[Feature]Metrics(filters?) { ... }
   ```

2. **Page File** (`app/[feature]/page.tsx`):
   ```typescript
   // ABOUTME: [Feature] dashboard page
   // ABOUTME: [Brief description]

   - Header with breadcrumbs
   - Suspense-wrapped metric cards
   - Suspense-wrapped charts
   - Suspense-wrapped tables
   - Period selector (if applicable)
   ```

3. **Components** (`components/dashboard/[Feature]*.tsx`):
   - Follow existing pattern from `MetricCard`, `RevenueChart`, etc.
   - Use shadcn/ui components (Card, Table, Badge, etc.)
   - TypeScript interfaces for props
   - Proper loading states

4. **Navigation**:
   - Add to sidebar navigation
   - Group related features (Marketing, Customers, Analytics)

### Development Order

**Phase 1** (Weeks 1-2): Core Marketing
- Feature 1: Marketing Attribution Dashboard
- Feature 2: Email Marketing Performance
- Feature 5: Marketing Campaign ROI

**Phase 2** (Weeks 3-4): Customer Analytics
- Feature 3: Customer LTV Analytics
- Feature 8: First-Time vs Repeat Analysis
- Feature 6: Enhanced Customer Detail Page

**Phase 3** (Weeks 5-6): Optimization
- Feature 4: Discount & Promotion Analysis
- Feature 7: Acquisition Source Analysis

**Phase 4** (Weeks 7-8): Advanced Features
- Feature 9: Marketing Consent Compliance
- Feature 10: Multi-Channel Customer Journey

---

## Technical Considerations

### Database Performance
- Add indexes on frequently queried columns:
  - `fct_order_attribution`: `acquisition_channel`, `order_date`, `customer_id`
  - `fct_customer_marketing`: `customer_id`, `is_email_subscriber`, `first_order_date`
  - `mart_marketing_performance`: `order_month`, `acquisition_channel`

### Caching Strategy
- Use React Server Components cache for dashboard metrics (1-5 min)
- Implement Suspense boundaries for independent data fetching
- Consider materialized views for complex aggregations

### Data Quality
- Handle null values in UTM fields (many orders won't have attribution)
- Gracefully handle missing Shopify data for older orders
- Show data coverage metrics where appropriate

---

## Success Metrics

### Technical Success
- Page load time < 2 seconds
- All queries use proper indexes
- Proper TypeScript typing throughout
- Accessible UI components

### Business Success
- Marketing team can answer attribution questions
- Customer success can identify at-risk subscribers
- Sales team has LTV data for prioritization
- Executive team has ROI visibility

---

## Future Enhancements

### After Initial 10 Features
- A/B test tracking integration
- Predictive LTV modeling
- Churn risk scoring
- Marketing automation integration
- Custom attribution models
- Real-time dashboard updates
- Export to CSV functionality
- Scheduled email reports

---

## Notes

- All features use existing UI patterns from the dashboard
- Leverage period filtering system (`7d`, `30d`, `90d`, `1y`, `all`)
- Follow the company-centric data model where applicable
- Maintain consistency with existing metric cards and charts
- Use the existing filter utilities from `lib/filter-utils.ts`
