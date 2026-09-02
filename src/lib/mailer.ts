import { Resend } from 'resend'
import type { Env } from '../config/env'
import { publicUrl } from './https'
import { logger } from './logger'

export async function sendPasswordResetEmail(env: Env, input: { to: string; token: string }) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada.')
  }

  const origin = publicUrl(env)
  const link = `${origin}/auth/reset-password?token=${encodeURIComponent(input.token)}`
  const from = env.RESEND_FROM || 'Vandrae <contato.t@example.org>'
  const resend = new Resend(env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: 'Redefinir senha — Vandrae',
    html: passwordResetEmailHtml(link),
    text: `Para criar uma senha nova no Vandrae, abra: ${link}\n\nO link vale por 1 hora. Se você não pediu isso, ignore este e-mail.`,
  })

  if (error) {
    logger.error(`[mail] falha ao enviar recuperação: ${error.message}`)
    throw new Error(error.message)
  }
}

function passwordResetEmailHtml(link: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4efe4;font-family:Arial,sans-serif;color:#1a3c34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:18px;padding:28px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#2d6a4f;font-weight:700;">Vandrae</p>
                <h1 style="margin:0 0 12px;font-size:22px;">Redefinir senha</h1>
                <p style="margin:0 0 20px;line-height:1.5;color:#3d4f48;">Recebemos um pedido para criar uma senha nova. O link abaixo vale por 1 hora.</p>
                <p style="margin:0 0 24px;">
                  <a href="${link}" style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">Definir senha nova</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8a83;">Se o botão não funcionar, copie: ${link}</p>
                <p style="margin:16px 0 0;font-size:12px;color:#7a8a83;">Se você não pediu essa troca, ignore este e-mail.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
