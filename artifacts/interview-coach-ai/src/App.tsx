import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, BookOpen,
  BriefcaseBusiness, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3,
  Compass, FileText, Flame, GraduationCap, Headphones, Lightbulb, LoaderCircle,
  LogOut, Menu, MessageSquareText, Mic, Pause, Play, Plus, RotateCcw, Save,
  ShieldCheck, Sparkles, Target, TrendingUp, Trophy, UserRound, X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getGetInterviewQueryKey, getGetMyProfileQueryKey,
  getListInterviewsQueryKey, getListRecommendationsQueryKey, useCompleteInterview,
  useCreateInterview, useGetDashboard, useGetInterview, useGetMyProfile,
  useGetNextInterviewQuestion, useListInterviews, useListRecommendations,
  useSubmitInterviewAnswer, useTranscribeInterviewAnswer, useUpdateMyProfile,
  useUpdateRecommendation,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#5d52c8', colorForeground: '#202944', colorMutedForeground: '#727c92',
    colorDanger: '#c44f5b', colorBackground: '#ffffff', colorInput: '#fbfbfe',
    colorInputForeground: '#202944', colorNeutral: '#dce0eb', fontFamily: 'DM Sans',
    borderRadius: '0.9rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-[22px] w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#202944] font-bold tracking-tight',
    headerSubtitle: 'text-[#727c92]',
    socialButtonsBlockButtonText: 'text-[#202944] font-semibold',
    formFieldLabel: 'text-[#313a52] font-semibold',
    footerActionLink: 'text-[#5d52c8] font-semibold',
    footerActionText: 'text-[#727c92]',
    dividerText: 'text-[#7d879d]',
    identityPreviewEditButton: 'text-[#5d52c8]',
    formFieldSuccessText: 'text-emerald-700',
    alertText: 'text-[#a43b49]',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-lg',
    socialButtonsBlockButton: 'border border-[#e2e5ef] hover:bg-[#f8f8fc] rounded-xl',
    formButtonPrimary: 'bg-[#5d52c8] hover:bg-[#4c42b3] rounded-xl shadow-none',
    formFieldInput: 'bg-[#fbfbfe] border-[#dfe3ee] text-[#202944] rounded-xl',
    footerAction: 'text-sm',
    dividerLine: 'bg-[#e4e7ef]',
    alert: 'rounded-xl',
    otpCodeFieldInput: 'border-[#dfe3ee] rounded-lg',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand-lockup" aria-label="Interview Coach AI home">
    <span className="brand-mark"><AudioLines size={19} strokeWidth={2.1} /></span>
    {!compact && <span className="brand-name">Interview <span>Coach AI</span></span>}
  </Link>;
}

function Button({ children, href, onClick, variant = 'primary', disabled = false, type = 'button', className = '' }: {
  children: ReactNode; href?: string; onClick?: () => void; variant?: 'primary' | 'outline' | 'ghost' | 'light'; disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  const cls = `button button-${variant} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} disabled={disabled} onClick={onClick} className={cls}>{children}</button>;
}

function PublicHome() {
  return <main className="public-home grain">
    <header className="public-nav wrap">
      <Brand />
      <nav aria-label="Main navigation">
        <Link href="/about">Our approach</Link><Link href="/help">Help</Link>
      </nav>
      <div className="nav-actions"><Link href="/sign-in" className="nav-signin">Sign in</Link><Button href="/sign-up" className="nav-cta">Create account <ArrowRight size={15} /></Button></div>
    </header>
    <section className="hero wrap">
      <div className="hero-copy animate-enter">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT INTERVIEW STARTS HERE</div>
        <h1>Practice out loud.<br /><em>Show up ready.</em></h1>
        <p className="hero-sub">A little honest practice can change the way you walk into a room. Build confidence with interview sessions that meet you where you are.</p>
        <div className="hero-actions"><Button href="/interview/setup">Start practicing <ArrowRight size={17} /></Button><Link href="/about" className="text-link">See how it works <ArrowRight size={15} /></Link></div>
        <div className="hero-proof"><div className="proof-faces"><span>J</span><span>M</span><span>A</span></div><p><strong>Made for the work before the work.</strong><br />Thoughtful practice, at your own pace.</p></div>
      </div>
      <div className="hero-art animate-enter delay-2" aria-label="Interview preparation progress illustration">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="art-topline"><span>YOUR PRACTICE SPACE</span><span><span className="live-dot" /> READY WHEN YOU ARE</span></div>
        <div className="art-main">
          <div className="art-caption">THIS WEEK <ArrowUpRight size={16} /></div>
          <div className="art-scoreline"><strong className="score-word">Growing</strong><span>one answer at a time</span><span className="score-change"><TrendingUp size={14} /> PRACTICE TREND</span></div>
          <p className="art-label">Your practice, taking shape</p>
          <div className="chart">
            <div className="chart-grid"><span>100</span><span>75</span><span>50</span><span>25</span></div>
            <svg viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true"><path d="M2 80 C38 75 42 59 77 64 S116 44 145 52 S192 40 220 45 S259 17 285 31 S329 10 358 7" /><path className="chart-area" d="M2 80 C38 75 42 59 77 64 S116 44 145 52 S192 40 220 45 S259 17 285 31 S329 10 358 7 V100 H2Z" /><circle cx="358" cy="7" r="4" /></svg>
            <div className="chart-days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>TODAY</span></div>
          </div>
        </div>
        <div className="art-toast"><span className="toast-icon"><Check size={15} /></span><div><strong>That was a strong answer.</strong><span>Specific feedback, every time.</span></div><ArrowUpRight size={14} /></div>
        <span className="art-note">Progress feels different when it’s yours.</span>
      </div>
      <div className="hero-index">01 <span /> 03</div>
    </section>
    <section className="trust-band"><div className="wrap trust-inner"><span>BUILT FOR THE MOMENT BEFORE</span><div><span><GraduationCap size={17} /> Students</span><span><BriefcaseBusiness size={17} /> Career changers</span><span><Compass size={17} /> First-time interviewers</span></div></div></section>
    <section className="steps-section wrap" id="how-it-works">
      <div className="section-intro"><div><div className="eyebrow">A PRACTICE THAT ADAPTS</div><h2>Get better by<br />getting started.</h2></div><p>No perfect answers required. Just a space to try, learn what landed, and take your next step with more confidence.</p></div>
      <div className="steps-grid">
        <article className="step-card step-card-dark"><span className="step-number">01 / PRACTICE</span><div className="step-icon"><MessageSquareText /></div><h3>Answer the real questions.</h3><p>Choose a role and interview style. Then take questions one at a time, with room to think before you speak.</p><div className="step-foot">A calm place to find your words <ArrowUpRight size={16} /></div></article>
        <article className="step-card step-card-lilac"><span className="step-number">02 / REFLECT</span><div className="step-icon"><Target /></div><h3>See what’s already strong.</h3><p>Get specific notes on clarity, content, and the moments where your answer could go further.</p><div className="step-foot">Feedback you can use <ArrowUpRight size={16} /></div></article>
        <article className="step-card step-card-cream"><span className="step-number">03 / GROW</span><div className="step-icon"><BookOpen /></div><h3>Know what to work on next.</h3><p>Your practice reveals the topics worth revisiting, so every study session has a purpose.</p><div className="step-foot">Progress that has a direction <ArrowUpRight size={16} /></div></article>
      </div>
    </section>
    <section className="feature-section"><div className="wrap feature-inner"><div className="feature-visual"><div className="feedback-sheet"><div className="sheet-head"><span>ANSWER REVIEW</span><span>QUESTION 03</span></div><h4>Tell me about a time you solved a difficult problem.</h4><div className="feedback-score"><span>ANSWER REVIEW</span><b>REFLECTION</b></div><div className="strength-row"><span><CheckCircle2 size={16} /> Clear situation and outcome</span><span>STRONG</span></div><div className="strength-row subtle"><span><Lightbulb size={16} /> Add the specific steps you took</span><span>GROW</span></div></div><div className="feature-stamp"><Sparkles size={16} /> KIND, SPECIFIC FEEDBACK</div></div><div className="feature-copy"><div className="eyebrow">MORE THAN A SCORE</div><h2>Know what landed.<br /><em>And what to try next.</em></h2><p>Useful feedback is more than a number. Learn what made your answer compelling, where you can add detail, and how to tell your story with confidence.</p><Button href="/about" variant="outline">Our approach to feedback <ArrowRight size={16} /></Button></div></div></section>
    <section className="cta-section wrap"><div className="cta-panel"><div className="cta-mark"><AudioLines size={20} /></div><div><div className="eyebrow">YOUR FIRST SESSION IS A GOOD PLACE TO START</div><h2>Ready when you are.</h2><p>Start with one question. See where it takes you.</p></div><Button href="/interview/setup" variant="light">Begin a practice session <ArrowRight size={16} /></Button><span className="cta-orb" /></div></section>
    <footer className="public-footer wrap"><Brand /><p>Practice for the moment that matters.</p><div><Link href="/about">About</Link><Link href="/help">Help</Link><Link href="/sign-in">Sign in</Link></div><span>© {new Date().getFullYear()} Interview Coach AI</span></footer>
  </main>;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Compass },
  { href: '/interview/setup', label: 'Practice', icon: AudioLines },
  { href: '/study', label: 'Study plan', icon: BookOpen },
  { href: '/history', label: 'Sessions', icon: Clock3 },
];
function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const displayName = user?.firstName || user?.fullName || 'Learner';
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand /><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="side-label">YOUR PRACTICE</div>
      <nav className="side-nav" aria-label="Student navigation">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`side-link ${location === href ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{href === '/interview/setup' && <Plus size={14} className="side-plus" />}</Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="side-help"><div className="help-symbol"><CircleHelp size={17} /></div><strong>Need a hand?</strong><span>We're here to help you prepare.</span><Link href="/help">Visit help center <ArrowRight size={13} /></Link></div>
        <Link href="/profile" className={`side-profile ${location === '/profile' ? 'active' : ''}`}><span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span><span className="profile-name"><strong>{displayName}</strong><small>My profile</small></span><ChevronDown size={15} /></Link>
        <button className="side-signout" onClick={() => signOut({ redirectUrl: basePath || '/' })}><LogOut size={15} /> Sign out</button>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <div className="main-column">
      <header className="topbar"><button onClick={() => setMobileOpen(true)} className="mobile-menu" aria-label="Open navigation"><Menu /></button><div className="breadcrumb"><span>Interview Coach AI</span><span>/</span><strong>{navItems.find((n) => n.href === location)?.label || (location.startsWith('/results') ? 'Session review' : location.startsWith('/interview/') ? 'Practice session' : 'Your space')}</strong></div><Link href="/interview/setup" className="topbar-action"><Plus size={15} /> New session</Link></header>
      <main className="page-content animate-enter">{children}</main>
    </div>
  </div>;
}

function SignInPage() { return <div className="auth-page"><Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link><div className="auth-intro"><Brand /><h1>Make room to practice.</h1><p>Your progress is waiting right where you left it.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function SignUpPage() { return <div className="auth-page"><Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link><div className="auth-intro"><Brand /><h1>Start with one answer.</h1><p>Build confidence one thoughtful practice at a time.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }
function SignedInGate({ children }: { children: ReactNode }) {
  return <><Show when="signed-in">{children}</Show><Show when="signed-out"><div className="signin-gate"><Brand /><div className="eyebrow">YOUR PRACTICE SPACE</div><h2>Sign in to pick up where you left off.</h2><p>Your sessions, feedback, and study plan are saved in one place.</p><Button href="/sign-in">Sign in to continue <ArrowRight size={16} /></Button><small>New here? <Link href="/sign-up">Create an account</Link></small></div></Show></>;
}

function LoadingCard({ label = 'Getting your practice space ready' }: { label?: string }) {
  return <div className="loading-card" role="status"><span className="skeleton-line wide" /><span className="skeleton-line" /><span className="skeleton-block" /><span className="loading-caption"><LoaderCircle size={15} /> {label}</span></div>;
}
function ErrorCard({ retry, message = 'We couldn’t load this just now.' }: { retry: () => void; message?: string }) {
  return <div className="state-card"><span className="state-icon"><RotateCcw size={20} /></span><h3>A small pause.</h3><p>{message} Your work is safe. Give it another try.</p><Button onClick={retry} variant="outline">Try again <RotateCcw size={14} /></Button></div>;
}
function EmptyCard({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-card"><span className="empty-icon"><Sparkles size={22} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}
function ScoreCircle({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  return <div className={`score-circle score-${size}`} style={{ '--score': `${Math.max(0, Math.min(score, 100)) * 3.6}deg` } as CSSProperties}><div><strong>{score}</strong>{size === 'large' && <span>out of 100</span>}</div></div>;
}
function DashboardPage() {
  const dashboard = useGetDashboard();
  const profile = useGetMyProfile();
  const d = dashboard.data;
  const trend = useMemo(() => d?.scoreTrend || [], [d?.scoreTrend]);
  if (dashboard.isLoading || profile.isLoading) return <LoadingCard />;
  if (dashboard.isError) return <ErrorCard retry={() => dashboard.refetch()} />;
  const firstName = profile.data?.displayName?.split(' ')[0] || 'there';
  return <div className="dashboard-page">
    <PageHeading eyebrow="YOUR PRACTICE SPACE" title={`Good to see you, ${firstName}.`} detail="Every session is a step closer to the version of you who walks in ready." action={<Button href="/interview/setup"><Plus size={17} /> Start a practice session</Button>} />
    {!d || d.completedSessions === 0 ? <div className="first-session-banner"><div className="banner-graphic"><span className="banner-ring" /><AudioLines size={34} /></div><div><div className="eyebrow">A FRESH START</div><h2>Your progress begins with one question.</h2><p>Choose a role, set the pace, and get to know how you want to show up.</p></div><Button href="/interview/setup">Set up your first session <ArrowRight size={16} /></Button></div> : null}
    <div className="stats-grid">
      <article className="stat-card stat-featured"><div className="stat-top"><span>AVERAGE SCORE</span><span className="stat-icon"><TrendingUp size={17} /></span></div><div className="stat-value">{d?.averageScore ?? '—'}<small>/100</small></div><div className="stat-note"><span className="positive"><TrendingUp size={13} /> In progress</span><span>Across completed sessions</span></div><div className="stat-sparkline">{trend.length > 1 && trend.map((p, i) => <span key={`${p.date}-${i}`} style={{ height: `${Math.max(18, p.score * .56)}%` }} />)}</div></article>
      <article className="stat-card"><div className="stat-top"><span>SESSIONS COMPLETED</span><span className="stat-icon"><CheckCircle2 size={17} /></span></div><div className="stat-value">{d?.completedSessions ?? 0}<small> sessions</small></div><div className="stat-note">Each one makes the next a little easier.</div><div className="stat-line"><span style={{ width: `${Math.min((d?.completedSessions || 0) * 12, 100)}%` }} /></div></article>
      <article className="stat-card"><div className="stat-top"><span>PRACTICE TIME</span><span className="stat-icon"><Clock3 size={17} /></span></div><div className="stat-value">{d?.practiceMinutes ?? 0}<small> min</small></div><div className="stat-note">Time spent building your confidence.</div><div className="time-stamp"><span>YOUR TIME</span><b>{d?.practiceMinutes ?? 0}<small>m</small></b><span>WELL SPENT</span></div></article>
      <article className="stat-card streak-card"><div className="stat-top"><span>CURRENT STREAK</span><span className="stat-icon"><Flame size={17} /></span></div><div className="stat-value">{d?.currentStreak ?? 0}<small> days</small></div><div className="stat-note">A little practice adds up.</div><div className="streak-dots">{Array.from({ length: 7 }, (_, i) => <span key={i} className={i < (d?.currentStreak || 0) ? 'lit' : ''}>{i < (d?.currentStreak || 0) ? <Check size={11} /> : ''}</span>)}</div></article>
    </div>
    <div className="dashboard-columns">
      <section className="content-panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">LOOKING BACK</div><h2>Recent sessions</h2></div><Link href="/history" className="panel-link">See all <ArrowRight size={14} /></Link></div>
        {d?.recentSessions?.length ? <div className="session-list">{d.recentSessions.slice(0, 4).map((s) => <div className="session-row" key={s.id}><span className="session-kind"><BriefcaseBusiness size={17} /></span><div className="session-description"><strong>{s.role}</strong><span>{s.interviewType} · {s.difficulty} · {new Date(s.createdAt).toLocaleDateString()}</span></div><span className="session-score">{s.score ?? '—'}<small> / 100</small></span><Link aria-label={`Review ${s.role} session`} href={`/results/${s.id}`} className="row-arrow"><ArrowUpRight size={16} /></Link></div>)}</div> : <EmptyCard title="Your story starts here." detail="After your first practice, you'll find your session notes and scores here." action={<Button href="/interview/setup" variant="outline">Practice your first interview <ArrowRight size={15} /></Button>} />}
      </section>
      <section className="recommend-panel"><div className="rec-top"><div className="eyebrow">A GOOD NEXT STEP</div><span className="rec-icon"><Lightbulb size={18} /></span></div><h2>Make your next<br />minute count.</h2><p>Turn what you learned in your sessions into a focused study plan.</p><div className="rec-mini">{d?.recommendations?.filter((r) => !r.completed).slice(0, 2).map((r) => <div key={r.id}><span><Target size={14} /></span><div><strong>{r.topic}</strong><small>{r.estimatedMinutes} min to explore</small></div><ArrowRight size={14} /></div>)}{!d?.recommendations?.some((r) => !r.completed) && <span className="rec-empty">Your personalized focus areas will show up here.</span>}</div><Link href="/study" className="rec-link">Open my study plan <ArrowRight size={15} /></Link></section>
    </div>
  </div>;
}

function SetupPage() {
  const create = useCreateInterview();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState('');
  const [type, setType] = useState('behavioral');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState('text');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const client = useQueryClient();
  useEffect(() => { setVoiceAvailable(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined' && window.MediaRecorder.isTypeSupported('audio/webm')); }, []);
  const start = (e: FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;
    create.mutate({ data: { role: role.trim(), interviewType: type as 'behavioral' | 'technical' | 'mixed', difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced', topic: topic.trim() || null, questionCount: count, mode: mode as 'text' | 'voice' } }, {
      onSuccess: (interview) => { client.invalidateQueries({ queryKey: getListInterviewsQueryKey() }); setLocation(`/interview/${interview.id}`); },
    });
  };
  return <div className="setup-page">
    <PageHeading eyebrow="A ROOM OF YOUR OWN" title="Set the scene." detail="Make this session yours. There’s no wrong place to begin." />
    <form className="setup-layout" onSubmit={start}>
      <div className="setup-form content-panel">
        <div className="form-section"><span className="form-number">01</span><div className="form-body"><label htmlFor="role">What role are you preparing for?</label><p>A job title gives your questions a little more context.</p><input id="role" data-testid="input-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Product design intern" maxLength={120} required /><div className="role-suggestions"><span>YOU CAN TRY</span>{['Software engineer', 'Marketing intern', 'Graduate analyst'].map((r) => <button type="button" key={r} onClick={() => setRole(r)}>{r}</button>)}</div></div></div>
        <div className="form-section"><span className="form-number">02</span><div className="form-body"><label>Choose your interview style</label><p>Pick one focus, or keep the conversation varied.</p><div className="option-grid">{[['behavioral', 'Behavioral', 'Stories, decisions, and how you work'], ['technical', 'Technical', 'Skills, problem-solving, and craft'], ['mixed', 'A little of both', 'A balanced practice session']].map(([v, title, desc]) => <button type="button" key={v} onClick={() => setType(v)} className={`choice-card ${type === v ? 'selected' : ''}`}><span className="choice-radio">{type === v && <span />}</span><strong>{title}</strong><small>{desc}</small></button>)}</div></div></div>
        <div className="form-section"><span className="form-number">03</span><div className="form-body"><label>Choose a comfortable challenge</label><p>You can always turn it up when you’re ready.</p><div className="difficulty-control">{[['beginner', 'Getting started'], ['intermediate', 'Building confidence'], ['advanced', 'Stretch me']].map(([v, title]) => <button type="button" key={v} className={difficulty === v ? 'selected' : ''} onClick={() => setDifficulty(v)}>{title}</button>)}</div></div></div>
        <div className="form-section"><span className="form-number">04</span><div className="form-body"><label htmlFor="topic">Anything you want to focus on?</label><p>Leave blank for questions tailored to your role.</p><input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Teamwork, project experience, SQL" maxLength={120} /></div></div>
        <div className="form-section form-last"><span className="form-number">05</span><div className="form-body"><label>Shape your session</label><p>Choose the length and how you’d like to answer.</p><div className="session-options"><div><span className="option-label">QUESTIONS</span><div className="count-control"><button type="button" aria-label="Fewer questions" onClick={() => setCount((c) => Math.max(3, c - 1))}>−</button><strong>{count}</strong><button type="button" aria-label="More questions" onClick={() => setCount((c) => Math.min(10, c + 1))}>+</button></div><small>3–10 questions</small></div><div className="mode-control"><span className="option-label">ANSWER MODE</span><div className="mode-tabs"><button type="button" className={mode === 'text' ? 'selected' : ''} onClick={() => setMode('text')}><FileText size={15} /> Text</button><button type="button" disabled={!voiceAvailable} aria-describedby="voice-status" className={mode === 'voice' ? 'selected' : ''} onClick={() => setMode('voice')}><Mic size={15} /> Voice</button></div><small id="voice-status">{voiceAvailable ? 'Voice capture available on this device' : 'Voice unavailable in this browser'}</small></div></div></div></div>
        {create.isError && <div className="form-error" role="alert">We couldn’t start this session. Please check your connection and try again.</div>}
        <div className="setup-footer"><div><ShieldCheck size={16} /> Private practice. Progress saved to your account.</div><Button type="submit" disabled={create.isPending || !role.trim()}>{create.isPending ? <><LoaderCircle size={16} className="spin" /> Setting up…</> : <>Start my session <ArrowRight size={16} /></>}</Button></div>
      </div>
      <aside className="setup-aside"><div className="aside-ornament"><span className="aside-ripple" /><AudioLines size={27} /></div><div className="eyebrow">A NOTE BEFORE YOU BEGIN</div><h2>There’s no score for being nervous.</h2><p>This is a practice room, not a test. Try an answer, learn something about how you think, then try again.</p><div className="aside-divider" /><div className="aside-tip"><Lightbulb size={17} /><span><strong>Try saying it your way.</strong><br />Your most useful answer is the honest one.</span></div></aside>
    </form>
  </div>;
}

function InterviewPage() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const queryClient = useQueryClient();
  const queryKey = getGetInterviewQueryKey(interviewId);
  const detail = useGetInterview(interviewId);
  const submit = useSubmitInterviewAnswer();
  const next = useGetNextInterviewQuestion();
  const complete = useCompleteInterview();
  const transcribe = useTranscribeInterviewAnswer();
  const [, setLocation] = useLocation();
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const current = detail.data?.questions?.find((q) => q.position === (detail.data?.answeredCount || 0)) || detail.data?.questions?.find((q) => !q.answer);
  const answered = detail.data?.answeredCount || 0;
  const total = detail.data?.questionCount || 1;
  const record = async () => {
    if (recording) { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setVoiceMessage('Voice capture is not supported in this browser. You can switch to text mode in your next session.'); return; }
    if (!current) return;
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stream?.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const audio = new Blob(chunks, { type: 'audio/webm' });
        if (!audio.size) {
          setVoiceMessage('No audio was captured. You can try again or type your answer.');
          return;
        }
        setVoiceMessage('Transcribing your answer…');
        transcribe.mutate({ interviewId, questionId: current.id, data: audio }, {
          onSuccess: ({ transcript }) => {
            setAnswer((previous) => (previous.trim() ? `${previous.trim()}\n\n${transcript}` : transcript).slice(0, 12000));
            setVoiceMessage('Transcript added. Review it, then submit your answer when ready.');
          },
          onError: () => setVoiceMessage('We couldn’t transcribe that recording. Please try again or type your answer.'),
        });
      };
      recorder.start(); setRecording(true); setVoiceMessage('Recording audio… Select stop when you’re finished.');
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 15000);
    } catch { stream?.getTracks().forEach((track) => track.stop()); setVoiceMessage('Microphone permission was not granted. You can still enter your answer below.'); setRecording(false); }
  };
  if (detail.isLoading) return <LoadingCard label="Opening your interview room" />;
  if (detail.isError || !detail.data) return <ErrorCard retry={() => detail.refetch()} message="We couldn’t open this interview session." />;
  const doSubmit = () => {
    if (!current || !answer.trim()) return;
    submit.mutate({ interviewId, questionId: current.id, data: { answer: answer.trim() } }, { onSuccess: (result) => { setFeedback(result.question); setAnswer(''); queryClient.invalidateQueries({ queryKey }); } });
  };
  const doNext = () => next.mutate({ interviewId }, { onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey });
    if (result.isComplete || !result.question) finish();
    else setFeedback(null);
  } });
  const finish = () => complete.mutate({ interviewId }, { onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: getListInterviewsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() }); setLocation(`/results/${result.interview.id}`); } });
  const answeredQuestion = feedback || detail.data.questions.find((q) => q.answer && q.position === answered);
  const waitingForNext = !!answeredQuestion && !feedback?.id;
  return <div className="interview-room">
    <div className="interview-top"><div><Link href="/dashboard" className="back-link"><ArrowLeft size={15} /> Leave room</Link><div className="session-chip"><span className="live-dot" /> SESSION IN PROGRESS</div><div className={`ai-mode-label ${detail.data.aiMode === 'demo' ? 'ai-mode-demo' : ''}`}>{detail.data.aiMode === 'demo' ? 'DEMO MODE · SAMPLE FEEDBACK' : 'AI-POWERED SESSION'}</div></div><Button variant="outline" onClick={() => { if (window.confirm('End this practice session and review your progress?')) finish(); }} disabled={complete.isPending}>{complete.isPending ? 'Wrapping up…' : 'End session'}</Button></div>
    <div className="interview-progress"><div className="progress-meta"><span>QUESTION {Math.min(answered + 1, total)} <span>OF {total}</span></span><span>{Math.round(answered / total * 100)}% COMPLETE</span></div><div className="progress-track"><span style={{ width: `${answered / total * 100}%` }} /></div></div>
    <div className="interview-layout"><section className="question-column"><div className="question-tag"><span>{current?.topic || detail.data.topic || 'Getting to know you'}</span>{current?.isFollowUp && <span className="followup-tag">FOLLOW-UP</span>}</div><div className="question-counter">QUESTION <span>{String(answered + 1).padStart(2, '0')}</span></div><h1>{current?.prompt || 'You’ve made it through this session.'}</h1><p className="question-prompt-sub">Take a moment to think. There’s no rush to find the perfect words.</p>
      {!answeredQuestion && <><div className="answer-wrap"><div className="answer-label"><label htmlFor="answer">YOUR ANSWER</label><span>{answer.length.toLocaleString()} / 12,000</span></div><textarea id="answer" value={answer} maxLength={12000} onChange={(e) => setAnswer(e.target.value)} placeholder="Start wherever feels natural…" rows={8} disabled={!current || submit.isPending} /><div className="answer-tools"><span><ShieldCheck size={14} /> Your answer is private</span>{detail.data.mode === 'voice' && <button type="button" className="voice-button" onClick={record} disabled={!current || submit.isPending || transcribe.isPending}>{recording ? <><Pause size={15} /> Stop recording</> : transcribe.isPending ? <><LoaderCircle size={15} className="spin" /> Transcribing…</> : <><Mic size={15} /> Record answer</>}</button>}</div>{detail.data.mode === 'voice' && <small className="voice-disclosure">Voice recordings are sent to OpenAI for transcription. The audio is not saved to your account.</small>}{voiceMessage && <p role="status" className="voice-status">{voiceMessage}</p>}</div><div className="answer-controls"><span>Take your time. Your first thought is a good place to start.</span><Button onClick={doSubmit} disabled={!answer.trim() || submit.isPending || !current}>{submit.isPending ? <><LoaderCircle size={16} className="spin" /> Reviewing…</> : <>Submit answer <ArrowRight size={16} /></>}</Button></div></>}
      {submit.isError && <div className="form-error" role="alert">Your answer couldn’t be submitted. Please try again.</div>}
      {answeredQuestion && waitingForNext && <div className="feedback-box"><div className="feedback-heading"><span className="feedback-check"><Check size={16} /></span><div><div className="eyebrow">ANSWER RECEIVED</div><h3>A moment to reflect.</h3></div></div><p>Your answer has been saved. Move on when you’re ready to see the next question.</p><Button onClick={doNext} disabled={next.isPending}>{next.isPending ? 'Finding your next question…' : answered >= total ? 'Finish session' : 'Next question'} <ArrowRight size={16} /></Button>{next.isError && <p className="form-error">Couldn’t load the next question. Try again.</p>}</div>}
      {feedback && <div className="feedback-box"><div className="feedback-heading"><span className="feedback-check"><Check size={16} /></span><div><div className="eyebrow">ANSWER SAVED</div><h3>Keep that momentum.</h3></div></div><p>Your answer is saved. Move on when you’re ready for the next question.</p><Button onClick={doNext} disabled={next.isPending}>{next.isPending ? 'Finding your next question…' : answered >= total ? 'Finish session' : 'Next question'} <ArrowRight size={16} /></Button>{next.isError && <p className="form-error">Couldn’t load the next question. Try again.</p>}</div>}
    </section><aside className="room-aside"><div className="room-quiet-art"><div><AudioLines size={21} /></div><span /><span /></div><div className="eyebrow">A LITTLE REMINDER</div><h3>You don’t have to sound rehearsed to sound ready.</h3><p>Speak to what you know. The real details are what make an answer yours.</p><div className="room-aside-bottom"><span><Clock3 size={14} /> YOUR OWN PACE</span><span>NO TIMER. NO PRESSURE.</span></div></aside></div>
  </div>;
}

function ResultsPage() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const interview = useGetInterview(interviewId);
  if (interview.isLoading) return <LoadingCard label="Gathering your session notes" />;
  if (interview.isError || !interview.data) return <ErrorCard retry={() => interview.refetch()} message="We couldn’t find the review for this session." />;
  const d = interview.data;
  const scored = d.questions.filter((q) => typeof q.score === 'number');
  const score = d.score ?? (scored.length ? Math.round(scored.reduce((sum, q) => sum + (q.score || 0), 0) / scored.length) : 0);
  const strengths = [...new Set(scored.flatMap((q) => q.strengths || []))];
  const improvements = [...new Set(scored.flatMap((q) => q.improvements || []))];
  const weakTopics = [...new Set(scored.filter((q) => (q.score || 100) < 65).map((q) => q.topic))];
  return <div className="results-page">
    <div className="results-return"><Link href="/history" className="back-link"><ArrowLeft size={15} /> All sessions</Link><span className="session-chip"><CheckCircle2 size={14} /> SESSION COMPLETE</span></div>
    <section className="results-hero"><div className="results-hero-copy"><div className="eyebrow">YOUR PRACTICE, REFLECTED</div><h1>That’s progress.</h1><p>{d.role} <span>·</span> {d.interviewType} <span>·</span> {new Date(d.completedAt || d.createdAt).toLocaleDateString()}</p>{d.aiMode === 'demo' && <span className="ai-mode-label ai-mode-demo">DEMO MODE · SAMPLE FEEDBACK</span>}<div className="results-summary-stats"><span><strong>{d.answeredCount}</strong> questions answered</span><span><strong>{d.topic || 'Full interview'}</strong> focus</span></div></div><div className="results-score"><ScoreCircle score={score} /><span>OVERALL SCORE</span></div></section>
    <div className="results-overview">
      <section className="content-panel insight-panel"><div className="panel-heading"><div><div className="eyebrow">WHAT’S WORKING</div><h2>Keep doing this.</h2></div><span className="insight-icon good"><CheckCircle2 size={18} /></span></div>{strengths.length ? <ul className="insight-list">{strengths.slice(0, 5).map((s, i) => <li key={`${s}-${i}`}><Check size={15} /> {s}</li>)}</ul> : <p className="muted-copy">Your next completed answer will reveal the strengths that came through.</p>}</section>
      <section className="content-panel insight-panel"><div className="panel-heading"><div><div className="eyebrow">ROOM TO GROW</div><h2>Your next focus.</h2></div><span className="insight-icon grow"><Target size={18} /></span></div>{improvements.length || weakTopics.length ? <ul className="insight-list improvement-list">{[...weakTopics.map((x) => `Spend a little time on ${x}.`), ...improvements].slice(0, 5).map((s, i) => <li key={`${s}-${i}`}><ArrowUpRight size={15} /> {s}</li>)}</ul> : <p className="muted-copy">Keep practising to reveal the most useful next step.</p>}</section>
    </div>
    <section className="content-panel question-review"><div className="panel-heading"><div><div className="eyebrow">QUESTION BY QUESTION</div><h2>Details worth keeping.</h2></div><span className="review-count">{d.questions.length} QUESTIONS</span></div>
      <div className="review-list">{d.questions.map((q) => <article className="review-item" key={q.id}><div className="review-item-top"><div><span className="review-q-number">Q{String(q.position).padStart(2, '0')}</span><span className="review-topic">{q.topic}</span></div><span className="review-score">{q.score ?? '—'}<small> / 100</small></span></div><h3>{q.prompt}</h3><p className="review-answer">{q.answer || 'No answer was recorded for this question.'}</p><div className="review-feedback-grid"><div><span className="eyebrow">WHAT LANDED</span><p>{q.correctness || (q.strengths?.length ? q.strengths.join(' ') : 'A thoughtful first attempt. Keep building on it.')}</p></div><div><span className="eyebrow">CLARITY</span><p>{q.clarity || (q.improvements?.length ? q.improvements.join(' ') : 'Your ideas came through. Try adding one specific detail next time.')}</p></div></div>{q.sampleAnswer && <details className="sample-answer"><summary><Lightbulb size={15} /> See a sample answer <ChevronDown size={14} /></summary><p>{q.sampleAnswer}</p></details>}</article>)}</div>
    </section>
    <div className="results-bottom"><div><div className="eyebrow">THE NEXT STEP IS YOURS</div><h2>Take what you learned with you.</h2></div><Button href="/study">Open my study plan <ArrowRight size={16} /></Button><Button href="/interview/setup" variant="outline">Practice again <RotateCcw size={15} /></Button></div>
  </div>;
}

function StudyPage() {
  const query = useListRecommendations();
  const update = useUpdateRecommendation();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const recommendations = query.data || [];
  if (query.isLoading) return <LoadingCard label="Building your study plan" />;
  if (query.isError) return <ErrorCard retry={() => query.refetch()} />;
  const toggle = (id: string, completed: boolean) => update.mutate({ recommendationId: id, data: { completed: !completed } }, { onSuccess: () => client.invalidateQueries({ queryKey: getListRecommendationsQueryKey() }) });
  const selected = recommendations.find((r) => r.id === selectedId);
  const done = recommendations.filter((r) => r.completed).length;
  return <div className="study-page"><PageHeading eyebrow="A PLAN THAT'S YOURS" title="Study with a purpose." detail="Small, focused steps—based on the way you actually answered." /><div className="study-progress-panel"><div><span className="study-progress-icon"><BookOpen size={19} /></span><div><strong>Your progress, at your pace</strong><small>{done} of {recommendations.length} focus areas completed</small></div></div><div className="study-bar"><span style={{ width: recommendations.length ? `${done / recommendations.length * 100}%` : '0%' }} /></div><span className="study-percent">{recommendations.length ? Math.round(done / recommendations.length * 100) : 0}%</span></div>
    {recommendations.length ? <div className="study-layout"><div className="study-list">{recommendations.map((r, i) => <article className={`study-card ${r.completed ? 'is-complete' : ''}`} key={r.id}><div className="study-card-top"><span className="study-index">{String(i + 1).padStart(2, '0')}</span><span className="study-topic-tag">{r.topic}</span><span className="study-time"><Clock3 size={13} /> {r.estimatedMinutes} min</span></div><h2>{r.title}</h2><p>{r.explanation}</p><div className="study-card-actions"><button className="study-link" onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}>{selectedId === r.id ? 'Close practice prompt' : 'Explore this focus'} <ArrowRight size={14} /></button><button onClick={() => toggle(r.id, r.completed)} disabled={update.isPending} className={`complete-button ${r.completed ? 'done' : ''}`}>{r.completed ? <><Check size={14} /> Completed</> : <>Mark complete <Check size={14} /></>}</button></div>{selectedId === r.id && <div className="practice-prompt"><div className="eyebrow">TRY THIS QUESTION</div><p>{r.practiceQuestion}</p></div>}</article>)}</div><aside className="study-aside"><div className="study-aside-art"><BookOpen size={25} /></div><div className="eyebrow">A GENTLE REMINDER</div><h3>You don’t have to do it all today.</h3><p>One focused ten minutes is still real progress. Come back when you’re ready for more.</p><Link href="/interview/setup" className="study-aside-link">Put it into practice <ArrowRight size={15} /></Link></aside></div> : <EmptyCard title="Your study plan will grow with your practice." detail="Complete an interview to get personal recommendations for what to explore next." action={<Button href="/interview/setup">Start a practice session <ArrowRight size={15} /></Button>} />}
  </div>;
}

function HistoryPage() {
  const sessions = useListInterviews();
  if (sessions.isLoading) return <LoadingCard label="Finding your past sessions" />;
  if (sessions.isError) return <ErrorCard retry={() => sessions.refetch()} />;
  const list = sessions.data || [];
  return <div className="history-page"><PageHeading eyebrow="YOUR PRACTICE, OVER TIME" title="Sessions." detail="Every attempt counts. Look back at how far you’ve come." action={<Button href="/interview/setup"><Plus size={16} /> New session</Button>} />
    <section className="content-panel history-panel">{list.length ? <><div className="history-header"><span>INTERVIEW</span><span>DATE</span><span>STATUS</span><span>SCORE</span><span /></div><div className="history-list">{list.map((s) => <article className="history-row" key={s.id}><span className="history-role-icon"><BriefcaseBusiness size={17} /></span><div className="history-role"><strong>{s.role}</strong><small>{s.interviewType} · {s.difficulty} · {s.topic || 'General'}</small></div><span className="history-date">{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span className={`status-pill ${s.status === 'completed' ? 'status-done' : 'status-current'}`}>{s.status === 'completed' ? 'Completed' : 'In progress'}</span><span className="history-score">{s.score ?? '—'}{s.score !== null && <small>/100</small>}</span><Link href={s.status === 'completed' ? `/results/${s.id}` : `/interview/${s.id}`} className="history-review">{s.status === 'completed' ? 'Review' : 'Continue'} <ArrowRight size={14} /></Link></article>)}</div></> : <EmptyCard title="This is where your progress takes shape." detail="Your completed practice sessions and the lessons inside them will live here." action={<Button href="/interview/setup">Start your first session <ArrowRight size={15} /></Button>} />}</section>
  </div>;
}

function ProfilePage() {
  const profile = useGetMyProfile();
  const update = useUpdateMyProfile();
  const client = useQueryClient();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [school, setSchool] = useState('');
  useEffect(() => { if (profile.data) { setDisplayName(profile.data.displayName || ''); setRole(profile.data.targetRole || ''); setLevel(profile.data.experienceLevel || ''); setSchool(profile.data.school || ''); } }, [profile.data]);
  if (profile.isLoading) return <LoadingCard label="Loading your profile" />;
  if (profile.isError || !profile.data) return <ErrorCard retry={() => profile.refetch()} message="We couldn’t load your profile details." />;
  const save = (e: FormEvent) => { e.preventDefault(); update.mutate({ data: { displayName, targetRole: role, experienceLevel: level || null, school: school || null } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetMyProfileQueryKey() }) }); };
  return <div className="profile-page"><PageHeading eyebrow="YOUR DETAILS" title="A little about you." detail="The more context you share, the more personal your practice can feel." /><div className="profile-layout"><section className="content-panel profile-form-panel"><div className="profile-identity"><span className="profile-big-avatar">{displayName?.slice(0, 1).toUpperCase() || 'S'}</span><div><h2>{displayName}</h2><p>{email}</p></div></div><div className="profile-divider" /><form onSubmit={save} className="profile-form"><label htmlFor="display-name">Display name<input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={120} /></label><label>Email address<input value={email} readOnly /></label><label htmlFor="target-role">Target role<input id="target-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. UX researcher" maxLength={120} required /></label><label htmlFor="experience-level">Experience level<select id="experience-level" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Select your level</option><option value="student">Student / first role</option><option value="early-career">Early career</option><option value="career-changer">Career changer</option><option value="experienced">Experienced professional</option></select></label><label htmlFor="school">School or program <span className="optional-label">OPTIONAL</span><input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Your school or program" /></label>{update.isError && <p role="alert" className="form-error">We couldn’t save your details. Please try again.</p>}{update.isSuccess && <p role="status" className="save-success"><CheckCircle2 size={15} /> Your details are up to date.</p>}<div className="profile-save"><span>Your details are only used to personalize practice.</span><Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : <><Save size={15} /> Save changes</>}</Button></div></form></section><aside className="profile-aside"><span className="profile-aside-icon"><ShieldCheck size={20} /></span><div className="eyebrow">YOUR ACCOUNT</div><h3>Your practice belongs to you.</h3><p>Your interview sessions, answers, and feedback stay connected to your account. You can update your learning context any time.</p><Link href="/help" className="panel-link">Account help <ArrowRight size={14} /></Link></aside></div></div>;
}

function AboutPage() {
  return <div className="info-page">
    <PageHeading eyebrow="WHY THIS ROOM EXISTS" title="Practice is how confidence grows." detail="Interview Coach AI is built around a simple idea: students deserve a supportive place to practise before the moment that matters." />
    <div className="info-hero-panel"><div className="info-hero-art"><span className="info-orbit" /><AudioLines size={36} /></div><div><div className="eyebrow">HONEST PRACTICE. VISIBLE PROGRESS.</div><h2>Better answers start with a safe first try.</h2><p>Job interviews can feel like a test you’re expected to pass without ever having taken one. This space makes that practice possible—personal, repeatable, and focused on helping you move forward.</p></div></div>
    <div className="info-values"><article><span>01</span><h3>Encouragement without the fluff.</h3><p>Feedback should help you see what you did well and what to strengthen. Not leave you guessing.</p></article><article><span>02</span><h3>Progress you can point to.</h3><p>Session history and a personal study plan help turn effort into clear, visible next steps.</p></article><article><span>03</span><h3>Your voice, not a perfect script.</h3><p>The goal isn’t to sound rehearsed. It’s to feel ready to tell your own story.</p></article></div>
    <section className="project-team"><div className="eyebrow">PROJECT TEAM</div><h2>Built around student practice.</h2><p>Contributor names and roles have not been provided yet. This page focuses on the project goals rather than inventing team biographies.</p></section>
    <div className="info-impact"><div><div className="eyebrow">THE OUTCOME WE CARE ABOUT</div><h2>More students walking in knowing they’ve done the work.</h2></div><p>Interview Coach AI brings practice, thoughtful feedback, and focused learning together—so preparation feels less like a mystery and more like a skill you can build.</p></div>
    <div className="info-end"><div><h2>Ready to try a first question?</h2><p>A small beginning is still a beginning.</p></div><Button href="/interview/setup">Start practicing <ArrowRight size={16} /></Button></div>
  </div>;
}
function HelpPage() {
  const faqs = [
    ['Is this a real interview or a test?', 'It’s practice, not a test. The room is designed to help you try answers, understand what’s working, and build confidence at your own pace.'],
    ['How do I get useful feedback?', 'Answer as honestly and specifically as you can. After your response, your review highlights strengths and a few concrete ways to make your story clearer.'],
    ['Can I practise without a microphone?', 'Yes. Text mode is always available. Voice mode is offered when your browser supports WebM recording. Audio is sent to OpenAI for transcription; only the text you choose to submit is saved to your account.'],
    ['Why does my session say demo mode?', 'Demo mode uses sample questions and clearly labelled sample feedback when AI is not configured. Live sessions use AI-generated questions and evaluation.'],
    ['Where can I find my past sessions?', 'Your session history is available from Sessions in the sidebar. Select a completed session to review each answer and its feedback.'],
    ['How does my study plan work?', 'After practice, your weaker topics can inform personalized recommendations. Mark a focus area complete when you’ve spent time with it.'],
  ];
  return <div className="help-page">
    <PageHeading eyebrow="WE’RE HERE FOR YOU" title="A few helpful answers." detail="A good practice room should make it easy to get started—and easy to ask for help." />
    <div className="help-layout">
      <section className="faq-list"><div className="eyebrow">FREQUENTLY ASKED</div>{faqs.map(([q, a]) => <details className="faq-item" key={q}><summary>{q}<ChevronDown size={17} /></summary><p>{a}</p></details>)}</section>
      <aside className="help-contact"><span className="contact-icon"><MessageSquareText size={21} /></span><div className="eyebrow">STILL HAVE A QUESTION?</div><h2>We’d like to hear from you.</h2><p>Send a note and tell us what would make your practice experience better.</p>
        {supportEmail ? <><a className="button button-primary" href={`mailto:${supportEmail}?subject=Interview%20Coach%20AI%20support`}>Contact support <ArrowRight size={15} /></a><span className="contact-caption">We’ll get back to you as soon as we can.</span></> : <p className="contact-unconfigured" role="status">Support contact details have not been configured yet.</p>}
      </aside>
    </div>
    <div className="help-bottom"><span><ShieldCheck size={17} /> Your answers are yours.</span><p>Your practice data is connected to your account and used to personalize your learning.</p><Link href="/profile">Review account details <ArrowRight size={14} /></Link></div>
  </div>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/dashboard" /></Show><Show when="signed-out"><PublicHome /></Show></>;
}
function Protected({ component: Component }: { component: () => ReactNode }) {
  return <SignedInGate><AppShell><Component /></AppShell></SignedInGate>;
}
function InfoRoute({ component: Component }: { component: () => ReactNode }) {
  return <><Show when="signed-in"><Protected component={Component} /></Show><Show when="signed-out"><div className="public-info-wrap"><header className="public-info-nav"><Brand /><div><Link href="/about">Our approach</Link><Link href="/help">Help</Link><Link href="/sign-in">Sign in</Link></div></header><main className="public-info-content"><Component /></main><footer className="public-info-footer">Interview Coach AI · Practice for the moment that matters.</footer></div></Show></>;
}
function SignInRoute() { return <SignInPage />; }
function SignUpRoute() { return <SignUpPage />; }

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  useEffect(() => {
    let previous: string | null | undefined;
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previous !== undefined && previous !== userId) cache.clear();
      previous = userId;
    });
    return unsubscribe;
  }, [addListener, cache]);
  return null;
}
function RoutedApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to return to your practice room.' } }, signUp: { start: { title: 'Create your practice space', subtitle: 'Build confidence one thoughtful session at a time.' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <ClerkQueryClientCacheInvalidator />
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInRoute} />
      <Route path="/sign-up/*?" component={SignUpRoute} />
      <Route path="/dashboard">{() => <Protected component={DashboardPage} />}</Route>
      <Route path="/interview/setup">{() => <Protected component={SetupPage} />}</Route>
      <Route path="/interview/:interviewId">{() => <Protected component={InterviewPage} />}</Route>
      <Route path="/results/:interviewId">{() => <Protected component={ResultsPage} />}</Route>
      <Route path="/study">{() => <Protected component={StudyPage} />}</Route>
      <Route path="/history">{() => <Protected component={HistoryPage} />}</Route>
      <Route path="/profile">{() => <Protected component={ProfilePage} />}</Route>
      <Route path="/about">{() => <InfoRoute component={AboutPage} />}</Route>
      <Route path="/help">{() => <InfoRoute component={HelpPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  </ClerkProvider>;
}
function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><RoutedApp /></WouterRouter></QueryClientProvider>;
}
export default App;
