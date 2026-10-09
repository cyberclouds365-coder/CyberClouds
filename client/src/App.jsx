import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronLeft, Cloud, Copy, Eye, EyeOff, Gift, KeyRound, Link2, LogOut, Mail, Menu, Monitor, Network, Plus, Save, Search, Shield, Star, Terminal, Trash2, UserRound, X } from 'lucide-react';
import { createSourceOutline, parseSourceText } from './sourceFormatting.js';
import { paymentSettings } from './paymentConfig.js';
import GoogleAd from './GoogleAd.jsx';


const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://cyberclouds-1.onrender.com' : 'http://localhost:3000')).replace(/\/+$/, '');

const sectionIcons = { os: Monitor, networking: Network, keycloak: KeyRound, commands: Terminal, aws: Cloud };
const legalContactEmail = 'cyberclouds365@gmail.com';

function PasswordField({ label, name, autoComplete, minLength, maxLength = 128, required = true, placeholder }) {
  const [visible, setVisible] = useState(false);
  return <label className="password-field-label">{label}<span className="password-input-wrap"><input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required={required} placeholder={placeholder} /><button className="password-visibility" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
}

function useAutoDismiss(message, clearMessage) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => clearMessage(''), 1000);
    return () => window.clearTimeout(timer);
  }, [message, clearMessage]);
}

function LegalPage({ kind, onNavigate, signedIn }) {
  const isPrivacy = kind === 'privacy';
  const sections = isPrivacy ? [
    { title: 'Information this service handles', paragraphs: [
      'When you create an account, CyberClouds stores your name and email address, a one-way password hash, your course access and payment status, and the time you accepted these terms.',
      'For account security and referrals, the service stores verification-code hashes and expiry times, referral codes and their registrations, sign-in counts, and hashes of session identifiers with their expiry and recent activity. The raw session cookie is not stored in the database.',
      'The API processes your IP address to apply sign-in and verification rate limits. Hosting and infrastructure providers may also process request and device metadata in their operational logs.',
    ] },
    { title: 'Why we use it', paragraphs: [
      'We use account details to create and protect your account, deliver verification and password-reset emails, provide course access, confirm payment status, operate the referral reward, respond to support requests, and protect the service from abuse.',
      'Passwords are hashed with bcrypt. Session identifiers and one-time codes are stored as hashes. Production traffic is served over HTTPS; database encryption at rest depends on the configured database provider.',
    ] },
    { title: 'Email, hosting, and other providers', paragraphs: [
      'Transactional email is sent through Brevo. The site and API may be hosted by Netlify and Render, with account data held in the configured PostgreSQL service. Google Fonts and Google AdSense are used on the public site; those providers may receive browser, device, and network information when their resources load.',
      'These providers process information to deliver their services under their own terms and privacy notices. CyberClouds does not sell account information.',
    ] },
    { title: 'Cookies and sessions', paragraphs: [
      'The sign-in cookie is necessary to keep you signed in. It is HttpOnly so page scripts cannot read it, Secure in production, and limited to the site/API session. It expires after eight hours; signing out or changing your password revokes the server-side session.',
      'Google AdSense may use cookies or similar technologies for advertising. You can manage cookies in your browser and use Google’s ad controls. Blocking the necessary sign-in cookie will prevent account sign-in from working.',
    ] },
    { title: 'Retention and your choices', paragraphs: [
      'Signup and password-reset codes expire after ten minutes and are single-use. Session records expire after eight hours. Account and referral records are kept while the account is active and for the time needed to operate the service, resolve disputes, and meet applicable obligations.',
      'You can ask to access, correct, or delete account information by contacting the address below. We may need to verify your identity first and may retain limited records where required for security or legal reasons.',
    ] },
  ] : [
    { title: 'Accounts and security', paragraphs: [
      'Give accurate account details, keep your password private, and tell us if you believe someone has accessed your account. You are responsible for activity carried out through your account until you report a compromise.',
      'You must not attempt to bypass access controls, disrupt the service, impersonate another person, or use the service unlawfully.',
    ] },
    { title: 'Course materials and access', paragraphs: [
      'CyberClouds provides technical notes, diagrams, and learning materials for personal learning. Access may depend on the account’s payment or referral-reward status. Do not copy, redistribute, or sell material unless you have the rights or permission to do so.',
      'The materials are educational and may contain errors or become outdated. Check important technical decisions against current primary documentation and your own environment.',
    ] },
    { title: 'Payments and referral rewards', paragraphs: [
      'Payment access is enabled after an administrator confirms the payment. The site records the account’s payment status; it does not itself promise that a bank or payment provider has completed a transaction.',
      'A referral reward can be claimed after two referred learner accounts have payments confirmed by an administrator. Referral rewards have no cash value and cannot be transferred. We may review or reverse rewards connected to abuse or invalid activity.',
    ] },
    { title: 'Availability and changes', paragraphs: [
      'We may update, suspend, or remove parts of the service to maintain security, fix issues, or improve the library. We will make reasonable efforts to keep account access available, but uninterrupted service cannot be guaranteed.',
      'These terms may change as the service changes. The date at the top of this page shows the latest revision. Continued use after an update means you accept the revised terms where applicable law permits.',
    ] },
    { title: 'Contact', paragraphs: [
      'Questions about these terms or account access can be sent to the CyberClouds support email below.',
    ] },
  ];

  return <main className="legal-page">
    <header className="legal-header">
      <button className="legal-brand" onClick={() => onNavigate('/')}><span className="brand-symbol cyber-logo-mark"><Cloud size={19} /><Shield size={10} /></span><span>cyberclouds</span></button>
      <nav aria-label="Legal pages"><button className={!isPrivacy ? 'active' : ''} onClick={() => onNavigate('/terms')}>Terms and Conditions</button><button className={isPrivacy ? 'active' : ''} onClick={() => onNavigate('/privacy')}>Privacy Policy</button></nav>
      <button className="legal-return" onClick={() => onNavigate(signedIn ? '/' : '/login')}>{signedIn ? 'Open library' : 'Sign in'} <span>→</span></button>
    </header>
    <section className="legal-hero"><span className="home-section-kicker">CYBERCLOUDS / {isPrivacy ? 'YOUR DATA' : 'SERVICE RULES'}</span><h1>{isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}<span>.</span></h1><p>Clear information about using CyberClouds and how the service handles your account.</p><small>Last updated October 8, 2026</small><a className="legal-hero-contact" href={`mailto:${legalContactEmail}`}>Questions? Contact {legalContactEmail}</a></section>
    <article className="legal-document">{sections.map((section, index) => <section key={section.title}><span className="legal-section-number">{String(index + 1).padStart(2, '0')}</span><div><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}<aside className="legal-contact"><span>QUESTIONS OR REQUESTS</span><a href={`mailto:${legalContactEmail}`}>{legalContactEmail}</a></aside></article>
    <footer className="legal-footer"><button onClick={() => onNavigate('/')}>← {signedIn ? 'Back to library' : 'Back to CyberClouds'}</button><span>CYBERCLOUDS / PRIVATE KNOWLEDGE</span><nav><button onClick={() => onNavigate('/terms')}>Terms and Conditions</button><button onClick={() => onNavigate('/privacy')}>Privacy Policy</button></nav></footer>
  </main>;
}

function SourceReader({ article }) {
  const blocks = parseSourceText(article.text);
  const outline = createSourceOutline(blocks);
  const renderedBlocks = [];
  let descriptions = [];

  const flushDescriptions = () => {
    if (!descriptions.length) return;
    const items = descriptions;
    descriptions = [];
    renderedBlocks.push(<ul className="source-bullets source-descriptions" key={`descriptions-${items[0].id}`}>
      {items.map((block) => <li key={block.id}><span className="bullet-marker" aria-hidden="true" /><span>{block.value}</span></li>)}
    </ul>);
  };

  blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      descriptions.push(block);
      return;
    }
    flushDescriptions();
    if (block.type === 'heading') {
      const Heading = block.level > 1 ? 'h3' : 'h2';
      const headingClass = block.level > 1 ? 'source-subheading' : 'source-heading';
      renderedBlocks.push(<Heading className={headingClass} id={block.id} key={block.id}>{block.value}</Heading>);
      return;
    }
    if (block.type === 'list') {
      renderedBlocks.push(<ul className="source-bullets" key={block.id}>{block.value.map((item, index) => <li key={`${block.id}-${index}`}><span className="bullet-marker" aria-hidden="true" /><span>{item.text}</span></li>)}</ul>);
      return;
    }
    if (block.type === 'commands') {
      renderedBlocks.push(<section className="source-command-card" aria-label="Command examples" key={block.id}>
        <div className="source-command-label"><Terminal size={13} /><span>COMMAND</span><span className="source-command-shell">SHELL</span></div>
        <pre className="source-command"><code>{block.value.split('\n').map((line, index) => {
          const comment = line.match(/^(.*?)(?:\s{2,}[-–—:]\s{1,})(.+)$/);
          return <span className="source-command-line" key={`${block.id}-${index}`}><span className="source-command-text">{comment ? comment[1].trimEnd() : line}</span>{comment && <span className="source-command-comment"><span aria-hidden="true"># </span>{comment[2]}</span>}</span>;
        })}</code></pre>
      </section>);
      return;
    }
    if (block.type === 'table') {
      const [headers, ...rows] = block.value;
      const items = rows.length
        ? rows.map((row) => row.map((cell, index) => `${headers[index] ? `${headers[index]}: ` : ''}${cell}`).join(' · '))
        : headers;
      renderedBlocks.push(<ul className="source-bullets source-table-list" key={block.id}>{items.map((item, index) => <li key={`${block.id}-${index}`}><span className="bullet-marker" aria-hidden="true" /><span>{item}</span></li>)}</ul>);
      return;
    }
    if (block.type === 'divider') {
      renderedBlocks.push(<hr className="source-divider" key={block.id} />);
      return;
    }
    renderedBlocks.push(<ul className="source-bullets source-descriptions" key={block.id}><li><span className="bullet-marker" aria-hidden="true" /><span>{block.value}</span></li></ul>);
  });
  flushDescriptions();

  return <div className="source-reading-layout">
    {outline.length > 3 && <aside className="source-outline"><details><summary>On this page <span>{outline.length} sections</span></summary><nav aria-label="Document sections">{outline.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}</nav></details></aside>}
    <div className="source-blocks">{renderedBlocks}</div>
    <div className="reading-end"><span>END OF SOURCE</span></div>
  </div>;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const fallback = response.status === 429
      ? 'Too many sign-in attempts. Please wait before trying again.'
      : response.status >= 500
        ? 'Service temporarily unavailable. Please try again later.'
        : `Request failed (${response.status})`;
    const error = new Error(response.status >= 500 ? fallback : (result.error || fallback));
    error.status = response.status;
    throw error;
  }
  return result;
}

async function copyTextToClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {}
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '-9999px';
  document.body.appendChild(field);
  let copied = false;
  try {
    field.focus();
    field.select();
    copied = typeof document.execCommand === 'function' && document.execCommand('copy');
  } finally {
    field.remove();
  }
  if (!copied) throw new Error('Clipboard access is unavailable. Select and copy the text manually.');
}

function App() {
  const [user, setUser] = useState(null);
  const [publicRoute, setPublicRoute] = useState(() => window.location.pathname);
  const [demo, setDemo] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [signupPendingEmail, setSignupPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetComplete, setResetComplete] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('os');
  const [activeDocument, setActiveDocument] = useState(null);
  const [article, setArticle] = useState(null);
  const [articleError, setArticleError] = useState('');
  const [contentBusy, setContentBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [profilePasswordError, setProfilePasswordError] = useState('');
  const [profilePasswordNotice, setProfilePasswordNotice] = useState('');
  const [users, setUsers] = useState([]);
  const [adminOverview, setAdminOverview] = useState({ totalUsers: 0, onlineUsers: 0, referralShares: 0, referralRegistrations: 0, referralLogins: 0, referralPurchases: 0 });
  const [adminReferralRows, setAdminReferralRows] = useState([]);
  const [adminTab, setAdminTab] = useState('content');
  const [adminSections, setAdminSections] = useState([]);
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [adminPreview, setAdminPreview] = useState(null);
  const [selectedAdminSection, setSelectedAdminSection] = useState('os');
  const [moduleName, setModuleName] = useState('');
  const [editingModuleName, setEditingModuleName] = useState('');
  const [documentEditor, setDocumentEditor] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [logoutFeedbackOpen, setLogoutFeedbackOpen] = useState(false);
  const [logoutRating, setLogoutRating] = useState(0);
  const [logoutFeedbackBusy, setLogoutFeedbackBusy] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [referralStats, setReferralStats] = useState(null);
  const [referralStatsLoading, setReferralStatsLoading] = useState(false);
  const [referralStatsError, setReferralStatsError] = useState('');
  const [referralNotice, setReferralNotice] = useState('');
  const [referralClaimBusy, setReferralClaimBusy] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState(() => new URLSearchParams(window.location.search).get('ref') || '');

  useAutoDismiss(authError, setAuthError);
  useAutoDismiss(authNotice, setAuthNotice);
  useAutoDismiss(articleError, setArticleError);
  useAutoDismiss(profileError, setProfileError);
  useAutoDismiss(profileNotice, setProfileNotice);
  useAutoDismiss(profilePasswordError, setProfilePasswordError);
  useAutoDismiss(profilePasswordNotice, setProfilePasswordNotice);
  useAutoDismiss(adminError, setAdminError);
  useAutoDismiss(adminNotice, setAdminNotice);
  useAutoDismiss(referralStatsError, setReferralStatsError);
  useAutoDismiss(referralNotice, setReferralNotice);

  useEffect(() => {
    const syncRoute = () => setPublicRoute(window.location.pathname);
    window.addEventListener('popstate', syncRoute);
    request('/api/health').then((result) => setDemo(result.database === 'demo-memory')).catch(() => {});
    request('/api/auth/me')
      .then(async (result) => {
        setUser(result.user);
        setDemo(result.demo);
        const content = await request('/api/content/sections');
        setSections(content.sections);
      })
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!authReady || user || publicRoute !== '/library') return;
    window.history.replaceState({}, '', '/login');
    setPublicRoute('/login');
  }, [authReady, user, publicRoute]);

  useEffect(() => {
    if (!resetCodeSent || resetCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setResetCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resetCodeSent, resetCooldown]);

  useEffect(() => {
    if (!user || user.role === 'admin') return undefined;
    const refreshAccount = async () => {
      try {
        const result = await request('/api/auth/me');
        setUser(result.user);
        if (profileOpen) {
          try {
            const referralResult = await request('/api/referrals/me');
            setReferralStats(referralResult.referral);
            setReferralStatsError('');
          } catch (error) {
            setReferralStatsError('Please try again.');
          }
        }
      } catch {}
    };
    const timer = window.setInterval(refreshAccount, 30000);
    window.addEventListener('focus', refreshAccount);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshAccount); };
  }, [user?.id, user?.role, profileOpen]);

  useEffect(() => {
    if (!user) return undefined;
    const heartbeat = () => {
      if (document.visibilityState === 'visible') request('/api/auth/heartbeat', { method: 'POST' }).catch(() => {});
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 20000);
    window.addEventListener('focus', heartbeat);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', heartbeat);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!adminOpen || adminTab !== 'users' || user?.role !== 'admin') return undefined;
    const refreshUsers = async () => {
      try {
        const result = await request('/api/admin/users');
        applyAdminUserData(result);
      } catch {}
    };
    refreshUsers();
    const timer = window.setInterval(refreshUsers, 15000);
    return () => window.clearInterval(timer);
  }, [adminOpen, adminTab, user?.id, user?.role]);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setPublicRoute(path);
    if (path === '/signup' || path === '/login') setAuthView(path === '/signup' ? 'signup' : 'login');
    setAuthError('');
    setAuthNotice('');
    if (path === '/signup' || path === '/login') setSignupPendingEmail('');
    if (path === '/forgot-password') {
      setResetEmail('');
      setResetCode('');
      setResetCodeSent(false);
      setResetCooldown(0);
      setResetComplete(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const signingUp = publicRoute === '/signup' || authView === 'signup';
    try {
      const result = await request(`/api/auth/${signingUp ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (signingUp) {
        setVerificationCode('');
        setSignupPendingEmail(result.email);
        setAuthNotice(`A verification code was sent to ${result.email}. It is valid for 10 minutes.`);
        return;
      }
      setUser(result.user);
      const content = await request('/api/content/sections');
      setSections(content.sections);
      setActiveSection('os');
      setActiveDocument(null);
      setArticle(null);
      setProfileOpen(false);
      window.history.replaceState({}, '', '/');
      setPublicRoute('/');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifySignup(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await request('/api/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupPendingEmail, code: verificationCode }),
      });
      setUser(result.user);
      const content = await request('/api/content/sections');
      setSections(content.sections);
      setActiveSection('os');
      setActiveDocument(null);
      setArticle(null);
      setProfileOpen(false);
      setSignupPendingEmail('');
      setVerificationCode('');
      window.history.replaceState({}, '', '/');
      setPublicRoute('/');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendSignupCode() {
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await request('/api/auth/resend-signup-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupPendingEmail }),
      });
      setVerificationCode('');
      setAuthNotice(`A new verification code was sent to ${result.email}.`);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim().toLowerCase();
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await request('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResetEmail(email);
      setResetCodeSent(true);
      setResetCooldown(60);
      setAuthNotice(result.message);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendPasswordResetCode() {
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await request('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetCode('');
      setResetCooldown(60);
      setAuthNotice(result.message);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function completePasswordReset(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    if (newPassword !== confirmPassword) {
      setAuthError('The passwords do not match.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await request('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
      });
      setResetComplete(true);
      setAuthNotice(result.message);
      setResetCode('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    setLogoutRating(0);
    setLogoutFeedbackBusy(false);
    setLogoutFeedbackOpen(true);
  }

  async function finishSignOut() {
    if (logoutRating < 1 || logoutFeedbackBusy) return;
    setLogoutFeedbackBusy(true);
    await request('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: logoutRating }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
    await request('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(5000) }).catch(() => {});
    setUser(null);
    setAdminOpen(false);
    setProfileOpen(false);
    setLogoutFeedbackOpen(false);
    setLogoutRating(0);
    setLogoutFeedbackBusy(false);
    setReferralStats(null);
    setReferralNotice('');
    setArticle(null);
    setActiveDocument(null);
    window.history.replaceState({}, '', '/');
    setPublicRoute('/');
  }

  async function loadReferralStats() {
    setReferralStatsLoading(true);
    setReferralStatsError('');
    try {
      const result = await request('/api/referrals/me', { signal: AbortSignal.timeout(12000) });
      setReferralStats(result.referral);
    } catch (error) {
      setReferralStats(null);
      setReferralStatsError('Please try again.');
    } finally {
      setReferralStatsLoading(false);
    }
  }

  async function claimReferralReward() {
    if (referralClaimBusy) return;
    setReferralClaimBusy(true);
    setReferralNotice('');
    try {
      const result = await request('/api/referrals/claim', { method: 'POST' });
      setUser(result.user);
      setReferralNotice(result.emailSent ? 'Done. Confirmation email sent, and all modules are unlocked.' : result.message);
      await loadReferralStats();
    } catch (error) {
      setReferralNotice(error.status === 404
        ? 'Reward claim API is not available on the server yet. Deploy the latest server, then try again.'
        : error.message);
    } finally {
      setReferralClaimBusy(false);
    }
  }

  async function openProfile() {
    setProfileOpen(true);
    setAdminOpen(false);
    setMobileOpen(false);
    setProfileError('');
    setProfileNotice('');
    setProfilePasswordError('');
    setProfilePasswordNotice('');
    setReferralNotice('');
    const accountRequest = request('/api/auth/me').then((result) => setUser(result.user)).catch(() => {});
    await Promise.all([loadReferralStats(), accountRequest]);
  }

  async function copyReferralCode() {
    const code = referralStats?.code || user?.referralCode;
    if (!code) {
      setReferralNotice('Your invite code is still loading. Try again in a moment.');
      return;
    }
    try {
      await copyTextToClipboard(code);
      setReferralNotice('Invite code copied. It counts when someone uses it to sign up.');
    } catch {
      setReferralNotice('Could not copy the invite code. Select it above and copy it manually.');
    }
  }

  async function copyReferralLink() {
    const code = referralStats?.code || user?.referralCode;
    if (!code) {
      setReferralNotice('Your invite code is still loading. Try again in a moment.');
      return;
    }
    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
    try {
      await copyTextToClipboard(link);
      setReferralNotice('Invite link copied. It counts when someone uses it to sign up.');
    } catch {
      setReferralNotice('Could not copy the invite link. Try copying it again.');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileError('');
    setProfileNotice('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await request('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name') }) });
      setUser(result.user);
      setProfileNotice('Profile updated.');
    } catch (error) { setProfileError(error.message); }
  }

  async function savePassword(event) {
    event.preventDefault();
    setProfilePasswordError('');
    setProfilePasswordNotice('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.currentPassword === values.newPassword) {
      setProfilePasswordError('New password must be different from your current password.');
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setProfilePasswordError('New passwords do not match.');
      return;
    }
    try {
      await request('/api/profile/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      form.reset();
      setProfilePasswordNotice('Password changed.');
    } catch (error) { setProfilePasswordError(error.message); }
  }

  async function chooseDocument(document) {
    setActiveDocument(document);
    setArticle(null);
    setArticleError('');
    if (document.kind === 'diagram') return;
    setContentBusy(true);
    try {
      const result = await request(`/api/content/${document.id}`);
      setArticle(result);
    } catch (error) {
      setArticleError(error.message);
    } finally {
      setContentBusy(false);
    }
  }

  function applyAdminUserData(result) {
    setUsers(result.users || []);
    setAdminOverview(result.overview || { totalUsers: 0, onlineUsers: 0, referralShares: 0, referralRegistrations: 0, referralLogins: 0, referralPurchases: 0 });
    setAdminReferralRows(result.referrals || []);
  }

  async function openAdmin() {
    setAdminOpen(true);
    setMobileOpen(false);
    setAdminError('');
    setAdminPreview(null);
    try {
      const [userResult, contentResult] = await Promise.all([request('/api/admin/users'), request('/api/admin/content')]);
      applyAdminUserData(userResult);
      setAdminSections(contentResult.sections);
      setAdminDocuments(contentResult.documents);
      setSelectedAdminSection((current) => contentResult.sections.some((section) => section.slug === current) ? current : contentResult.sections[0]?.slug || '');
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function refreshAdminContent() {
    const result = await request('/api/admin/content');
    setAdminSections(result.sections);
    setAdminDocuments(result.documents);
    setAdminPreview(null);
    setSelectedAdminSection((current) => result.sections.some((section) => section.slug === current) ? current : result.sections[0]?.slug || '');
  }

  async function createModule(event) {
    event.preventDefault();
    setAdminError('');
    try {
      const result = await request('/api/admin/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: moduleName }) });
      setModuleName('');
      setSelectedAdminSection(result.section.slug);
      await refreshAdminContent();
      const readerContent = await request('/api/content/sections');
      setSections(readerContent.sections);
    } catch (error) { setAdminError(error.message); }
  }

  async function saveModuleName(event) {
    event.preventDefault();
    setAdminError('');
    try {
      const result = await request(`/api/admin/sections/${selectedAdminSection}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingModuleName }) });
      setSelectedAdminSection(result.section.slug);
      setEditingModuleName('');
      await refreshAdminContent();
      const readerContent = await request('/api/content/sections');
      setSections(readerContent.sections);
    } catch (error) { setAdminError(error.message); }
  }

  async function removeModule() {
    if (!selectedAdminSection) return;
    setAdminError('');
    try {
      await request(`/api/admin/sections/${selectedAdminSection}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await refreshAdminContent();
      const readerContent = await request('/api/content/sections');
      setSections(readerContent.sections);
    } catch (error) { setAdminError(error.message); }
  }

  async function saveDocument(event) {
    event.preventDefault();
    setAdminError('');
    const isEditing = Boolean(documentEditor.id);
    try {
      const targetSection = documentEditor.sectionSlug || selectedAdminSection;
      const path = isEditing ? `/api/admin/documents/${documentEditor.id}` : `/api/admin/sections/${targetSection}/documents`;
      const result = await request(path, { method: isEditing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: documentEditor.title, sourceName: documentEditor.sourceName, kind: documentEditor.kind, content: documentEditor.content, sectionSlug: targetSection }) });
      setSelectedAdminSection(result.document.sectionSlug);
      setDocumentEditor(null);
      await refreshAdminContent();
      const readerContent = await request('/api/content/sections');
      setSections(readerContent.sections);
    } catch (error) { setAdminError(error.message); }
  }

  async function editDocument(document) {
    setAdminError('');
    setAdminPreview(null);
    try {
      const result = await request(`/api/admin/documents/${document.id}`);
      setDocumentEditor({ ...result.document });
    } catch (error) { setAdminError(error.message); }
  }

  async function removeDocument(document) {
    setAdminError('');
    try {
      await request(`/api/admin/documents/${document.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setDocumentEditor(null);
      await refreshAdminContent();
      const readerContent = await request('/api/content/sections');
      setSections(readerContent.sections);
    } catch (error) { setAdminError(error.message); }
  }

  async function saveUser(event) {
    event.preventDefault();
    setAdminError('');
    try {
      await request(`/api/admin/users/${editingUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingUser.name, email: editingUser.email }) });
      setEditingUser(null);
      const result = await request('/api/admin/users');
      applyAdminUserData(result);
    } catch (error) { setAdminError(error.message); }
  }

  async function createUser(event) {
    event.preventDefault();
    setAdminError('');
    const form = new FormData(event.currentTarget);
    try {
      await request('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      setCreateUserOpen(false);
      const result = await request('/api/admin/users');
      applyAdminUserData(result);
    } catch (error) { setAdminError(error.message); }
  }

  async function removeUser(account) {
    setAdminError('');
    try {
      await request(`/api/admin/users/${account.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      const result = await request('/api/admin/users');
      applyAdminUserData(result);
    } catch (error) { setAdminError(error.message); }
  }

  async function changeRole(account, role) {
    setAdminError('');
    try {
      await request(`/api/admin/users/${account.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const result = await request('/api/admin/users');
      applyAdminUserData(result);
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function changeActive(account, isActive) {
    setAdminError('');
    try {
      await request(`/api/admin/users/${account.id}/active`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
      const result = await request('/api/admin/users');
      applyAdminUserData(result);
    } catch (error) { setAdminError(error.message); }
  }

  async function changePayment(account) {
    setAdminError('');
    setAdminNotice('');
    try {
      const paymentResult = await request(`/api/admin/users/${account.id}/payment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentDone: true }) });
      if (!paymentResult.emailSent && !paymentResult.emailAlreadySent) {
        throw new Error('Payment changed, but the server did not confirm the payment email. Deploy the latest server code and check its mail settings.');
      }
      const usersResult = await request('/api/admin/users');
      applyAdminUserData(usersResult);
      const paymentNotice = paymentResult.emailSent
        ? `Payment marked Done and confirmation email sent to ${account.email}.`
        : `Payment is already Done and its confirmation email was already sent to ${account.email}.`;
      const referralNotice = paymentResult.referralRewardGrantedTo ? ` ${paymentResult.referralRewardGrantedTo.name} is now eligible to claim the referral reward.` : '';
      setAdminNotice(`${paymentNotice}${referralNotice}`);
    } catch (error) {
      setAdminError(error.message);
      try { applyAdminUserData(await request('/api/admin/users')); } catch {}
    }
  }

  if (!authReady) return <main className="boot-screen"><span className="boot-mark"><BookOpen size={21} /></span><span>Loading library</span></main>;

  if (publicRoute === '/privacy' || publicRoute === '/terms') {
    return <LegalPage kind={publicRoute === '/privacy' ? 'privacy' : 'terms'} onNavigate={navigate} signedIn={Boolean(user)} />;
  }

  if (!user) {
    if (publicRoute === '/login' || publicRoute === '/signup' || publicRoute === '/library' || publicRoute === '/forgot-password') {
      const signingUp = publicRoute === '/signup';
      const forgettingPassword = publicRoute === '/forgot-password';
      return <main className="auth-shell cyber-auth-shell">
        <section className="auth-art" aria-label="CyberClouds security cloud">
          <a className="auth-brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}><span className="brand-symbol cyber-logo-mark"><Cloud size={21} /><Shield size={11} /></span><span>cyberclouds</span></a>
          <div className="auth-art-copy"><span className="auth-eyebrow">CYBERCLOUDS / PRIVATE LIBRARY</span><h1>One sky.<br /><em>Every system.</em></h1><p>Sign in to your curated world of operating systems, cloud knowledge, network diagrams, and field notes.</p></div>
          <div className="auth-art-bottom"><span>SECURE ACCESS</span><span>YOUR NOTES</span><span>ALWAYS CONNECTED</span></div>
        </section>
        <section className="auth-panel">
          <div className="auth-mobile-brand"><span className="brand-symbol cyber-logo-mark"><Cloud size={18} /><Shield size={10} /></span>cyberclouds</div>
          <a className="auth-back-link" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>← Home</a>
          <div className="auth-form-wrap">
            {!forgettingPassword && <div className="auth-switch"><button className={!signingUp ? 'auth-tab active' : 'auth-tab'} onClick={() => navigate('/login')}>Sign in</button><button className={signingUp ? 'auth-tab active' : 'auth-tab'} onClick={() => navigate('/signup')}>Create account</button></div>}
            <div className="auth-heading"><span className="section-kicker">CYBERCLOUDS / {forgettingPassword ? 'ACCOUNT RECOVERY' : 'ACCESS'}</span><h2>{forgettingPassword ? resetComplete ? 'Password updated.' : resetCodeSent ? 'Check your inbox.' : 'Reset your password.' : signingUp ? signupPendingEmail ? 'Check your inbox.' : 'Join the cloud.' : 'Welcome back.'}</h2><p>{forgettingPassword ? resetComplete ? 'Your password has been changed. Sign in with the new password.' : resetCodeSent ? `A verification code was sent to ${resetEmail}.` : 'Enter the email address on your account and we’ll send a one-time verification code.' : signingUp ? signupPendingEmail ? `Enter the 6-digit code sent to ${signupPendingEmail}.` : 'Create your secure reader account.' : 'Sign in to open your knowledge library.'}</p></div>
            {forgettingPassword ? resetComplete ? <div className="auth-form">{authNotice && <div className="success-alert" role="status">{authNotice}</div>}<button type="button" className="primary-button" onClick={() => navigate('/login')}>Back to sign in<span>→</span></button></div> : resetCodeSent ? <form key="password-reset" className="auth-form" onSubmit={completePasswordReset}>
              <label>Email address<input type="email" autoComplete="email" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} /></label>
              <label>Verification code<input name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength="6" maxLength="6" required spellCheck={false} autoCapitalize="off" value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} onPaste={(event) => { event.preventDefault(); setResetCode(event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)); }} placeholder="6-digit code" /></label>
              <PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={8} placeholder="Create a strong password" />
              <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={8} placeholder="Enter it again" />
              <p className="password-rule">Use 8+ characters with uppercase, lowercase, a number, and a symbol. The code expires in 10 minutes.</p>
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              {authNotice && <div className="success-alert" role="status">{authNotice}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : 'Verify code and change password'}<span>→</span></button>
              <button type="button" className="quiet-button" disabled={authBusy || resetCooldown > 0} onClick={resendPasswordResetCode}>{resetCooldown > 0 ? `Send a new code in ${resetCooldown}s` : 'Send a new verification code'}</button>
              <button type="button" className="quiet-button" disabled={authBusy} onClick={() => { setResetCodeSent(false); setResetCode(''); setAuthError(''); setAuthNotice(''); }}>Use a different email</button>
            </form> : <form key="forgot-password" className="auth-form" onSubmit={requestPasswordReset}>
              <label>Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="name@example.com" /></label>
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : 'Send verification code'}<span>→</span></button>
            </form> : signingUp && signupPendingEmail ? <form key="signup-verification" className="auth-form" onSubmit={verifySignup}>
              <label>Verification code<input name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength="6" maxLength="6" required spellCheck={false} autoCapitalize="off" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} onPaste={(event) => { event.preventDefault(); setVerificationCode(event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)); }} placeholder="6-digit code" /></label>
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              {authNotice && <div className="success-alert" role="status">{authNotice}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : 'Verify email and create account'}<span>→</span></button>
              <button type="button" className="quiet-button" disabled={authBusy} onClick={resendSignupCode}>Resend verification code</button>
              <button type="button" className="quiet-button" disabled={authBusy} onClick={() => { setSignupPendingEmail(''); setVerificationCode(''); setAuthError(''); setAuthNotice(''); }}>Use a different email</button>
            </form> : <form className="auth-form" onSubmit={handleAuth}>
              {signingUp && <label>Full name<input name="name" type="text" autoComplete="name" minLength="2" maxLength="100" required placeholder="Your name" /></label>}
              <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></label>
              {signingUp && <label>Referral code (optional)<input name="referralCode" type="text" autoComplete="off" value={referralCodeInput} onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 10))} placeholder="Enter a friend's code" /></label>}
              <PasswordField label="Password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} placeholder={signingUp ? 'Create a strong password' : 'Your password'} />
              {signingUp && <p className="password-rule">Use 8+ characters with uppercase, lowercase, a number, and a symbol.</p>}
              {signingUp && <label className="auth-legal-consent"><input type="checkbox" name="termsAccepted" value="true" required /><span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span></label>}
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              {authNotice && <div className="success-alert" role="status">{authNotice}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : signingUp ? 'Send verification code' : 'Sign in'}<span>→</span></button>
            </form>}
            {forgettingPassword ? !resetComplete && <button type="button" className="auth-forgot-link" onClick={() => navigate('/login')}>← Back to sign in</button> : signingUp ? <p className="role-note"><Shield size={14} /> Verify your email to activate the account. Refer two learners and claim your reward after both payments are confirmed.</p> : <><button type="button" className="auth-forgot-link" onClick={() => navigate('/forgot-password')}>Forgot password?</button><p className="demo-note">{demo ? 'Local preview only: accounts use temporary in-memory storage.' : 'Sign in with your CyberClouds account.'}</p></>}
          </div>
          <div className="auth-footer"><span>CYBERCLOUDS / PRIVATE ACCESS</span><nav><button type="button" onClick={() => navigate('/privacy')}>Privacy</button><button type="button" onClick={() => navigate('/terms')}>Terms</button></nav></div>
        </section>
      </main>;
    }

    return <main className="public-home">
      <header className="home-nav"><a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}><span className="brand-symbol cyber-logo-mark"><Cloud size={20} /><Shield size={10} /></span><span>cyberclouds</span></a><nav><a href="#library-preview">Explore</a><a href="#about-clouds">About</a></nav><div className="home-auth-actions"><button className="home-signin" onClick={() => navigate('/login')}>Sign in</button><button className="home-join" onClick={() => navigate('/signup')}>Join CyberClouds <span>→</span></button></div></header>
      <section className="home-hero"><div className="home-hero-copy"><div className="home-eyebrow"><span />YOUR SYSTEMS, IN ONE PLACE</div><h1>Make sense of<br />the <em>cloud around you.</em></h1><p>A personal knowledge base for the tools, networks, hardware, and cloud systems you work with every day.</p><div className="home-hero-actions"><button className="home-join large" onClick={() => navigate('/signup')}>Open your workspace <span>→</span></button><button className="home-text-link" onClick={() => navigate('/login')}>I already have an account <span>↗</span></button></div><div className="hero-assurance"><Shield size={15} /><span>Private accounts · Reader access by default</span></div></div><div className="cloud-visual" aria-hidden="true"><div className="cloud-ring ring-one" /><div className="cloud-ring ring-two" /><div className="cloud-core"><Cloud size={51} strokeWidth={1.25} /><span>CC</span></div><div className="cloud-node node-os"><Monitor size={16} /><span>OS</span></div><div className="cloud-node node-network"><Network size={16} /><span>NETWORK</span></div><div className="cloud-node node-key"><KeyRound size={16} /><span>IDENTITY</span></div><div className="cloud-node node-aws"><Cloud size={16} /><span>CLOUD</span></div><div className="cloud-orbit orbit-dot-one" /><div className="cloud-orbit orbit-dot-two" /></div><div className="hero-bottom-label"><span>01 / YOUR KNOWLEDGE, CONNECTED</span><span>SCROLL TO EXPLORE ↓</span></div></section>
     <GoogleAd slotId="5649539153" />
      <section className="home-library-preview" id="library-preview"><div className="home-section-heading"><div><span className="home-section-kicker">THE CYBERCLOUDS LIBRARY</span><h2>Everything has<br />its own place<span>.</span></h2></div><p>Explore practical notes and diagrams across the systems you use. New accounts start with one module; pay for full access or refer two learners, then claim a free reward after both payments are confirmed.</p></div><div className="home-topic-grid">{[{ icon: Monitor, num: '01', title: 'Operating systems', desc: 'Linux, Windows, processes, storage, and the hardware beneath.' }, { icon: Network, num: '02', title: 'Networking + hardware', desc: 'Protocols, switches, office topology, components, and diagrams.' }, { icon: KeyRound, num: '03', title: 'Identity + Keycloak', desc: 'SSO, federation, authentication, and access control notes.' }, { icon: Terminal, num: '04', title: 'Commands', desc: 'A searchable field guide to your everyday terminal toolkit.' }, { icon: Cloud, num: '05', title: 'AWS + cloud', desc: 'Cloud concepts, services, and your AWS learning notes.' }].map(({ icon: Icon, num, title, desc }) => <article className="home-topic" key={num}><span className="topic-top"><span>{num}</span><Icon size={19} /></span><h3>{title}</h3><p>{desc}</p></article>)}</div></section><section className="home-about" id="about-clouds"><div className="about-signal"><span className="signal-line" /><span>BUILT AROUND YOUR NOTES</span></div><div><h2>Your learning,<br /><em>not lost in tabs.</em></h2><p>CyberClouds brings your technical notes and original diagrams into a calm, structured space. Sign up as a reader, find what you need, and keep building your own understanding.</p><button className="home-text-link" onClick={() => navigate('/signup')}>Get started with CyberClouds <span>→</span></button></div><div className="about-stats"><div><strong>05</strong><span>TOPIC AREAS</span></div><div><strong>01</strong><span>CONNECTED LIBRARY</span></div><div><strong>∞</strong><span>ROOM TO LEARN</span></div></div></section><footer className="home-footer"><a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}><span className="brand-symbol cyber-logo-mark"><Cloud size={18} /><Shield size={9} /></span><span>cyberclouds</span></a><span>PRIVATE KNOWLEDGE / CONNECTED SYSTEMS</span><nav><button onClick={() => navigate('/privacy')}>Privacy</button><button onClick={() => navigate('/terms')}>Terms</button><button onClick={() => navigate('/login')}>Sign in <span>↗</span></button></nav></footer>
    
   
    </main>;
  }

  const currentSection = sections.find((section) => section.slug === activeSection) || sections[0];
  const currentDocuments = currentSection?.documents || [];
  const currentModuleIndex = Math.max(0, sections.findIndex((section) => section.slug === activeSection));
  const fullAccess = Boolean(user.hasFullAccess ?? (user.role === 'admin' || user.paymentDone || user.referralRewarded));
  const referralRewardGranted = Boolean(user.referralRewarded || referralStats?.rewardUnlocked);
  const referralRewardReady = Number(referralStats?.purchases || 0) >= 2 && !referralRewardGranted;
  const filteredUsers = users.filter((account) => `${account.name} ${account.email} ${account.role} ${account.paymentDone ? 'paid' : 'pending'} ${account.referralRewarded ? 'referral free unlocked' : ''}`.toLowerCase().includes(adminUserSearch.trim().toLowerCase()));
  const selectedSection = adminSections.find((section) => section.slug === selectedAdminSection);
  const selectedSectionDocuments = adminDocuments.filter((document) => document.sectionSlug === selectedAdminSection);

  function openModule(index) {
    if (index < 0 || index >= sections.length) return;
    if (!fullAccess && index > 0) {
      setPaymentOpen(true);
      return;
    }
    setActiveSection(sections[index].slug);
    setActiveDocument(null);
    setArticle(null);
    setArticleError('');
    setAdminOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
    document.getElementById('library')?.scrollTo({ top: 0 });
  }

  return <div className="library-app">
    <aside className={`library-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <a className="library-brand cyber-brand" href="#library"><span className="brand-symbol cyber-logo-mark"><Cloud size={19} /><Shield size={10} /></span><span>cyberclouds</span></a>
      <div className="sidebar-caption">KNOWLEDGE BASE</div>
      <nav className="source-navigation" aria-label="Knowledge sections">
        {sections.map((section, index) => {
          const Icon = sectionIcons[section.slug] || BookOpen;
          const locked = !fullAccess && index > 0;
          return <button key={section.slug} disabled={locked} title={locked ? 'Pay for access or earn the course through referrals' : undefined} className={`source-nav-item ${activeSection === section.slug && !adminOpen && !profileOpen ? 'current' : ''} ${locked ? 'module-locked' : ''}`} onClick={() => { setActiveSection(section.slug); setActiveDocument(null); setArticle(null); setAdminOpen(false); setProfileOpen(false); setMobileOpen(false); }}><Icon size={17} /><span>{section.name}</span><small>0{index + 1}</small></button>;
        })}
      </nav>
      {!fullAccess && <button className="payment-access-note" onClick={() => setPaymentOpen(true)}>One module is open. Pay for full access or refer two learners, then claim your reward after both payments are confirmed.</button>}
      <div className="sidebar-account">
        <div className="role-pill"><span className={`role-dot ${user.role}`} />{user.role === 'admin' ? 'Administrator' : 'Reader'}{demo && <span className="demo-pill">DEMO</span>}</div>
        <div className="account-row"><div className="account-avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="account-copy"><strong>{user.name}</strong><span>{user.email}</span></div></div>
        <button className={`admin-link profile-link ${profileOpen ? 'current' : ''}`} onClick={openProfile}><UserRound size={15} />My profile<span>→</span></button>
        {user.role === 'admin' && <button className={`admin-link ${adminOpen ? 'current' : ''}`} onClick={openAdmin}><Shield size={15} />Admin panel<span>→</span></button>}
        <button className="signout-button" onClick={signOut}><LogOut size={15} />Sign out</button>
      </div>
    </aside>

    {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="library-main" id="library">
      <header className="library-topbar"><button className="mobile-nav-button" onClick={() => setMobileOpen(true)} aria-label="Open sections"><Menu size={19} /></button></header>
      {adminOpen ? <section className="admin-view">
        <div className="page-kicker">CONTROL ROOM / ADMINISTRATOR</div><h1>Manage the library<span>.</span></h1><p className="page-intro">Edit the reading collection and manage who can access it.</p>
        <div className="admin-tabs" role="tablist" aria-label="Admin management areas"><button role="tab" aria-selected={adminTab === 'content'} className={adminTab === 'content' ? 'active' : ''} onClick={() => { setAdminTab('content'); setAdminError(''); }}>Modules & content <span>{adminSections.length}</span></button><button role="tab" aria-selected={adminTab === 'users'} className={adminTab === 'users' ? 'active' : ''} onClick={() => { setAdminTab('users'); setAdminError(''); }}>Users <span>{users.length}</span></button></div>
        {adminError && <div className="form-alert admin-alert" role="alert">{adminError}</div>}{adminTab === 'users' && adminNotice && <div className="success-alert admin-alert" role="status">{adminNotice}</div>}
        {adminTab === 'content' ? <div className="content-manager">
          <aside className="module-manager"><div className="manager-overline">MODULES</div>{adminSections.map((section) => <button key={section.slug} className={selectedAdminSection === section.slug ? 'selected' : ''} onClick={() => { setSelectedAdminSection(section.slug); setAdminPreview(null); setDocumentEditor(null); setEditingModuleName(''); setDeleteTarget(null); }}><span>{section.name}</span><small>{section.documents.length.toString().padStart(2, '0')}</small></button>)}<form className="add-module-form" onSubmit={createModule}><label htmlFor="module-name">Add module</label><div><input id="module-name" value={moduleName} maxLength="80" onChange={(event) => setModuleName(event.target.value)} placeholder="Module name" required /><button aria-label="Create module"><Plus size={16} /></button></div></form></aside>
          <div className="module-workspace">{selectedSection ? <>
            <div className="module-workspace-head"><div><div className="section-kicker">MODULE / {selectedSectionDocuments.length.toString().padStart(2, '0')} ITEMS</div><h2>{selectedSection.name}</h2></div><div className="module-actions"><button className="quiet-button" onClick={() => { setEditingModuleName(selectedSection.name); setDeleteTarget(null); }}>Rename</button><button className="danger-button" onClick={() => setDeleteTarget({ kind: 'section', item: selectedSection })}><Trash2 size={14} />Delete module</button></div></div>
            {editingModuleName && <form className="rename-module-form" onSubmit={saveModuleName}><input autoFocus value={editingModuleName} onChange={(event) => setEditingModuleName(event.target.value)} aria-label="Module name" maxLength="80" required /><button className="primary-small"><Save size={14} />Save name</button><button type="button" className="quiet-button" onClick={() => setEditingModuleName('')}>Cancel</button></form>}
            {deleteTarget?.kind === 'section' && <div className="delete-confirm"><span>Delete <strong>{selectedSection.name}</strong> and all its content?</span><div><button className="danger-button" onClick={removeModule}>Delete module</button><button className="quiet-button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></div>}
            <div className="managed-items-heading"><span>CONTENT IN THIS MODULE</span><button className="primary-small" onClick={() => { setDeleteTarget(null); setDocumentEditor({ title: '', sourceName: '', kind: 'document', content: '', sectionSlug: selectedAdminSection }); }}><Plus size={14} />Add content</button></div>
            {!documentEditor ? <div className="managed-document-list">{selectedSectionDocuments.map((document) => <div className="managed-document" key={document.id}><span className={`managed-document-icon ${document.kind}`}>{document.kind === 'diagram' ? <Network size={16} /> : <BookOpen size={16} />}</span><span className="managed-document-copy"><strong>{document.title}</strong><small>{document.sourceName || 'Untitled source'} · {document.kind === 'diagram' ? 'Diagram' : 'Text content'}</small></span><button className="quiet-button" onClick={() => setAdminPreview(document)}><Eye size={13} />View</button><button className="quiet-button" onClick={() => editDocument(document)}>Edit</button><button className="icon-danger" aria-label={`Delete ${document.title}`} onClick={() => { setAdminPreview(null); setDeleteTarget({ kind: 'document', item: document }); }}><Trash2 size={15} /></button></div>)}{selectedSectionDocuments.length === 0 && <div className="manager-empty">No content in this module yet.</div>}</div> : <form className="content-editor" onSubmit={saveDocument}><div className="editor-heading"><div><div className="section-kicker">{documentEditor.id ? 'EDIT SOURCE' : 'NEW SOURCE'}</div><h3>{documentEditor.title || 'New content'}</h3></div><button type="button" className="icon-close" aria-label="Close editor" onClick={() => setDocumentEditor(null)}><X size={17} /></button></div><div className="editor-fields"><label>Display title<input autoFocus value={documentEditor.title} maxLength="180" required onChange={(event) => setDocumentEditor({ ...documentEditor, title: event.target.value })} placeholder="Give this source a clear title" /></label><label>Module<select value={documentEditor.sectionSlug || selectedAdminSection} onChange={(event) => setDocumentEditor({ ...documentEditor, sectionSlug: event.target.value })}>{adminSections.map((section) => <option key={section.slug} value={section.slug}>{section.name}</option>)}</select></label><div className="editor-field-row"><label>Source label<input value={documentEditor.sourceName || ''} maxLength="180" onChange={(event) => setDocumentEditor({ ...documentEditor, sourceName: event.target.value })} placeholder="e.g. notes.txt" /></label><label>Content type<select value={documentEditor.kind} onChange={(event) => setDocumentEditor({ ...documentEditor, kind: event.target.value })}><option value="document">Text / notes</option><option value="diagram">SVG diagram</option></select></label></div><label>Full content<textarea className="content-editor-text" value={documentEditor.content || ''} maxLength={4000000} required onChange={(event) => setDocumentEditor({ ...documentEditor, content: event.target.value })} placeholder={documentEditor.kind === 'diagram' ? 'Paste SVG markup' : '# Topic\n## Subtopic\nDescription or 1. list item'} /></label>{documentEditor.kind === 'document' && <div className="editor-hint">Use <code># Topic</code> and <code>## Subtopic</code>. Each content point displays as a bullet; commands appear in highlighted terminal cells, with explanations styled as comments.</div>}<div className="editor-actions"><span>{(documentEditor.content || '').length.toLocaleString()} characters</span><button type="button" className="quiet-button" onClick={() => setDocumentEditor(null)}>Cancel</button><button className="primary-small"><Save size={14} />Save content</button></div></div></form>}
            {adminPreview && !documentEditor && <section className="admin-content-preview"><div className="admin-content-preview-head"><div><span className="section-kicker">CONTENT PREVIEW</span><h3>{adminPreview.title}</h3></div><button type="button" className="icon-close" onClick={() => setAdminPreview(null)} aria-label="Close content preview"><X size={17} /></button></div>{adminPreview.kind === 'diagram' ? <div className="admin-diagram-preview"><img src={`${API_URL}/api/content/${adminPreview.id}`} alt={adminPreview.title} /></div> : <SourceReader article={{ text: adminPreview.content || '' }} />}</section>}
            {deleteTarget?.kind === 'document' && <div className="delete-confirm"><span>Delete <strong>{deleteTarget.item.title}</strong> permanently?</span><div><button className="danger-button" onClick={() => removeDocument(deleteTarget.item)}>Delete content</button><button className="quiet-button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></div>}
          </> : <div className="manager-empty">Add a module to start your library.</div>}</div>
        </div> : <div className="user-management"><div className="admin-referral-overview"><div className="admin-overview-heading"><div><span className="section-kicker">COMMUNITY / REFERRALS</span><h2>Growth and live activity</h2></div><span className="online-indicator"><i />{adminOverview.onlineUsers} online now</span></div><p className="admin-overview-note">Online means an active session with a heartbeat in the last 5 minutes. Referral code uses count when a learner starts signup with a valid code; copying does not count. Verification signs learners in automatically; sign-ins below count later login-page visits.</p><div className="admin-overview-cards"><div><strong>{adminOverview.totalUsers}</strong><span>learner accounts</span></div><div><strong>{adminOverview.referralShares}</strong><span>referral code uses</span></div><div><strong>{adminOverview.referralRegistrations}</strong><span>verified referrals</span></div><div><strong>{adminOverview.referralLogins}</strong><span>referred learners signed in again</span></div><div><strong>{adminOverview.referralPurchases}</strong><span>confirmed purchases</span></div></div>{adminReferralRows.length > 0 && <div className="admin-referral-table-wrap"><div className="admin-referral-title">REFERRAL ACTIVITY BY INVITER</div><table className="admin-referral-table"><thead><tr><th>INVITER</th><th>CODE USES</th><th>REGISTERED</th><th>RETURN LOGINS</th><th>BOUGHT</th><th>REWARD</th></tr></thead><tbody>{adminReferralRows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.email}</small></td><td>{row.shares}</td><td>{row.registrations}</td><td>{row.logins}</td><td>{row.purchases} / 2</td><td>{row.referralRewarded ? <span className="referral-reward-status">Done</span> : row.purchases >= 2 ? <span className="referral-reward-status">Ready to claim</span> : 'In progress'}</td></tr>)}</tbody></table></div>}</div><div className="user-management-head"><p>Click Pending to mark payment Done and send its confirmation email automatically. Done payments cannot be reverted.</p><button className="primary-small" onClick={() => setCreateUserOpen((open) => !open)}><Plus size={14} />Add user</button></div>{createUserOpen && <form className="user-editor create-user-editor" onSubmit={createUser}><div className="editor-heading"><div><div className="section-kicker">NEW ACCOUNT / READER</div><h3>Passwords are stored as secure hashes.</h3></div><button type="button" className="icon-close" onClick={() => setCreateUserOpen(false)} aria-label="Close new user form"><X size={17} /></button></div><div className="editor-field-row"><label>Name<input name="name" autoComplete="name" minLength="2" maxLength="100" required placeholder="Full name" /></label><label>Email<input name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></label><label>Temporary password<input name="password" type="password" minLength="8" maxLength="128" required placeholder="Create a strong password" /></label></div><div className="editor-actions"><button type="button" className="quiet-button" onClick={() => setCreateUserOpen(false)}>Cancel</button><button className="primary-small"><Plus size={14} />Create reader</button></div></form>}<div className="user-search-row"><div><span className="section-kicker">USER DIRECTORY</span><strong>{filteredUsers.length ? `${filteredUsers.length} accounts` : 'No matching accounts'}</strong></div><label className="admin-user-search"><Search size={16} /><input type="search" value={adminUserSearch} onChange={(event) => setAdminUserSearch(event.target.value)} placeholder="Search name, email, role..." aria-label="Search users" /></label></div><div className="user-table-wrap"><table className="user-table"><thead><tr><th>ACCOUNT</th><th>EMAIL</th><th>ROLE</th><th>ACCESS</th><th>PAYMENT</th><th>STATUS</th><th>MANAGE</th></tr></thead><tbody>{filteredUsers.map((account) => <tr key={account.id}><td><div className="account-name-presence"><strong>{account.name}</strong><span className={`user-presence ${account.isOnline ? 'online' : 'offline'}`}><i />{account.isOnline ? 'Online' : 'Offline'}</span></div>{account.referralRewarded && <small className="user-referral-tag">DONE</small>}</td><td>{account.email}</td><td><span className={`table-role ${account.role}`}>{account.role}</span></td><td><select aria-label={`Role for ${account.email}`} value={account.role} disabled={String(account.id) === String(user.id)} onChange={(event) => changeRole(account, event.target.value)}><option value="user">Reader</option><option value="admin">Admin</option></select></td><td>{account.referralRewarded ? <span className="account-status-toggle enabled">Done</span> : <button className={`account-status-toggle ${account.paymentDone ? 'enabled' : 'disabled'}`} disabled={account.role === 'admin' || (account.paymentDone && account.paymentConfirmationEmailSent)} title={account.paymentDone && !account.paymentConfirmationEmailSent ? 'Payment is Done; click to retry the confirmation email.' : account.paymentDone ? 'Payment is confirmed and cannot be reverted.' : 'Confirm payment and send its email.'} onClick={() => changePayment(account)}>{account.paymentDone ? 'Done' : 'Pending'}</button>}</td><td><button className={`account-status-toggle ${account.isActive ? 'enabled' : 'disabled'}`} disabled={String(account.id) === String(user.id)} onClick={() => changeActive(account, !account.isActive)}>{account.isActive ? 'Active' : 'Inactive'}</button></td><td><div className="user-actions"><button className="quiet-button" disabled={String(account.id) === String(user.id)} onClick={() => setEditingUser({ id: account.id, name: account.name, email: account.email })}>Edit</button><button className="icon-danger" disabled={String(account.id) === String(user.id)} aria-label={`Delete ${account.email}`} onClick={() => setDeleteTarget({ kind: 'user', item: account })}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>{editingUser && <form className="user-editor" onSubmit={saveUser}><div className="editor-heading"><div><div className="section-kicker">EDIT ACCOUNT</div><h3>{editingUser.email}</h3></div><button type="button" className="icon-close" onClick={() => setEditingUser(null)} aria-label="Close account editor"><X size={17} /></button></div><div className="editor-field-row"><label>Name<input value={editingUser.name} required onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} /></label><label>Email<input type="email" value={editingUser.email} required onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} /></label></div><div className="editor-actions"><button type="button" className="quiet-button" onClick={() => setEditingUser(null)}>Cancel</button><button className="primary-small"><Save size={14} />Save account</button></div></form>}{deleteTarget?.kind === 'user' && <div className="delete-confirm"><span>Delete account <strong>{deleteTarget.item.email}</strong>?</span><div><button className="danger-button" onClick={() => removeUser(deleteTarget.item)}>Delete user</button><button className="quiet-button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></div>}</div>}
      </section> : profileOpen ? <section className="profile-view"><div className="page-kicker">ACCOUNT / PERSONAL SETTINGS</div><h1>My profile<span>.</span></h1><p className="page-intro">Manage your name and password, and check your account access.</p><div className="profile-panels"><form className="profile-panel" onSubmit={saveProfile}><div className="profile-panel-head"><span className="profile-panel-icon"><UserRound size={18} /></span><div><h2>Account details</h2><p>Your email is fixed. You can update your display name.</p></div></div><label>Name<input name="name" minLength="2" maxLength="100" required defaultValue={user.name} /></label><label>Email address<input type="email" value={user.email} readOnly aria-readonly="true" /></label>{profileError && <div className="form-alert" role="alert">{profileError}</div>}{profileNotice && <div className="success-alert" role="status">{profileNotice}</div>}<button className="primary-small"><Save size={14} />Save name</button></form><form className="profile-panel" onSubmit={savePassword}><div className="profile-panel-head"><span className="profile-panel-icon"><KeyRound size={18} /></span><div><h2>Change password</h2><p>Confirm your current password before setting a new one.</p></div></div><PasswordField label="Current password" name="currentPassword" autoComplete="current-password" /><PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={8} placeholder="Create a strong password" /><PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={8} /><p className="password-rule">8+ characters with uppercase, lowercase, a number, and a special character.</p>{profilePasswordError && <div className="form-alert" role="alert">{profilePasswordError}</div>}{profilePasswordNotice && <div className="success-alert" role="status">{profilePasswordNotice}</div>}<button className="primary-small"><Save size={14} />Update password</button></form><section className="profile-panel profile-access-panel"><div className="profile-panel-head"><span className="profile-panel-icon"><Shield size={18} /></span><div><h2>Payment &amp; module access</h2><p>Your current payment and library access status.</p></div></div><div className="profile-status-grid"><div className="profile-status-item"><span>Payment status</span><strong className={fullAccess ? 'status-paid' : 'status-pending'}>{user.role === 'admin' ? 'Admin account' : user.referralRewarded ? 'Done' : user.paymentDone ? 'Payment complete' : 'Payment pending'}</strong></div><div className="profile-status-item"><span>Module access</span><strong className={fullAccess ? 'status-paid' : 'status-pending'}>{fullAccess ? 'All modules unlocked' : 'One module available'}</strong></div><div className="profile-status-item"><span>Account status</span><strong className={user.isActive ? 'status-paid' : 'status-pending'}>{user.isActive ? 'Active' : 'Inactive'}</strong></div></div>{user.role !== 'admin' && !fullAccess && <button className="profile-payment-link" onClick={() => setPaymentOpen(true)}>View payment instructions</button>}</section>{user.role === 'user' && <section className="profile-panel referral-panel"><div className="profile-panel-head"><span className="profile-panel-icon referral-icon"><Gift size={18} /></span><div><h2>Share the course, earn it free</h2><p>Refer two learners. When both payments are confirmed, claim your reward to unlock the full library.</p></div></div><div className="referral-progress-summary"><div><strong>{referralStats?.registrations || 0}</strong><span>verified accounts</span></div><div><strong>{referralStats?.purchases || 0}<small> / 2</small></strong><span>confirmed payments</span></div></div><p className="referral-count-note">A referral counts after signup is verified. Rewards become claimable after two referred accounts have confirmed payments.</p><div className="referral-progress-track" aria-label={`${Math.min(referralStats?.purchases || 0, 2)} of 2 confirmed referral payments`}><span style={{ width: `${Math.min((referralStats?.purchases || 0) * 50, 100)}%` }} /></div><div className="referral-code-row"><div><span>YOUR INVITE CODE</span><code>{referralStats?.code || user.referralCode || (referralStatsLoading ? 'Loading...' : 'Unavailable')}</code></div><div className="referral-copy-actions"><button type="button" className="quiet-button" disabled={!referralStats?.code && !user.referralCode} onClick={copyReferralCode}><Copy size={14} />Copy code</button><button type="button" className="quiet-button" disabled={!referralStats?.code && !user.referralCode} onClick={copyReferralLink}><Link2 size={14} />Copy invite link</button></div></div>{referralRewardGranted ? <div className="referral-unlocked"><Check size={15} />Done. You can access all modules.</div> : user.paymentDone ? <div className="referral-unlocked"><Check size={15} />You already have full access to all modules, so you do not need to claim this reward.</div> : referralRewardReady && <button type="button" className="primary-small referral-claim-button" disabled={referralClaimBusy} onClick={claimReferralReward}><Gift size={14} />{referralClaimBusy ? 'Claiming reward…' : 'Claim reward'}</button>}{referralStatsError && <div className="referral-feedback" role="status">Could not load referral details: {referralStatsError} <button type="button" className="quiet-button" onClick={loadReferralStats}>Retry</button></div>}{referralNotice && <div className="referral-feedback" role="status">{referralNotice}</div>}</section>}</div></section> : <>
        <section className="section-hero"><div><div className="page-kicker">SOURCE LIBRARY / 0{Math.max(1, sections.findIndex((item) => item.slug === activeSection) + 1)}</div><h1>{currentSection?.name}<span>.</span></h1><p className="page-intro">Original notes and source material, kept together by topic.</p></div><div className="hero-index">{String(currentDocuments.length).padStart(2, '0')}<small>SOURCE FILES</small></div></section>
        <section className="source-section">
          <div className="source-list-heading"><div><span className="section-kicker">ORIGINAL MATERIAL</span><h2>{activeDocument ? activeDocument.title : 'Documents in this section'}</h2></div>{activeDocument && <button className="back-to-sources" onClick={() => { setActiveDocument(null); setArticle(null); }}><ChevronLeft size={15} />All sources</button>}</div>
          {!activeDocument ? <div className="source-list">{currentDocuments.map((document, index) => <button key={document.id} className="source-card" onClick={() => chooseDocument(document)}><span className="source-file-icon">{document.kind === 'diagram' ? <Network size={19} /> : <BookOpen size={19} />}</span><span className="source-card-copy"><strong>{document.title}</strong></span><span className="source-type">{document.kind === 'diagram' ? 'DRAWING' : 'FULL TEXT'}</span><span className="source-index">0{index + 1}</span><span className="source-arrow">↗</span></button>)}</div> : <article className="reader-view">
            <div className="reader-toolbar"><span className="reader-state"><Check size={13} />{activeDocument.kind === 'diagram' ? 'ORIGINAL EDITABLE DIAGRAM' : 'FULL TEXT / SPELLING FIXES + CREDENTIAL REDACTIONS'}</span></div>
            {contentBusy && <div className="reader-loading">Loading source material...</div>}
            {articleError && <div className="form-alert" role="alert">{articleError}</div>}
            {activeDocument.kind === 'diagram' ? <div className="diagram-stage"><img src={`${API_URL}/api/content/${activeDocument.id}`} alt={activeDocument.title} /><p>Supplied editable Draw.io diagram. Download the original file above.</p></div> : article && <SourceReader article={article} />}
          </article>}
          <div className="module-stepper"><button className="quiet-button" onClick={() => openModule(currentModuleIndex - 1)} disabled={currentModuleIndex === 0}>← Previous module</button><span>MODULE {String(currentModuleIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span>{currentModuleIndex < sections.length - 1 ? <button className="primary-small" onClick={() => openModule(currentModuleIndex + 1)}>{fullAccess ? 'Next module' : 'Unlock next module'} →</button> : <button className="quiet-button" disabled>End of modules</button>}</div>
        </section>
        <footer className="library-footer"><span>CYBERCLOUDS / SOURCE MATERIAL</span><span>READ ONLY FOR MEMBER ACCOUNTS</span><nav className="library-legal-links"><button onClick={() => navigate('/privacy')}>Privacy</button><button onClick={() => navigate('/terms')}>Terms</button></nav></footer>
      </>}
    </main>
    {logoutFeedbackOpen && <div className="logout-feedback-backdrop"><section className="logout-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="logout-feedback-title"><div className="logout-feedback-icon"><LogOut size={18} /></div><h2 id="logout-feedback-title">How was your experience this time?</h2><p className="logout-feedback-prompt">Choose a star rating before signing out.</p><div className="logout-feedback-rating" role="group" aria-label="Rate your experience">
      {[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={logoutRating >= rating ? 'selected' : ''} type="button" aria-pressed={logoutRating === rating} disabled={logoutFeedbackBusy} aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`} onClick={() => setLogoutRating(rating)}><Star size={29} fill={logoutRating >= rating ? 'currentColor' : 'none'} /></button>)}
    </div><div className="logout-feedback-actions"><button className="quiet-button" disabled={logoutFeedbackBusy} onClick={() => { setLogoutFeedbackOpen(false); setLogoutRating(0); }}>Keep learning</button><button className="primary-small" disabled={logoutRating < 1 || logoutFeedbackBusy} onClick={finishSignOut}>{logoutFeedbackBusy ? 'Signing out…' : 'Logout'} <span>→</span></button></div></section></div>}
    {paymentOpen && <div className="payment-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentOpen(false); }}><section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><button className="payment-modal-close" aria-label="Close payment details" onClick={() => setPaymentOpen(false)}><X size={18} /></button><span className="section-kicker">MODULE ACCESS / PAYMENT</span><h2 id="payment-title">How to get full access</h2><div className="payment-email-warning referral-offer" role="note"><strong>Earn the full course free</strong><p>Refer two learners. When both payments are confirmed, claim your reward to unlock all modules. Find your invite link in My profile.</p></div><ol><li>Scan the QR code with GPay or another UPI app to make your payment.</li><li>Submit your payment details through the Google Form below.</li><li>The admin will review your payment. Verification may take time; you’ll receive an email at your registered address from <strong>{paymentSettings.contactEmail}</strong> when access is updated.</li></ol><div className="payment-email-warning" role="note"><strong>Important: use your CyberClouds account email</strong><p>Enter the same email address in the Google Form that you used to sign up or log in here. If the email does not match, we may not be able to identify your account, and access may be delayed or not granted even after payment. Payments may not be refundable, so please check the email carefully before submitting.</p></div><div className="payment-upi-details"><div className="payment-qr-frame"><img src={paymentSettings.qrImage} alt="GPay QR code for payment" /></div></div>{paymentSettings.googleFormUrl ? <a className="payment-form-link" href={paymentSettings.googleFormUrl} target="_blank" rel="noreferrer">Open payment Google Form <span>↗</span></a> : <p className="payment-form-pending">Payment Google Form link will be added here.</p>}<p className="payment-refund-note">Please review the payment details carefully before submitting the form. Contact the administrator if you need help.</p><button className="primary-small" onClick={() => setPaymentOpen(false)}>Got it</button></section></div>}
  </div>;
}

export default App;
