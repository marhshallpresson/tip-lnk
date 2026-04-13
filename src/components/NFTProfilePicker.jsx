import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { useNFTs } from '../hooks/useNFTs';
import { ImageIcon, Star, Loader2, AlertCircle } from 'lucide-react';

export default function NFTProfilePicker({ onComplete }) {
  const { publicKey } = useWallet();
  const { updateProfile } = useApp();
  const { nfts, loading, error, fetchNFTs } = useNFTs();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (publicKey) {
      fetchNFTs(publicKey.toBase58());
    }
  }, [publicKey, fetchNFTs]);

  const handleContinue = () => {
    if (selected) {
      updateProfile({ nftAvatar: selected });
      onComplete();
    }
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-accent-purple/20 flex items-center justify-center mx-auto mb-6">
          <ImageIcon size={36} className="text-accent-purple" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Choose Your Profile NFT</h2>
        <p className="text-surface-400">
          Select an NFT from your wallet as your creator avatar. Doodles NFTs are highlighted.
        </p>
      </div>

      {error && (
        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-3 mb-6 flex items-center gap-2">
          <AlertCircle size={16} className="text-accent-orange shrink-0" />
          <span className="text-accent-orange text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={32} className="text-brand-400 animate-spin" />
          <span className="text-surface-400">Scanning wallet NFTs via QuickNode...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {nfts.map((nft) => (
              <button
                key={nft.id}
                onClick={() => setSelected(nft)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                  selected?.id === nft.id
                    ? 'border-brand-500 ring-4 ring-brand-500/20'
                    : 'border-surface-700 hover:border-surface-500'
                }`}
              >
                <div className="aspect-square bg-surface-800 flex items-center justify-center">
                  {nft.image && !nft.image.includes('placeholder') ? (
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
                      nft.image && !nft.image.includes('placeholder') ? 'hidden' : 'flex'
                    }`}
                  >
                    <ImageIcon size={24} className="text-surface-600" />
                    <span className="text-xs text-surface-500">{nft.name}</span>
                  </div>
                </div>

                {nft.isDoodle && (
                  <div className="absolute top-2 right-2 bg-accent-orange/90 text-surface-950 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <Star size={10} /> Doodle
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface-950 via-surface-950/80 to-transparent p-3">
                  <p className="text-xs font-medium truncate">{nft.name}</p>
                  <p className="text-[10px] text-surface-500 truncate">{nft.collection}</p>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-6 bg-brand-600/10 border border-brand-500/30 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-surface-800 overflow-hidden shrink-0">
                {selected.image && !selected.image.includes('placeholder') ? (
                  <img src={selected.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={16} className="text-surface-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selected.name}</p>
                <p className="text-sm text-surface-400 truncate">{selected.collection}</p>
              </div>
              <button onClick={handleContinue} className="btn-primary whitespace-nowrap">
                Use as Avatar
              </button>
            </div>
          )}

          {!selected && (
            <p className="text-center text-surface-500 text-sm mt-6">
              Select an NFT above to use as your profile avatar
            </p>
          )}
        </>
      )}
    </div>
  );
}
