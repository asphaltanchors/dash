-- Every revenue-bearing customer-company bridge row should land in the company
-- master. This protects no-email/skipped-domain customers from disappearing
-- out of company-level analytics.

WITH bridge_revenue AS (
    SELECT
        company_domain_key,
        SUM(customer_total_revenue) AS bridge_total_revenue
    FROM {{ ref('bridge_customer_company') }}
    GROUP BY company_domain_key
)

SELECT
    br.company_domain_key,
    br.bridge_total_revenue
FROM bridge_revenue br
LEFT JOIN {{ ref('fct_companies') }} fc
    ON br.company_domain_key = fc.company_domain_key
WHERE br.bridge_total_revenue > 0
  AND fc.company_domain_key IS NULL

