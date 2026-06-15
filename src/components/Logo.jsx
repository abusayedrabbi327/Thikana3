// SVG Logo — 3rd variant: "T" inside a location-pin shaped house
// Bottom-left design from the brand sheet

export default function ThikanaLogo({ size = 36, className = '' }) {
 return (
  <svg
   width={size}
   height={size * 1.15}
   viewBox="0 0 40 46"
   fill="none"
   xmlns="http://www.w3.org/2000/svg"
   className={className}
   aria-label="Thikana logo"
  >
   {/* House body (dark navy) */}
   <path
    d="M20 2L38 15V36C38 37.1 37.1 38 36 38H4C2.9 38 2 37.1 2 36V15L20 2Z"
    fill="#0F172A"
   />
   {/* Pointed pin bottom */}
   <path d="M4 38H36L20 46L4 38Z" fill="#0F172A" />
   {/* Roof highlight line */}
   <path d="M20 2L38 15H2L20 2Z" fill="#1E293B" />

   {/* T letter — horizontal bar */}
   <rect x="11" y="19" width="18" height="3.5" rx="1.75" fill="#F97316" />
   {/* T letter — vertical bar */}
   <rect x="18.25" y="19" width="3.5" height="13" rx="1.75" fill="#F97316" />
   {/* Pin circle at bottom of T */}
   <circle cx="20" cy="33.5" r="2" fill="#F97316" />
  </svg>
 )
}
