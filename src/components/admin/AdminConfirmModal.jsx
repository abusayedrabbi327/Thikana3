export default function AdminConfirmModal({ open, title, message, onCancel, onConfirm, confirmLabel = 'Confirm', busy = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[130] glass-overlay flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-theme-text">{title}</h3>
        <p className="text-sm text-theme-muted mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-theme-border text-theme-muted hover:text-theme-text"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
