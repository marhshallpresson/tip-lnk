import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react'

interface SNSWarningProps {
  snsName: string
  walletAddress: string
}

/**
 * Task 3.3: SNS Impersonation Warning Component
 * Detects Unicode homoglyphs and suspicious patterns in .sol domains.
 */
export function SNSWarning({ snsName, walletAddress }: SNSWarningProps) {
  const [hasNonAscii, setHasNonAscii] = useState(false)
  const [showFullAddress, setShowFullAddress] = useState(false)

  useEffect(() => {
    // Detect Unicode homoglyphs and non-ASCII characters
    // common lookalikes: о, е, а, і, і, l, 0, O
    const nonAscii = /[^\x00-\x7F]/.test(snsName)
    const suspiciousPatterns = /[оеаiіl0O]/.test(snsName) 
    setHasNonAscii(nonAscii || suspiciousPatterns)
  }, [snsName])

  if (!snsName) return null

  return (
    <div className="mt-4 p-4 rounded-xl border transition-all bg-amber-500/5 border-amber-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-amber-500">
          <ShieldAlert size={16} />
          <span className="text-sm font-bold tracking-tight">{snsName}{snsName.endsWith('.sol') ? '' : '.sol'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-white/50">
          Verify the wallet address below matches the creator's official public identity.
        </p>
        
        <button 
          onClick={() => setShowFullAddress(!showFullAddress)}
          className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 group-hover:text-white/60">
            {showFullAddress ? 'Hide Full Address' : 'Verify Wallet Address'}
          </span>
          <ExternalLink size={12} className="text-white/20 group-hover:text-white/40" />
        </button>

        {showFullAddress && (
          <div className="animate-fade-in">
            <code className="block p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] break-all text-amber-200/80">
              {walletAddress}
            </code>
            <p className="mt-2 text-[9px] text-amber-500/60 italic">
              * On-chain records for {snsName} are immutable and publicly verifiable.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
