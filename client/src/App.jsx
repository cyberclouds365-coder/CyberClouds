import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronLeft, Cloud, Eye, EyeOff, KeyRound, LogOut, Mail, Menu, Monitor, Network, Plus, Save, Shield, Terminal, Trash2, UserRound, X } from 'lucide-react';
import { createSourceOutline, parseSourceText } from './sourceFormatting.js';
import { paymentSettings } from './paymentConfig.js';
import GoogleAd from './GoogleAd.jsx';


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const sectionIcons = { os: Monitor, networking: Network, keycloak: KeyRound, commands: Terminal, aws: Cloud };

function PasswordField({ label, name, autoComplete, minLength, maxLength = 128, required = true, placeholder }) {
  const [visible, setVisible] = useState(false);
  return <label className="password-field-label">{label}<span className="password-input-wrap"><input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required={required} placeholder={placeholder} /><button className="password-visibility" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
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
      : `Request failed (${response.status})`;
    throw new Error(result.error || fallback);
  }
  return result;
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
    if (!user || user.role === 'admin') return undefined;
    const refreshAccount = () => request('/api/auth/me').then((result) => setUser(result.user)).catch(() => {});
    const timer = window.setInterval(refreshAccount, 10000);
    window.addEventListener('focus', refreshAccount);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshAccount); };
  }, [user?.id, user?.role]);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setPublicRoute(path);
    setAuthView(path === '/signup' ? 'signup' : 'login');
    setAuthError('');
    setAuthNotice('');
    if (path !== '/signup') setSignupPendingEmail('');
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

  async function signOut() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setAdminOpen(false);
    setProfileOpen(false);
    setArticle(null);
    setActiveDocument(null);
    window.history.replaceState({}, '', '/');
    setPublicRoute('/');
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

  async function openAdmin() {
    setAdminOpen(true);
    setMobileOpen(false);
    setAdminError('');
    setAdminPreview(null);
    try {
      const [userResult, contentResult] = await Promise.all([request('/api/admin/users'), request('/api/admin/content')]);
      setUsers(userResult.users);
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
      setUsers(result.users);
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
      setUsers(result.users);
    } catch (error) { setAdminError(error.message); }
  }

  async function removeUser(account) {
    setAdminError('');
    try {
      await request(`/api/admin/users/${account.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      const result = await request('/api/admin/users');
      setUsers(result.users);
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
      setUsers(result.users);
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function changeActive(account, isActive) {
    setAdminError('');
    try {
      await request(`/api/admin/users/${account.id}/active`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
      const result = await request('/api/admin/users');
      setUsers(result.users);
    } catch (error) { setAdminError(error.message); }
  }

  async function changePayment(account, paymentDone) {
    setAdminError('');
    setAdminNotice('');
    try {
      const paymentResult = await request(`/api/admin/users/${account.id}/payment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentDone }) });
      const usersResult = await request('/api/admin/users');
      setUsers(usersResult.users);
      if (paymentDone) {
        setAdminNotice(paymentResult.emailSent
          ? `Payment confirmed and an email was sent to ${account.email}.`
          : paymentResult.message || `Payment is confirmed, but the email could not be sent to ${account.email}.`);
      }
    } catch (error) { setAdminError(error.message); }
  }

  async function emailPaymentConfirmation(account) {
    setAdminError('');
    setAdminNotice('');
    try {
      const paymentResult = await request(`/api/admin/users/${account.id}/payment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentDone: true }) });
      const usersResult = await request('/api/admin/users');
      setUsers(usersResult.users);
      setAdminNotice(paymentResult.emailSent
        ? `Payment confirmation email sent to ${account.email}.`
        : paymentResult.message || `The payment email could not be sent to ${account.email}.`);
    } catch (error) { setAdminError(error.message); }
  }

  if (!authReady) return <main className="boot-screen"><span className="boot-mark"><BookOpen size={21} /></span><span>Loading library</span></main>;

  if (!user) {
    if (publicRoute === '/login' || publicRoute === '/signup' || publicRoute === '/library') {
      const signingUp = publicRoute === '/signup';
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
            <div className="auth-switch"><button className={!signingUp ? 'auth-tab active' : 'auth-tab'} onClick={() => navigate('/login')}>Sign in</button><button className={signingUp ? 'auth-tab active' : 'auth-tab'} onClick={() => navigate('/signup')}>Create account</button></div>
            <div className="auth-heading"><span className="section-kicker">CYBERCLOUDS / ACCESS</span><h2>{signingUp ? signupPendingEmail ? 'Check your inbox.' : 'Join the cloud.' : 'Welcome back.'}</h2><p>{signingUp ? signupPendingEmail ? `Enter the 6-digit code sent to ${signupPendingEmail}.` : 'Create your secure reader account.' : 'Sign in to open your knowledge library.'}</p></div>
            {signingUp && signupPendingEmail ? <form key="signup-verification" className="auth-form" onSubmit={verifySignup}>
              <label>Verification code<input name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength="6" maxLength="6" required spellCheck={false} autoCapitalize="off" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} onPaste={(event) => { event.preventDefault(); setVerificationCode(event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)); }} placeholder="6-digit code" /></label>
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              {authNotice && <div className="success-alert" role="status">{authNotice}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : 'Verify email and create account'}<span>→</span></button>
              <button type="button" className="quiet-button" disabled={authBusy} onClick={resendSignupCode}>Resend verification code</button>
              <button type="button" className="quiet-button" disabled={authBusy} onClick={() => { setSignupPendingEmail(''); setVerificationCode(''); setAuthError(''); setAuthNotice(''); }}>Use a different email</button>
            </form> : <form className="auth-form" onSubmit={handleAuth}>
              {signingUp && <label>Full name<input name="name" type="text" autoComplete="name" minLength="2" maxLength="100" required placeholder="Your name" /></label>}
              <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></label>
              <PasswordField label="Password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} placeholder={signingUp ? 'Create a strong password' : 'Your password'} />
              {signingUp && <p className="password-rule">Use 8+ characters with uppercase, lowercase, a number, and a symbol.</p>}
              {authError && <div className="form-alert" role="alert">{authError}</div>}
              {authNotice && <div className="success-alert" role="status">{authNotice}</div>}
              <button className="primary-button" disabled={authBusy}>{authBusy ? 'Please wait...' : signingUp ? 'Send verification code' : 'Sign in'}<span>→</span></button>
            </form>}
            {signingUp ? <p className="role-note"><Shield size={14} /> Email verification activates your reader account. Payment unlocks every module.</p> : demo ? <p className="demo-note">Local preview only: accounts use temporary in-memory storage.</p> : <p className="demo-note">Sign in with your CyberClouds account.</p>}
          </div>
          <span className="auth-footer">CYBERCLOUDS / PRIVATE ACCESS</span>
        </section>
      </main>;
    }

    return <main className="public-home">
      <header className="home-nav"><a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}><span className="brand-symbol cyber-logo-mark"><Cloud size={20} /><Shield size={10} /></span><span>cyberclouds</span></a><nav><a href="#library-preview">Explore</a><a href="#about-clouds">About</a></nav><div className="home-auth-actions"><button className="home-signin" onClick={() => navigate('/login')}>Sign in</button><button className="home-join" onClick={() => navigate('/signup')}>Join CyberClouds <span>→</span></button></div></header>
      <section className="home-hero"><div className="home-hero-copy"><div className="home-eyebrow"><span />YOUR SYSTEMS, IN ONE PLACE</div><h1>Make sense of<br />the <em>cloud around you.</em></h1><p>A personal knowledge base for the tools, networks, hardware, and cloud systems you work with every day.</p><div className="home-hero-actions"><button className="home-join large" onClick={() => navigate('/signup')}>Open your workspace <span>→</span></button><button className="home-text-link" onClick={() => navigate('/login')}>I already have an account <span>↗</span></button></div><div className="hero-assurance"><Shield size={15} /><span>Private accounts · Reader access by default</span></div></div><div className="cloud-visual" aria-hidden="true"><div className="cloud-ring ring-one" /><div className="cloud-ring ring-two" /><div className="cloud-core"><Cloud size={51} strokeWidth={1.25} /><span>CC</span></div><div className="cloud-node node-os"><Monitor size={16} /><span>OS</span></div><div className="cloud-node node-network"><Network size={16} /><span>NETWORK</span></div><div className="cloud-node node-key"><KeyRound size={16} /><span>IDENTITY</span></div><div className="cloud-node node-aws"><Cloud size={16} /><span>CLOUD</span></div><div className="cloud-orbit orbit-dot-one" /><div className="cloud-orbit orbit-dot-two" /></div><div className="hero-bottom-label"><span>01 / YOUR KNOWLEDGE, CONNECTED</span><span>SCROLL TO EXPLORE ↓</span></div></section>
      <section className="home-library-preview" id="library-preview"><div className="home-section-heading"><div><span className="home-section-kicker">THE CYBERCLOUDS LIBRARY</span><h2>Everything has<br />its own place<span>.</span></h2></div><p>Explore our many learning modules, with practical notes and diagrams across the systems you use. New accounts can start with one module; full access opens after payment is marked complete.</p></div><div className="home-topic-grid">{[{ icon: Monitor, num: '01', title: 'Operating systems', desc: 'Linux, Windows, processes, storage, and the hardware beneath.' }, { icon: Network, num: '02', title: 'Networking + hardware', desc: 'Protocols, switches, office topology, components, and diagrams.' }, { icon: KeyRound, num: '03', title: 'Identity + Keycloak', desc: 'SSO, federation, authentication, and access control notes.' }, { icon: Terminal, num: '04', title: 'Commands', desc: 'A searchable field guide to your everyday terminal toolkit.' }, { icon: Cloud, num: '05', title: 'AWS + cloud', desc: 'Cloud concepts, services, and your AWS learning notes.' }].map(({ icon: Icon, num, title, desc }) => <article className="home-topic" key={num}><span className="topic-top"><span>{num}</span><Icon size={19} /></span><h3>{title}</h3><p>{desc}</p></article>)}</div></section><section className="home-about" id="about-clouds"><div className="about-signal"><span className="signal-line" /><span>BUILT AROUND YOUR NOTES</span></div><div><h2>Your learning,<br /><em>not lost in tabs.</em></h2><p>CyberClouds brings your technical notes and original diagrams into a calm, structured space. Sign up as a reader, find what you need, and keep building your own understanding.</p><button className="home-text-link" onClick={() => navigate('/signup')}>Get started with CyberClouds <span>→</span></button></div><div className="about-stats"><div><strong>05</strong><span>TOPIC AREAS</span></div><div><strong>01</strong><span>CONNECTED LIBRARY</span></div><div><strong>∞</strong><span>ROOM TO LEARN</span></div></div></section><footer className="home-footer"><a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}><span className="brand-symbol cyber-logo-mark"><Cloud size={18} /><Shield size={9} /></span><span>cyberclouds</span></a><span>PRIVATE KNOWLEDGE / CONNECTED SYSTEMS</span><button onClick={() => navigate('/login')}>Sign in <span>↗</span></button></footer>
    <GoogleAd slotId="5649539153" />
   
    </main>;
  }

  const currentSection = sections.find((section) => section.slug === activeSection) || sections[0];
  const currentDocuments = currentSection?.documents || [];
  const selectedSection = adminSections.find((section) => section.slug === selectedAdminSection);
  const selectedSectionDocuments = adminDocuments.filter((document) => document.sectionSlug === selectedAdminSection);

  return <div className="library-app">
    <aside className={`library-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <a className="library-brand cyber-brand" href="#library"><span className="brand-symbol cyber-logo-mark"><Cloud size={19} /><Shield size={10} /></span><span>cyberclouds</span></a>
      <div className="sidebar-caption">KNOWLEDGE BASE</div>
      <nav className="source-navigation" aria-label="Knowledge sections">
        {sections.map((section, index) => {
          const Icon = sectionIcons[section.slug] || BookOpen;
          const locked = user.role !== 'admin' && !user.paymentDone && index > 0;
          return <button key={section.slug} disabled={locked} title={locked ? 'Complete payment for access to all modules' : undefined} className={`source-nav-item ${activeSection === section.slug && !adminOpen && !profileOpen ? 'current' : ''} ${locked ? 'module-locked' : ''}`} onClick={() => { setActiveSection(section.slug); setActiveDocument(null); setArticle(null); setAdminOpen(false); setProfileOpen(false); setMobileOpen(false); }}><Icon size={17} /><span>{section.name}</span><small>0{index + 1}</small></button>;
        })}
      </nav>
      {user.role !== 'admin' && !user.paymentDone && <button className="payment-access-note" onClick={() => setPaymentOpen(true)}>One module is available now. Click here to see how to pay and get access to all modules.</button>}
      <div className="sidebar-account">
        <div className="role-pill"><span className={`role-dot ${user.role}`} />{user.role === 'admin' ? 'Administrator' : 'Reader'}{demo && <span className="demo-pill">DEMO</span>}</div>
        <div className="account-row"><div className="account-avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="account-copy"><strong>{user.name}</strong><span>{user.email}</span></div></div>
        <button className={`admin-link profile-link ${profileOpen ? 'current' : ''}`} onClick={() => { setProfileOpen(true); setAdminOpen(false); setMobileOpen(false); setProfileError(''); setProfileNotice(''); setProfilePasswordError(''); setProfilePasswordNotice(''); }}><UserRound size={15} />My profile<span>→</span></button>
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
        </div> : <div className="user-management"><div className="user-management-head"><p>Mark payment Done to unlock every module and email the user. Use Email to resend a confirmation.</p><button className="primary-small" onClick={() => setCreateUserOpen((open) => !open)}><Plus size={14} />Add user</button></div>{createUserOpen && <form className="user-editor create-user-editor" onSubmit={createUser}><div className="editor-heading"><div><div className="section-kicker">NEW ACCOUNT / READER</div><h3>Passwords are stored as secure hashes.</h3></div><button type="button" className="icon-close" onClick={() => setCreateUserOpen(false)} aria-label="Close new user form"><X size={17} /></button></div><div className="editor-field-row"><label>Name<input name="name" autoComplete="name" minLength="2" maxLength="100" required placeholder="Full name" /></label><label>Email<input name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></label><label>Temporary password<input name="password" type="password" minLength="8" maxLength="128" required placeholder="Create a strong password" /></label></div><div className="editor-actions"><button type="button" className="quiet-button" onClick={() => setCreateUserOpen(false)}>Cancel</button><button className="primary-small"><Plus size={14} />Create reader</button></div></form>}<div className="user-table-wrap"><table className="user-table"><thead><tr><th>ACCOUNT</th><th>EMAIL</th><th>ROLE</th><th>ACCESS</th><th>PAYMENT</th><th>STATUS</th><th>MANAGE</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td><strong>{account.name}</strong></td><td>{account.email}</td><td><span className={`table-role ${account.role}`}>{account.role}</span></td><td><select aria-label={`Role for ${account.email}`} value={account.role} disabled={String(account.id) === String(user.id)} onChange={(event) => changeRole(account, event.target.value)}><option value="user">Reader</option><option value="admin">Admin</option></select></td><td><button className={`account-status-toggle ${account.paymentDone ? 'enabled' : 'disabled'}`} disabled={account.role === 'admin'} onClick={() => changePayment(account, !account.paymentDone)}>{account.paymentDone ? 'Done' : 'Pending'}</button></td><td><button className={`account-status-toggle ${account.isActive ? 'enabled' : 'disabled'}`} disabled={String(account.id) === String(user.id)} onClick={() => changeActive(account, !account.isActive)}>{account.isActive ? 'Active' : 'Inactive'}</button></td><td><div className="user-actions"><button className="quiet-button" type="button" disabled={!account.paymentDone || account.role === 'admin'} aria-label={`Email payment confirmation to ${account.email}`} title="Send payment confirmation email" onClick={() => emailPaymentConfirmation(account)}><Mail size={13} />Email</button><button className="quiet-button" disabled={String(account.id) === String(user.id)} onClick={() => setEditingUser({ id: account.id, name: account.name, email: account.email })}>Edit</button><button className="icon-danger" disabled={String(account.id) === String(user.id)} aria-label={`Delete ${account.email}`} onClick={() => setDeleteTarget({ kind: 'user', item: account })}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>{editingUser && <form className="user-editor" onSubmit={saveUser}><div className="editor-heading"><div><div className="section-kicker">EDIT ACCOUNT</div><h3>{editingUser.email}</h3></div><button type="button" className="icon-close" onClick={() => setEditingUser(null)} aria-label="Close account editor"><X size={17} /></button></div><div className="editor-field-row"><label>Name<input value={editingUser.name} required onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} /></label><label>Email<input type="email" value={editingUser.email} required onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} /></label></div><div className="editor-actions"><button type="button" className="quiet-button" onClick={() => setEditingUser(null)}>Cancel</button><button className="primary-small"><Save size={14} />Save account</button></div></form>}{deleteTarget?.kind === 'user' && <div className="delete-confirm"><span>Delete account <strong>{deleteTarget.item.email}</strong>?</span><div><button className="danger-button" onClick={() => removeUser(deleteTarget.item)}>Delete user</button><button className="quiet-button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></div>}</div>}
      </section> : profileOpen ? <section className="profile-view"><div className="page-kicker">ACCOUNT / PERSONAL SETTINGS</div><h1>My profile<span>.</span></h1><p className="page-intro">Manage your name and password, and check your account access.</p><div className="profile-panels"><form className="profile-panel" onSubmit={saveProfile}><div className="profile-panel-head"><span className="profile-panel-icon"><UserRound size={18} /></span><div><h2>Account details</h2><p>Your email is fixed. You can update your display name.</p></div></div><label>Name<input name="name" minLength="2" maxLength="100" required defaultValue={user.name} /></label><label>Email address<input type="email" value={user.email} readOnly aria-readonly="true" /></label>{profileError && <div className="form-alert" role="alert">{profileError}</div>}{profileNotice && <div className="success-alert" role="status">{profileNotice}</div>}<button className="primary-small"><Save size={14} />Save name</button></form><form className="profile-panel" onSubmit={savePassword}><div className="profile-panel-head"><span className="profile-panel-icon"><KeyRound size={18} /></span><div><h2>Change password</h2><p>Confirm your current password before setting a new one.</p></div></div><PasswordField label="Current password" name="currentPassword" autoComplete="current-password" /><PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={8} placeholder="Create a strong password" /><PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={8} /><p className="password-rule">8+ characters with uppercase, lowercase, a number, and a special character.</p>{profilePasswordError && <div className="form-alert" role="alert">{profilePasswordError}</div>}{profilePasswordNotice && <div className="success-alert" role="status">{profilePasswordNotice}</div>}<button className="primary-small"><Save size={14} />Update password</button></form><section className="profile-panel profile-access-panel"><div className="profile-panel-head"><span className="profile-panel-icon"><Shield size={18} /></span><div><h2>Payment &amp; module access</h2><p>Your current payment and library access status.</p></div></div><div className="profile-status-grid"><div className="profile-status-item"><span>Payment status</span><strong className={user.paymentDone || user.role === 'admin' ? 'status-paid' : 'status-pending'}>{user.role === 'admin' ? 'Admin account' : user.paymentDone ? 'Payment complete' : 'Payment pending'}</strong></div><div className="profile-status-item"><span>Module access</span><strong className={user.role === 'admin' || user.paymentDone ? 'status-paid' : 'status-pending'}>{user.role === 'admin' || user.paymentDone ? 'All modules unlocked' : 'One module available'}</strong></div><div className="profile-status-item"><span>Account status</span><strong className={user.isActive ? 'status-paid' : 'status-pending'}>{user.isActive ? 'Active' : 'Inactive'}</strong></div></div>{user.role !== 'admin' && !user.paymentDone && <button className="profile-payment-link" onClick={() => setPaymentOpen(true)}>View payment instructions</button>}</section></div></section> : <>
        <section className="section-hero"><div><div className="page-kicker">SOURCE LIBRARY / 0{Math.max(1, sections.findIndex((item) => item.slug === activeSection) + 1)}</div><h1>{currentSection?.name}<span>.</span></h1><p className="page-intro">Original notes and source material, kept together by topic.</p></div><div className="hero-index">{String(currentDocuments.length).padStart(2, '0')}<small>SOURCE FILES</small></div></section>
        <section className="source-section">
          <div className="source-list-heading"><div><span className="section-kicker">ORIGINAL MATERIAL</span><h2>{activeDocument ? activeDocument.title : 'Documents in this section'}</h2></div>{activeDocument && <button className="back-to-sources" onClick={() => { setActiveDocument(null); setArticle(null); }}><ChevronLeft size={15} />All sources</button>}</div>
          {!activeDocument ? <div className="source-list">{currentDocuments.map((document, index) => <button key={document.id} className="source-card" onClick={() => chooseDocument(document)}><span className="source-file-icon">{document.kind === 'diagram' ? <Network size={19} /> : <BookOpen size={19} />}</span><span className="source-card-copy"><strong>{document.title}</strong></span><span className="source-type">{document.kind === 'diagram' ? 'DRAWING' : 'FULL TEXT'}</span><span className="source-index">0{index + 1}</span><span className="source-arrow">↗</span></button>)}</div> : <article className="reader-view">
            <div className="reader-toolbar"><span className="reader-state"><Check size={13} />{activeDocument.kind === 'diagram' ? 'ORIGINAL EDITABLE DIAGRAM' : 'FULL TEXT / SPELLING FIXES + CREDENTIAL REDACTIONS'}</span></div>
            {contentBusy && <div className="reader-loading">Loading source material...</div>}
            {articleError && <div className="form-alert" role="alert">{articleError}</div>}
            {activeDocument.kind === 'diagram' ? <div className="diagram-stage"><img src={`${API_URL}/api/content/${activeDocument.id}`} alt={activeDocument.title} /><p>Supplied editable Draw.io diagram. Download the original file above.</p></div> : article && <SourceReader article={article} />}
          </article>}
        </section>
        <footer className="library-footer"><span>CYBERCLOUDS / SOURCE MATERIAL</span><span>READ ONLY FOR MEMBER ACCOUNTS</span></footer>
      </>}
    </main>
    {paymentOpen && <div className="payment-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentOpen(false); }}><section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><button className="payment-modal-close" aria-label="Close payment details" onClick={() => setPaymentOpen(false)}><X size={18} /></button><span className="section-kicker">MODULE ACCESS / PAYMENT</span><h2 id="payment-title">How to get full access</h2><ol><li>Scan the QR code with GPay or another UPI app to make your payment.</li><li>Submit your payment details through the Google Form below.</li><li>The admin will review your payment. Verification may take time; you’ll receive an email at your registered address from <strong>{paymentSettings.contactEmail}</strong> when access is updated.</li></ol><div className="payment-email-warning" role="note"><strong>Important: use your CyberClouds account email</strong><p>Enter the same email address in the Google Form that you used to sign up or log in here. If the email does not match, we may not be able to identify your account, and access may be delayed or not granted even after payment. Payments may not be refundable, so please check the email carefully before submitting.</p></div><div className="payment-upi-details"><div className="payment-qr-frame"><img src={paymentSettings.qrImage} alt="GPay QR code for payment" /></div></div>{paymentSettings.googleFormUrl ? <a className="payment-form-link" href={paymentSettings.googleFormUrl} target="_blank" rel="noreferrer">Open payment Google Form <span>↗</span></a> : <p className="payment-form-pending">Payment Google Form link will be added here.</p>}<p className="payment-refund-note">Please review the payment details carefully before submitting the form. Contact the administrator if you need help.</p><button className="primary-small" onClick={() => setPaymentOpen(false)}>Got it</button></section></div>}
  </div>;
}

export default App;
