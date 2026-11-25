/** Published payment options. These do not create receipts or activate collections. */
export const tournamentPricing = {
    '15f0483d-26a8-450e-a6a8-8f7a7c957277': {
        totalCents: 45000, monthlyCents: [11250, 11250, 11250, 11250], twoPaymentsCents: [21500, 21500],
        accommodation: 'Hotel de 4 estrellas', flightExcluded: true,
    },
    '9b6c8ac0-a542-49ab-a116-6679c8640932': {
        totalCents: 102500, monthlyCents: [15000, 15000, 15000, 15000, 15000, 15000, 12500], twoPaymentsCents: [51250, 51250],
        accommodation: 'Camping / albergue', flightExcluded: false,
    },
    'c93d7e14-a316-4dab-b240-a6e4b3d0ee81': {
        totalCents: 59900, monthlyCents: [10000, 10000, 10000, 10000, 10000, 9900], twoPaymentsCents: [29950, 29950],
        accommodation: 'Camping con bungalows', flightExcluded: false,
    },
} as const

export function getTournamentPricing(id: string, currentPrice: number | string) {
    const plan = tournamentPricing[id as keyof typeof tournamentPricing]
    // An administrative price edit must never leave an outdated payment offer visible.
    return plan && Math.round(Number(currentPrice) * 100) === plan.totalCents ? plan : null
}
