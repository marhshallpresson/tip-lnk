import { useState } from 'react';
import { Copy, Check, Zap, Code, Link as LinkIcon, ExternalLink } from 'lucide-react';

export default function EmbedGenerator({ handle = 'creator', profileUrl = '#' }) {
  const [copied, setCopied] = useState({ link: false, html: false });

  const embedCode = `<a href="${profileUrl}" target="_blank" style="display: inline-flex; align-items: center; background: #00D265; color: #000; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-decoration: none; font-family: sans-serif; gap: 8px; box-shadow: 0 4px 14px rgba(0, 210, 101, 0.3);">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  Tip me on TipLnk
</a>`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-left mb-8">
        <h2 className="text-3xl font-black mb-2">Share & Embed</h2>
        <p className="text-surface-500 text-sm italic font-medium">Grow your audience by placing your TipLnk jar where your fans are.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview Section */}
        <div className="space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-[32px] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={120} className="text-brand-500" />
            </div>
            
            <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6">Button Preview</h3>
            
            <div className="flex items-center justify-center min-h-[140px] bg-main-bg/50 rounded-[24px] border border-surface-800/50">
              <div dangerouslySetInnerHTML={{ __html: embedCode }} />
            </div>
          </div>

          <div className="glass-card p-6 border-brand-500/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 shrink-0">
                <LinkIcon size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Direct Link</h4>
                <p className="text-xs text-surface-500 mb-4">Perfect for Instagram, Twitter or Discord bios.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 font-mono text-xs text-brand-400 overflow-hidden truncate">
                    {profileUrl}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(profileUrl, 'link')}
                    className="p-3 bg-surface-800 hover:bg-surface-700 rounded-xl transition-all"
                  >
                    {copied.link ? <Check size={18} className="text-brand-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Section */}
        <div className="space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-[32px] p-8 h-full">
            <h3 className="text-xs font-black text-surface-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Code size={14} /> HTML Snippet
            </h3>
            
            <div className="relative group">
              <pre className="bg-surface-950 border border-surface-800 rounded-[24px] p-6 text-[10px] font-mono leading-relaxed text-surface-400 overflow-x-auto h-[200px] scrollbar-hide">
                {embedCode}
              </pre>
              <button 
                onClick={() => copyToClipboard(embedCode, 'html')}
                className="absolute top-4 right-4 p-3 bg-brand-500 text-black rounded-xl shadow-xl hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
              >
                {copied.html ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>

            <div className="mt-8 p-6 bg-brand-500/5 border border-brand-500/10 rounded-[24px]">
              <div className="flex items-center gap-2 text-brand-500 mb-2">
                <Zap size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Growth Pro Tip</span>
              </div>
              <p className="text-xs text-surface-400 leading-relaxed font-medium">
                Embedded buttons have a <strong>42% higher conversion rate</strong> than plain text links. Place this in your website's footer or about page for maximum impact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
