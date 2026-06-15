export default function AdminCard({ children, className = '' }) {
  return (
    <div className={`glass-panel p-4 md:p-5 ${className}`}>
      {children}
    </div>
  )
}
