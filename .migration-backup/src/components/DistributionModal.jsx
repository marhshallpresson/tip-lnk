import React from 'react';
import { X, Layout } from 'lucide-react';
import EmbedGenerator from './EmbedGenerator';

export default function DistributionModal({ isOpen, onClose, creatorId, handle }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto relative border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] custom-scrollbar">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0d0d0d]/80 backdrop-blur-md z-10 p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                 <Layout size={20} />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-white tracking-tight">Growth & Distribution</h3>
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Share your link or embed the widget</p>
              </div>
           </div>
           
           <button 
             onClick={onClose}
             className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all"
           >
              <X size={20} />
           </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 md:p-8">
           <EmbedGenerator creatorId={creatorId} handle={handle} />
        </div>

        {/* Modal Footer (Optional) */}
        <div className="p-6 border-t border-white/5 text-center">
           <p className="text-[10px] font-medium text-white/20 uppercase tracking-[0.2em]">Powered by Tip Stack Infrastructure</p>
        </div>
      </div>
    </div>
  );
}
