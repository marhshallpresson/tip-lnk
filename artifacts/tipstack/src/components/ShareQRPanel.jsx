import { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Download, Share2, Globe, ExternalLink, X } from 'lucide-react';

export default function ShareQRPanel({ onClose }) {
  const { profile } = useApp();
  const { user } = useAuth();
  const qrRef = useRef();
  
  const identifier = profile.solDomain || profile.displayName || user?.id || 'creator';
  const tipUrl = `${window.location.origin}/${identifier}`;
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadQR = () => {
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Set higher resolution for download
    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR
      ctx.drawImage(img, 0, 0, size, size);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `tipstack-qr-${identifier}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col gap-6 animate-scale-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tighter">Receive Support</h3>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: QR Code Section */}
        <div className="space-y-6">
          <div 
            ref={qrRef}
            className="aspect-square bg-white p-6 rounded-[32px] shadow-2xl shadow-brand-500/10 flex items-center justify-center group relative overflow-hidden"
          >
            <QRCodeSVG 
              value={tipUrl} 
              size={240} 
              bgColor={"#ffffff"} 
              fgColor={"#000000"} 
              level={"H"}
              includeMargin={false}
              className="w-full h-full"
            />
            {/* Overlay for aesthetic */}
            <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          <button 
            onClick={downloadQR}
            className="w-full h-14 bg-white text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            <Download size={18} />
            Download QR Code
          </button>
        </div>

        {/* Right: Info & Links Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Personal Tipping Link</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-500/30 transition-colors">
              <div className="truncate pr-4">
                <p className="text-sm font-bold text-white truncate">{tipUrl.replace('https://', '')}</p>
              </div>
              <button 
                onClick={() => copyToClipboard(tipUrl, 'link')}
                className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-brand-500 transition-all hover:bg-brand-500/10"
              >
                {copied === 'link' ? <Check size={18} className="text-brand-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Wallet Domain</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-500/30 transition-colors">
              <div className="flex items-center gap-3 truncate pr-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <Globe size={16} />
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {profile.solDomain || `${identifier.toLowerCase()}.tipstack.sol`}
                </p>
              </div>
              <button 
                onClick={() => copyToClipboard(profile.solDomain || `${identifier.toLowerCase()}.tipstack.sol`, 'domain')}
                className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-brand-500 transition-all hover:bg-brand-500/10"
              >
                {copied === 'domain' ? <Check size={18} className="text-brand-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-6">
            <div className="bg-brand-500/5 border border-brand-500/10 rounded-[24px] p-6 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500">
                    <Share2 size={20} />
                  </div>
                  <p className="text-xs font-bold leading-tight">
                    Show this QR to anyone <br />
                    <span className="text-white/40">to receive instant on-chain tips.</span>
                  </p>
               </div>
               <p className="text-[10px] text-white/30 leading-relaxed">
                 Your supporters can pay with SOL, USDC, or even Credit Cards. Settlements are instant and non-custodial.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <a 
          href={tipUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-white/10 transition-all"
        >
          View Live Page <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
