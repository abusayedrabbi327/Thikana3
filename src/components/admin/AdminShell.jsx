import { Menu } from 'lucide-react'

export default function AdminShell({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  actions,
  children,
}) {
  return (
    <div className="w-full pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 glass-panel p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">Admin Console</p>
              <h1 className="section-heading">{title}</h1>
              {subtitle && <p className="text-sm text-theme-muted mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-6">
          <aside className="glass-panel p-3 lg:p-4 h-fit lg:sticky lg:top-24">
            <nav className="space-y-1">
              {sections.map(section => {
                const Icon = section.icon
                const active = activeSection === section.key
                return (
                  <button
                    key={section.key}
                    onClick={() => onSectionChange(section.key)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${active
                      ? 'bg-theme-primary/15 text-theme-primary border border-theme-primary/30'
                      : 'text-theme-muted hover:text-theme-text hover:bg-theme-bg/70 border border-transparent'
                      }`}
                  >
                    <Icon size={16} />
                    <span className="text-left flex-1">{section.label}</span>
                    {section.count > 0 && (
                      <span className="text-[10px] rounded-full bg-theme-primary text-theme-primary-text px-2 py-0.5 font-bold">
                        {section.count > 99 ? '99+' : section.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
            <div className="mt-4 pt-4 border-t border-theme-border text-[11px] text-theme-muted flex items-center gap-2">
              <Menu size={13} /> Responsive admin modules
            </div>
          </aside>

          <section className="space-y-4">{children}</section>
        </div>
      </div>
    </div>
  )
}
