import { getAcademyPaymentReview } from '@/lib/academy-payment-review'
import { AcademyPaymentReviewPanel } from '@/components/admin/academy-payment-review'
export default async function PaymentReview({searchParams}:{searchParams:Promise<{month?:string;method?:string}>}) {
    const query=await searchParams,data=await getAcademyPaymentReview(query.month)
    return <AcademyPaymentReviewPanel data={data} initialMethod={query.method}/>
}
