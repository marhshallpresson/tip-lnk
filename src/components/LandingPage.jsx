import { useState, useEffect } from 'react';
import { Zap, Shield, Globe, ArrowRight, Wallet, TrendingUp, ChevronRight, ExternalLink, Star, Users, Coins, Image as ImageIcon } from 'lucide-react';

/* ─── Animated particles (SNS-inspired) ─── */
function Particles() {
  return (
    <div className="particles-container" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-accent-neon/20"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100 + 100}%`,
            animation: `particle ${Math.random() * 15 + 15}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
}



/* ─── Ko-fi Style Feature Block (Split Layout) ─── */
function FeatureBlock({ title, description, icon: Icon, reversed }) {
  return (
    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-20 py-16`}>
      <div className="flex-1 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#c4ff00]/10 flex items-center justify-center border border-[#c4ff00]/20 mb-6 shadow-[0_0_30px_rgba(196,255,0,0.15)]">
          <Icon size={32} className="text-[#c4ff00]" />
        </div>
        <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight">{title}</h3>
        <p className="text-base md:text-lg text-surface-400 leading-relaxed">{description}</p>
        <button className="btn-outline flex items-center gap-2">
          Learn more <ChevronRight size={16} />
        </button>
      </div>
      <div className="flex-1 w-full relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c4ff00]/20 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="h-[250px] md:h-[300px] w-full rounded-3xl home-card flex items-center justify-center border border-[#c4ff00]/10 relative z-10 overflow-hidden">
           {/* Abstract visual representation */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#c4ff00 1px, transparent 1px), linear-gradient(90deg, #c4ff00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           <Icon size={120} className="text-[#c4ff00]/20" />
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison Table ─── */
function ComparisonTable() {
  const rows = [
    { feature: 'Platform Fee', tiplnk: '0%', buymeacoffee: '5%', kofi: '0%*', patreon: '5-12%' },
    { feature: 'Instant Payout', tiplnk: '✓ Near Instant', buymeacoffee: '2-5 days', kofi: '2-5 days', patreon: '1-5 days' },
    { feature: 'Global Recipients', tiplnk: '✓ Instant', buymeacoffee: 'Waitlist', kofi: 'PayPal only', patreon: 'Bank dependent' },
    { feature: 'Own Your Identity', tiplnk: '✓ On-chain SNS', buymeacoffee: '✗ Centralized', kofi: '✗ Centralized', patreon: '✗ Centralized' },
    { feature: 'Yield on Tips', tiplnk: '✓ Kamino DeFi', buymeacoffee: '✗', kofi: '✗', patreon: '✗' },
  ];

  return (
    <div className="overflow-x-auto w-full home-card p-4 sm:p-6 border-[#c4ff00]/20">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="border-b border-surface-700/50">
            <th className="text-left py-4 px-4 text-[#c4ff00] font-semibold text-base">Feature</th>
            <th className="text-center py-4 px-4 text-[#c4ff00] font-black text-lg">TipLnk</th>
            <th className="text-center py-4 px-4 text-surface-400 font-medium">Ko-fi</th>
            <th className="text-center py-4 px-4 text-surface-400 font-medium">BMC</th>
            <th className="text-center py-4 px-4 text-surface-400 font-medium hidden md:table-cell">Patreon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-surface-800/40 hover:bg-surface-900/30 transition-colors">
              <td className="py-4 px-4 text-surface-200 font-medium">{row.feature}</td>
              <td className="py-4 px-4 text-center text-[#c4ff00] font-bold">{row.tiplnk}</td>
              <td className="py-4 px-4 text-center text-surface-500">{row.kofi}</td>
              <td className="py-4 px-4 text-center text-surface-500">{row.buymeacoffee}</td>
              <td className="py-4 px-4 text-center text-surface-500 hidden md:table-cell">{row.patreon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onboardingComplete, connected, onViewDashboard }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0d1117] text-white">
      <Particles />
      


      {/* ── Hero Section (Ko-fi style Friendly & Bold) ─── */}
      <section className="relative pt-32 md:pt-40 pb-20 px-4 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(196,255,0,0.15)_0%,transparent_50%)] z-0" />
        
        <div className="relative z-10 max-w-[900px] mx-auto w-full">
          
          
          <h1 className="animate-slide-up text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8">
            Fund your <span className="whitespace-nowrap">passio<span className="text-[#c4ff00]">n</span>.</span> <br className="hidden sm:block" />
            Make it <span className="whitespace-nowrap">on-chai<span className="text-[#c4ff00]">n</span>.</span>
          </h1>
          
          <p className="animate-slide-up text-surface-300 text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light" style={{ animationDelay: '0.1s' }}>
            Accept tips, sell memberships, and grow your audience with zero platform fees. Instantly cash out to fiat anywhere.
          </p>

          <div className="animate-slide-up bg-surface-900/60 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-2 max-w-lg mx-auto flex items-center justify-between shadow-2xl shadow-black/50 mb-6" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center text-surface-400 pl-4">
              <span className="text-[#c4ff00]">tiplnk.sol/</span>
              <input type="text" placeholder="yourname" className="bg-transparent outline-none w-32 border-none text-white focus:ring-0 placeholder:text-surface-600" />
            </div>
            <button onClick={onGetStarted} className="btn-primary !px-8 py-4 min-h-[50px] shadow-[0_0_15px_rgba(196,255,0,0.5)]">
              Claim Link
            </button>
          </div>
          <p className="animate-fade-in text-surface-500 text-sm" style={{ animationDelay: '0.3s' }}>It's free, completely decentralized, and takes 10 seconds.</p>
        </div>
      </section>

      {/* ── Creators Grid (Ko-fi Community Discovery Style) ─── */}
      <section id="creators" className="relative z-10 py-16 border-y border-surface-800/60 bg-surface-900/20 px-4">
        <div className="max-w-[1200px] mx-auto overflow-hidden">
          <p className="text-center text-[#c4ff00] font-bold tracking-widest uppercase text-[10px] sm:text-sm mb-10">Join 10,000+ Creators on TipLnk</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
               { name: 'Mobot Defi', handle: '@mobot.tiplnk.sol', color: 'bg-emerald-500' },
               { name: 'DeFi Analyst', handle: '@defi.tiplnk.sol', color: 'bg-blue-500' },
               { name: 'Music Producer', handle: '@beats.tiplnk.sol', color: 'bg-purple-500' },
               { name: 'Web3 Dev', handle: '@dev.tiplnk.sol', color: 'bg-orange-500' }
            ].map((c, i) => (
              <div key={i} className="home-card p-5 text-center group cursor-pointer border-[#c4ff00]/10 hover:border-[#c4ff00]/50 transition-colors">
                <div className={`w-16 h-16 mx-auto rounded-full ${c.color} mb-3 flex items-center justify-center border-2 border-surface-900 shadow-lg`}>
                  <ImageIcon size={24} className="text-white/50" />
                </div>
                <h4 className="font-bold text-white">{c.name}</h4>
                <p className="text-xs text-[#c4ff00] font-mono mt-1">{c.handle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Blocks ─── */}
      <section id="features" className="relative z-10 py-24 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Everything you need, <br/><span className="text-[#c4ff00]">none of the fees.</span></h2>
          </div>

          <div className="space-y-12 md:space-y-24">
            <FeatureBlock 
              icon={Globe}
              title="Your On-chain Identity"
              description="Never paste a long wallet address again. Claim your SNS domain (yourname.tiplnk.sol) and build a permanent tipping page that can't be taken down."
            />
            <FeatureBlock 
              icon={Coins}
              reversed
              title="Zero Platform Fees"
              description="Keep 100% of your money. Ko-fi and Patreon take a massive cut. With smart contracts and DFlow routing, your supporters' tips go straight to your wallet."
            />
            <FeatureBlock 
              icon={TrendingUp}
              title="Earn While You Sleep"
              description="Idle tips automatically compound inside Kamino DeFi vaults. Your tip jar literally grows on its own until you're ready to cash out."
            />
          </div>
        </div>
      </section>

      {/* ── Comparison Compare ─── */}
      <section id="compare" className="relative z-10 py-24 px-4 bg-surface-900/30 border-t border-surface-800/50">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-6">No Match.</h2>
            <p className="text-surface-400 text-base max-w-md mx-auto">The best alternative to traditional platforms is built on Solana.</p>
          </div>
          <ComparisonTable />
        </div>
      </section>

      {/* ── CTA Footer ─── */}
      <section className="relative z-10 py-32 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(196,255,0,0.1)_0%,transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto h-full flex flex-col justify-center items-center">
          <div className="w-20 h-20 bg-[#c4ff00]/10 rounded-full flex items-center justify-center mb-8 border border-[#c4ff00]/30 shadow-[0_0_30px_rgba(196,255,0,0.3)]">
            <Zap size={40} className="text-[#c4ff00]" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Start your era.</h2>
          <button onClick={onGetStarted} className="btn-primary text-base !px-10 !py-4 shadow-[0_0_40px_rgba(196,255,0,0.4)]">
            Claim Your Page
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-800/40 py-12 px-4 bg-[#0a0d13]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c4ff00] flex items-center justify-center">
              <Zap size={16} className="text-black" />
            </div>
            <span className="text-lg font-black text-white">TipLnk</span>
          </div>
          <p className="text-surface-500 text-sm">© 2026 TipLnk. Built for the Frontier.</p>
          <div className="flex gap-6">
            <a href="x.com/useTipLnk" className="text-surface-400 hover:text-[#c4ff00] transition-colors"><TwitterIcon /></a>
            <a href="https://github.com/marhshallpresson/tip-lnk" className="text-surface-400 hover:text-[#c4ff00] transition-colors"><GithubIcon /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TwitterIcon() { return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>; }
function GithubIcon() { return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>; }
