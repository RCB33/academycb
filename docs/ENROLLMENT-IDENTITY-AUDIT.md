# Enrollment identity review — 21 November 2026

## Acceptance behavior

- Academy review, Academy acceptance, Campus acceptance and legacy request conversion share an administrative identity check. Matching ignores name case, common accents and repeated spaces; Spanish phone numbers with or without `+34` match.
- Reuse the unique existing tutor and player when submitted information agrees. A new sibling uses the existing tutor. Existing account credentials and player history remain unchanged.
- Stop for review when an email has multiple tutors, tutor name/phone differs, the same tutor appears under another email, a player's birth date is missing/different, a player is archived, or the matching player belongs to another family. Never infer a new family relationship from a matching name.
- Academy review displays whether acceptance will reuse a player, reuse a tutor or create a new family. Acceptance rechecks the data. Existing membership, fee and receipt safeguards remain in place.
- A family-link trigger also rejects creation of another matching child in the same family through atomic manual/event/combined registration paths. Explicitly linking an existing tutor to an existing child remains supported.

## Production maintenance

- Applied migrations `20261121160625_enrollment_identity_reuse` and `20261121160639_guardian_consolidation_backup` to `pnaitrnthhclyzfdvgbp`.
- Consolidated **three** duplicate tutor pairs whose normalized name, email, phone and notes matched. Kept the account-linked tutor, retained existing child links and primary-contact flags. No new family access was granted and no Auth user was changed or deleted.
- Maintenance first ran inside a rolled-back transaction. The committed transaction repeated every check, locked the relevant records, inspected all foreign-key references and refused to remove a tutor with any other referenced history. Recovery snapshots of both records and both sets of links are in `private.guardian_consolidation_backup` (three rows).
- Recovery is an administrative operation: inspect snapshots and current links first, restore only after resolving the unique-email guard and any later changes. Do not blindly replay snapshots over newer family edits. The backup has no client grants or policies and is intentionally inaccessible through the application.
- One other duplicate had already disappeared during the audit; it is not counted as a merge performed by this change.
- **One ambiguous email group remains intentionally separate**, following the owner's instruction: the complete tutor record and the incomplete tutor linked to Sergi. Neither those records nor their links were changed. Karen can review the relationship and use **Datos de los tutores → Vincular Tutor** on Sergi's page to select the existing tutor if appropriate. Creating another copy of that tutor is unnecessary.

## Verification

- Disposable UTF-8 PostgreSQL database, transaction rolled back: existing 16 fee/proration combinations, moved/last month, historical fee exemptions, exact review snapshots, stale/repeated acceptance and immutable pre-existing receipts; plus normalized identity reuse, legacy retries, mismatched phone/birth date, archived/missing birth date, another family, atomic duplicate protection, new sibling, explicit tutor linking, Campus retries and repeated requests.
- Passed TypeScript, changed-file ESLint, request-review and registration-email-detail tests, and a production build. Email tests use mocks; no actual request was accepted and no family email was sent in production during this work.
- Read-only production review found four existing-player matches among ten pending requests at the time checked. This count is a snapshot of a live system, not a fixed expectation.
- Production payment baseline and final checksum: **21 rows**, `md5(string_agg(to_jsonb(p)::text, '' order by id)) = cf174b6b8ec293e4653b62107e341555`. Maintenance verifies this within the transaction and aborts on any change. No existing payment or Stripe setting was modified.
- Security advisors: authenticated public SECURITY DEFINER warnings decreased from 14 to 13 because the legacy converter now uses invoker permissions. Existing anonymous SECURITY DEFINER warnings (2) and leaked-password-protection warning remain. The new private recovery table adds one expected [RLS-without-policy information notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy); all application-role table privileges are revoked by design.

## Limits

These checks protect acceptance and linked-player creation. They do not automatically reconcile ambiguous families, overwrite conflicting contact information, or deduplicate every historical record based only on a name. A real mailbox delivery test is outside this maintenance; passing mocked email tests does not demonstrate delivery.
