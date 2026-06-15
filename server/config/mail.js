const nodemailer = require('nodemailer')

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    console.log(`📧 SMTP configured: ${process.env.SMTP_USER}`)
  } else {
    console.warn('⚠️  No SMTP configured. Emails will NOT be sent.')
    console.warn('   Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable.')
    // Return a dummy transporter that logs instead of sending
    return {
      sendMail: async (opts) => {
        console.log(`📧 [DRY RUN] Would send to: ${opts.to} | Subject: ${opts.subject}`)
        return { messageId: 'dry-run' }
      }
    }
  }

  return transporter
}

async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter()
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"Thikana Marketplace" <thikana.marketplace@gmail.com>',
    to,
    subject,
    html,
    text: text || '',
  })

  console.log(`📧 Email sent to ${to} [${info.messageId}]`)
  return info
}

module.exports = { sendMail }
