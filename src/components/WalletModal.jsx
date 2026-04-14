import { X } from 'lucide-react';
import WalletConnect from './WalletConnect';

export default function WalletModal({ isOpen, onClose, onConnected }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg animate-scale-in">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors p-2"
        >
          <X size={24} />
        </button>
        
        <WalletConnect onConnected={(addr) => {
          onConnected(addr);
          onClose();
        }} />
      </div>
    </div>
  );
}
