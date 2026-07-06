#!/bin/bash
# One-time export of mart tables to CSV for offline business analysis.
# Run from the bi/ repo root on your Mac. Output: ./analysis_export/*.csv
set -euo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)/analysis_export"
mkdir -p "$OUT"

PSQL="psql -h localhost -p 5432 -U test -d yourdb"
export PGPASSWORD=test

TABLES=(
  fct_orders
  fct_order_line_items
  fct_products
  fct_companies
  fct_company_orders
  fct_order_attribution
  bridge_customer_company
  fct_trade_show_leads
  fct_trade_show_performance
  dim_company_health
  mart_company_period_metrics
  mart_order_channel_period_metrics
  mart_order_segment_period_metrics
  mart_product_margin_analytics
  mart_product_unit_sales
  mart_marketing_performance
  mart_product_company_period_spending
  mart_business_cockpit_summary
)

for t in "${TABLES[@]}"; do
  echo "exporting $t ..."
  $PSQL -c "\\copy (SELECT * FROM analytics_mart.$t) TO '$OUT/$t.csv' WITH CSV HEADER" \
    || echo "  skipped $t (not found)"
done

echo "done. files in $OUT:"
ls -lh "$OUT"
