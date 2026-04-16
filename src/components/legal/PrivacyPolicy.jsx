import { ArrowLeft, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
              <Eye size={24} className="text-[#c4ff00]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black">Privacy Policy</h1>
          </div>

          <div className="space-y-8 text-surface-300 leading-relaxed font-light">
            <p>
              At TipLnk, we prioritize your privacy and aim to collect only the minimum data necessary to provide a seamless decentralized experience.
            </p>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Public Wallet Addresses:</strong> We process your public Solana wallet address to enable profile management, tipping, and analytics.</li>
                <li><strong>Public Profile Data:</strong> Information you explicitly provide, such as your display name, SNS subdomain, and social handles.</li>
                <li><strong>On-chain Data:</strong> We retrieve publicly available blockchain data (transactions, NFT ownership) to populate your dashboard.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. How We Store Information</h2>
              <p>
                Core application state is stored locally in your browser's persistent storage. For cross-device profile synchronization, we utilize secure infrastructure to store your profile metadata. No private keys or seeds are ever transmitted or stored.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. Use of Information</h2>
              <p>
                We use the collected information solely to provide the Service's features, including routing tips, displaying your creator profile, and providing portfolio insights. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">4. Third-Party Services</h2>
              <p>
                Our Service interacts with various third-party decentralized protocols and wallet adapters. These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">5. Cookies and Tracking</h2>
              <p>
                TipLnk does not use traditional tracking cookies or third-party advertising trackers. We may use local storage to maintain your application preferences and session state.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">6. Data Retention</h2>
              <p>
                Since core transaction data is stored on the Solana blockchain, it is permanent and beyond our control. Profile metadata stored in our infrastructure can be removed by disconnecting your wallet or using profile management tools within the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">7. Contact Us</h2>
              <p>
                If you have questions about this policy, please reach out to us via our community channels on Twitter or Discord.
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
