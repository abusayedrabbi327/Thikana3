export default function AdminDataTable({ columns, rows, loading, emptyLabel, rowKey }) {
  if (loading) {
    return (
      <div className="py-14 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!rows.length) {
    return <p className="py-12 text-sm text-theme-muted text-center">{emptyLabel}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-theme-border">
            {columns.map(col => (
              <th key={col.key} className="text-left text-xs uppercase tracking-wide text-theme-muted font-bold py-3 px-2">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-theme-border/60 hover:bg-theme-bg/50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="py-3 px-2 align-top text-theme-text">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
