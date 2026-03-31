import { createClient } from '@/lib/supabase/server'
import { FileText, Calendar, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function DocumentosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/portal')

    // Get signatures for this specific user
    const { data: signatures } = await supabase
        .from('signatures')
        .select('*')
        .eq('guardian_id', user.id)
        .order('signed_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-navy">Mis Documentos</h1>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {signatures && signatures.length > 0 ? (
                    signatures.map((doc: any) => (
                        <Card key={doc.id} className="overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all bg-white relative">
                            {/* Watermark icon */}
                            <div className="absolute right-[-20px] top-[-20px] text-green-500/10 pointer-events-none">
                                <CheckCircle size={120} strokeWidth={1} />
                            </div>
                            <CardHeader className="pb-2 bg-slate-50/50 border-b">
                                <CardTitle className="text-lg flex justify-between items-center text-slate-800">
                                    <span className="truncate">{doc.document_type}</span>
                                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 shadow-sm bg-white rounded-full" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 flex flex-col gap-3 relative z-10">
                                <div className="flex items-center text-sm font-medium text-slate-600">
                                    <span className="bg-slate-100 p-1.5 rounded-md mr-3">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                    </span>
                                    {new Date(doc.signed_at).toLocaleDateString()} a las {new Date(doc.signed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-slate-500 ml-10">
                                    Versión: <span className="font-mono bg-slate-100 px-1 rounded">{doc.document_version}</span>
                                </div>
                                <div className="pt-3 mt-1 border-t border-slate-100">
                                     <a href={doc.signature_image_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center transition-colors">
                                        <FileText className="mr-1.5 h-4 w-4" />
                                        Ver Certificado Original
                                     </a>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center bg-white rounded-xl border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Documentos</h3>
                        <p className="text-slate-500 max-w-sm">No hay documentos firmados actualmente vinculados a tu cuenta.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
