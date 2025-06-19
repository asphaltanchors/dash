# Company Analytics Implementation Plan

## Context & Insights

**Key Realization**: The "customer" drill-down approach was misguided. Individual customers within companies are just store locations or data entry artifacts. What matters is **company-level business intelligence**.

**User Requirements**:
- Active vs inactive companies
- Order trends and growth analysis  
- Product purchasing patterns
- Company health assessment (growing/declining, good/bad customer)
- Year-over-year sales comparisons

## Current Schema Analysis

### ✅ Available Now
- `fct_companies` - Clean company consolidation with basic metrics
- `fct_company_orders` - Individual order records at company level
- `fct_company_products` - Product purchasing data by company

### ❌ Missing (DBT Pipeline Needed)
- Company health indicators (days since last order, activity status)
- Time-series aggregations for growth analysis
- Year-over-year comparison capabilities
- Seasonal pattern detection
- Health scoring algorithms

## Implementation Phases

### Phase 1: Immediate Implementation (Using Current Schema)
**Timeline**: Can implement now with existing tables

1. **Company Order Timeline**
   - Use `fct_company_orders` to show order history
   - Basic order frequency analysis
   - Revenue trends over time

2. **Product Analysis Dashboard**
   - Use `fct_company_products` for "what they buy"
   - Top products by company
   - Product category breakdowns

3. **Basic Health Indicators**
   - Calculate days since last order from `fct_company_orders.order_date`
   - Simple active/inactive classification
   - Order count and revenue totals

4. **Company Detail Page Enhancements**
   - Replace customer drill-down with order timeline
   - Add product purchasing analysis
   - Show basic health metrics

### Phase 2: Enhanced Analytics (Waiting on DBT Updates)
**Timeline**: After DBT pipeline enhancements

1. **Advanced Health Scoring**
   - Comprehensive health score calculation
   - Growth trend direction (growing/stable/declining)
   - Order frequency categorization

2. **Time-Series Analysis**
   - Year-over-year revenue growth
   - Seasonal ordering patterns
   - Quarter-over-quarter comparisons

3. **Predictive Analytics**
   - Churn risk assessment
   - Revenue forecasting
   - Lifecycle stage classification

### Phase 3: Advanced Business Intelligence (Future)
**Timeline**: After Phase 2 data maturity

1. **Relationship Strength Analysis**
   - Customer lifecycle management
   - Engagement scoring
   - Retention analytics

2. **Market Intelligence**
   - Company size vs purchasing patterns
   - Industry trend analysis
   - Competitive benchmarking

## Technical Implementation

### Query Functions Needed

**Phase 1 (Immediate)**:
```typescript
// Use existing fct_company_orders
getCompanyOrderTimeline(domainKey: string): Promise<CompanyOrder[]>
getCompanyProductAnalysis(domainKey: string): Promise<CompanyProduct[]>  
getCompanyHealthBasic(domainKey: string): Promise<CompanyHealth>

// Enhanced main view
getCompaniesWithHealth(): Promise<CompanyWithHealth[]>
```

**Phase 2 (Post-DBT)**:
```typescript
// Use new dim_company_health table
getCompanyHealthAdvanced(domainKey: string): Promise<AdvancedHealth>
getCompanyGrowthTrends(domainKey: string): Promise<GrowthMetrics[]>
getYearOverYearAnalysis(domainKey: string): Promise<YoYComparison[]>
```

## DBT Pipeline Requirements

### High Priority Tables Needed:

1. **`dim_company_health`**
   ```sql
   SELECT 
     company_domain_key,
     days_since_last_order,
     order_frequency_score,
     activity_status, -- Active (30d), Recent (90d), Inactive (90d+)
     growth_trend_direction, -- Growing, Stable, Declining
     health_score -- 1-100 composite score
   FROM {{ ref('fct_company_orders') }}
   ```

2. **`fct_company_orders_time_series`**
   ```sql
   SELECT 
     company_domain_key,
     order_year,
     order_quarter,
     order_month,
     total_revenue,
     order_count,
     avg_order_value,
     yoy_revenue_growth_pct,
     yoy_order_count_growth_pct
   FROM {{ ref('fct_company_orders') }}
   ```

3. **Enhanced `fct_company_products`**
   - Add time-based trend columns
   - Product diversification metrics
   - Purchase volume trends

## Success Metrics

**Phase 1 Success**:
- Company detail pages show actionable order timeline
- Product analysis reveals purchasing patterns
- Basic health status visible on main companies view

**Phase 2 Success**:
- Growth/decline trends clearly identified
- Health scores enable customer prioritization
- Year-over-year analysis drives business decisions

**Overall Goal**: Transform from basic company listing to comprehensive B2B relationship intelligence platform.

## Current Status
- **Phase 1**: Ready to implement with existing schema
- **DBT Pipeline**: Enhancements documented in `DBT_CANDIDATES.md`
- **User Expectation**: Shift from customer details to company business intelligence

---

*This plan serves as a checkpoint for company analytics development and will be updated as implementation progresses.*