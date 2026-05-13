export function buildSiwsMessage(address) {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const requestId = crypto.randomUUID();
  const domain = window.location.hostname;
  const uri = `${window.location.origin}/`;

  return `${domain} wants you to sign in with your Solana account:
${address}

Welcome to Tip Stack. Signing is the only way we can truly know that you are the owner of the wallet you are connecting. Signing is a safe, gas-less transaction that does not in any way give Tip Stack permission to perform any transactions with your wallet.

URI: ${uri}
Version: 1
Nonce: ${nonce}
Issued At: ${timestamp}
Request ID: ${requestId}`;
}
