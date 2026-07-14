'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { submitContact, type LeadState } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initialState: LeadState = {}

export function ContactForm() {
    const [state, action, pending] = useActionState(submitContact, initialState)

    if (state.success) {
        return (
            <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-8 text-center text-white" role="status">
                <h2 className="font-heading text-3xl font-bold">Mensaje recibido</h2>
                <p className="mt-3 text-green-100">{state.message}</p>
            </div>
        )
    }

    return (
        <form action={action} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-sm font-medium text-gray-300">Nombre</label>
                    <Input id="contact-name" name="name" required minLength={2} autoComplete="name" className="bg-navy border-white/10 text-white h-12" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="contact-phone" className="text-sm font-medium text-gray-300">Teléfono</label>
                    <Input id="contact-phone" name="phone" type="tel" autoComplete="tel" className="bg-navy border-white/10 text-white h-12" />
                </div>
            </div>
            <div className="space-y-2">
                <label htmlFor="contact-email" className="text-sm font-medium text-gray-300">Email</label>
                <Input id="contact-email" name="email" type="email" required autoComplete="email" className="bg-navy border-white/10 text-white h-12" />
            </div>
            <div className="space-y-2">
                <label htmlFor="contact-message" className="text-sm font-medium text-gray-300">Mensaje</label>
                <textarea id="contact-message" name="message" required minLength={10} maxLength={3000} className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-navy px-4 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50" />
            </div>
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label className="flex items-start gap-2 text-xs text-gray-300">
                <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4" />
                <span>Acepto el tratamiento de mis datos para responder a la consulta, según la <Link href="/privacidad" className="text-gold underline">política de privacidad</Link>.</span>
            </label>
            {state.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200" role="alert">{state.error}</p>}
            <Button disabled={pending} className="w-full h-12 text-lg font-heading font-bold uppercase tracking-wider bg-gold hover:bg-white hover:text-navy text-navy">
                <Send className="mr-2 h-4 w-4" /> {pending ? 'Enviando…' : 'Enviar mensaje'}
            </Button>
        </form>
    )
}
