import fs from 'node:fs'
import path from 'node:path'
import { Resend } from 'resend'
import type { Env } from '../config/env'
import { publicUrl } from './https'
import { logger } from './logger'

/** Remetente de testes do Resend. Só entrega no e-mail da conta até o domínio ser verificado. */
const RESEND_TEST_FROM = 'Vandrae <onboarding@resend.dev>'
const PLACEHOLDER_FROM = /@(example\.(com|org|net)|teste?\.com)\b/i

function mailFrom(env: Env) {
  const from = env.RESEND_FROM?.trim()
  if (from && !PLACEHOLDER_FROM.test(from)) {
    return from
  }
  if (from) {
    logger.warn(`[mail] RESEND_FROM ignorado (${from}). Use onboarding@resend.dev ou um domínio verificado.`)
  }
  return RESEND_TEST_FROM
}

function describeResendError(message: string) {
  if (/only send testing emails to your own email address/i.test(message)) {
    return 'Com onboarding@resend.dev o Resend só entrega no e-mail da conta Resend. Para avisar outros usuários, verifique um domínio em resend.com/domains e use esse endereço em RESEND_FROM.'
  }
  if (/domain is not verified/i.test(message)) {
    return 'O domínio do remetente não está verificado no Resend. Use onboarding@resend.dev ou um domínio em resend.com/domains.'
  }
  return message
}

export async function sendPasswordResetEmail(env: Env, input: { to: string; token: string }) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada.')
  }

  const origin = publicUrl(env)
  const link = `${origin}/auth/reset-password?token=${encodeURIComponent(input.token)}`
  const from = mailFrom(env)
  logger.info(`[mail] recuperação from=${from} to=${input.to}`)
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
    throw new Error(describeResendError(error.message))
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function loadLogoPng() {
  const file = path.join(process.cwd(), 'public', 'vandrae-logo.png')
  try {
    return fs.readFileSync(file)
  } catch {
    return null
  }
}

export async function sendBanNoticeEmail(
  env: Env,
  input: { to: string; name: string; subject: string; body: string },
) {
  await sendNoticeEmail(env, input, 'aviso de banimento')
}

export async function sendRemovalNoticeEmail(
  env: Env,
  input: { to: string; name: string; subject: string; body: string },
) {
  await sendNoticeEmail(env, input, 'aviso de remoção')
}

async function sendNoticeEmail(
  env: Env,
  input: { to: string; name: string; subject: string; body: string },
  logLabel: string,
) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada.')
  }

  const from = mailFrom(env)
  const resend = new Resend(env.RESEND_API_KEY)
  const logo = loadLogoPng()
  const paragraphs = escapeHtml(input.body)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.55;color:#3d4f48;">${block.replace(/\n/g, '<br />')}</p>`)
    .join('')
  const logoBlock = logo
    ? `<img src="cid:vandrae-logo" width="56" height="56" alt="Vandrae" style="display:block;margin:0 auto 10px;border-radius:14px;" />`
    : ''

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4efe4;font-family:Arial,sans-serif;color:#1a3c34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:18px;padding:28px 28px 22px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#2d6a4f;font-weight:700;">Vandrae</p>
                <h1 style="margin:0 0 16px;font-size:22px;">${escapeHtml(input.subject)}</h1>
                ${paragraphs}
                <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#7a8a83;">Esta mensagem foi enviada pela equipe Vandrae. Se precisar de ajuda, responda este e-mail.</p>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #ece6da;text-align:center;">
                  ${logoBlock}
                  <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#1a3c34;">Vandrae</p>
                  <p style="margin:4px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#2d6a4f;font-weight:700;">Trilhas da comunidade</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${input.body}\n\n— Vandrae\nTrilhas da comunidade`,
    attachments: logo
      ? [
          {
            filename: 'vandrae-logo.png',
            content: logo,
            contentId: 'vandrae-logo',
          },
        ]
      : undefined,
  })

  if (error) {
    logger.error(`[mail] falha ao enviar ${logLabel}: ${error.message}`)
    throw new Error(describeResendError(error.message))
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
