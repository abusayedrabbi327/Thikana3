import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck, LayoutDashboard, IdCard, Package, Users, Settings2,
  RefreshCw, Search, CheckCircle2, XCircle, ShieldAlert, Ban, PauseCircle, PlayCircle, Save,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AdminShell from '../components/admin/AdminShell'
import AdminCard from '../components/admin/AdminCard'
import AdminStatusBadge from '../components/admin/AdminStatusBadge'
import AdminDataTable from '../components/admin/AdminDataTable'
import AdminConfirmModal from '../components/admin/AdminConfirmModal'
import KycDetailModal from '../components/admin/KycDetailModal'
import {
  getAdminDashboard,
  getAdminProducts,
  adminReviewProduct,
  getAdminNid,
  adminReviewNid,
  adminUpdateKycFlag,
  getAdminNidImageUrl,
  getAdminUsers,
  adminUpdateUserStatus,
  getAdminSettings,
  updateAdminSettings,
} from '../services/api'

const PAGE_SIZE = 10
const initialPaging = { page: 1, pages: 1, total: 0, limit: PAGE_SIZE }

export default function Admin() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [dashboard, setDashboard] = useState({ loading: true, error: '', data: null })
  const [kyc, setKyc] = useState({ loading: true, error: '', rows: [], pagination: initialPaging })
  const [kycQuery, setKycQuery] = useState({ page: 1, status: 'pending', search: '', fraud: 'all', sortBy: 'created_at', sortDir: 'desc' })
  const [selectedKyc, setSelectedKyc] = useState(null)
  const [kycImages, setKycImages] = useState({ nid: '', selfie: '', loading: false, error: '' })
  const [kycNoteById, setKycNoteById] = useState({})
  const [products, setProducts] = useState({ loading: true, error: '', rows: [], pagination: initialPaging })
  const [productQuery, setProductQuery] = useState({ page: 1, status: 'pending', search: '', sortBy: 'created_at', sortDir: 'desc' })
  const [productNoteById, setProductNoteById] = useState({})
  const [users, setUsers] = useState({ loading: true, error: '', rows: [], pagination: initialPaging })
  const [userQuery, setUserQuery] = useState({
    page: 1, search: '', role: 'all', account_status: 'all', verification: 'all', fraud: 'all', sortBy: 'created_at', sortDir: 'desc',
  })
  const [userNoteById, setUserNoteById] = useState({})
  const [settings, setSettings] = useState({ loading: true, saving: false, error: '', data: null })
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', busy: false, onConfirm: null })

  const runWithConfirm = ({ title, message, action }) => {
    setConfirmState({
      open: true,
      title,
      message,
      busy: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, busy: true }))
        try {
          await action()
          setConfirmState({ open: false, title: '', message: '', busy: false, onConfirm: null })
        } catch (err) {
          setConfirmState(prev => ({ ...prev, busy: false, message: err.message || prev.message }))
        }
      },
    })
  }

  const loadDashboard = useCallback(async () => {
    setDashboard(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await getAdminDashboard()
      setDashboard({ loading: false, error: '', data: data.dashboard })
    } catch (err) {
      setDashboard({ loading: false, error: err.message || 'Failed to load dashboard.', data: null })
    }
  }, [])

  const loadKyc = useCallback(async () => {
    setKyc(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await getAdminNid({ ...kycQuery, limit: PAGE_SIZE })
      setKyc({ loading: false, error: '', rows: data.submissions || [], pagination: data.pagination || initialPaging })
    } catch (err) {
      setKyc(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load KYC queue.' }))
    }
  }, [kycQuery])

  const loadProducts = useCallback(async () => {
    setProducts(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await getAdminProducts({ ...productQuery, limit: PAGE_SIZE })
      setProducts({ loading: false, error: '', rows: data.products || [], pagination: data.pagination || initialPaging })
    } catch (err) {
      setProducts(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load products.' }))
    }
  }, [productQuery])

  const loadUsers = useCallback(async () => {
    setUsers(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await getAdminUsers({ ...userQuery, limit: PAGE_SIZE })
      setUsers({ loading: false, error: '', rows: data.users || [], pagination: data.pagination || initialPaging })
    } catch (err) {
      setUsers(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load users.' }))
    }
  }, [userQuery])

  const loadSettings = useCallback(async () => {
    setSettings(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await getAdminSettings()
      setSettings({ loading: false, saving: false, error: '', data: data.settings })
    } catch (err) {
      setSettings(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load settings.' }))
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { loadKyc() }, [loadKyc])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { loadSettings() }, [loadSettings])

  useEffect(() => {
    let live = true
    let nidUrl = ''
    let selfieUrl = ''
    if (!selectedKyc?.id) {
      setKycImages({ nid: '', selfie: '', loading: false, error: '' })
      return
    }
    setKycImages({ nid: '', selfie: '', loading: true, error: '' })
    Promise.all([getAdminNidImageUrl(selectedKyc.id, 'nid'), getAdminNidImageUrl(selectedKyc.id, 'selfie')])
      .then(([nextNid, nextSelfie]) => {
        nidUrl = nextNid
        selfieUrl = nextSelfie
        if (live) setKycImages({ nid: nextNid, selfie: nextSelfie, loading: false, error: '' })
      })
      .catch(err => {
        if (live) setKycImages({ nid: '', selfie: '', loading: false, error: err.message || 'Image unavailable.' })
      })
    return () => {
      live = false
      if (nidUrl) URL.revokeObjectURL(nidUrl)
      if (selfieUrl) URL.revokeObjectURL(selfieUrl)
    }
  }, [selectedKyc])

  const sectionItems = useMemo(() => ([
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'kyc', label: 'KYC Verification', icon: IdCard, count: dashboard.data?.pending_kyc_requests || 0 },
    { key: 'products', label: 'Product Moderation', icon: Package, count: dashboard.data?.pending_product_approvals || 0 },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings2 },
  ]), [dashboard.data])

  const reviewKyc = async (row, status) => {
    await adminReviewNid({ submission_id: row.id, status, admin_note: kycNoteById[row.id] || '' })
    await Promise.all([loadKyc(), loadDashboard()])
  }
  const updateKycFlagAction = async (row, action, flag) => {
    const response = await adminUpdateKycFlag(row.id, { action, flag })
    const updated = response?.submission
    if (updated) {
      setSelectedKyc(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
      setKyc(prev => ({
        ...prev,
        rows: prev.rows.map(item => (item.id === updated.id ? { ...item, ...updated } : item)),
      }))
    }
    await loadDashboard()
  }
  const reviewProductAction = async (row, status) => {
    await adminReviewProduct({ product_id: row.id, status, admin_note: productNoteById[row.id] || '' })
    await Promise.all([loadProducts(), loadDashboard()])
  }
  const updateUserStatusAction = async (row, status) => {
    await adminUpdateUserStatus(row.id, { status, note: userNoteById[row.id] || '' })
    await Promise.all([loadUsers(), loadDashboard()])
  }
  const handleSettingsSave = async (sectionKey) => {
    setSettings(prev => ({ ...prev, saving: true, error: '' }))
    try {
      const response = await updateAdminSettings({ [sectionKey]: settings.data?.[sectionKey] || {} })
      setSettings(prev => ({ ...prev, saving: false, data: response.settings }))
      await loadDashboard()
    } catch (err) {
      setSettings(prev => ({ ...prev, saving: false, error: err.message || 'Failed to save settings.' }))
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-theme-bg">
        <AdminShell
          title="Marketplace Admin Panel"
          subtitle="Production moderation, verification, and governance tools"
          sections={sectionItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          actions={(
            <button onClick={() => {
              if (activeSection === 'dashboard') loadDashboard()
              if (activeSection === 'kyc') loadKyc()
              if (activeSection === 'products') loadProducts()
              if (activeSection === 'users') loadUsers()
              if (activeSection === 'settings') loadSettings()
            }} className="btn-secondary">
              <RefreshCw size={16} /> Refresh
            </button>
          )}
        >
          {activeSection === 'dashboard' && <DashboardSection state={dashboard} />}
          {activeSection === 'kyc' && (
            <>
              <KycSection
                state={kyc}
                query={kycQuery}
                setQuery={setKycQuery}
                selectedKyc={selectedKyc}
                setSelectedKyc={setSelectedKyc}
                kycImages={kycImages}
                noteById={kycNoteById}
                setNoteById={setKycNoteById}
                onApprove={row => runWithConfirm({ title: 'Approve KYC request?', message: `Approve verification for ${row.full_name}?`, action: () => reviewKyc(row, 'approved') })}
                onReject={row => runWithConfirm({ title: 'Reject KYC request?', message: `Reject verification for ${row.full_name}?`, action: () => reviewKyc(row, 'rejected') })}
              />
              <KycDetailModal
                kycData={selectedKyc}
                kycImages={kycImages}
                noteById={kycNoteById}
                setNoteById={setKycNoteById}
                onClose={() => setSelectedKyc(null)}
                onApprove={row => runWithConfirm({ title: 'Approve KYC request?', message: `Approve verification for ${row.full_name}?`, action: () => { setSelectedKyc(null); return reviewKyc(row, 'approved') } })}
                onReject={row => runWithConfirm({ title: 'Reject KYC request?', message: `Reject verification for ${row.full_name}?`, action: () => { setSelectedKyc(null); return reviewKyc(row, 'rejected') } })}
                onFlagAdd={(row, flag) => runWithConfirm({ title: 'Add fraud flag?', message: `Add "${flag}" for ${row.full_name}?`, action: () => updateKycFlagAction(row, 'add', flag) })}
                onFlagRemove={(row, flag) => runWithConfirm({ title: 'Remove fraud flag?', message: `Remove "${flag}" for ${row.full_name}?`, action: () => updateKycFlagAction(row, 'remove', flag) })}
                isLoading={kycImages.loading}
                isSaving={confirmState.busy}
              />
            </>
          )}
          {activeSection === 'products' && (
            <ProductsSection
              state={products}
              query={productQuery}
              setQuery={setProductQuery}
              noteById={productNoteById}
              setNoteById={setProductNoteById}
              onApprove={row => runWithConfirm({ title: 'Approve listing?', message: `Approve "${row.title}"?`, action: () => reviewProductAction(row, 'approved') })}
              onReject={row => runWithConfirm({ title: 'Reject listing?', message: `Reject "${row.title}"?`, action: () => reviewProductAction(row, 'rejected') })}
            />
          )}
          {activeSection === 'users' && (
            <UsersSection
              state={users}
              query={userQuery}
              setQuery={setUserQuery}
              noteById={userNoteById}
              setNoteById={setUserNoteById}
              onSuspend={row => runWithConfirm({ title: 'Suspend user?', message: `Suspend ${row.full_name}?`, action: () => updateUserStatusAction(row, 'suspended') })}
              onBan={row => runWithConfirm({ title: 'Ban user?', message: `Ban ${row.full_name}?`, action: () => updateUserStatusAction(row, 'banned') })}
              onActivate={row => runWithConfirm({ title: 'Activate user?', message: `Restore ${row.full_name} to active?`, action: () => updateUserStatusAction(row, 'active') })}
            />
          )}
          {activeSection === 'settings' && (
            <SettingsSection state={settings} setState={setSettings} onSaveSection={handleSettingsSave} />
          )}
        </AdminShell>
      </main>
      <Footer />
      <AdminConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        busy={confirmState.busy}
        onCancel={() => setConfirmState({ open: false, title: '', message: '', busy: false, onConfirm: null })}
        onConfirm={() => confirmState.onConfirm?.()}
      />
    </>
  )
}

function DashboardSection({ state }) {
  if (state.loading) return <LoadingCard />
  if (state.error) return <ErrorCard message={state.error} />
  if (!state.data) return <EmptyCard label="No dashboard data available." />
  const cards = [
    { key: 'total_users', label: 'Total Users' },
    { key: 'total_sellers', label: 'Total Sellers' },
    { key: 'pending_kyc_requests', label: 'Pending KYC Requests' },
    { key: 'pending_product_approvals', label: 'Pending Product Approvals' },
    { key: 'total_listings', label: 'Total Listings' },
    { key: 'fraud_flagged_users', label: 'Fraud Flagged Users' },
  ]
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => (
          <AdminCard key={card.key}>
            <p className="text-xs uppercase font-bold tracking-wide text-theme-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-theme-text">{state.data[card.key] ?? 0}</p>
          </AdminCard>
        ))}
      </div>
      <AdminCard>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-theme-primary" />
          <h3 className="text-sm font-bold text-theme-text">Recent Activities</h3>
        </div>
        {!state.data.recent_activities?.length ? (
          <p className="text-sm text-theme-muted py-8 text-center">No recent admin activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {state.data.recent_activities.map(item => (
              <li key={item.id} className="rounded-xl border border-theme-border bg-theme-bg/60 px-3 py-2">
                <p className="text-sm font-semibold text-theme-text">{humanizeAction(item.action)}</p>
                <p className="text-xs text-theme-muted mt-0.5">{item.actor_name || 'System'} - {new Date(item.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </>
  )
}

function KycSection({ state, query, setQuery, selectedKyc, setSelectedKyc, kycImages, noteById, setNoteById, onApprove, onReject }) {
  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      render: row => (
        <div>
          <p className="font-semibold">{row.full_name}</p>
          <p className="text-xs text-theme-muted">{row.email}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: row => <AdminStatusBadge status={row.verification_status} /> },
    {
      key: 'score',
      label: 'Confidence',
      render: row => (
        <div className="text-xs">
          <p>Score: <span className="font-bold">{Math.round(Number(row.confidence_score) || 0)}</span></p>
          <p className="text-theme-muted">OCR {Math.round(Number(row.ocr_confidence) || 0)} - Face {Math.round(Number(row.face_match_score) || 0)}</p>
        </div>
      ),
    },
    {
      key: 'fraud',
      label: 'Fraud Flags',
      render: row => (
        <div className="flex flex-wrap gap-1">
          {(row.fraud_flags || []).slice(0, 2).map(flag => <span key={flag} className="glass-tag !text-[10px]">{String(flag).replaceAll('_', ' ')}</span>)}
          {!row.fraud_flags?.length && <span className="text-xs text-theme-muted">None</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: row => (
        <div className="space-y-2 min-w-[220px]">
          <textarea value={noteById[row.id] || ''} onChange={e => setNoteById(prev => ({ ...prev, [row.id]: e.target.value }))} placeholder="Moderation note" className="input-field py-2 px-3 text-xs" rows={2} />
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSelectedKyc(row)} className="px-2.5 py-1 rounded-lg border border-theme-border text-xs text-theme-muted hover:text-theme-text">Automated window</button>
            {row.verification_status === 'approved' ? (
              <>
                <button disabled className="px-2.5 py-1 rounded-lg border text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1 opacity-50 cursor-not-allowed"><CheckCircle2 size={12} />Approved</button>
                <button onClick={() => onReject(row)} className="px-2.5 py-1 rounded-lg border text-xs border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 inline-flex items-center gap-1"><XCircle size={12} />Reject</button>
              </>
            ) : row.verification_status === 'rejected' ? (
              <>
                <button onClick={() => onApprove(row)} className="px-2.5 py-1 rounded-lg border text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 size={12} />Approve</button>
                <button disabled className="px-2.5 py-1 rounded-lg border text-xs border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 inline-flex items-center gap-1 opacity-50 cursor-not-allowed"><XCircle size={12} />Rejected</button>
              </>
            ) : (
              <>
                <button onClick={() => onApprove(row)} className="px-2.5 py-1 rounded-lg border text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 size={12} />Approve</button>
                <button onClick={() => onReject(row)} className="px-2.5 py-1 rounded-lg border text-xs border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 inline-flex items-center gap-1"><XCircle size={12} />Reject</button>
              </>
            )}
          </div>
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminCard>
        <FilterRow>
          <SearchInput value={query.search} onChange={v => setQuery(prev => ({ ...prev, page: 1, search: v }))} placeholder="Search KYC by user/email/NID" />
          <Select value={query.status} onChange={v => setQuery(prev => ({ ...prev, page: 1, status: v }))} options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']]} />
          <Select value={query.fraud} onChange={v => setQuery(prev => ({ ...prev, page: 1, fraud: v }))} options={[['all', 'Fraud: All'], ['flagged', 'Flagged'], ['clean', 'Clean']]} />
          <Select value={`${query.sortBy}:${query.sortDir}`} onChange={v => {
            const [sortBy, sortDir] = v.split(':')
            setQuery(prev => ({ ...prev, sortBy, sortDir, page: 1 }))
          }} options={[['created_at:desc', 'Newest'], ['created_at:asc', 'Oldest'], ['confidence_score:desc', 'Highest score'], ['confidence_score:asc', 'Lowest score']]} />
        </FilterRow>
        {state.error && <ErrorInline message={state.error} />}
        <AdminDataTable columns={columns} rows={state.rows} loading={state.loading} emptyLabel="No KYC requests found." rowKey={row => row.id} />
        <Pager pagination={state.pagination} currentPage={query.page} onPageChange={page => setQuery(prev => ({ ...prev, page }))} />
      </AdminCard>

    </>
  )
}

function ProductsSection({ state, query, setQuery, noteById, setNoteById, onApprove, onReject }) {
  const columns = [
    {
      key: 'listing',
      label: 'Listing',
      render: row => (
        <div className="max-w-[260px]">
          <p className="font-semibold truncate">{row.title}</p>
          <p className="text-xs text-theme-muted capitalize">{row.category?.replaceAll('_', ' ')} - Tk {Number(row.price || 0).toLocaleString()}</p>
        </div>
      ),
    },
    {
      key: 'seller',
      label: 'Seller Info',
      render: row => (
        <div>
          <p className="font-medium">{row.seller_name}</p>
          <p className="text-xs text-theme-muted">{row.seller_email}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: row => <AdminStatusBadge status={row.status} /> },
    { key: 'preview', label: 'Preview', render: row => row.main_image ? <img src={row.main_image} alt={row.title} className="w-16 h-12 rounded-lg object-cover border border-theme-border" /> : <span className="text-xs text-theme-muted">No image</span> },
    {
      key: 'actions',
      label: 'Moderation',
      render: row => (
        <div className="space-y-2 min-w-[220px]">
          <textarea value={noteById[row.id] || ''} onChange={e => setNoteById(prev => ({ ...prev, [row.id]: e.target.value }))} placeholder="Moderation note" className="input-field py-2 px-3 text-xs" rows={2} />
          <div className="flex gap-1.5">
            <button onClick={() => onApprove(row)} className="px-2.5 py-1 rounded-lg border text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 size={12} />Approve</button>
            <button onClick={() => onReject(row)} className="px-2.5 py-1 rounded-lg border text-xs border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 inline-flex items-center gap-1"><XCircle size={12} />Reject</button>
          </div>
        </div>
      ),
    },
  ]
  return (
    <AdminCard>
      <FilterRow>
        <SearchInput value={query.search} onChange={v => setQuery(prev => ({ ...prev, page: 1, search: v }))} placeholder="Search products/title/seller" />
        <Select value={query.status} onChange={v => setQuery(prev => ({ ...prev, page: 1, status: v }))} options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']]} />
        <Select value={`${query.sortBy}:${query.sortDir}`} onChange={v => {
          const [sortBy, sortDir] = v.split(':')
          setQuery(prev => ({ ...prev, sortBy, sortDir, page: 1 }))
        }} options={[['created_at:desc', 'Newest'], ['created_at:asc', 'Oldest'], ['price:desc', 'Price high-low'], ['price:asc', 'Price low-high']]} />
      </FilterRow>
      {state.error && <ErrorInline message={state.error} />}
      <AdminDataTable columns={columns} rows={state.rows} loading={state.loading} emptyLabel="No listings found." rowKey={row => row.id} />
      <Pager pagination={state.pagination} currentPage={query.page} onPageChange={page => setQuery(prev => ({ ...prev, page }))} />
    </AdminCard>
  )
}

function UsersSection({ state, query, setQuery, noteById, setNoteById, onSuspend, onBan, onActivate }) {
  const columns = [
    {
      key: 'user',
      label: 'User',
      render: row => (
        <div>
          <p className="font-semibold">{row.full_name}</p>
          <p className="text-xs text-theme-muted">{row.email}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: row => <span className="capitalize text-sm">{row.effective_role}</span> },
    { key: 'verification', label: 'Verification', render: row => <AdminStatusBadge status={row.latest_verification_status || (row.nid_verified ? 'approved' : 'pending')} /> },
    { key: 'account_status', label: 'Account', render: row => <AdminStatusBadge status={row.account_status} /> },
    { key: 'fraud_flags', label: 'Fraud', render: row => (row.fraud_flags?.length ? <span className="text-xs text-rose-500 font-semibold">{row.fraud_flags.length} flags</span> : <span className="text-xs text-theme-muted">Clean</span>) },
    {
      key: 'actions',
      label: 'Actions',
      render: row => (
        <div className="space-y-2 min-w-[220px]">
          <textarea value={noteById[row.id] || ''} onChange={e => setNoteById(prev => ({ ...prev, [row.id]: e.target.value }))} placeholder="Admin note" className="input-field py-2 px-3 text-xs" rows={2} />
          <div className="flex flex-wrap gap-1.5">
            {row.account_status !== 'active' && <button onClick={() => onActivate(row)} className="px-2 py-1 rounded-lg border border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300 text-xs inline-flex items-center gap-1"><PlayCircle size={12} />Activate</button>}
            {row.account_status !== 'suspended' && <button onClick={() => onSuspend(row)} className="px-2 py-1 rounded-lg border border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300 text-xs inline-flex items-center gap-1"><PauseCircle size={12} />Suspend</button>}
            {row.account_status !== 'banned' && <button onClick={() => onBan(row)} className="px-2 py-1 rounded-lg border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 text-xs inline-flex items-center gap-1"><Ban size={12} />Ban</button>}
          </div>
        </div>
      ),
    },
  ]
  return (
    <AdminCard>
      <FilterRow>
        <SearchInput value={query.search} onChange={v => setQuery(prev => ({ ...prev, page: 1, search: v }))} placeholder="Search users by name/email/id" />
        <Select value={query.role} onChange={v => setQuery(prev => ({ ...prev, page: 1, role: v }))} options={[['all', 'All roles'], ['buyer', 'Buyer'], ['seller', 'Seller'], ['admin', 'Admin']]} />
        <Select value={query.account_status} onChange={v => setQuery(prev => ({ ...prev, page: 1, account_status: v }))} options={[['all', 'All accounts'], ['active', 'Active'], ['suspended', 'Suspended'], ['banned', 'Banned']]} />
        <Select value={query.verification} onChange={v => setQuery(prev => ({ ...prev, page: 1, verification: v }))} options={[['all', 'Verification: All'], ['verified', 'Verified'], ['unverified', 'Unverified'], ['pending', 'Pending'], ['rejected', 'Rejected']]} />
        <Select value={query.fraud} onChange={v => setQuery(prev => ({ ...prev, page: 1, fraud: v }))} options={[['all', 'Fraud: All'], ['flagged', 'Flagged'], ['clean', 'Clean']]} />
      </FilterRow>
      {state.error && <ErrorInline message={state.error} />}
      <AdminDataTable columns={columns} rows={state.rows} loading={state.loading} emptyLabel="No users found." rowKey={row => row.id} />
      <Pager pagination={state.pagination} currentPage={query.page} onPageChange={page => setQuery(prev => ({ ...prev, page }))} />
    </AdminCard>
  )
}

function SettingsSection({ state, setState, onSaveSection }) {
  const setField = (group, key, value) => {
    setState(prev => ({ ...prev, data: { ...prev.data, [group]: { ...prev.data[group], [key]: value } } }))
  }
  if (state.loading) return <LoadingCard />
  if (state.error && !state.data) return <ErrorCard message={state.error} />
  if (!state.data) return <EmptyCard label="No settings available." />
  
  const groupConfigs = {
    verification_thresholds: { icon: 'V', color: 'from-emerald-500 to-teal-500', description: 'KYC verification confidence levels and approval rules' },
    moderation_settings: { icon: 'M', color: 'from-amber-500 to-orange-500', description: 'Content moderation and quality control settings' },
    upload_limits: { icon: 'U', color: 'from-blue-500 to-cyan-500', description: 'File size and upload frequency restrictions' },
    notification_settings: { icon: 'N', color: 'from-purple-500 to-pink-500', description: 'Alert and notification preferences' },
    security_settings: { icon: 'S', color: 'from-rose-500 to-red-500', description: 'Platform security and protection features' },
  }

  // Field configuration for ranges and units
  const fieldConfig = {
    auto_approve_score: { min: 0, max: 100, unit: '%' },
    manual_review_score: { min: 0, max: 100, unit: '%' },
    min_ocr_confidence: { min: 0, max: 100, unit: '%' },
    min_face_match_score: { min: 0, max: 100, unit: '%' },
    max_pending_days: { min: 1, max: 7, unit: 'days' },
    max_upload_size: { min: 1, max: 1000, unit: 'MB' },
    rate_limit: { min: 1, max: 1000, unit: 'req/min' },
    max_product_images: { min: 1, max: 10, unit: 'images' },
    max_image_size: { min: 1, max: 10, unit: 'MB' },
    max_kyc_image_size: { min: 1, max: 10, unit: 'MB' },
    max_image_size_mb: { min: 1, max: 10, unit: 'MB' },
    max_kyc_image_size_mb: { min: 1, max: 10, unit: 'MB' },
    max_login_attempts: { min: 1, max: 10, unit: 'attempts' },
    lockout_minutes: { min: 1, max: 1440, unit: 'min' },
    login_attempt_limit: { min: 1, max: 10, unit: 'attempts' },
    lockout_duration_minutes: { min: 1, max: 1440, unit: 'min' },
  }

  const getFieldConfig = (key) => {
    if (fieldConfig[key]) return fieldConfig[key]
    // Default for scores/thresholds
    if (key.includes('score') || key.includes('threshold') || key.includes('confidence')) {
      return { min: 0, max: 100, unit: '%' }
    }
    // Default for other numeric values
    return { min: 0, max: 100, unit: '' }
  }

  const renderToggle = (value, onChange) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-6 bg-theme-border rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
    </label>
  )

  const lockoutJumpPoints = [1, 5, 10, 30, 60, 120, 180, 240, 360, 480, 720, 1440]
  const lockoutKeys = new Set(['lockout_minutes', 'lockout_duration_minutes'])
  const getClosestPointIndex = (value, points) => {
    let bestIndex = 0
    let bestDiff = Math.abs((Number(value) || 0) - points[0])
    for (let i = 1; i < points.length; i += 1) {
      const diff = Math.abs((Number(value) || 0) - points[i])
      if (diff < bestDiff) {
        bestDiff = diff
        bestIndex = i
      }
    }
    return bestIndex
  }

  const renderThresholdZones = (data) => {
    const autoApprove = data.auto_approve_score || 85
    const minManualReview = data.manual_review_score ?? data.min_manual_review_score ?? 50
    
    return (
      <div className="space-y-4">
        <div className="mt-2">
          <div className="h-3 w-full bg-theme-border rounded-full flex overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${minManualReview}%` }}></div>
            <div className="h-full bg-amber-500" style={{ width: `${autoApprove - minManualReview}%` }}></div>
            <div className="h-full bg-emerald-500" style={{ width: `${100 - autoApprove}%` }}></div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-start gap-2 p-3 bg-theme-bg/50 rounded-lg border border-theme-border/30">
            <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 flex-shrink-0"></div>
            <div>
              <p className="text-[11px] font-bold text-theme-text">Auto-Reject</p>
              <p className="text-[10px] text-theme-muted">&lt; {minManualReview}% score</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-theme-bg/50 rounded-lg border border-theme-border/30">
            <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 flex-shrink-0"></div>
            <div>
              <p className="text-[11px] font-bold text-theme-text">Manual Review</p>
              <p className="text-[10px] text-theme-muted">{minManualReview}% - {autoApprove}%</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-theme-bg/50 rounded-lg border border-theme-border/30">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></div>
            <div>
              <p className="text-[11px] font-bold text-theme-text">Auto-Approve</p>
              <p className="text-[10px] text-theme-muted">&gt; {autoApprove}% confidence</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-theme-border/30">
          <div>
            <label className="text-sm font-semibold text-theme-text mb-2 block">Auto-Approve Threshold ({data.auto_approve_score || 85}%)</label>
            <input 
              type="range" 
              min="0"
              max="100"
              value={data.auto_approve_score || 85}
              onChange={e => setField('verification_thresholds', 'auto_approve_score', Number(e.target.value))}
              className="w-full h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-theme-text mb-2 block">Manual Review Min ({data.manual_review_score ?? data.min_manual_review_score ?? 50}%)</label>
            <input 
              type="range" 
              min="0"
              max="100"
              value={data.manual_review_score ?? data.min_manual_review_score ?? 50}
              onChange={e => setField('verification_thresholds', 'manual_review_score', Number(e.target.value))}
              className="w-full h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {state.error && <ErrorInline message={state.error} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(groupConfigs).map(([groupKey, config]) => (
          <div key={groupKey} className="h-fit">
            <AdminCard>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-lg flex-shrink-0`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-text">{groupKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h3>
                  <p className="text-[11px] text-theme-muted mt-0.5">{config.description}</p>
                </div>
              </div>
              
              {groupKey === 'verification_thresholds' ? (
                renderThresholdZones(state.data[groupKey] || {})
              ) : (
                <div className="space-y-5">
                  {Object.entries(state.data[groupKey] || {}).map(([key, value]) => {
                    const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    const config = getFieldConfig(key)
                    const isDiscreteLockout = lockoutKeys.has(key)
                    const discreteIndex = isDiscreteLockout ? getClosestPointIndex(value, lockoutJumpPoints) : 0
                    const displayValue = isDiscreteLockout ? lockoutJumpPoints[discreteIndex] : value
                    const progressPercent = isDiscreteLockout
                      ? (discreteIndex / (lockoutJumpPoints.length - 1)) * 100
                      : ((value - config.min) / (config.max - config.min)) * 100
                    
                    return (
                      <div key={key} className="pb-4 border-b border-theme-border/30 last:border-b-0">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-theme-text text-sm">{label}</p>
                          <span className="text-sm font-semibold text-theme-text">{displayValue} <span className="text-xs text-theme-muted">{config.unit}</span></span>
                        </div>
                        {typeof value === 'number' ? (
                          <input 
                            type="range" 
                            min={isDiscreteLockout ? 0 : config.min}
                            max={isDiscreteLockout ? lockoutJumpPoints.length - 1 : config.max}
                            step={isDiscreteLockout ? 1 : 1}
                            value={isDiscreteLockout ? discreteIndex : value}
                            onChange={e => {
                              const nextValue = Number(e.target.value)
                              setField(groupKey, key, isDiscreteLockout ? lockoutJumpPoints[nextValue] : nextValue)
                            }}
                            className="w-full h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            style={{
                              background: `linear-gradient(to right, rgb(239, 68, 68) 0%, rgb(217, 119, 6) ${progressPercent}%, rgb(167, 243, 208) ${progressPercent}%, rgb(16, 185, 129) 100%)`
                            }}
                          />
                        ) : typeof value === 'boolean' ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-theme-muted">
                              {value ? 'Enabled' : 'Disabled'}
                            </span>
                            {renderToggle(value, v => setField(groupKey, key, v))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button onClick={() => onSaveSection(groupKey)} disabled={state.saving} className="btn-primary">
                  <Save size={16} /> {state.saving ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </AdminCard>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingCard() {
  return <AdminCard><div className="py-16 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" /></div></AdminCard>
}
function ErrorCard({ message }) {
  return <AdminCard><ErrorInline message={message} /></AdminCard>
}
function EmptyCard({ label }) {
  return <AdminCard><p className="text-center py-16 text-sm text-theme-muted">{label}</p></AdminCard>
}
function ErrorInline({ message }) {
  return <p className="mb-3 text-sm rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-300">{message}</p>
}
function FilterRow({ children }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
}
function Select({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)} className="input-field py-2 px-3 min-w-[150px] w-auto">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
}
function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-[240px] flex-1 max-w-[420px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field py-2 pl-9" />
    </div>
  )
}
function Pager({ pagination, currentPage, onPageChange }) {
  if (!pagination?.pages || pagination.pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-theme-muted">
      <p>Total {pagination.total}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="px-2.5 py-1 rounded-lg border border-theme-border disabled:opacity-40">Prev</button>
        <span>Page {currentPage} / {pagination.pages}</span>
        <button onClick={() => onPageChange(Math.min(pagination.pages, currentPage + 1))} disabled={currentPage >= pagination.pages} className="px-2.5 py-1 rounded-lg border border-theme-border disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}
function Score({ label, value }) {
  return (
    <div className="rounded-lg border border-theme-border bg-theme-card p-2 text-center">
      <p className="text-sm font-black text-theme-text">{Math.round(Number(value) || 0)}</p>
      <p className="text-[10px] uppercase font-semibold text-theme-muted">{label}</p>
    </div>
  )
}
function ImagePreview({ src, label }) {
  if (!src) return <div className="h-28 rounded-lg border border-theme-border bg-theme-bg/70 flex items-center justify-center text-xs text-theme-muted">No image</div>
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <div className="h-28 rounded-lg border border-theme-border overflow-hidden bg-theme-card"><img src={src} alt={label} className="w-full h-full object-cover" /></div>
      <p className="mt-1 text-xs text-theme-muted">{label}</p>
    </a>
  )
}
function humanizeAction(action) {
  return String(action || 'activity').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}
