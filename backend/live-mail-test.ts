import { sendMail } from './lib/mailer.js';

async function liveInboxTest() {
  console.log('📧 Initiating Live Inbox Test for mobot685@gmail.com...');
  try {
    const result = await sendMail({
      to: 'mobot685@gmail.com',
      subject: 'Welcome to TipLnk Elite — System Check',
      text: 'Your professional SMTP integration is working flawlessly. TipLnk is now active.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0d1117; color: white; border-radius: 12px;">
          <h1 style="color: #00d265;">✨ TipLnk is Live</h1>
          <p>This is a live test of your professional creator onboarding system.</p>
          <p>Your verification engine is now 100% functional.</p>
          <hr style="border: 0; border-top: 1px solid #30363d; margin: 20px 0;" />
          <p style="font-size: 12px; color: #8b949e;">Powered by Brevo x Helius x DFlow</p>
        </div>
      `
    });
    
    if (result.skipped) {
      console.error('❌ Test SKIPPED. Check SMTP environment variables.');
    } else {
      console.log('✅ Success! Test email dispatched to mobot685@gmail.com.');
    }
  } catch (err) {
    console.error('❌ Delivery Failed:', err.message);
  }
  process.exit(0);
}

liveInboxTest();
