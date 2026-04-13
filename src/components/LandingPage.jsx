import { useState, useEffect } from 'react';
import { Zap, Shield, Globe, ArrowRight, Wallet, QrCode, TrendingUp, ChevronRight, ExternalLink, Star } from 'lucide-react';

/* ─── Animated particles (SNS-inspired) ─── */
function Particles() {
  return (
    <div className="particles-container" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-brand-500/20"
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

/* ─── Navbar ─── */
function Navbar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-main-bg/90 backdrop-blur-lg border-b border-surface-800/60' : ''}`}>
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">TipLnk</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-surface-400 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-surface-400 hover:text-white transition-colors">How It Works</a>
          <a href="#partners" className="text-sm text-surface-400 hover:text-white transition-colors">Partners</a>
        </div>
        <button onClick={onGetStarted} className="btn-primary text-sm !px-5 !py-2.5 flex items-center gap-2">
          Launch App <ArrowRight size={14} />
        </button>
      </div>
    </nav>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({ icon: Icon, title, description, badge, color }) {
  return (
    <div className="home-card p-6 sm:p-8 group hover:scale-[1.02] transition-transform duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      {badge && <span className="badge-brand mb-3 inline-block">{badge}</span>}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-surface-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── How It Works Step ─── */
function HowStep({ number, title, description }) {
  return (
    <div className="flex gap-4 sm:gap-6">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        {number < 4 && <div className="w-px flex-1 bg-gradient-to-b from-brand-600/50 to-transparent mt-2" />}
      </div>
      <div className="pb-8">
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-surface-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ─── Stat Counter ─── */
function StatCounter({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{value}</span>
      <span className="text-xs sm:text-sm text-surface-400 font-medium">{label}</span>
    </div>
  );
}

/* ─── Comparison Table ─── */
function ComparisonTable() {
  const rows = [
    { feature: 'Platform Fee', tiplnk: '0%', buymeacoffee: '5%', kofi: '0%*', patreon: '5-12%' },
    { feature: 'Instant Payout', tiplnk: '✓ Sub-second', buymeacoffee: '2-5 days', kofi: '2-5 days', patreon: '1-5 days' },
    { feature: 'Global Recipients', tiplnk: '✓ Instant', buymeacoffee: 'Bank dependent', kofi: 'PayPal only', patreon: 'Bank dependent' },
    { feature: 'Own Your Identity', tiplnk: '✓ On-chain SNS', buymeacoffee: '✗ Centralized', kofi: '✗ Centralized', patreon: '✗ Centralized' },
    { feature: 'Yield on Tips', tiplnk: '✓ Kamino DeFi', buymeacoffee: '✗', kofi: '✗', patreon: '✗' },
    { feature: 'Fiat Off-ramp', tiplnk: '✓ NGN via Pajcash', buymeacoffee: '✓ Limited', kofi: '✓ PayPal', patreon: '✓ Limited' },
  ];

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-700/50">
            <th className="text-left py-3 px-4 text-surface-400 font-medium">Feature</th>
            <th className="text-center py-3 px-4 text-brand-400 font-bold">TipLnk</th>
            <th className="text-center py-3 px-4 text-surface-400 font-medium">BMC</th>
            <th className="text-center py-3 px-4 text-surface-400 font-medium hidden sm:table-cell">Ko-fi</th>
            <th className="text-center py-3 px-4 text-surface-400 font-medium hidden md:table-cell">Patreon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-surface-800/40 hover:bg-surface-900/30 transition-colors">
              <td className="py-3 px-4 text-surface-300">{row.feature}</td>
              <td className="py-3 px-4 text-center text-brand-400 font-medium">{row.tiplnk}</td>
              <td className="py-3 px-4 text-center text-surface-500">{row.buymeacoffee}</td>
              <td className="py-3 px-4 text-center text-surface-500 hidden sm:table-cell">{row.kofi}</td>
              <td className="py-3 px-4 text-center text-surface-500 hidden md:table-cell">{row.patreon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Particles />
      <Navbar onGetStarted={onGetStarted} />

      {/* ── Hero Section ─── */}
      <section className="hero-bg-animated relative pt-32 sm:pt-40 pb-20 px-4">
        <div className="max-w-[1000px] mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="animate-fade-in mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Star size={12} className="fill-brand-400" />
              Built for Colosseum Solana Frontier Hackathon
            </span>
          </div>

          {/* Heading */}
          <h1 className="animate-slide-up text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
            <span className="text-white">Get Tipped in</span>
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-accent-cyan bg-clip-text text-transparent">
              Crypto. Instantly.
            </span>
          </h1>

          {/* Subhead */}
          <p className="animate-slide-up text-surface-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Claim your <span className="text-brand-400 font-semibold">$creator.tiplnk.sol</span> domain.
            Accept tips from anyone. Earn yield on idle funds. Cash out to fiat.
            <span className="text-surface-500"> Zero platform fees.</span>
          </p>

          {/* CTA Buttons */}
          <div className="animate-slide-up flex flex-col sm:flex-row gap-3 justify-center mb-12" style={{ animationDelay: '0.2s' }}>
            <button onClick={onGetStarted} className="btn-primary text-base !px-8 !py-4 flex items-center justify-center gap-2 group">
              Claim Your Domain
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#features" className="btn-outline text-base !px-8 !py-4 flex items-center justify-center gap-2">
              See How It Works
              <ChevronRight size={16} />
            </a>
          </div>

          {/* Solflare badge */}
          <div className="animate-fade-in flex items-center justify-center gap-3 text-sm text-surface-500" style={{ animationDelay: '0.3s' }}>
            <span className="w-2 h-2 rounded-full bg-solflare animate-glow-pulse" />
            Powered by <span className="text-solflare font-semibold">Solflare</span> wallet-first UX
          </div>
        </div>
      </section>

      {/* ── Stats Strip ─── */}
      <section className="relative z-10 py-8 border-y border-surface-800/40">
        <div className="max-w-[900px] mx-auto flex items-center justify-center divide-x divide-surface-700/50">
          <StatCounter value="<1s" label="Transaction Finality" />
          <StatCounter value="0%" label="Platform Fee" />
          <StatCounter value="$0.001" label="Avg Gas Cost" />
          <StatCounter value="24/7" label="Global Payouts" />
        </div>
      </section>

      {/* ── Features Section ─── */}
      <section id="features" className="relative z-10 py-20 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything Creators Need</h2>
            <p className="text-surface-400 max-w-lg mx-auto">A complete, wallet-first platform for accepting tips, managing earnings, and growing your creator brand on Solana.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Globe}
              title="SNS Domain Identity"
              description="Claim $creator.tiplnk.sol — a human-readable address that replaces long wallet hashes. Your tip page, your brand."
              badge="SNS"
              color="bg-gradient-to-br from-brand-600 to-brand-800"
            />
            <FeatureCard
              icon={Wallet}
              title="Solflare Deep Integration"
              description="Custom transaction builder with simulation. See exactly what you're signing. Portfolio analytics. Transaction history. All wallet-first."
              badge="Solflare Track"
              color="bg-gradient-to-br from-solflare to-solflare-dark"
            />
            <FeatureCard
              icon={Zap}
              title="DFlow Smart Routing"
              description="Tips are routed through DFlow's order flow auction for best execution. Tip in any token — creator receives their preferred one."
              color="bg-gradient-to-br from-accent-cyan to-blue-700"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Kamino Yield"
              description="Idle tip funds auto-compound in Kamino vaults. Your tips earn yield while you sleep. Withdraw anytime."
              color="bg-gradient-to-br from-accent-purple to-purple-800"
            />
            <FeatureCard
              icon={QrCode}
              title="Scan-to-Reward QR"
              description="Generate Solana Pay QR codes for IRL events. Fans scan your QR at meetups, concerts, or cafés to tip instantly."
              color="bg-gradient-to-br from-accent-orange to-orange-700"
            />
            <FeatureCard
              icon={Shield}
              title="NGN Fiat Off-ramp"
              description="Cash out SOL/USDC to Nigerian Naira instantly via Pajcash or Fossapay. No bank needed — mobile money supported."
              badge="Africa-first"
              color="bg-gradient-to-br from-accent-green to-emerald-800"
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─── */}
      <section id="how-it-works" className="relative z-10 py-20 px-4">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How TipLnk Works</h2>
            <p className="text-surface-400 max-w-md mx-auto">Four steps from zero to earning. Your wallet is the app.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <HowStep number={1} title="Connect Solflare" description="Start with Solflare for the full wallet-first experience — portfolio view, transaction simulation, and deep linking on mobile." />
            <HowStep number={2} title="Pick Your NFT Avatar" description="Choose a Doodles or any NFT from your wallet as your creator profile picture. Holders get verified badges." />
            <HowStep number={3} title="Claim Your Domain" description="Register $yourname.tiplnk.sol via SNS. This is your permanent, on-chain identity and shareable tip page." />
            <HowStep number={4} title="Share & Earn" description="Share your tip link, embed the widget, or print the QR. Tips arrive in sub-seconds, earn yield in Kamino, and cash out to fiat." />
          </div>
        </div>
      </section>

      {/* ── Comparison Table ─── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Why TipLnk?</h2>
            <p className="text-surface-400 max-w-md mx-auto">See how TipLnk stacks up against traditional tipping platforms.</p>
          </div>
          <div className="home-card p-4 sm:p-6 overflow-hidden">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ── Partners Strip ─── */}
      <section id="partners" className="relative z-10 py-16 px-4 border-t border-surface-800/40">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="text-surface-500 text-sm font-medium mb-8 uppercase tracking-wider">Built With</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {['Solflare', 'SNS', 'DFlow', 'Kamino', 'QuickNode', 'Pajcash', 'Fossapay'].map((partner) => (
              <div key={partner} className="text-surface-500 hover:text-white transition-colors text-base font-semibold opacity-60 hover:opacity-100">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Footer ─── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to get tipped?</h2>
          <p className="text-surface-400 mb-8">Claim your domain in under a minute. No email, no KYC, no BS.</p>
          <button onClick={onGetStarted} className="btn-primary text-base !px-10 !py-4 flex items-center justify-center gap-2 mx-auto group">
            Launch TipLnk
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-800/40 py-8 px-4">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold">TipLnk</span>
          </div>
          <span className="text-xs text-surface-500">© 2026 TipLnk — Colosseum Solana Frontier Hackathon</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-surface-500 hover:text-white text-xs transition-colors flex items-center gap-1">
              GitHub <ExternalLink size={10} />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-surface-500 hover:text-white text-xs transition-colors flex items-center gap-1">
              X (Twitter) <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
