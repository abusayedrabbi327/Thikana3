import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Privacy() {
 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-20 pb-12">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-fade-in">

     <div className="flex items-center gap-3 mb-6">
      <Link to="/" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-theme-border dark:hover:border-gray-800 transition-all">
       <ArrowLeft size={18} />
      </Link>
      <div>
       <h1 className="text-xl font-bold text-theme-text">Privacy Policy</h1>
       <p className="text-xs text-theme-muted mt-0.5">Last updated: April 2026</p>
      </div>
     </div>

     <div className="bg-theme-card border border-theme-border rounded-2xl shadow-sm p-7">

      <ProseSection title="1. Information We Collect">
       <p>We collect information you provide directly:</p>
       <ul>
        <li><strong>Account data:</strong> Name, email, phone, password (hashed).</li>
        <li><strong>Profile data:</strong> Avatar, address, bio.</li>
        <li><strong>Listing data:</strong> Product details, photos, price, location.</li>
        <li><strong>NID data:</strong> National ID number and images for verification only.</li>
       </ul>
      </ProseSection>

      <ProseSection title="2. How We Use Your Information">
       <ul>
        <li>To provide and improve the Thikana marketplace.</li>
        <li>To verify your identity (NID verification).</li>
        <li>To send transactional emails (OTP, password reset).</li>
        <li>To enable communication between buyers and sellers.</li>
        <li>To detect and prevent fraud.</li>
       </ul>
      </ProseSection>

      <ProseSection title="3. NID Data">
       NID documents and images are stored securely and accessed only by verified admins for identity verification. We do not sell or share NID data with third parties. NID images may be deleted upon request after verification is complete.
      </ProseSection>

      <ProseSection title="4. Data Sharing">
       We do not sell your personal data. We may share limited data with:
       <ul>
        <li>Other users (your name, listings, and verified status are visible).</li>
        <li>Service providers (email services) under strict confidentiality.</li>
        <li>Law enforcement when required by law.</li>
       </ul>
      </ProseSection>

      <ProseSection title="5. Data Retention">
       We retain your data for as long as your account is active. You can request account deletion at any time by contacting us.
      </ProseSection>

      <ProseSection title="6. Cookies">
       We use localStorage to store your session token and theme preference. We do not use third-party tracking cookies.
      </ProseSection>

      <ProseSection title="7. Security">
       We use industry-standard security measures including bcrypt password hashing, JWT authentication, and HTTPS. However, no system is 100% secure.
      </ProseSection>

      <ProseSection title="8. Your Rights">
       You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:support@thikana.com" className="text-theme-primary">support@thikana.com</a> to exercise these rights.
      </ProseSection>

      <ProseSection title="9. Contact">
       For privacy concerns, contact us at <a href="mailto:support@thikana.com" className="text-theme-primary">support@thikana.com</a>.
      </ProseSection>
     </div>

     <p className="text-center text-xs text-theme-muted mt-4">
      <Link to="/terms" className="text-theme-primary hover:underline">Terms of Service</Link>
     </p>
    </div>
   </main>
   <Footer />
  </>
 )
}

function ProseSection({ title, children }) {
 return (
  <div className="mb-6">
   <h2 className="text-base font-bold text-theme-text mb-2">{title}</h2>
   <div className="text-sm text-theme-muted leading-relaxed space-y-2 [&_ul]:pl-4 [&_ul]:list-disc [&_ul]:space-y-1">{children}</div>
  </div>
 )
}
