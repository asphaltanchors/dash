# AGENTS.md

This file provides guidance to coding agents working in the `importer/` submodule.

## QuickBooks Order Number Caveat

QuickBooks `order_number` values are not globally unique in this dataset.

We confirmed that the raw QuickBooks imports contain real duplicate printed document numbers across different transactions:

- Duplicate invoice numbers exist in `raw.xlsx_invoice`.
- No true duplicate sales receipt numbers were found in the current loaded data.
- These are true source-data collisions, not only downstream modeling bugs.

Examples discovered during investigation:

- Invoice `A4025` maps to two different QuickBooks transaction identifiers across 2018-07-09 and 2019-07-08.
- Invoice `A7067` maps to two different QuickBooks transaction identifiers on 2025-11-03.
- Invoice `A7068` maps to two different QuickBooks transaction identifiers on 2026-01-02.
- Invoice `S-1603` maps to two different QuickBooks transaction identifiers on 2026-03-19.

## Practical Guidance

- Do not assume `order_number` alone is a stable unique key for QuickBooks data.
- Prefer `quick_books_internal_id` as the strongest transaction identifier when available.
- For invoices, `transaction_id` (`transxx`) is also useful for distinguishing collisions.
- `int_quickbooks__orders` and `fct_orders` expose `order_key` as the stable transaction-grain identifier.
- If a model must be one row per business transaction, do not group only by `order_number`.
- If a model remains keyed by `order_number` for reporting convenience, document that this may merge a small number of bad source records.

## Accepted Current State

For now, these duplicate source records are an accepted data-quality issue.

- The bookkeeping team will address the source data in QuickBooks.
- We should avoid spending more time re-debugging these same duplicates unless the user explicitly asks.
- Minor reporting distortion from this limited set of records is currently acceptable.

## Separate Issue: Load Deduping

Some records may also appear multiple times across seed and incremental loads with the same QuickBooks identifiers.

- This is a different issue from true reused printed order numbers.
- This is currently broad and recent: duplicate loads have been observed for invoice dates through 2026-05-19, with repeated loads seen as recently as 2026-06-26.
- Example previously observed: invoice `A7218`.
- Treat load deduping problems separately from true source-number collisions.
- Order-level models should keep the latest `_dlt_load_id` for each transaction key before aggregation to avoid double-counting repeated loads.
