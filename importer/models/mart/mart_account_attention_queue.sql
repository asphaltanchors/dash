/*
ABOUTME: Read-only account attention queue for account risk and growth discovery.
ABOUTME: One row per flagged corporate company with contact context and transparent reason codes.
*/

{{ config(
    materialized = 'table',
    tags = ['companies', 'accounts', 'attention', 'current']
) }}

WITH best_contacts AS (
    SELECT *
    FROM (
        SELECT
            company_domain_key,
            contact_id,
            full_name,
            primary_email,
            primary_phone,
            contact_role,
            CASE
                WHEN primary_email ~* '^(billing|invoice|invoices|accounting|ap|ar)@' THEN TRUE
                ELSE FALSE
            END AS is_billing_contact,
            CASE
                WHEN primary_email ~* '^(info|sales|orders|customerservice|support|admin|office)@' THEN TRUE
                ELSE FALSE
            END AS is_generic_contact,
            CASE
                WHEN primary_email ILIKE '%@anchorallied.com'
                    OR primary_email ILIKE '%@wwd.us'
                THEN TRUE
                ELSE FALSE
            END AS is_internal_contact,
            CASE
                WHEN full_name IS NOT NULL
                    AND TRIM(full_name) <> ''
                    AND primary_email IS NOT NULL
                    AND primary_email !~* '^(billing|invoice|invoices|accounting|ap|ar|info|sales|orders|customerservice|support|admin|office)@'
                THEN TRUE
                ELSE FALSE
            END AS is_likely_human_contact,
            ROW_NUMBER() OVER (
                PARTITION BY company_domain_key
                ORDER BY
                    is_primary_company_contact DESC,
                    CASE
                        WHEN full_name IS NOT NULL AND TRIM(full_name) <> '' THEN 0 ELSE 1
                    END,
                    company_contact_rank ASC NULLS LAST
            ) AS contact_rank
        FROM {{ ref('dim_customer_contacts') }}
        WHERE company_domain_key IS NOT NULL
            AND primary_email IS NOT NULL
    ) ranked
    WHERE contact_rank = 1
),

company_metrics AS (
    SELECT
        h.company_domain_key,
        h.company_name,
        h.domain_type,
        h.business_size_category,
        h.revenue_category,
        h.health_score,
        h.health_category,
        h.customer_archetype,
        h.activity_status,
        h.engagement_level,
        h.combined_growth_trend,
        h.growth_trend_direction,
        h.days_since_last_order,
        h.last_order_date,
        h.first_order_date,
        h.total_orders,
        h.total_revenue,
        h.avg_order_value,
        h.orders_last_90_days,
        h.revenue_last_90_days,
        h.orders_last_year,
        h.orders_prior_year,
        h.revenue_percentile,
        h.at_risk_flag,
        h.growth_opportunity_flag,
        COALESCE(t90.total_revenue, 0) AS trailing_90d_revenue,
        COALESCE(t1y.total_revenue, 0) AS trailing_1y_revenue
    FROM {{ ref('dim_company_health') }} h
    LEFT JOIN {{ ref('mart_company_period_metrics') }} t90
        ON h.company_domain_key = t90.company_domain_key
        AND t90.period_type = 'trailing_90d'
    LEFT JOIN {{ ref('mart_company_period_metrics') }} t1y
        ON h.company_domain_key = t1y.company_domain_key
        AND t1y.period_type = 'trailing_1y'
    WHERE h.domain_type = 'corporate'
),

flagged AS (
    SELECT
        *,
        CASE WHEN total_revenue >= 50000 OR revenue_percentile >= 0.9 THEN TRUE ELSE FALSE END AS is_high_value_account,
        CASE WHEN at_risk_flag = TRUE AND (total_revenue >= 25000 OR revenue_percentile >= 0.75) THEN TRUE ELSE FALSE END AS is_high_value_at_risk,
        CASE WHEN combined_growth_trend IN ('Growing', 'New Customer') AND trailing_1y_revenue >= 5000 THEN TRUE ELSE FALSE END AS is_growth_opportunity,
        CASE WHEN days_since_last_order >= 180 AND (total_revenue >= 25000 OR revenue_percentile >= 0.75) THEN TRUE ELSE FALSE END AS is_dormant_high_value,
        CASE WHEN combined_growth_trend = 'Declining' AND days_since_last_order <= 365 AND trailing_1y_revenue >= 1000 THEN TRUE ELSE FALSE END AS is_declining_active
    FROM company_metrics
),

scored AS (
    SELECT
        *,
        CASE
            WHEN is_high_value_at_risk THEN 100
            WHEN is_dormant_high_value THEN 90
            WHEN is_declining_active THEN 80
            WHEN is_growth_opportunity THEN 70
            ELSE 50
        END AS attention_score,
        CONCAT_WS(
            '; ',
            CASE WHEN is_high_value_at_risk THEN 'high_value_at_risk' END,
            CASE WHEN is_dormant_high_value THEN 'dormant_high_value' END,
            CASE WHEN is_declining_active THEN 'declining_active' END,
            CASE WHEN is_growth_opportunity THEN 'growth_opportunity' END,
            CASE WHEN at_risk_flag THEN 'health_at_risk' END,
            CASE WHEN growth_opportunity_flag THEN 'health_growth_opportunity' END
        ) AS reason_codes
    FROM flagged
)

SELECT
    s.company_domain_key,
    s.company_name,
    s.business_size_category,
    s.revenue_category,
    s.health_score,
    s.health_category,
    s.activity_status,
    s.engagement_level,
    s.combined_growth_trend,
    s.growth_trend_direction,
    s.days_since_last_order,
    s.last_order_date,
    s.first_order_date,
    s.total_orders,
    s.total_revenue,
    s.avg_order_value,
    s.trailing_90d_revenue,
    s.trailing_1y_revenue,
    s.orders_last_90_days,
    s.revenue_last_90_days,
    s.revenue_percentile,
    s.is_high_value_account,
    s.is_high_value_at_risk,
    s.is_growth_opportunity,
    s.is_dormant_high_value,
    s.is_declining_active,
    s.attention_score,
    s.reason_codes,
    bc.contact_id AS best_contact_id,
    bc.full_name AS best_contact_name,
    bc.primary_email AS best_contact_email,
    bc.primary_phone AS best_contact_phone,
    bc.contact_role AS best_contact_role,
    COALESCE(bc.is_billing_contact, FALSE) AS best_contact_is_billing,
    COALESCE(bc.is_generic_contact, FALSE) AS best_contact_is_generic,
    COALESCE(bc.is_internal_contact, FALSE) AS best_contact_is_internal,
    COALESCE(bc.is_likely_human_contact, FALSE) AS best_contact_is_likely_human,
    CURRENT_TIMESTAMP AS created_at
FROM scored s
LEFT JOIN best_contacts bc
    ON s.company_domain_key = bc.company_domain_key
WHERE s.reason_codes <> ''
ORDER BY s.attention_score DESC, s.total_revenue DESC
