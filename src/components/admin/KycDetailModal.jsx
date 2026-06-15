import { useState } from 'react'
import { X, ShieldAlert, Plus, Trash2 } from 'lucide-react'
import AdminStatusBadge from './AdminStatusBadge'

const FLAG_OPTIONS = [
  'LOW_OCR_CONFIDENCE',
  'MISSING_NID_NUMBER',
  'MISSING_FULL_NAME',
  'LOW_FACE_MATCH',
  'INVALID_DOCUMENT_STRUCTURE',
  'INVALID_IMAGE_DIMENSIONS',
  'BLOCKED_NID',
  'DUPLICATE_NID',
  'MULTIPLE_FAILED_ATTEMPTS',
  'NO_FACE_ON_NID',
  'NO_FACE_ON_SELFIE',
]

function metricLabel(score) {
  if (score >= 80) return { label: 'Excellent', cls: 'text-emerald-600' }
  if (score >= 60) return { label: 'Moderate', cls: 'text-amber-600' }
  return { label: 'Low', cls: 'text-rose-600' }
}

export default function KycDetailModal({
  kycData,
  kycImages,
  noteById,
  setNoteById,
  onClose,
  onApprove,
  onReject,
  onFlagAdd,
  onFlagRemove,
  isSaving,
}) {
  const [newFlag, setNewFlag] = useState('')
  if (!kycData || typeof kycData !== 'object') return null

  const safeData = {
    ...kycData,
    fraud_flags: Array.isArray(kycData.fraud_flags) ? kycData.fraud_flags : [],
    full_name: kycData.full_name || 'Unknown',
    email: kycData.email || 'N/A',
    created_at: kycData.created_at || null,
    extracted_full_name: kycData.extracted_full_name || null,
    nid_number: kycData.nid_number || null,
    dob: kycData.dob || null,
    verification_status: kycData.verification_status || 'pending',
    confidence_score: Number(kycData.confidence_score) || 0,
    ocr_confidence: Number(kycData.ocr_confidence) || 0,
    face_match_score: Number(kycData.face_match_score) || 0,
  }

  const statusIsPending = ['pending', 'processing', 'review'].includes(safeData.verification_status)
  const statusIsApproved = safeData.verification_status === 'approved'
  const statusIsRejected = safeData.verification_status === 'rejected'
  const score = Math.round(safeData.confidence_score)
  const ocrScore = Math.round(safeData.ocr_confidence)
  const faceScore = Math.round(safeData.face_match_score)
  const scoreBadge = metricLabel(score)
  const ocrBadge = metricLabel(ocrScore)
  const faceBadge = metricLabel(faceScore)
  const activeFlags = safeData.fraud_flags

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-theme-card rounded-xl border border-theme-border w-full max-w-5xl shadow-2xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-theme-border">
          <div>
            <h2 className="text-2xl font-bold text-theme-text">KYC Verification Review</h2>
            <p className="text-sm text-theme-muted mt-1">Request #{safeData.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminStatusBadge status={safeData.verification_status} />
            <button onClick={onClose} className="p-2 hover:bg-theme-bg rounded-lg transition-colors">
              <X size={20} className="text-theme-muted" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto">
          <div className="flex gap-3">
            {statusIsPending ? (
              <>
                <button onClick={() => onReject(safeData)} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-lg border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                  Reject Request
                </button>
                <button onClick={() => onApprove(safeData)} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  Approve Verification
                </button>
              </>
            ) : statusIsApproved ? (
              <>
                <button disabled className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold opacity-50 cursor-not-allowed">
                  Approved
                </button>
                <button onClick={() => onReject(safeData)} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-lg border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                  Reject Request
                </button>
              </>
            ) : statusIsRejected ? (
              <>
                <button onClick={() => onApprove(safeData)} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  Approve Verification
                </button>
                <button disabled className="flex-1 px-4 py-2.5 rounded-lg border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 font-semibold opacity-50 cursor-not-allowed">
                  Rejected
                </button>
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-theme-text">NID Document (Front)</h3>
                  <span className="text-xs font-semibold text-theme-muted">Click to open full image</span>
                </div>
                {kycImages.loading ? (
                  <div className="h-72 bg-theme-bg rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" />
                  </div>
                ) : kycImages.nid ? (
                  <a href={kycImages.nid} target="_blank" rel="noreferrer" className="block h-72 bg-theme-bg rounded-lg overflow-hidden border border-theme-border">
                    <img src={kycImages.nid} alt="NID Document" className="w-full h-full object-contain" />
                  </a>
                ) : (
                  <div className="h-72 bg-theme-bg rounded-lg flex items-center justify-center text-xs text-theme-muted border border-theme-border">
                    No image available
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-theme-text">Live Selfie</h3>
                  <span className="text-xs font-semibold text-theme-muted">Click to open full image</span>
                </div>
                {kycImages.loading ? (
                  <div className="h-72 bg-theme-bg rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" />
                  </div>
                ) : kycImages.selfie ? (
                  <a href={kycImages.selfie} target="_blank" rel="noreferrer" className="block h-72 bg-theme-bg rounded-lg overflow-hidden border border-theme-border">
                    <img src={kycImages.selfie} alt="Selfie" className="w-full h-full object-contain" />
                  </a>
                ) : (
                  <div className="h-72 bg-theme-bg rounded-lg flex items-center justify-center text-xs text-theme-muted border border-theme-border">
                    No image available
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-theme-bg rounded-lg border border-theme-border p-4 space-y-4">
                <h3 className="font-bold text-theme-text">Risk Assessment</h3>
                <div className="flex justify-center">
                  <div className={`w-24 h-24 rounded-full border-4 ${score >= 80 ? 'border-emerald-500' : score >= 60 ? 'border-amber-500' : 'border-rose-500'} flex items-center justify-center`}>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{score}</p>
                      <p className="text-[10px] font-bold text-theme-muted">TRUST SCORE</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Overall confidence</span>
                    <span className={`${scoreBadge.cls} font-semibold`}>{scoreBadge.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">OCR confidence ({ocrScore})</span>
                    <span className={`${ocrBadge.cls} font-semibold`}>{ocrBadge.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Face match ({faceScore})</span>
                    <span className={`${faceBadge.cls} font-semibold`}>{faceBadge.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Flags</span>
                    <span className={`${activeFlags.length ? 'text-rose-600' : 'text-emerald-600'} font-semibold`}>
                      {activeFlags.length ? `${activeFlags.length} active` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-theme-bg rounded-lg border border-theme-border p-4 space-y-3">
                <h3 className="font-bold text-theme-text">Submitted Profile</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-theme-muted mb-0.5">USERNAME</p>
                    <p className="font-semibold text-theme-text">{safeData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted mb-0.5">EMAIL ADDRESS</p>
                    <p className="font-semibold text-theme-text">{safeData.email}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted mb-0.5">ACCOUNT CREATED</p>
                    <p className="font-semibold text-theme-text">{String(safeData.created_at || '').slice(0, 10) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-theme-bg rounded-lg border border-theme-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-theme-text">OCR Data Extraction Summary</h3>
              <span className="text-xs font-semibold text-theme-muted">Admin visible</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-theme-muted mb-1">FULL NAME</p>
                <p className="font-semibold text-theme-text">{safeData.extracted_full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-theme-muted mb-1">DOCUMENT NUMBER (NID)</p>
                <p className="font-semibold text-theme-text">{safeData.nid_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-theme-muted mb-1">DATE OF BIRTH</p>
                <p className="font-semibold text-theme-text">{safeData.dob ? String(safeData.dob).slice(0, 10) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-theme-muted mb-1">ISSUE AUTHORITY</p>
                <p className="font-semibold text-theme-text">Bangladesh Authority</p>
              </div>
            </div>
          </div>

          <div className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-4">
            <h3 className="font-bold text-rose-600 mb-3 flex items-center gap-2">
              <ShieldAlert size={16} /> Fraud Flags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {!activeFlags.length && <span className="text-xs text-theme-muted">No flags</span>}
              {activeFlags.map(flag => (
                <span key={flag} className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  {String(flag).replaceAll('_', ' ')}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => onFlagRemove?.(safeData, flag)}
                    className="opacity-80 hover:opacity-100 disabled:opacity-40"
                    title="Remove flag"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select value={newFlag} onChange={e => setNewFlag(e.target.value)} className="input-field py-2 px-3 text-xs w-44 max-w-full">
                <option value="">Select a flag to add</option>
                {FLAG_OPTIONS.filter(option => !activeFlags.includes(option)).map(option => (
                  <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!newFlag || isSaving}
                onClick={() => { onFlagAdd?.(safeData, newFlag); setNewFlag('') }}
                className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 text-xs inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Plus size={12} /> Add Flag
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-theme-text mb-2">Moderation Note</label>
            <textarea
              value={noteById[safeData.id] || ''}
              onChange={e => setNoteById(prev => ({ ...prev, [safeData.id]: e.target.value }))}
              placeholder="Add notes for this verification request..."
              className="input-field w-full py-3 px-4 text-sm rounded-lg resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
