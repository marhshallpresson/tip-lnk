import { useState, useEffect } from 'react';
import { Zap, Shield, Globe, ArrowRight, Wallet, TrendingUp, ChevronRight, ExternalLink, Star, Users, Coins, Image as ImageIcon } from 'lucide-react';

function FeatureBlock({ title, description, icon: Icon, reversed }) {
  return (
    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16 py-12 md:py-20`}>
      <div className="flex-1 space-y-6">
        <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 mb-6">
          <Icon size={24} className="text-brand-500" />
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h3>
        <p className="text-base md:text-lg text-white/60 leading-relaxed">{description}</p>
        <button className="btn-outline flex items-center gap-2 group">
          Learn more <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      <div className="flex-1 w-full relative">
        <div className="h-[200px] md:h-[300px] w-full rounded-xl bg-[#111111] border border-white/5 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <Icon size={80} className="text-white/5" />
        </div>
      </div>
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    { feature: 'Platform Fee', tiplnk: '0%', buymeacoffee: '5%', kofi: '0%*', patreon: '5-12%' },
    { feature: 'Instant Payout', tiplnk: '✓ Near Instant', buymeacoffee: '2-5 days', kofi: '2-5 days', patreon: '1-5 days' },
    { feature: 'Global Recipients', tiplnk: '✓ Instant', buymeacoffee: 'Waitlist', kofi: 'PayPal only', patreon: 'Bank dependent' },
    { feature: 'Own Your Identity', tiplnk: '✓ On-chain SNS', buymeacoffee: '✗ Centralized', kofi: '✗ Centralized', patreon: '✗ Centralized' },
    { feature: 'Yield on Tips', tiplnk: '✓ Kamino DeFi', buymeacoffee: '✗', kofi: '✗', patreon: '✗' },
  ];

  return (
    <div className="overflow-x-auto w-full home-card p-4 sm:p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-4 px-4 text-white/40 font-medium uppercase tracking-wider text-[10px]">Feature</th>
            <th className="text-center py-4 px-4 text-brand-500 font-bold">TipLnk</th>
            <th className="text-center py-4 px-4 text-white/40 font-medium">Ko-fi</th>
            <th className="text-center py-4 px-4 text-white/40 font-medium">BMC</th>
            <th className="text-center py-4 px-4 text-white/40 font-medium hidden md:table-cell">Patreon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="py-4 px-4 text-white/80 font-medium">{row.feature}</td>
              <td className="py-4 px-4 text-center text-brand-500 font-semibold">{row.tiplnk}</td>
              <td className="py-4 px-4 text-center text-white/40">{row.kofi}</td>
              <td className="py-4 px-4 text-center text-white/40">{row.buymeacoffee}</td>
              <td className="py-4 px-4 text-center text-white/40 hidden md:table-cell">{row.patreon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-24 px-4 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,210,101,0.05)_0%,transparent_50%)] z-0" />

        <div className="relative z-10 max-w-[800px] mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            TipLnk is now in public beta
          </div>

          <h1 className="animate-slide-up text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
            Fund your passion. <br />
            <span className="text-brand-500">Make it on-chain.</span>
          </h1>

          <p className="animate-slide-up text-white/60 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Accept tips, sell memberships, and grow your audience with zero platform fees. Instantly cash out anywhere in the world.
          </p>

          <div className="animate-slide-up bg-[#111111] border border-white/10 rounded-xl p-1.5 max-w-lg mx-auto flex items-center shadow-2xl mb-8" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center text-white/40 pl-4 flex-1">
              <span className="text-brand-500 font-medium">tiplnk.sol/</span>
              <input type="text" placeholder="yourname" className="bg-transparent outline-none flex-1 border-none text-white focus:ring-0 placeholder:text-white/20 ml-1" />
            </div>
            <button onClick={onGetStarted} className="btn-primary !px-6">
              Claim Link
            </button>
          </div>
          <p className="animate-fade-in text-white/40 text-sm" style={{ animationDelay: '0.3s' }}>Takes less than 10 seconds to get started.</p>
        </div>
      </section>

      {/* Creators Grid */}
      <section id="creators" className="relative z-10 py-20 border-y border-white/5 bg-[#0c0c0c] px-4">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-center text-white/40 font-medium uppercase tracking-[0.2em] text-[10px] mb-12">Join thousands of creators on TipLnk</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Mobot Defi', handle: '@mobot.tiplnk.sol', color: 'bg-emerald-500' },
              { name: 'DeFi Analyst', handle: '@defi.tiplnk.sol', color: 'bg-blue-500' },
              { name: 'Music Producer', handle: '@beats.tiplnk.sol', color: 'bg-purple-500' },
              { name: 'Web3 Dev', handle: '@dev.tiplnk.sol', color: 'bg-orange-500' }
            ].map((c, i) => (
              <div key={i} className="home-card p-6 text-center group cursor-pointer hover:border-brand-500/20 transition-all">
                <div className={`w-12 h-12 mx-auto rounded-full ${c.color}/20 flex items-center justify-center mb-4 border border-${c.color}/30`}>
                  <ImageIcon size={20} className={c.color.replace('bg-', 'text-')} />
                </div>
                <h4 className="font-semibold text-white">{c.name}</h4>
                <p className="text-xs text-brand-500 mt-1">{c.handle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <section id="features" className="relative z-10 py-24 px-4">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Everything you need, <span className="text-brand-500">none of the fees.</span></h2>
          </div>

          <div className="space-y-8 md:space-y-16">
            <FeatureBlock
              icon={Globe}
              title="Your On-chain Identity"
              description="Claim your SNS domain (yourname.tiplnk.sol) and build a permanent tipping page that's truly yours."
            />
            <FeatureBlock
              icon={Coins}
              reversed
              title="Zero Platform Fees"
              description="Keep 100% of your earnings. By using smart contracts, your supporters' tips go directly to your wallet."
            />
            <FeatureBlock
              icon={TrendingUp}
              title="Yield on Your Terms"
              description="Optionally put your tips to work. Idle funds can automatically earn yield through Kamino DeFi vaults."
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="compare" className="relative z-10 py-24 px-4 bg-[#0c0c0c] border-t border-white/5">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Unmatched value</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">The best alternative to traditional platforms is built on Solana.</p>
          </div>
          <ComparisonTable />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-4 text-center">
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to start?</h2>
          <p className="text-white/60 text-lg mb-12 max-w-md mx-auto">Join the new creator economy. No fees, no middlemen, just you and your supporters.</p>
          <button onClick={onGetStarted} className="btn-primary !px-10 !py-4 text-lg">
            Claim Your Page
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-4 bg-[#080808]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <img src="public/favicon.svg" className="w-6 h-6" alt="Tip Lnk" />
            <span className="text-lg font-bold text-white tracking-tight">TipLnk</span>
          </div>
          <p className="text-white/40 text-sm">© 2026 TipLnk. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/terms" className="text-white/40 hover:text-brand-500 transition-colors text-sm">Terms</a>
            <a href="/privacy" className="text-white/40 hover:text-brand-500 transition-colors text-sm">Privacy</a>
            <a href="x.com/useTipLnk" className="text-white/40 hover:text-brand-500 transition-colors">
              <TwitterIcon />
            </a>
            <a href="https://github.com/marhshallpresson/tip-lnk" className="text-white/40 hover:text-brand-500 transition-colors">
              <GithubIcon />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TwitterIcon() { return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>; }




function GithubIcon() { return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>; }
