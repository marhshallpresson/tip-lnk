import { sendMail } from './lib/mailer.js';

async function testEmail() {
  console.log('📧 Testing Brevo SMTP Connection...');
  try {
    const result = await sendMail({
      to: 'a873a4001@smtp-brevo.com', // Sending to self as test
      subject: 'TipLnk Elite System Check',
      text: 'Your SMTP integration is 100% functional. TipLnk is ready for launch.',
      html: '<h1>✨ TipLnk Active</h1><p>Your SMTP integration is 100% functional. TipLnk is ready for launch.</p>'
    });
    
    if (result.skipped) {
      console.error('❌ Email was SKIPPED. Check if SMTP_HOST is set in backend environment.');
    } else {
      console.log('✅ Email SENT. Check your Brevo inbox.');
    }
  } catch (err) {
    console.error('❌ Email Failed:', err.message);
  }
  process.exit(0);
}

testEmail();
