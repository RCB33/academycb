import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText, FileSpreadsheet, Image as ImageIcon, Film, File, FolderOpen } from "lucide-react"

const ICON_MAP: Record<string, any> = {
    pdf: FileText,
    doc: FileText,
    docx: FileText,
    xls: FileSpreadsheet,
    xlsx: FileSpreadsheet,
    csv: FileSpreadsheet,
    png: ImageIcon,
    jpg: ImageIcon,
    jpeg: ImageIcon,
    mp4: Film,
    mov: Film,
}

function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const Icon = ICON_MAP[ext] || File
    return <Icon className="h-6 w-6" />
}

function getFileColor(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    if (['pdf'].includes(ext)) return 'bg-red-50 text-red-500 border-red-100'
    if (['doc', 'docx'].includes(ext)) return 'bg-blue-50 text-blue-500 border-blue-100'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-green-50 text-green-500 border-green-100'
    if (['png', 'jpg', 'jpeg'].includes(ext)) return 'bg-purple-50 text-purple-500 border-purple-100'
    if (['mp4', 'mov'].includes(ext)) return 'bg-orange-50 text-orange-500 border-orange-100'
    return 'bg-slate-50 text-slate-500 border-slate-100'
}

function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default async function DescargasPage() {
    const supabase = await createClient()

    // List files from the 'downloads' bucket
    let files: any[] = []
    try {
        const { data, error } = await supabase.storage.from('downloads').list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        })
        if (data && !error) {
            // Filter out the .emptyFolderPlaceholder file
            files = data.filter(f => f.name !== '.emptyFolderPlaceholder')
        }
    } catch (e) {
        // Bucket may not exist yet — show empty state
    }

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
        files.map(async (file) => {
            const { data } = await supabase.storage.from('downloads').createSignedUrl(file.name, 3600)
            return { ...file, url: data?.signedUrl || '#' }
        })
    )

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-navy">Zona de Descargas</h1>
            <p className="text-muted-foreground">Documentos, plantillas y recursos de la academia disponibles para ti.</p>

            {filesWithUrls.length === 0 ? (
                <Card className="border-2 border-dashed border-slate-200 shadow-sm">
                    <CardContent className="py-16 text-center">
                        <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <FolderOpen className="h-10 w-10 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">Sin Archivos Disponibles</h2>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            La academia aún no ha subido archivos para descargar. Cuando lo hagan, aparecerán automáticamente aquí.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filesWithUrls.map((file) => (
                        <a
                            key={file.id || file.name}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                        >
                            <Card className="border shadow-sm hover:shadow-lg transition-all group-hover:-translate-y-0.5 overflow-hidden bg-white">
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-4 p-5">
                                        <div className={`p-3 rounded-xl border shrink-0 group-hover:scale-110 transition-transform ${getFileColor(file.name)}`}>
                                            {getFileIcon(file.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate text-sm group-hover:text-indigo-600 transition-colors">
                                                {file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-1">
                                                <span className="uppercase">{file.name.split('.').pop()}</span>
                                                {file.metadata?.size && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatSize(file.metadata.size)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Download className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}
