import { Link } from 'react-router-dom';
import { Share2, Zap, MoreHorizontal } from 'lucide-react';

/**
 * WhiteLabelNav - A premium, minimal navigation bar for Creator Pages.
 * Shows TipLnk branding as a seal of quality while keeping focus on the creator.
 */
export default function WhiteLabelNav({ creatorName = 'Creator' }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${creatorName} on TipLnk`,
        text: `Support ${creatorName} directly on Solana with TipLnk!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] h-16 bg-main-bg/80 backdrop-blur-md border-b border-surface-800/50 flex items-center px-6">
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="public/favicon.svg" className="w-8 h-8 " alt="Tip Lnk" />
            <span className="font-black text-sm uppercase tracking-widest text-surface-400 group-hover:text-white transition-colors">
              TipLnk
            </span>
          </Link>
          <div className="h-4 w-[1px] bg-surface-800 mx-2" />
          <span className="font-bold text-sm text-white">{creatorName}</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white hover:border-surface-600 transition-all"
          >
            <Share2 size={18} />
          </button>
          <button className="p-2.5 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white hover:border-surface-600 transition-all">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
