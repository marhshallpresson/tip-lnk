import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-surface-400 hover:text-[#c4ff00] transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="glass-card p-8 md:p-12 border-[#c4ff00]/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#c4ff00]/10 flex items-center justify-center border border-[#c4ff00]/20">
              <Shield size={24} className="text-[#c4ff00]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black">Terms of Service</h1>
          </div>

          <div className="space-y-8 text-surface-300 leading-relaxed font-light">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the TipLnk platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
              <p>
                TipLnk provides a decentralized, non-custodial interface on the Solana blockchain that enables users to create creator profiles, register SNS subdomains, and facilitate payment tipping using third-party routing protocols (e.g., DFlow, Jupiter).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. Non-Custodial Nature</h2>
              <p>
                TipLnk does not take custody of your digital assets. You are solely responsible for managing your private keys and securing your wallet. TipLnk never has access to your funds and cannot reverse or recover transactions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">4. SNS Subdomains</h2>
              <p>
                The registration and use of SNS subdomains (e.g., name.tiplnk.sol) are subject to the rules and fees established by the Solana Name Service (SNS) and Bonfida. TipLnk facilitates the interface for registration but does not own or control the SNS infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">5. Risks and Disclaimers</h2>
              <p>
                Blockchain transactions are irreversible. You acknowledge the inherent risks of using decentralized finance (DeFi) protocols, including but not limited to smart contract vulnerabilities, network congestion, and volatile asset prices. The Service is provided "AS IS" without warranties of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">6. Third-Party Integrations</h2>
              <p>
                TipLnk integrates with third-party services such as wallet providers, RPC nodes, and trading aggregators. Your use of these services is subject to their respective terms and conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, TipLnk and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">8. Governing Law</h2>
              <p>
                These terms shall be governed by the laws of the jurisdiction in which the core development team operates, without regard to its conflict of law provisions.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-surface-800/50 text-center">
            <p className="text-surface-500 text-sm">Last Updated: April 15, 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
