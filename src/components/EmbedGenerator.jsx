import { useState } from 'react';
import { Copy, Check, Zap, Code, Link as LinkIcon, ExternalLink, Settings, Layout } from 'lucide-react';

const EmbedGenerator = ({ creatorAddress, handle = 'creator' }) => {
  const [copied, setCopied] = useState({ link: false, html: false, iframe: false });
  const [accentColor, setAccentColor] = useState('#00D265');
  const [theme, setTheme] = useState('dark');

  // Construct the dynamic profile URL
  const profileUrl = `${window.location.origin}/${handle}`;

  const buttonHtml = `<a href="${profileUrl}" target="_blank" style="display: inline-flex; align-items: center; background: ${accentColor}; color: #000; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-decoration: none; font-family: sans-serif; gap: 8px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  Tip me on TipLnk
</a>`;

  const iframeHtml = `<iframe 
  src="${profileUrl}?embed=true&theme=${theme}&accent=${encodeURIComponent(accentColor)}" 
  width="400" 
  height="600" 
  style="border:none; border-radius:24px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"
  title="Tip me on TipLnk"
></iframe>`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-left">
          <h2 className="text-4xl font-black mb-2 tracking-tight">Growth & Distribution</h2>
          <p className="text-surface-500 text-sm font-medium">Embed your tip jar directly into your website, blog, or bio.</p>
        </div>
        
        <div className="flex gap-2 bg-surface-900 p-1.5 rounded-2xl border border-surface-800">
           <button 
             onClick={() => setTheme('dark')}
             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${theme === 'dark' ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-500 hover:text-white'}`}
           >
             Dark
           </button>
           <button 
             onClick={() => setTheme('light')}
             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-surface-500 hover:text-white'}`}
           >
             Light
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Customization Column */}
        <div className="space-y-6">
           <div className="glass-card p-6">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Settings size={14} /> Customize Style
              </h3>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-3">Accent Color</label>
                   <div className="flex flex-wrap gap-3">
                     {['#00D265', '#FF3B30', '#5865F2', '#1DA1F2', '#FF9500', '#AF52DE'].map(color => (
                       <button
                         key={color}
                         onClick={() => setAccentColor(color)}
                         className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                         style={{ backgroundColor: color }}
                       />
                     ))}
                   </div>
                </div>

                <div className="pt-6 border-t border-surface-800">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                       <LinkIcon size={18} />
                     </div>
                     <div>
                       <h4 className="font-bold text-sm">Bio Link</h4>
                       <p className="text-[10px] text-surface-500">Instagram / Twitter</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 font-mono text-[10px] text-surface-400 truncate">
                       {profileUrl}
                     </div>
                     <button 
                       onClick={() => copyToClipboard(profileUrl, 'link')}
                       className="p-2 bg-surface-800 hover:bg-surface-700 rounded-lg transition-all"
                     >
                       {copied.link ? <Check size={14} className="text-brand-500" /> : <Copy size={14} />}
                     </button>
                   </div>
                </div>
              </div>
           </div>
        </div>

        {/* Floating Button Column */}
        <div className="space-y-6">
           <div className="bg-surface-900 border border-surface-800 rounded-[32px] p-8 h-full flex flex-col">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-widest mb-6">Action Button</h3>
              
              <div className="flex-1 flex items-center justify-center bg-main-bg/50 rounded-[24px] border border-dashed border-surface-800 mb-6 p-10 min-h-[160px]">
                <div dangerouslySetInnerHTML={{ __html: buttonHtml }} />
              </div>

              <div className="relative group">
                <pre className="bg-surface-950 border border-surface-800 rounded-2xl p-4 text-[9px] font-mono text-surface-500 overflow-hidden line-clamp-4">
                  {buttonHtml}
                </pre>
                <button 
                  onClick={() => copyToClipboard(buttonHtml, 'html')}
                  className="absolute inset-0 bg-brand-500 text-black font-bold text-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                >
                  {copied.html ? <Check size={16} /> : <Copy size={16} />}
                  Copy Button HTML
                </button>
              </div>
           </div>
        </div>

        {/* Full Widget Column */}
        <div className="space-y-6">
           <div className="bg-surface-900 border border-surface-800 rounded-[32px] p-8 h-full flex flex-col">
              <h3 className="text-xs font-black text-surface-500 uppercase tracking-widest mb-6">Embedded Widget</h3>
              
              <div className="flex-1 flex flex-col items-center justify-center bg-main-bg/50 rounded-[24px] border border-dashed border-surface-800 mb-6 p-6 min-h-[160px]">
                <Layout className="text-surface-700 mb-3" size={32} />
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">BuyMeCoffee Style</p>
              </div>

              <div className="relative group">
                <pre className="bg-surface-950 border border-surface-800 rounded-2xl p-4 text-[9px] font-mono text-surface-500 overflow-hidden line-clamp-4">
                  {iframeHtml}
                </pre>
                <button 
                  onClick={() => copyToClipboard(iframeHtml, 'iframe')}
                  className="absolute inset-0 bg-accent-cyan text-black font-bold text-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                >
                  {copied.iframe ? <Check size={16} /> : <Copy size={16} />}
                  Copy Widget Iframe
                </button>
              </div>
           </div>
        </div>

      </div>

      <div className="glass-card p-10 bg-gradient-to-br from-brand-600/10 to-transparent flex flex-col md:flex-row items-center gap-8 justify-between">
        <div className="max-w-xl">
          <h3 className="text-2xl font-black mb-3">Professional Branding</h3>
          <p className="text-surface-400 text-sm leading-relaxed">
            Verified creators using our embedded widgets see an average <strong>320% increase in recurring support</strong>. Our widgets are fully responsive and work seamlessly on WordPress, Webflow, Shopify, and custom sites.
          </p>
        </div>
        <button className="btn-primary whitespace-nowrap flex items-center gap-2 group shadow-2xl shadow-brand-500/20">
          Developer Documentation <ExternalLink size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default EmbedGenerator;
