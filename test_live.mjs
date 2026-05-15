const testEndpoints = async () => {
  const base = 'https://tipstack.fun/api';
  const check = async (name, url, options) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      console.log(`[${name}] ${res.status} ${res.statusText}`);
      if (res.status >= 400) console.log(`   -> ${text.substring(0, 150)}`);
    } catch (e) {
      console.log(`[${name}] ERROR: ${e.message}`);
    }
  };

  await check('Health Probe', `${base}/`);
  await check('Profile Fetch', `${base}/solana/profile/get?wallet=mobot.tipstack.sol`);
  await check('Deep Link Resolve', `${base}/deep-link/resolve?handle=@mobot`);
  await check('Fiat Rate Quote', `${base}/payments/fiat/rate?amount=5`);
  await check('Diagnostic Check', `${base}/solana/diagnostic-check`);
  
  await check('Crypto Payment Intent', `${base}/payments/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorId: 'mobot.tipstack.sol', inputTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: '5000000', sourceWalletAddress: 'mobot.tipstack.sol' })
  });

  await check('Fiat Payment Intent', `${base}/payments/fiat/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorId: 'mobot.tipstack.sol', amount: 5 })
  });
};

testEndpoints();
