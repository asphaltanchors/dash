-- Unresolved entity types intentionally avoid cross-customer consolidation.
-- If any of these rows contains multiple customers, a public/no-email/skipped
-- domain has been merged into a false company.

SELECT
    company_domain_key,
    domain_type,
    customer_count,
    total_revenue
FROM {{ ref('fct_companies') }}
WHERE domain_type IN ('individual', 'no_email', 'skip')
  AND customer_count != 1

