import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function ShareQRPanel() {
  const { profile } = useApp();
  const tipUrl = `https://tiplnk.sol/tip/${profile.solDomain || 'creator.sol'}`;
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(tipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-6 border-brand-500/30">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-brand-400">
        Share Tip Page
      </h3>

      <div className="flex flex-col sm:flex-row gap-8 items-center justify-between">
        <div className="flex-1 space-y-4">
          <p className="text-surface-400 text-sm">
            Share your unique tipping URL with your audience. Supporters can tip you directly from any browser using Solflare, Phantom, or any Solana wallet.
          </p>

          <div className="bg-surface-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between border border-surface-700">
            <span className="font-mono text-sm text-surface-300 break-all">{tipUrl}</span>
            <div className="flex items-center gap-2">
              <button onClick={copyUrl} className="btn-secondary !px-3 !py-1.5 flex items-center gap-2 shrink-0">
                {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a href={tipUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !px-3 !py-1.5 flex items-center gap-2 shrink-0 border-0 bg-brand-600 hover:bg-brand-500">
                <ExternalLink size={14} /> Open
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shrink-0 shadow-[0_0_20px_rgba(20,241,149,0.15)] glow-brand">
          <QRCodeSVG 
            value={tipUrl} 
            size={140} 
            bgColor={"#ffffff"} 
            fgColor={"#060e1a"} 
            level={"H"}
            includeMargin={false}
          />
          <p className="text-center font-bold text-surface-950 text-xs mt-3 uppercase tracking-wide">Scan to Tip</p>
        </div>
      </div>
    </div>
  );
}
