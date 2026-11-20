'use server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
export async function setAcademyPaymentMethod(input:{membershipId:string;method:string}) {
    try {
        const {supabase}=await requireAdmin()
        const data=z.object({membershipId:z.string().uuid(),method:z.enum(['cash','stripe'])}).parse(input)
        const {error}=await supabase.rpc('set_academy_payment_method',{membership_input:data.membershipId,method_input:data.method})
        if(error) return {error:error.message}
        revalidatePath('/admin/dashboard');revalidatePath('/admin/crm/alumnos','layout');revalidatePath('/portal','layout')
        return {success:true}
    }catch{return {error:'No se pudo guardar la forma de pago. Revisa tus permisos y vuelve a intentarlo.'}}
}
