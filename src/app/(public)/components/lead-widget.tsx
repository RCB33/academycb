'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send, User, Calendar, Trophy, Phone, CheckCircle2 } from "lucide-react"
import { submitLead } from '@/app/actions/leads'
import { toast } from 'sonner'

type Step = 'intro' | 'child_name' | 'birth_year' | 'category' | 'guardian_name' | 'phone' | 'submitting' | 'success'

export default function LeadWidget() {
    const [step, setStep] = useState<Step>('intro')
    const [data, setData] = useState({
        child_name: '',
        birth_year: '',
        category_text: '',
        guardian_name: '',
        phone: '',
    })

    const handleNext = (nextStep: Step) => {
        setStep(nextStep)
    }

    const handleSubmit = async () => {
        if (!data.phone) return

        setStep('submitting')
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => formData.append(key, value))

        try {
            const result = await submitLead({}, formData)
            if (result.success) {
                setStep('success')
                toast.success("Solicitud recibida correctamente")
            } else {
                toast.error(result.error || "Ha ocurrido un error")
                setStep('phone')
            }
        } catch (e) {
            console.error(e)
            toast.error("Error de conexión")
            setStep('phone')
        }
    }

    const variants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    }

    // Fixed colors: explicitly utilize tailwind classes ensuring contrast
    const inputClasses = "text-lg h-12 bg-navy-light border-white/20 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold"

    return (
        <div className="w-full max-w-lg mx-auto bg-navy rounded-xl overflow-hidden min-h-[400px] flex flex-col shadow-[0_4px_20px_rgba(212,175,55,0.15)] border-4 border-gold">
            <div className="bg-gold p-4 text-navy flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                    <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold">Asistente de Inscripción</h3>
                    <p className="text-xs opacity-90 font-medium">Te ayudamos a encontrar el mejor plan</p>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-center text-white relative">
                <AnimatePresence mode="wait">
                    {step === 'intro' && (
                        <motion.div key="intro" variants={variants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-6">
                            <h4 className="text-2xl font-bold">¡Hola! 👋</h4>
                            <p className="text-gray-200 text-lg">Me encantaría saber un poco más sobre qué buscas para poder informarte mejor.</p>
                            <Button size="lg" onClick={() => handleNext('child_name')} className="w-full text-lg h-12 font-bold text-navy bg-gold hover:bg-gold-light">
                                Sí, quiero información
                            </Button>
                        </motion.div>
                    )}

                    {step === 'child_name' && (
                        <motion.div key="child_name" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <div className="flex items-center gap-2 text-gold font-medium mb-2">
                                <User className="h-5 w-5" /> ¿Cómo se llama el futuro crack?
                            </div>
                            <Input
                                placeholder="Nombre del niño/a"
                                value={data.child_name}
                                onChange={(e) => setData({ ...data, child_name: e.target.value })}
                                autoFocus
                                className={inputClasses}
                            />
                            <Button
                                disabled={!data.child_name || data.child_name.length < 2}
                                onClick={() => handleNext('birth_year')}
                                className="w-full font-bold text-navy bg-gold hover:bg-gold-light disabled:opacity-50"
                            >
                                Siguiente <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'birth_year' && (
                        <motion.div key="birth_year" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <div className="flex items-center gap-2 text-gold font-medium mb-2">
                                <Calendar className="h-5 w-5" /> ¿En qué año nació {data.child_name}?
                            </div>
                            <Input
                                type="number"
                                placeholder="Ej: 2014"
                                value={data.birth_year}
                                onChange={(e) => setData({ ...data, birth_year: e.target.value })}
                                autoFocus
                                className={inputClasses}
                            />
                            <Button
                                disabled={!data.birth_year || data.birth_year.length !== 4}
                                onClick={() => handleNext('category')}
                                className="w-full font-bold text-navy bg-gold hover:bg-gold-light disabled:opacity-50"
                            >
                                Siguiente <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'category' && (
                        <motion.div key="category" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <div className="flex items-center gap-2 text-gold font-medium mb-2">
                                <Trophy className="h-5 w-5" /> ¿Ha jugado antes? ¿Qué nivel/categoría buscas?
                            </div>
                            <Input
                                placeholder="Ej: Iniciación, Federado, Solo diversión..."
                                value={data.category_text}
                                onChange={(e) => setData({ ...data, category_text: e.target.value })}
                                autoFocus
                                className={inputClasses}
                            />
                            <Button
                                disabled={!data.category_text}
                                onClick={() => handleNext('guardian_name')}
                                className="w-full font-bold text-navy bg-gold hover:bg-gold-light disabled:opacity-50"
                            >
                                Siguiente <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'guardian_name' && (
                        <motion.div key="guardian_name" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <div className="flex items-center gap-2 text-gold font-medium mb-2">
                                <User className="h-5 w-5" /> Perfecto. ¿Cuál es TU nombre (padre/madre/tutor)?
                            </div>
                            <Input
                                placeholder="Tu nombre completo"
                                value={data.guardian_name}
                                onChange={(e) => setData({ ...data, guardian_name: e.target.value })}
                                autoFocus
                                className={inputClasses}
                            />
                            <Button
                                disabled={!data.guardian_name}
                                onClick={() => handleNext('phone')}
                                className="w-full font-bold text-navy bg-gold hover:bg-gold-light disabled:opacity-50"
                            >
                                Siguiente <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'phone' && (
                        <motion.div key="phone" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <div className="flex items-center gap-2 text-gold font-medium mb-2">
                                <Phone className="h-5 w-5" /> Por último, déjanos un teléfono para contactarte.
                            </div>
                            <Input
                                type="tel"
                                placeholder="600 000 000"
                                value={data.phone}
                                onChange={(e) => setData({ ...data, phone: e.target.value })}
                                autoFocus
                                className={inputClasses}
                            />
                            <p className="text-xs text-gray-400 mt-2">Solo lo usaremos para informarte sobre la academia.</p>
                            <Button
                                disabled={!data.phone || data.phone.length < 9}
                                onClick={handleSubmit}
                                className="w-full font-bold text-navy bg-gold hover:bg-gold-light disabled:opacity-50"
                            >
                                Enviar Solicitud <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'submitting' && (
                        <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                            <p>Enviando...</p>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" variants={variants} initial="hidden" animate="visible" className="text-center space-y-6">
                            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h4 className="text-2xl font-bold">¡Recibido!</h4>
                            <p className="text-gray-200">Hemos guardado tus datos. Nos pondremos en contacto contigo lo antes posible.</p>

                            <div className="pt-4 border-t border-white/10">
                                <p className="text-sm text-gray-300 mb-4">¿Prefieres escribirnos tú ahora?</p>
                                <Button variant="secondary" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" asChild>
                                    <a href="https://wa.me/34600000000?text=Hola,%20acabo%20de%20rellenar%20el%20formulario%20de%20la%20web" target="_blank" rel="noopener noreferrer">
                                        <MessageSquare className="mr-2 h-4 w-4" /> Iniciar WhatsApp
                                    </a>
                                </Button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            {step !== 'intro' && step !== 'success' && step !== 'submitting' && (
                <div className="h-2 bg-navy-dark w-full">
                    <div
                        className="h-full bg-gold transition-all duration-500"
                        style={{
                            width:
                                step === 'child_name' ? '20%' :
                                    step === 'birth_year' ? '40%' :
                                        step === 'category' ? '60%' :
                                            step === 'guardian_name' ? '80%' :
                                                '95%'
                        }}
                    />
                </div>
            )}
        </div>
    )
}
