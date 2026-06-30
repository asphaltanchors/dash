-- Public/personal email domains are not valid company identifiers.
-- They must be represented as per-customer unresolved keys instead of
-- rollups such as individual_gmail.com or individual_yahoo.com.

SELECT
    company_domain_key,
    domain_type,
    customer_count,
    total_revenue
FROM {{ ref('fct_companies') }}
WHERE domain_type = 'individual'
  AND company_domain_key NOT LIKE 'individual_customer_%'

