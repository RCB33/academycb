import 'server-only'

// Supabase caps each response. Read stable pages instead of silently omitting older families.
export async function adminReadAll<T>(page:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:{message:string}|null}>) {
 const rows:T[]=[]
 for(let from=0;;from+=500){
  const result=await page(from,from+499)
  if(result.error)throw new Error('No se pudo cargar la información de actividades.')
  rows.push(...(result.data||[]))
  if((result.data?.length||0)<500)return {data:rows,error:null}
 }
}
