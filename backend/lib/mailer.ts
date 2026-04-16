import nodemailer from 'nodemailer'
import { createNotification, type CreateNotificationArgs } from './notifications.js'

const env = (name: string) => (process.env[name] || '').trim()

const smtpPort = () => {
  const raw = env('SMTP_PORT')
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n > 0 ? n : 587
}

const smtpEnabled = () => Boolean(env('SMTP_HOST'))

const smtpTransport = () =>
  nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: smtpPort(),
    secure: smtpPort() === 465,
    auth: env('SMTP_USER')
      ? {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        }
      : undefined,
  })

export const sendMail = async (args: {
  to: string
  subject: string
  text: string
  html?: string
  notify?: CreateNotificationArgs
}) => {
  const shouldNotify = Boolean(args.notify?.userId && args.notify?.title && args.notify?.body)
  if (!smtpEnabled()) {
    if (shouldNotify) {
      createNotification(args.notify as CreateNotificationArgs).catch(() => null)
    }
    return { skipped: true as const }
  }
  const hostname = new URL(env('APP_URL') || 'http://localhost').hostname
  const fromAddress = env('SMTP_FROM') || `no-reply@${hostname}`
  const fromName = env('SMTP_FROM_NAME') || env('APP_NAME') || 'TipLnk'
  const transport = smtpTransport()
  await transport.sendMail({
    from: { name: fromName, address: fromAddress },
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  })
  if (shouldNotify) {
    createNotification(args.notify as CreateNotificationArgs).catch(() => null)
  }
  return { skipped: false as const }
}
