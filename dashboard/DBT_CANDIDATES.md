# DBT Pipeline Candidates

This file tracks opportunities to move logic from the dashboard app into the DBT pipeline for better performance and maintainability.

## High Priority

### Daily Revenue Rollups
**Current State**: Aggregating revenue by day in real-time queries
**DBT Candidate**: Create `dim_daily_revenue` table with pre-calculated daily totals
**Benefits**: Faster dashboard loading, consistent time series data
**Complexity**: Low - simple GROUP BY date aggregation

### Weekly/Monthly Revenue Summaries  
**Current State**: Real-time weekly comparisons in dashboard
**DBT Candidate**: Create `dim_weekly_revenue` and `dim_monthly_revenue` tables
**Benefits**: Instant "this week vs last week" comparisons
**Complexity**: Low - date windowing functions

## Medium Priority

### Customer Lifetime Value (CLV)
**Current State**: Not yet implemented in dashboard
**DBT Candidate**: Create `dim_customer_metrics` with CLV, order frequency, avg order value
**Benefits**: Rich customer analytics without complex dashboard queries
**Complexity**: Medium - requires customer cohort analysis

### Order Status Transitions
**Current State**: Static status from fct_orders
**DBT Candidate**: Create `fct_order_status_history` tracking status changes over time
**Benefits**: Status change analytics, conversion funnel analysis
**Complexity**: Medium - requires tracking state changes

## Low Priority

### Product Performance Metrics
**Current State**: Basic product data in fct_products
**DBT Candidate**: Create `dim_product_performance` with sales velocity, margin analysis
**Benefits**: Product recommendation engine, inventory insights
**Complexity**: High - requires complex product-sales joins

### Geographic Sales Analysis
**Current State**: Raw address fields in fct_orders
**DBT Candidate**: Create `dim_geographic_sales` with normalized locations and sales totals
**Benefits**: Regional performance dashboards, shipping optimization
**Complexity**: Medium - address normalization and geocoding

## Data Quality Issues to Address

### Sales Price & Purchase Cost Data Types
**Issue**: `sales_price` and `purchase_cost` stored as TEXT instead of NUMERIC
**Impact**: Cannot perform margin calculations without type casting
**DBT Fix**: Cast to NUMERIC in staging layer, handle null/invalid values

### Date Field Inconsistencies
**Issue**: Mix of `date`, `timestamp`, and `varchar` for date fields
**Impact**: Complex date comparisons and filtering
**DBT Fix**: Standardize all date fields to appropriate types in staging

### Missing Indexes
**Issue**: No indexes on frequently queried columns (order_date, customer, status)
**Impact**: Slow dashboard queries
**DBT Fix**: Add post-hook indexes for performance-critical columns