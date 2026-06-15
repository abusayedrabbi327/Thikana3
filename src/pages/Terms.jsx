import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Terms() {
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
       <h1 className="text-xl font-bold text-theme-text">Terms of Service</h1>
       <p className="text-xs text-theme-muted mt-0.5">Last updated: April 2026</p>
      </div>
     </div>

     <div className="bg-theme-card border border-theme-border rounded-2xl shadow-sm p-7 prose prose-sm dark:prose-invert max-w-none">

      <ProseSection title="1. Acceptance of Terms">
       By accessing or using Thikana, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.
      </ProseSection>

      <ProseSection title="2. Eligibility">
       You must be at least 18 years old and a resident of Bangladesh to use Thikana. By using the platform, you represent and warrant that you meet these requirements.
      </ProseSection>

      <ProseSection title="3. User Accounts">
       <ul>
        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        <li>You must provide accurate, current, and complete information during registration.</li>
        <li>You agree to notify us immediately of any unauthorized use of your account.</li>
        <li>Each user may only have one account.</li>
       </ul>
      </ProseSection>

      <ProseSection title="4. Listings and Content">
       <ul>
        <li>You are solely responsible for the accuracy and legality of any listing you post.</li>
        <li>Listings must be for real properties or goods you have the right to sell or rent.</li>
        <li>We reserve the right to remove any listing that violates these terms or applicable law.</li>
        <li>Fraudulent, misleading, or illegal listings are strictly prohibited.</li>
       </ul>
      </ProseSection>

      <ProseSection title="5. Prohibited Activities">
       You agree not to:
       <ul>
        <li>Post false or misleading information.</li>
        <li>Use the platform for any illegal purpose.</li>
        <li>Harass, threaten, or harm other users.</li>
        <li>Attempt to circumvent our security measures.</li>
        <li>Scrape or collect data from the platform without permission.</li>
       </ul>
      </ProseSection>

      <ProseSection title="6. NID Verification">
       Submitting false NID information is a violation of these terms and may result in permanent account suspension and legal action. NID data is used solely for identity verification and is kept confidential.
      </ProseSection>

      <ProseSection title="7. Limitation of Liability">
       Thikana is a marketplace platform and does not guarantee the quality, safety, or legality of listings. We are not responsible for any disputes between buyers and sellers. Use the platform at your own risk.
      </ProseSection>

      <ProseSection title="8. Termination">
       We reserve the right to suspend or terminate your account at any time for violations of these terms, with or without notice.
      </ProseSection>

      <ProseSection title="9. Changes to Terms">
       We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.
      </ProseSection>

      <ProseSection title="10. Contact">
       For questions about these terms, please contact us at <a href="mailto:support@thikana.com" className="text-theme-primary">support@thikana.com</a>.
      </ProseSection>
     </div>

     <p className="text-center text-xs text-theme-muted mt-4">
      <Link to="/privacy" className="text-theme-primary hover:underline">Privacy Policy</Link>
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
   <div className="text-sm text-theme-muted leading-relaxed space-y-2">{children}</div>
  </div>
 )
}
