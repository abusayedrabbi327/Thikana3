import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Trash2, ArrowLeft, Building2, ShoppingBag, Sofa, Tv, ArrowUpRight, HelpCircle } from 'lucide-react'
import { compareProducts } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const CATEGORY_ICONS = {
  house_sell: Building2,
  house_rent: Building2,
  furniture: Sofa,
  appliance: Tv,
}

export default function Compare() {
  const navigate = useNavigate()
  const [compareIds, setCompareIds] = useState(() => {
    try {
      const items = localStorage.getItem('thikana_compare')
      return items ? JSON.parse(items) : []
    } catch (_e) {
      return []
    }
  })
  
  const [products, setProducts] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([])
      setAiSummary('')
      return
    }

    setLoading(true)
    setError('')
    compareProducts(compareIds)
      .then(res => {
        setProducts(res.products || [])
        setAiSummary(res.summary || '')
      })
      .catch(err => {
        console.error('[compare fetch error]', err)
        setError('Failed to fetch product details. Please try again.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [compareIds])

  const handleRemove = (id) => {
    const next = compareIds.filter(cid => String(cid) !== String(id))
    setCompareIds(next)
    localStorage.setItem('thikana_compare', JSON.stringify(next))
  }

  const handleClear = () => {
    setCompareIds([])
    localStorage.setItem('thikana_compare', JSON.stringify([]))
  }

  const renderAttributeRow = (label, selector) => {
    return (
      <tr className="border-b border-theme-border/60 hover:bg-theme-bg/25 transition-colors">
        <td className="p-4 text-xs font-black text-theme-muted uppercase tracking-wider bg-theme-bg/10 w-44">{label}</td>
        {products.map(p => {
          const val = selector(p)
          return (
            <td key={p.id} className="p-4 text-sm font-semibold text-theme-text min-w-[200px]">
              {val ?? <span className="text-theme-muted opacity-45">—</span>}
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-theme-bg pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-theme-border/60 pb-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-card border border-theme-border transition-all">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-xl font-black text-theme-text">Smart Product Comparison</h1>
                <p className="text-xs text-theme-muted">Select properties or furniture to compare side-by-side with AI summaries.</p>
              </div>
            </div>
            {compareIds.length > 0 && (
              <button 
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 text-xs font-bold transition-all"
              >
                <Trash2 size={13} /> Clear all
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-theme-card border border-theme-border rounded-3xl animate-pulse">
              <Sparkles size={40} className="animate-spin text-theme-primary mb-3 opacity-60" />
              <p className="text-sm font-medium text-theme-muted">Generating AI analysis and building comparison summary...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-theme-card border border-red-200 rounded-3xl text-red-500 font-semibold">
              {error}
            </div>
          ) : compareIds.length === 0 ? (
            <div className="text-center py-20 bg-theme-card border border-theme-border rounded-3xl max-w-2xl mx-auto">
              <HelpCircle size={48} className="mx-auto text-theme-muted opacity-30 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-theme-text mb-2">Your Comparison List is Empty</h3>
              <p className="text-theme-muted text-sm max-w-sm mx-auto mb-6">
                Go to the product details page of any flat, furniture item, or appliance, and click the **"Add to Compare"** button.
              </p>
              <Link to="/" className="px-6 py-3 rounded-xl bg-theme-primary text-white font-bold text-sm hover:opacity-90 transition-all">
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* AI Glowbox Summary */}
              {aiSummary && (
                <div className="p-6 rounded-[28px] bg-theme-primary/10 dark:bg-orange-950/20 border border-theme-primary/20 dark:border-orange-900 flex items-start gap-4 animate-scale-in">
                  <div className="p-2 rounded-2xl bg-theme-primary text-white flex-shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-theme-text dark:text-orange-400 uppercase tracking-wider mb-1">AI Comparison Insights</h3>
                    <p className="text-sm leading-relaxed text-theme-text/90 font-medium whitespace-pre-line">{aiSummary}</p>
                  </div>
                </div>
              )}

              {/* Comparison Matrix Table */}
              <div className="glass-panel overflow-x-auto rounded-[32px] border border-theme-border shadow-xl scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-theme-card border-b border-theme-border">
                      <th className="p-4 text-xs font-black text-theme-muted uppercase tracking-wider bg-theme-bg/10 w-44">Product Details</th>
                      {products.map(p => {
                        const Icon = CATEGORY_ICONS[p.category] || ShoppingBag
                        return (
                          <th key={p.id} className="p-4 min-w-[280px]">
                            <div className="flex gap-3 items-start relative pr-8">
                              <div className="w-16 h-16 rounded-2xl bg-theme-bg border border-theme-border flex items-center justify-center text-theme-muted overflow-hidden flex-shrink-0">
                                {p.attributes?.main_image || p.main_image ? (
                                  <img src={p.attributes?.main_image || p.main_image} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Icon size={24} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="bg-theme-bg px-2 py-0.5 rounded text-[9px] font-bold text-theme-primary uppercase border border-theme-border/40">
                                  {p.category.replaceAll('_', ' ')}
                                </span>
                                <h3 className="font-bold text-sm text-theme-text truncate mt-1 hover:text-theme-primary transition-colors">
                                  <Link to={`/product/${p.id}`}>{p.title}</Link>
                                </h3>
                                <p className="text-theme-primary font-black text-base mt-0.5">৳{Number(p.price).toLocaleString()}</p>
                              </div>
                              <button 
                                onClick={() => handleRemove(p.id)}
                                className="absolute top-0 right-0 p-1.5 rounded-lg text-theme-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {renderAttributeRow('Price (৳)', p => `৳${Number(p.price).toLocaleString()}`)}
                    {renderAttributeRow('Location', p => p.location)}
                    {renderAttributeRow('Bedrooms', p => p.attributes?.beds ? `${p.attributes.beds} Bed(s)` : null)}
                    {renderAttributeRow('Bathrooms', p => p.attributes?.baths ? `${p.attributes.baths} Bath(s)` : null)}
                    {renderAttributeRow('Condition', p => p.attributes?.condition)}
                    {renderAttributeRow('Description', p => (
                      <p className="line-clamp-3 text-xs text-theme-muted leading-relaxed font-normal">{p.description}</p>
                    ))}
                    <tr className="bg-theme-card/30">
                      <td className="p-4 text-xs font-black text-theme-muted uppercase tracking-wider bg-theme-bg/10 w-44">Action</td>
                      {products.map(p => (
                        <td key={p.id} className="p-4">
                          <Link 
                            to={`/product/${p.id}`} 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-orange-600 transition-all active:scale-95"
                          >
                            View Details <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
