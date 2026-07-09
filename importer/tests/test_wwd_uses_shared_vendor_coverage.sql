/* Regular WWD layer SKUs share the observed vendor cadence instead of sparse per-SKU PO inclusion intervals. */

SELECT
    sku,
    target_coverage_days,
    target_coverage_source
FROM {{ ref('mart_inventory_reorder_recommendations') }}
WHERE preferred_vendor = 'WWD'
  AND policy_bucket != 'NO_ACTION_OR_ARCHIVE'
  AND target_coverage_source != 'observed_vendor_po_cycle'
