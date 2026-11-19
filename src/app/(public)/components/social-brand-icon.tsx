import Image from 'next/image'

// Brand glyphs from Simple Icons (CC0), rendered locally without third-party requests.
export function SocialBrandIcon({ brand, className = 'h-6 w-6' }: { brand: 'instagram' | 'whatsapp'; className?: string }) {
    return <Image src={`/brands/${brand}.svg`} width={24} height={24} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
}

export const instagramStyle = 'bg-[radial-gradient(circle_at_30%_110%,#ffdc80_0%,#fcaf45_15%,#f77737_30%,#e1306c_55%,#c13584_70%,#833ab4_90%)] text-white'
export const whatsappStyle = 'bg-[#25D366] text-navy'

export function whatsappContactLink(number: string) {
    const digits = number.replace(/\D/g, '').replace(/^00/, '')
    const international = digits.length === 9 ? `34${digits}` : digits
    return /^\d{8,15}$/.test(international) ? `https://wa.me/${international}` : null
}
