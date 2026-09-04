const PROJECT_REF = 'pnaitrnthhclyzfdvgbp'
const SITE_URL = 'https://www.academycostabrava.com'
const FROM = 'Academy Costa Brava <info@academycostabrava.com>'
const REPLY_TO = 'info@academycostabrava.com'

function layout({ eyebrow, title, intro, detail, buttonLabel, buttonHref, code, security = false }) {
    const action = buttonLabel && buttonHref
        ? `<tr><td style="padding:8px 32px 28px"><a href="${buttonHref}" style="display:inline-block;background:#dfb52f;color:#0d2749;text-decoration:none;font-size:15px;font-weight:800;padding:14px 22px;border-radius:10px">${buttonLabel}</a></td></tr>`
        : ''
    const otp = code
        ? `<tr><td style="padding:4px 32px 28px"><div style="display:inline-block;background:#f5f0df;border:1px solid #ead58c;border-radius:12px;color:#0d2749;font-size:28px;font-weight:900;letter-spacing:7px;padding:16px 20px">${code}</div></td></tr>`
        : ''
    const securityNote = security
        ? `<tr><td style="padding:0 32px 28px"><div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;color:#9a3412;font-size:13px;line-height:1.55;padding:14px 16px"><strong>¿No has realizado esta acción?</strong><br>Protege tu cuenta y escríbenos cuanto antes a <a href="mailto:${REPLY_TO}" style="color:#9a3412">${REPLY_TO}</a>.</div></td></tr>`
        : ''

    return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#14233a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe6ef;border-radius:20px;overflow:hidden"><tr><td style="background:#0d2749;padding:22px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="76" valign="middle"><img src="${SITE_URL}/email-logo.png" width="64" height="64" alt="Logo de Academy Costa Brava" style="display:block;width:64px;height:64px;border:0;border-radius:50%;object-fit:cover"></td><td valign="middle" style="padding-left:14px;color:#ffffff;font-size:18px;font-weight:800;line-height:1.15">ACADEMY<br><span style="color:#dfb52f;font-size:12px;letter-spacing:1.5px">COSTA BRAVA</span></td></tr></table></td></tr><tr><td style="padding:32px 32px 10px;color:#dfb52f;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">${eyebrow}</td></tr><tr><td style="padding:0 32px 14px"><h1 style="margin:0;color:#0d2749;font-size:28px;line-height:1.2">${title}</h1></td></tr><tr><td style="padding:0 32px 18px;color:#475569;font-size:16px;line-height:1.65">${intro}</td></tr>${detail ? `<tr><td style="padding:0 32px 24px;color:#64748b;font-size:14px;line-height:1.6">${detail}</td></tr>` : ''}${otp}${action}${securityNote}<tr><td style="border-top:1px solid #e7edf4;padding:22px 32px;color:#7b8799;font-size:12px;line-height:1.55">Este mensaje ha sido enviado por Academy Costa Brava.<br>Si necesitas ayuda, responde a este correo o escribe a <a href="mailto:${REPLY_TO}" style="color:#0d2749">${REPLY_TO}</a>.</td></tr></table><div style="max-width:620px;padding:14px;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center">Academy Costa Brava · Entrena · Aprende · Compite · Disfruta</div></td></tr></table></body></html>`
}

const templates = [
    {
        id: 'invite', subjectKey: 'mailer_subjects_invite', contentKey: 'mailer_templates_invite_content',
        subject: 'Bienvenido/a a Academy · Activa tu acceso',
        html: layout({ eyebrow: 'Tu acceso a Academy', title: '¡Bienvenido/a a la familia Academy!', intro: 'Tu cuenta está preparada. Activa tu acceso para entrar en tu espacio privado y consultar las funciones asignadas a tu perfil.', detail: 'El enlace es personal y tiene una duración limitada. No lo compartas con otras personas.', buttonLabel: 'Activar mi acceso', buttonHref: '{{ .ConfirmationURL }}' })
    },
    {
        id: 'confirmation', subjectKey: 'mailer_subjects_confirmation', contentKey: 'mailer_templates_confirmation_content',
        subject: 'Confirma tu correo · Academy Costa Brava',
        html: layout({ eyebrow: 'Verificación de correo', title: 'Confirma tu dirección de email', intro: 'Solo falta confirmar que esta dirección de correo te pertenece para terminar de proteger tu cuenta Academy.', detail: 'Si tú no has iniciado este registro, puedes ignorar el mensaje.', buttonLabel: 'Confirmar mi correo', buttonHref: '{{ .ConfirmationURL }}' })
    },
    {
        id: 'recovery', subjectKey: 'mailer_subjects_recovery', contentKey: 'mailer_templates_recovery_content',
        subject: 'Recupera tu contraseña · Academy Costa Brava',
        html: layout({ eyebrow: 'Recuperación de acceso', title: 'Crea una nueva contraseña', intro: 'Hemos recibido una solicitud para recuperar el acceso a tu cuenta.', detail: 'El enlace caduca por seguridad. Si no has solicitado el cambio, ignora este correo y tu contraseña seguirá siendo la misma.', buttonLabel: 'Cambiar mi contraseña', buttonHref: '{{ .ConfirmationURL }}', security: true })
    },
    {
        id: 'magic_link', subjectKey: 'mailer_subjects_magic_link', contentKey: 'mailer_templates_magic_link_content',
        subject: 'Tu enlace de acceso · Academy Costa Brava',
        html: layout({ eyebrow: 'Acceso seguro', title: 'Entra en tu cuenta Academy', intro: 'Utiliza este enlace personal para iniciar sesión de forma segura.', detail: 'El enlace solo puede utilizarse una vez y caduca en poco tiempo.', buttonLabel: 'Entrar en Academy', buttonHref: '{{ .ConfirmationURL }}' })
    },
    {
        id: 'email_change', subjectKey: 'mailer_subjects_email_change', contentKey: 'mailer_templates_email_change_content',
        subject: 'Confirma tu nuevo correo · Academy Costa Brava',
        html: layout({ eyebrow: 'Cambio de correo', title: 'Confirma tu nueva dirección', intro: 'Has solicitado utilizar <strong>{{ .NewEmail }}</strong> como nuevo correo de acceso a Academy.', detail: 'El cambio no se completará hasta que confirmes esta dirección.', buttonLabel: 'Confirmar nuevo correo', buttonHref: '{{ .ConfirmationURL }}', security: true })
    },
    {
        id: 'reauthentication', subjectKey: 'mailer_subjects_reauthentication', contentKey: 'mailer_templates_reauthentication_content',
        subject: '{{ .Token }} · Código de verificación Academy',
        html: layout({ eyebrow: 'Verificación de identidad', title: 'Tu código de seguridad', intro: 'Introduce este código para confirmar que eres tú antes de realizar una acción sensible.', detail: 'No compartas este código con nadie. Academy nunca te lo pedirá por teléfono o WhatsApp.', code: '{{ .Token }}', security: true })
    },
    {
        id: 'password_changed_notification', subjectKey: 'mailer_subjects_password_changed_notification', contentKey: 'mailer_templates_password_changed_notification_content', notificationKey: 'mailer_notifications_password_changed_enabled',
        subject: 'Tu contraseña se ha cambiado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Contraseña actualizada', intro: 'La contraseña de tu cuenta Academy se ha cambiado correctamente.', detail: 'Si has realizado el cambio, no tienes que hacer nada más.', security: true })
    },
    {
        id: 'email_changed_notification', subjectKey: 'mailer_subjects_email_changed_notification', contentKey: 'mailer_templates_email_changed_notification_content', notificationKey: 'mailer_notifications_email_changed_enabled',
        subject: 'Tu correo de acceso se ha cambiado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Correo de acceso actualizado', intro: 'El correo de tu cuenta se ha cambiado de <strong>{{ .OldEmail }}</strong> a <strong>{{ .Email }}</strong>.', detail: 'Si has realizado el cambio, no tienes que hacer nada más.', security: true })
    },
    {
        id: 'phone_changed_notification', subjectKey: 'mailer_subjects_phone_changed_notification', contentKey: 'mailer_templates_phone_changed_notification_content', notificationKey: 'mailer_notifications_phone_changed_enabled',
        subject: 'Tu teléfono de acceso se ha cambiado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Teléfono actualizado', intro: 'El teléfono asociado a tu cuenta se ha cambiado de <strong>{{ .OldPhone }}</strong> a <strong>{{ .Phone }}</strong>.', security: true })
    },
    {
        id: 'mfa_factor_enrolled_notification', subjectKey: 'mailer_subjects_mfa_factor_enrolled_notification', contentKey: 'mailer_templates_mfa_factor_enrolled_notification_content', notificationKey: 'mailer_notifications_mfa_factor_enrolled_enabled',
        subject: 'Nuevo método de verificación añadido · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Protección adicional activada', intro: 'Se ha añadido un nuevo método de verificación a tu cuenta Academy.', detail: 'Método registrado: <strong>{{ .FactorType }}</strong>.', security: true })
    },
    {
        id: 'mfa_factor_unenrolled_notification', subjectKey: 'mailer_subjects_mfa_factor_unenrolled_notification', contentKey: 'mailer_templates_mfa_factor_unenrolled_notification_content', notificationKey: 'mailer_notifications_mfa_factor_unenrolled_enabled',
        subject: 'Método de verificación eliminado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Protección adicional modificada', intro: 'Se ha eliminado un método de verificación de tu cuenta Academy.', detail: 'Método eliminado: <strong>{{ .FactorType }}</strong>.', security: true })
    },
    {
        id: 'identity_linked_notification', subjectKey: 'mailer_subjects_identity_linked_notification', contentKey: 'mailer_templates_identity_linked_notification_content', notificationKey: 'mailer_notifications_identity_linked_enabled',
        subject: 'Nuevo método de acceso vinculado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Método de acceso vinculado', intro: 'Se ha vinculado <strong>{{ .Provider }}</strong> como método de acceso a tu cuenta Academy.', security: true })
    },
    {
        id: 'identity_unlinked_notification', subjectKey: 'mailer_subjects_identity_unlinked_notification', contentKey: 'mailer_templates_identity_unlinked_notification_content', notificationKey: 'mailer_notifications_identity_unlinked_enabled',
        subject: 'Método de acceso eliminado · Academy',
        html: layout({ eyebrow: 'Aviso de seguridad', title: 'Método de acceso eliminado', intro: 'Se ha eliminado <strong>{{ .Provider }}</strong> como método de acceso a tu cuenta Academy.', security: true })
    },
]

function buildAuthConfig() {
    return templates.reduce((config, template) => {
        config[template.subjectKey] = template.subject
        config[template.contentKey] = template.html
        if (template.notificationKey) config[template.notificationKey] = true
        return config
    }, {})
}

function renderPreview(html) {
    return html
        .replaceAll('{{ .ConfirmationURL }}', `${SITE_URL}/portal`)
        .replaceAll('{{ .Token }}', '482731')
        .replaceAll('{{ .NewEmail }}', 'nuevo-correo@ejemplo.com')
        .replaceAll('{{ .OldEmail }}', 'correo-anterior@ejemplo.com')
        .replaceAll('{{ .Email }}', 'nuevo-correo@ejemplo.com')
        .replaceAll('{{ .OldPhone }}', '+34 600 000 001')
        .replaceAll('{{ .Phone }}', '+34 600 000 002')
        .replaceAll('{{ .FactorType }}', 'Aplicación de autenticación')
        .replaceAll('{{ .Provider }}', 'Google')
}

async function configureSupabase() {
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN
    if (!accessToken) throw new Error('Falta SUPABASE_ACCESS_TOKEN para configurar Supabase.')

    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAuthConfig()),
    })
    if (!response.ok) throw new Error(`Supabase rechazó la configuración (${response.status}): ${await response.text()}`)
    console.log(`Configuradas ${templates.length} plantillas de Academy en Supabase.`)
}

async function sendPreviews(to) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Falta RESEND_API_KEY para enviar las pruebas.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('El email de prueba no es válido.')

    const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(templates.map((template, index) => ({
            from: FROM,
            to: [to],
            reply_to: REPLY_TO,
            subject: `[PRUEBA ${index + 1}/${templates.length}] ${template.subject.replaceAll('{{ .Token }}', '482731')}`,
            html: renderPreview(template.html),
            text: `Vista previa de la plantilla: ${template.id}. Esta prueba no realiza ninguna acción en tu cuenta.`,
        }))),
    })
    if (!response.ok) throw new Error(`Resend rechazó las pruebas (${response.status}): ${await response.text()}`)
    console.log(`Enviadas ${templates.length} pruebas a ${to}.`)
}

const shouldConfigure = process.argv.includes('--configure')
const previewIndex = process.argv.indexOf('--preview-to')
const previewTo = previewIndex >= 0 ? process.argv[previewIndex + 1] : ''

if (!shouldConfigure && !previewTo) {
    throw new Error('Usa --configure y/o --preview-to correo@ejemplo.com')
}
if (shouldConfigure) await configureSupabase()
if (previewTo) await sendPreviews(previewTo)
