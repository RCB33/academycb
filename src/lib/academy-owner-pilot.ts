import type { AcademyContract } from './academy-stripe-contract'

// Explicit owner authorization, 20 Nov 2026. One persisted contract only.
// This is not a switch for public recurring sales. Remove the launcher after QA.
export const OWNER_PILOT_CONTRACT = '78b7e771-3b5c-4525-8baa-7dea137bd3e9'
export const OWNER_PILOT_ACCOUNT = 'ac35ef1d-aab4-47fc-bb13-04d6d24046e0'
export function assertOwnerPilot(c: AcademyContract, actor: string) {
    if (actor !== OWNER_PILOT_ACCOUNT || c.id !== OWNER_PILOT_CONTRACT || c.owner_id !== actor ||
        c.mode !== 'live' || c.choice !== 'monthly' || Number(c.unit_cents) !== 100 ||
        Number(c.fee_cents) !== 0 || Number(c.months) !== 1 || Number(c.total_cents) !== 100 ||
        c.return_origin !== 'https://www.academycostabrava.com') throw new Error('Not the authorized one-euro pilot')
}
