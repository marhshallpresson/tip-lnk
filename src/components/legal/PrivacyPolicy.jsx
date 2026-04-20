import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-surface-300 space-y-8 font-sans">
      <h1 className="text-4xl font-black text-white mb-12">Privacy Policy</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-accent-cyan">1. Information We Collect</h2>
        <p className="leading-relaxed">
          TipLnk is designed to be privacy-first. We collect your Solana public wallet address, connected social handles (if provided), and email address (if linked).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-accent-cyan">2. On-Chain Transparency</h2>
        <p className="leading-relaxed">
          Please note that all financial transactions made via TipLnk are recorded on the Solana blockchain and are publicly viewable on explorers like Solscan. We do not have the power to hide or delete on-chain data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-accent-cyan">3. Third-Party Integrations</h2>
        <p className="leading-relaxed">
          We use third-party services like Helius (for blockchain indexing) and Brevo (for email verification). These services only receive the minimum data required to perform their specific functions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest text-accent-cyan">4. Data Export</h2>
        <p className="leading-relaxed">
          You may request an export of all off-chain data associated with your profile at any time through the "Settings" panel in your Creator Dashboard.
        </p>
      </section>

      <p className="text-xs text-surface-500 pt-12">Last Updated: April 20, 2026</p>
    </div>
  );
}
