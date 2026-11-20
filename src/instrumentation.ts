import type { Instrumentation } from 'next'
import { operationalArea, operationalLog } from './lib/operational-log'

export function register() {
    operationalLog('monitoring.ready')
}
export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
    const digest=typeof error==='object'&&error!==null&&'digest' in error&&typeof error.digest==='string'?error.digest:undefined
    // Use only the framework's route category; omit raw path/query/headers.
    operationalLog('request.failed',{source:operationalArea(context.routePath),digest})
}
