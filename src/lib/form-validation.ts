export type InvalidField = { field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; label: string; message: string }

// Keep native constraints, but provide persistent feedback instead of relying
// on a mobile browser bubble which may be hidden by the sticky header.
export function invalidFormFields(form: HTMLFormElement): InvalidField[] {
    return Array.from(form.elements).flatMap(element => {
        if (!('willValidate' in element) || !('validity' in element)) return []
        const field = element as InvalidField['field']
        if (!field.willValidate || field.validity.valid) return []
        let label = field.getAttribute('aria-label') || ''
        if (!label && field.labels?.[0]) {
            const copy = field.labels[0].cloneNode(true) as HTMLElement
            copy.querySelectorAll('input,select,textarea,button').forEach(node => node.remove())
            label = copy.textContent?.trim() || ''
        }
        const player = field.closest('[data-player]')?.getAttribute('data-player')
        if (player) label = `${player} · ${label}`
        return [{ field, label: label || field.name || 'Campo obligatorio', message: field.validationMessage }]
    })
}

export function focusInvalidField(field: InvalidField['field']) {
    field.focus({ preventScroll: true })
    field.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
