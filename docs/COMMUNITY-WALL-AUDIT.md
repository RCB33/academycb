# Private community interactions — 21 November 2026

The Academy wall now has one reversible like per account/post, comments (600 characters), deletion by the comment's author or an active admin, and protected sharing. The share payload contains a generic title/message and `/portal/muro/publicacion/<uuid>`; it does not include post text, child names, photos or signed media URLs. The browser's native share sheet is used when available, otherwise copy-link/manual copy. The exact protected destination survives password login and code-based password setup; arbitrary/external destinations remain rejected.

Only published community posts accept interactions. Private or withdrawn posts do not. RLS requires a linked family with a non-archived child or an active administrator for community reads/interactions. Unlinked self-signups cannot browse the community. Comments show the adult profile's first name (or a generic fallback), assigned by an invoker trigger instead of trusting a client-supplied author label. Existing media consent, signed storage URLs and publishing rules remain in place. No broad profile-read policy or service-role client is introduced.

Admin moderation is available in `/admin/muro`. Family preview remains read-only; comments load over an authenticated, non-cached GET so the existing mutation block for admin preview is preserved. Comment lists load 20 at a time. Counts update after the viewer's interactions and on reload/opening comments; no claim of automatic real-time synchronization between devices.

## Verification

- Worktree `/Users/roque/academy-wall-social`, based on current production main and rebased through `67b07c9`. Unrelated in-progress Academy review changes in the active checkout were preserved.
- `scripts/test-community-social.cjs`: validation, actor binding, idempotent likes, own unlike, safe comment retries, RLS deletion results, strict internal share/login destinations. Mock only.
- `scripts/test-community-social.sql`: transaction/rollback fixtures for two linked family users, an unlinked signup and an administrator. Tests distinct like counts, duplicate likes, unlike, first-name attribution, spoof rejection, private/withdrawn isolation, own deletion, denied cross-user deletion, administrator deletion, anonymous grants, cascade cleanup and unchanged payment digest. Passed before and after applying the migration. No fixture accounts/posts/comments retained and no real messages sent.
- Hosted migration `20261121154326_community_social_interactions` applied. All new functions use security invoker with empty search paths. New tables have explicit grants and RLS.
- Security advisors show no additional findings. Existing findings remain recorded in the payment/security audit; [RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Payment baseline immediately before and after tests: 21 rows, digest `cf174b6b8ec293e4653b62107e341555`.
- Typecheck, production webpack build and focused ESLint passed (existing wall warnings for legacy any types and an img tag). Existing Auth, admin-view, unified-consent and private-media suites passed.
- Native Chrome, 390px iframe, actual interaction component with mock actions/read responses: like 12→13→12, open comments, add a fictitious comment 1→2, delete it 2→1, share fallback confirmation. Mobile visual inspection passed. No real-family content or external share recipient was used.

The browser test exercises the copy fallback; native iOS/Android share-sheet delivery to another person was not exercised. The database test exercises real PostgreSQL/RLS inside rollback, rather than submitting test comments to the production community.

## Welcome publication and real family-browser test — 21 November 2026

At the owner's request, the welcome post `c9160f1a-06d6-46ae-bcd4-daef6e6e9199` was published with an Academy photo and a message signed by Manu explaining the portal, values and interactions. The browser used the owner's existing administrative session to upload/publish; a narrowly scoped database update assigned the post to the explicitly confirmed Manu account (`ee7fdcd0-5992-47a8-b622-e4aba789342b`). No Manu credentials were requested or changed. The photo stays in the private community-wall bucket.

The admin composer now accepts JPG/PNG/WebP photos up to 3 MB. The authenticated admin action decodes and re-encodes to WebP, limits dimensions and removes metadata, writes with the admin's normal RLS client, and removes a newly uploaded object if insertion fails. It disables duplicate submissions and refreshes the published list.

The real upload test uncovered an existing trigger that required a child consent even for official posts without a child. Applied migration `20261121160152_academy_official_wall_photos` permits only official posts authored by the currently authenticated active admin with no child attached. Family posts, posts attached to a child, spoofed authors and non-admin official attempts retain their checks. No image-consent records were created or changed. `scripts/test-academy-wall-photo.sql` verifies these boundaries in rollback with standalone fixtures and an unchanged payment digest. The existing private trigger remains non-executable by public/anon/authenticated.

A temporary synthetic guardian and child were created only for this requested browser test (no enrollments, contracts, payments, consent signatures or emails). The IAB browser signed in through the normal production password form. Real clicks verified like 0→1→0, comment creation 0→1, and persistence after opening the direct post URL. The marked test comment was deleted under its own authenticated RLS context. The browser signed out; the same direct link then required login and preserved the destination. No external recipient received a share. Native share delivery was not asserted.

At 390px, the photo-first layout and expandable caption were inspected; Ver más/Ver menos worked. Saved local evidence: `tmp/muro-bienvenida-movil.png` and `tmp/muro-bienvenida-completa.png`. The final screenshot has no test interactions. The temporary family was removed after a reviewed rollback cleanup; zero fixture accounts/children/guardians remain, and the welcome post remains published under Manu. Payments: 21 rows, digest `cf174b6b8ec293e4653b62107e341555`, unchanged before/after.

Validation: admin-photo mock suite (real Sharp decode, format/size/corruption checks, actor binding and upload cleanup), existing social-action suite, TypeScript, focused ESLint, production webpack build and successful Vercel deployments. Security advisors produced no wall-specific finding; other concurrent project work changed the counts of unrelated pre-existing findings.
