import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  Globe, 
  Plus, 
  X, 
  ArrowRight,
  Link as LinkIcon,
  CreditCard,
  Wallet,
  CheckCircle2,
} from 'lucide-react'; 

// --- DATA ---
const stories = [
  {
    id: 1,
    question: "The Problem 🛑",
    answer: "For years, creators have been 'behind the curtain' of giant platforms—losing 30%, waiting weeks for payouts, and owning zero data. We are changing that.",
  },
  {
    id: 2,
    question: "What do we stand for? ✊",
    answer: "Absolute ownership. Tip Stack is a bridge built on Solana that puts the engine entirely in your hands. No middlemen, no custody, no delays.",   
  },
  {
    id: 3,
    question: "What makes us different? 📈",
    answer: "Unlike standard tip jars, your tips don't just sit there. They earn real-time interest via Kamino DeFi vaults the moment they land in your wallet.",
  },
  {
    id: 4,
    question: "Where are we headed? 🚀",
    answer: "To a fully decentralized creator economy where you keep 99% of your revenue, settle instantly, and operate anywhere on the social web.",        
  }
];

const faqs = [
  {
    q: "Do my fans need crypto to tip me?",
    a: "Not at all. Fans can pay using standard credit cards, Apple Pay, or bank transfers. We route everything behind the scenes via institutional-grade execution."
  },
  {
    q: "How does the passive yield work?",
    a: "The moment a tip is processed, it is instantly routed into Kamino DeFi vaults. Your balance automatically grows through real-time compounding interest."
  },
  {
    q: "What are the platform fees?",
    a: "We charge a flat 1% protocol fee. Compare that to the standard 10% - 30% taken by traditional social platforms."
  },
  {
    q: "How fast do I get paid?",
    a: "Instant. Because Tip Stack is built on Solana, settlement happens in ~400ms directly to your non-custodial wallet."
  },
  {
    q: "Is it safe to connect my wallet?",
    a: "Yes. Tip Stack is fully non-custodial. We never have access to your private keys or your funds. You are always in complete control."
  }
];

export default function LandingPage({ onGetStarted = () => {}, onboardingComplete = false, connected = false, onViewDashboard = () => {}, onViewProfile = () => {} }) {
  const [handle, setHandle] = useState('');
  const [activeStory, setActiveStory] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-brand selection:bg-brand-500/30 overflow-x-hidden mesh-gradient">
     


      {/* --- 1. HERO SECTION (REPOSITIONED FOR CONVERSION) --- */}
      <header className="relative pt-32 md:pt-48 pb-16 px-4 flex flex-col justify-center min-h-[75vh]">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center w-full text-center relative z-20">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full animate-fade-in mb-8">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span className="text-xs font-bold text-brand-500">The fastest way to get paid globally</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-white animate-slide-up mb-6">
            Get paid instantly.<br />
            <span className="text-gradient">From anyone. Anywhere.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-medium animate-slide-up mb-10" style={{ animationDelay: '0.1s' }}>
            Accept tips via card, bank, or crypto — and receive money instantly in your wallet or local currency. No holds, no middlemen.
          </p>

          {/* INPUT CTA (CRITICAL CHANGE) */}
          <div className="flex flex-col sm:flex-row items-center justify-center w-full max-w-xl gap-3 animate-slide-up mx-auto mb-12" style={{ animationDelay: '0.2s' }}>
            <div className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl p-1.5 flex items-center group focus-within:border-brand-500/50 transition-all shadow-2xl">
              <div className="flex-1 flex items-center pl-4 gap-1">
                <span className="text-white/40 font-bold">tipstack.sol/</span>
                <input 
                  type="text" 
                  placeholder="yourname"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="bg-transparent border-none outline-none text-white font-bold text-lg placeholder:text-white/20 w-full min-w-0"
                />
              </div>
              <button 
                onClick={() => onGetStarted(handle)}
                className="h-full px-6 md:px-8 bg-brand-500 hover:bg-brand-400 text-black font-black uppercase text-sm rounded-xl transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
              >
                Claim Link <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* SUPPORTING TRUST STRIP */}
          <div className="flex flex-col items-center animate-slide-up opacity-60" style={{ animationDelay: '0.3s' }}>
            <p className="text-sm font-bold text-white/60 mb-4">Works seamlessly with</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 text-sm font-bold tracking-wider text-white/40">
              <span className="flex items-center gap-2"><CreditCard size={18} /> CARDS & BANKS</span>
              <span className="flex items-center gap-2"><img src="https://jup.ag/favicon.ico" className="w-4 h-4 grayscale" alt="Jupiter" /> JUPITER</span>
              <span className="flex items-center gap-2"><Globe size={18} /> FOSSAPAY</span>
            </div>
          </div>
          
        </div>
      </header>

       {/* --- 3. HOW IT WORKS (CRITICAL ADDITION) --- */}
      <section id="how-it-works" className="py-32 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">How Tip Stack Works</h2>
            <p className="text-white/50 text-lg">Start monetizing your audience in under a minute.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-brand-500/0 via-brand-500/20 to-brand-500/0 -z-10"></div>

            <div className="glass-card p-8 text-center flex flex-col items-center relative group">
              <div className="w-12 h-12 bg-[#050505] border-2 border-brand-500/50 rounded-full flex items-center justify-center font-black text-xl text-brand-500 mb-6 shadow-[0_0_20px_rgba(159, 53, 232,0.2)]">1</div>
              <h3 className="text-2xl font-bold mb-3">Create your link</h3>
              <p className="text-white/50 text-sm leading-relaxed">No wallet setup needed to start. Claim your handle and personalize your tipping page in seconds.</p>
            </div>

            <div className="glass-card p-8 text-center flex flex-col items-center relative">
              <div className="w-12 h-12 bg-[#050505] border-2 border-brand-500/50 rounded-full flex items-center justify-center font-black text-xl text-brand-500 mb-6 shadow-[0_0_20px_rgba(159, 53, 232,0.2)]">2</div>
              <h3 className="text-2xl font-bold mb-3">Share anywhere</h3>
              <p className="text-white/50 text-sm leading-relaxed">Drop your link in your X bio, YouTube description, Twitch panels, or personal website.</p>
            </div>

            <div className="glass-card p-8 text-center flex flex-col items-center relative">
              <div className="w-12 h-12 bg-[#050505] border-2 border-brand-500/50 rounded-full flex items-center justify-center font-black text-xl text-brand-500 mb-6 shadow-[0_0_20px_rgba(159, 53, 232,0.2)]">3</div>
              <h3 className="text-2xl font-bold mb-3">Get paid instantly</h3>
              <p className="text-white/50 text-sm leading-relaxed">Fans pay via card, bank, or crypto. Funds settle instantly to your wallet or off-ramp to local fiat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- STORY SECTION --- */}
      <section className="py-24 px-6 relative border-t border-white/5">
        <h2 className="text-3xl md:text-5xl font-black text-center mb-6 text-white tracking-tighter">
          What happens when you <br />
          <span className="text-white/40 italic font-medium">own your revenue? 🤔</span>
        </h2>
        
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-6">
          {stories.map((story, index) => (
            <div key={story.id} className="w-full flex flex-col items-center text-center relative">
              <button 
                onClick={() => setActiveStory(activeStory === index ? null : index)}
                className={`text-2xl md:text-4xl font-bold transition-all duration-300 ${
                  activeStory === index ? 'text-brand-500 scale-105' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {story.question}
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  activeStory === index ? 'max-h-40 opacity-100 mt-6' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-white/60 text-lg max-w-2xl px-4 font-medium leading-relaxed">
                  {story.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* --- 5. DIFFERENTIATION (COMPARISON TABLE) --- */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Why creators are switching</h2>
            <p className="text-white/50 text-lg">No middlemen. No delays. No limits.</p>
          </div>

          <div className="glass-card !p-0 border-white/10 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-white/5 p-6 border-b border-white/10">
              <div className="font-bold text-white/50 text-sm uppercase tracking-wider">Feature</div>
              <div className="font-black text-brand-500 text-lg text-center">Tip Stack</div>
              <div className="font-bold text-white/40 text-sm text-center">Traditional Platforms</div>
            </div>
            
            <div className="grid grid-cols-3 p-6 border-b border-white/5 items-center">
              <div className="font-bold">Fees</div>
              <div className="font-black text-brand-500 text-center text-xl">1%</div>
              <div className="text-white/40 text-center font-medium">10% – 30%</div>
            </div>

            <div className="grid grid-cols-3 p-6 border-b border-white/5 items-center">
              <div className="font-bold">Payout Speed</div>
              <div className="font-black text-brand-500 text-center text-xl">Instant</div>
              <div className="text-white/40 text-center font-medium">7 – 30 Days</div>
            </div>

            <div className="grid grid-cols-3 p-6 border-b border-white/5 items-center">
              <div className="font-bold">Ownership</div>
              <div className="font-black text-brand-500 text-center text-xl">Full (Self-Custody)</div>
              <div className="text-white/40 text-center font-medium">None (Platform Owned)</div>
            </div>

            <div className="grid grid-cols-3 p-6 items-center bg-white/[0.01]">
              <div className="font-bold">Global Reach</div>
              <div className="font-black text-brand-500 text-center flex justify-center items-center gap-2"><CheckCircle2 size={20} /> Yes</div>
              <div className="text-white/40 text-center font-medium">Limited</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 8. FAQ (OBJECTION HANDLING) --- */}
      <section id="faq" className="py-24 px-6 md:px-12 max-w-4xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className={`border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-white/5 border-white/20' : 'bg-[#0a0a0a] hover:bg-[#111]'}`}
              >
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className={`text-lg font-bold pr-8 ${isOpen ? 'text-brand-500' : 'text-white'}`}>{faq.q}</span>
                  {isOpen ? (
                    <X className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-white/40 flex-shrink-0" />
                  )}
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="p-6 pt-0 text-white/50 font-medium leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 7. CTA SECTION (STRONG CLOSE) --- */}
      <section className="py-32 px-4 text-center relative overflow-hidden bg-brand-500/5 border-t border-brand-500/20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white">
              Start earning in <br /> under 10 seconds.
            </h2>
            <p className="text-white/60 text-xl font-medium">
              No setup. No fees. No waiting.
            </p>
            <div className="pt-8">
              <button 
                onClick={() => onGetStarted(handle)}
                className="px-10 py-5 bg-brand-500 hover:bg-brand-400 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(159, 53, 232,0.3)] flex items-center gap-3 mx-auto"
              >
                Create your Tip Link <ArrowRight size={18} />
              </button>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 px-8 border-t border-white/5 bg-[#050505] relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.svg" className="h-14" alt="Tip Stack" />
                </div>
                <p className="text-white/20 text-xs font-bold uppercase tracking-[0.3em] max-w-xs leading-loose">
                    Creator Reward Platform<br /> for Creator to Earn without limits.
                </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Protocol</p>
                    <ul className="space-y-2">
                        <li><a href="https://docs.tipstack.fun" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">Documentation</a></li>
                    <li><a href="/terms" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">Terms & Conditons</a></li>
                    <li><a href="/privacy" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">Privacy Policy</a></li>
                    </ul>
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Connect</p>
                    <ul className="space-y-2">
                        <li><a href="https://x.com/usetiplink" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">X / Twitter</a></li>
                        <li><a href="https://discord.gg/tipstack" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">Discord</a></li>
                        <li><a href="https://github.com/marshallpresson/tip-lnk" className="text-sm font-bold text-white/60 hover:text-brand-500 transition-colors">GitHub</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center">
            
            <div className="flex flex-wrap justify-center gap-6 text-[10px] font-black text-white/30 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Globe size={12}/> Powered by Solana</span>
            </div>
            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">© 2026 Built for the Frontier.</p>
        </div>
      </footer>
    </div>
  );
}
