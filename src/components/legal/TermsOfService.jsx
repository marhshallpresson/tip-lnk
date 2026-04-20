import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-surface-300 space-y-8 font-sans">
      <h1 className="text-4xl font-black text-white mb-12">Terms of Service</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-brand-500">1. Acceptance of Terms</h2>
        <p className="leading-relaxed">
          By accessing or using TipLnk ("the Protocol"), you agree to be bound by these Terms of Service. If you do not agree, you must immediately cease all use of the Protocol.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-brand-500">2. Description of Service</h2>
        <p className="leading-relaxed">
          TipLnk is a decentralized tipping and content platform on the Solana blockchain. We provide infrastructure for creators to receive digital asset contributions from supporters.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-brand-500">3. Protocol Fees & Automation</h2>
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
            <p className="font-bold text-white italic underline">3.1 Sender-Pays Platform Fee</p>
            <p className="leading-relaxed">
              TipLnk charges a platform fee on complex transactions (swaps) to cover routing and infrastructure costs. This fee is currently set at 100 BPS (1%) and is added to the sender's total authorization. Direct transfers of SOL or USDC incur a 0% platform fee.
            </p>
            <p className="font-bold text-white italic underline">3.2 Automated Stablecoin Settlement</p>
            <p className="leading-relaxed">
              Creators may enable "Auto-Settle to USDC." When enabled, the Protocol will automatically route any non-USDC contributions through decentralized exchanges (via DFlow/Jupiter) to convert them into stable USDC before final delivery to the creator's wallet.
            </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-brand-500">4. Risk Disclosure</h2>
        <p className="leading-relaxed">
          Blockchain transactions are irreversible. TipLnk is not responsible for lost funds due to user error, wallet compromise, or smart contract vulnerabilities. You acknowledge that crypto-assets are volatile.
        </p>
      </section>

      <p className="text-xs text-surface-500 pt-12">Last Updated: April 20, 2026</p>
    </div>
  );
}
