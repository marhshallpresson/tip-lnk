const appName = 'TipLnk'
const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, '')
const appUrl = normalizeUrl(process.env.APP_URL || 'http://localhost:3000')
const assetUrl = normalizeUrl(
  process.env.MAIL_ASSET_URL ||
  process.env.UPLOADS_BASE_URL ||
  appUrl
)

const brandColor = '#00FFA3' // TipLnk Green/Cyan
const brandBlack = '#0A0A0A'
const brandGray = '#1A1A1A'

const styles = {
  body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #E5E7EB; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; background-color: #0A0A0A;',
  container: 'max-w-xl mx-auto bg-[#1A1A1A] rounded-2xl shadow-xl overflow-hidden border border-white/10',
  header: `background-color: ${brandBlack}; padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);`,
  logo: 'height: 40px; width: auto;',
  content: 'padding: 40px 30px; background-color: #1A1A1A;',
  h1: `color: #FFFFFF; font-size: 24px; font-weight: 700; margin-bottom: 20px;`,
  p: 'font-size: 16px; margin-bottom: 24px; color: #9CA3AF; line-height: 1.6;',
  buttonContainer: 'text-align: center; margin: 30px 0;',
  button: `display: inline-block; background-color: ${brandColor}; color: ${brandBlack}; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; transition: opacity 0.2s;`,
  highlightBox: `background-color: rgba(0, 255, 163, 0.05); border-left: 4px solid ${brandColor}; padding: 20px; margin-bottom: 24px; border-radius: 8px;`,
  footer: 'background-color: #0A0A0A; padding: 30px 20px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid rgba(255,255,255,0.05);',
}

const renderLayout = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${styles.body}">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 20px 12px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1A1A1A; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="${styles.header}">
              <div style="font-size: 24px; font-weight: 800; color: ${brandColor}; letter-spacing: -1px;">TipLnk</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="${styles.content}">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="${styles.footer}">
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p style="margin-top: 12px;">
                <a href="${appUrl}/privacy" style="color: #6B7280; text-decoration: underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

export const templates = {
  verifyEmailCode: (name: string, code: string) => {
    const content = `
      <h1 style="${styles.h1}">Verify Your Email</h1>
      <p style="${styles.p}">Hi ${name},</p>
      <p style="${styles.p}">Use the following code to verify your email address and secure your TipLnk account:</p>
      
      <div style="background-color: #000000; padding: 30px; text-align: center; border-radius: 16px; margin: 30px 0; border: 1px solid rgba(255,255,255,0.1);">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: monospace;">${code}</span>
      </div>
      
      <p style="${styles.p}">This code will expire in 1 hour.</p>
    `
    return renderLayout(content, 'Your TipLnk Verification Code')
  },

  resetPassword: (name: string, link: string) => {
    const content = `
      <h1 style="${styles.h1}">Reset Password</h1>
      <p style="${styles.p}">Hi ${name},</p>
      <p style="${styles.p}">We received a request to reset your password. Click the button below to choose a new one:</p>
      
      <div style="${styles.buttonContainer}">
        <a href="${link}" style="${styles.button}">Reset Password</a>
      </div>
      
      <p style="${styles.p}">If you didn't request this, you can safely ignore this email.</p>
    `
    return renderLayout(content, 'Reset your TipLnk password')
  },
}
