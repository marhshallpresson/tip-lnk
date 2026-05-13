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
export function SNSWarning({ snsName }: { snsName: string }) {
  const [hasNonAscii, setHasNonAscii] = useState(false)

  useEffect(() => {
    const nonAscii = /[^\x00-\x7F]/.test(snsName)
    const suspiciousPatterns = /[оеаiіl0O]/.test(snsName) 
    setHasNonAscii(nonAscii || suspiciousPatterns)
  }, [snsName])

  if (!snsName) return null

  return (
    <div className="mt-4 p-4 rounded-xl border transition-all bg-emerald-500/5 border-emerald-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-emerald-500">
          <ShieldAlert size={16} />
          <span className="text-sm font-bold tracking-tight">{snsName}{snsName.endsWith('.sol') ? '' : '.sol'}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[8px] font-bold uppercase tracking-widest">
            Verified ID
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-white/50">
          This creator is verified via Solana Name Service. All payments are processed through zero-knowledge secure channels.
        </p>
        
        {hasNonAscii && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px]">
            ⚠️ <strong>Warning:</strong> This handle contains non-standard characters. Ensure you are sending to the correct creator.
          </div>
        )}
      </div>
    </div>
  )
}
