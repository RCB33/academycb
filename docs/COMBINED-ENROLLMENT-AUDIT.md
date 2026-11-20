# Unified family enrollment — 20 November 2026

## Behavior

`/inscripcion` now accepts Academy, one published Campus edition and the tournament campaign together for each of up to six children. The dedicated Campus and Tournament forms remain available and link to this form. All three forms show separate day, month and year birthday selectors; they retain an ISO full date for validation/storage.

The unified form retains its tab-local 24-hour draft, including birthdays, selected activities and packs. Verification opens separately; returning and refreshing transfers the draft to the verified family. Combining activities for a child, and any tournament request, requires a verified email. A single Academy or Campus request retains the existing anonymous submission behavior. Existing child identities are checked against the signed-in family's children on the server.

The summary uses published pricing functions: first Academy month (prorated), provisional new-player enrollment fee and Plus, Campus weeks/pack, tournament pack and any required kit. Future Academy installments appear separately. Sibling discounts and enrollment-fee exemptions are explicitly pending review. No extra combined-activity discount is invented. Prices and catalog versions are revalidated on the server.

Payment choices retain current main's per-activity rules: Academy cash/card, Campus transfer/cash, Tournaments transfer. Each activity's selected method is saved with its request. Combining activities does not authorize charges or change these rules.

All selected activities are validated before persistence. `submit_combined_enrollment` saves a batch in one transaction, reuses one verified child profile across activities and returns the same IDs on a matching retry. Changed retries and existing active requests for the same linked child/activity are rejected. No payments, memberships, Stripe sessions or automatic acceptance are created by submitting.

Receipt and acceptance emails remain separate per activity. Receipt text includes the requested activity and estimated prices without health details. Each activity still needs staff review. Failure to dispatch an email does not ask the family to resubmit a successfully saved batch; the existing outbox remains available for retries.

## Evidence

- Rebased against main through `f5aeede`, preserving the parallel email-code access and per-activity payment changes. Historical workspace snapshots were not used.
- `scripts/test-combined-enrollment.cjs`: full/leap/invalid birth dates, combined totals, future installments, all tournament packs, form arrays, canonical verified email, ownership, stale catalogs, duplicate children and activity-specific payment validation. Mock database and email dispatch only.
- Existing offering, events, notification, payment-option, Karen and Stripe suites passed; no external payment/email calls in these tests.
- Typecheck and production webpack build passed. Focused ESLint has no errors; two effect/state warnings concern synchronizing browser session storage (one pre-existing).
- Native Chrome test of actual React components with an isolated example catalog: 2 February 2016 retained after reload; all three activity selections retained; Academy 67.50 + Campus 197 + Tournaments 165 = 429.50; six future installments of 75 shown separately. No submission, consent acceptance, real registration or email was performed in this browser test.
- Hosted migration `20261120094500_combined_family_enrollment` applied to `pnaitrnthhclyzfdvgbp`. The private implementation is security-definer with an empty search path; public wrapper is invoker. Both are executable only by service_role. Anonymous/authenticated grants are revoked; private batch data has RLS and no client policies.
- `scripts/test-combined-enrollment.sql` passed both before applying the migration (DDL + fixtures inside rollback) and after applying it (fixtures inside rollback). Tests exercise service_role, three activities with one child, two activities without tournaments with one child, three receipt outbox rows, retry/changed-retry/actor isolation and rollback of partial failures. No fixture rows or emails are retained.
- Immediately before and after final rollback tests: 21 payment rows, digest `13ac2fe6f6d8c3721523c18b62853160`; the test also asserts digest equality inside its transaction. Earlier session counts changed during concurrent external work; this is not a claim that the entire production session had no outside activity.
- Security advisor after applying migration: existing warnings unchanged (2 anon definer, 14 authenticated definer, leaked-password protection). New INFO for private RLS without a policy is intentional deny-by-default, not public exposure: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

## Limits

Mock tests and outbox creation are not provider acceptance or delivery to a real inbox. No real family's receipt/acceptance email or invitation was sent for this audit. The production acceptance/onboarding flow still needs an actual user-authorized registration and staff review to demonstrate end-to-end inbox delivery. Stripe LIVE was not enabled and existing payments were not edited.
