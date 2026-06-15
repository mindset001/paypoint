import Link from 'next/link';
import {
  Phone, Wifi, Tv, Zap, BookOpen,
  Shield, Clock, Zap as ZapIcon, Star,
  ArrowRight, CheckCircle, ChevronRight,
  Users, TrendingUp, Award,
} from 'lucide-react';

const SERVICES = [
  { icon: Phone, label: 'Airtime', desc: 'All networks', color: 'bg-yellow-50 text-yellow-600', border: 'border-yellow-100', glow: 'hover:shadow-yellow-100' },
  { icon: Wifi, label: 'Data', desc: 'SME & corporate', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100', glow: 'hover:shadow-blue-100' },
  { icon: Tv, label: 'Cable TV', desc: 'DStv, GOtv, Startimes', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100', glow: 'hover:shadow-purple-100' },
  { icon: Zap, label: 'Electricity', desc: 'All DisCos', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100', glow: 'hover:shadow-orange-100' },
  { icon: BookOpen, label: 'Exam Pins', desc: 'WAEC, NECO, JAMB', color: 'bg-green-50 text-green-600', border: 'border-green-100', glow: 'hover:shadow-green-100' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create account', desc: 'Sign up in under 2 minutes with your phone number and email.' },
  { step: '02', title: 'Fund your wallet', desc: 'Add money via card, bank transfer, or USSD — instantly credited.' },
  { step: '03', title: 'Pay anything', desc: 'Buy airtime, data, pay bills and more at the best rates.' },
];

const TRUST_POINTS = [
  { icon: Shield, label: 'Bank-grade security', desc: 'All transactions encrypted end-to-end.', color: 'bg-blue-50 text-brand-blue' },
  { icon: ZapIcon, label: 'Instant delivery', desc: 'Airtime and data delivered in seconds.', color: 'bg-yellow-50 text-yellow-600' },
  { icon: Clock, label: '24/7 service', desc: 'Pay bills any time, day or night.', color: 'bg-purple-50 text-purple-600' },
  { icon: Star, label: 'Best rates', desc: 'Discounted prices on every service.', color: 'bg-green-50 text-green-600' },
];

const TESTIMONIALS = [
  { name: 'Chioma A.', location: 'Lagos', text: "PayPoint has made paying my DSTV subscription so easy. I don't have to visit any shop anymore!", rating: 5 },
  { name: 'Emeka O.', location: 'Abuja', text: "Fastest airtime purchase I've ever used. The money left my wallet and the airtime was on my phone instantly.", rating: 5 },
  { name: 'Fatima B.', location: 'Kano', text: 'I use PayPoint to buy data for my business phone every week. The SME data rates are the cheapest around.', rating: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">PayPoint</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Services', 'How it works', 'Reviews'].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(' ', '-')}`}
                className="text-white/60 text-sm font-medium hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="text-white/70 text-sm font-medium px-4 py-2 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/register"
              className="bg-brand-blue text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-blue-500/30 active:scale-95">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────── */}
      <section className="relative bg-brand-dark pt-16 overflow-hidden min-h-screen flex items-center">
        {/* Animated background blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-brand-blue/20 rounded-full blur-3xl animate-float-simple" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-float-simple" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-simple hidden lg:block" style={{ animationDelay: '1s' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-8 w-full py-20 lg:py-28">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-6 animate-fade-up-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse relative pulse-ring" />
                <span className="text-white/80 text-xs font-medium">Nigeria&apos;s fastest VTU platform</span>
              </div>

              <h1 className="text-white font-black leading-[1.1] mb-6 animate-fade-up-2">
                <span className="block text-4xl md:text-5xl lg:text-6xl">Pay bills &amp;</span>
                <span className="block text-4xl md:text-5xl lg:text-6xl">buy airtime</span>
                <span className="block text-4xl md:text-5xl lg:text-6xl shimmer-text">instantly.</span>
              </h1>

              <p className="text-white/60 text-base lg:text-lg leading-relaxed mb-8 max-w-lg animate-fade-up-3">
                Airtime, data, electricity, cable TV, exam pins and more — all in one app, at the best prices in Nigeria.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-fade-up-4">
                <Link href="/register"
                  className="flex items-center justify-center gap-2 bg-brand-blue text-white font-bold text-base py-4 px-8 rounded-2xl hover:bg-primary-700 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                  Create free account
                  <ArrowRight size={18} />
                </Link>
                <Link href="/login"
                  className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold text-base py-4 px-8 rounded-2xl hover:bg-white/20 active:scale-[0.98] transition-all">
                  Sign in
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10 animate-fade-up-5">
                {[
                  { value: '50K+', label: 'Active users', icon: Users },
                  { value: '₦2B+', label: 'Processed', icon: TrendingUp },
                  { value: '99.9%', label: 'Uptime', icon: Award },
                ].map((s) => (
                  <div key={s.label} className="text-center group">
                    <p className="text-white text-2xl font-black group-hover:text-brand-blue transition-colors">{s.value}</p>
                    <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — 3D floating app mockup */}
            <div className="hidden lg:flex items-center justify-center animate-slide-right">
              <div className="relative animate-float" style={{ perspective: '1000px' }}>
                {/* Glow rings */}
                <div className="absolute inset-0 bg-brand-blue/20 rounded-3xl blur-3xl scale-125 animate-pulse" />
                <div className="absolute inset-0 bg-purple-500/10 rounded-3xl blur-2xl scale-110" />

                <div className="relative w-80 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl"
                  style={{ transform: 'rotateY(-8deg) rotateX(4deg)', transformStyle: 'preserve-3d' }}>

                  {/* Gloss overlay */}
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />

                  {/* Wallet balance */}
                  <div className="bg-gradient-to-br from-brand-blue/40 to-blue-700/40 rounded-2xl p-4 mb-4 border border-white/10">
                    <p className="text-white/60 text-xs mb-1">Wallet Balance</p>
                    <p className="text-white text-3xl font-black">₦ 24,500<span className="text-lg font-semibold">.00</span></p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <p className="text-white/50 text-xs">Updated just now</p>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { icon: Phone, label: 'Airtime', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
                      { icon: Wifi, label: 'Data', bg: 'bg-blue-500/20', text: 'text-blue-300' },
                      { icon: Zap, label: 'Electric', bg: 'bg-orange-500/20', text: 'text-orange-300' },
                    ].map(({ icon: Icon, label, bg, text }) => (
                      <div key={label} className={`${bg} rounded-xl p-3 flex flex-col items-center gap-1`}>
                        <Icon size={16} className={text} />
                        <span className="text-white/70 text-xs">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Transactions */}
                  <div className="space-y-2.5">
                    {[
                      { label: 'MTN Airtime', amount: '-₦500', time: '2m ago', credit: false },
                      { label: 'Wallet Funded', amount: '+₦5,000', time: '1h ago', credit: true },
                      { label: 'DSTV Premium', amount: '-₦21,000', time: '3d ago', credit: false },
                    ].map((tx) => (
                      <div key={tx.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${tx.credit ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                            {tx.credit ? '+' : '−'}
                          </div>
                          <div>
                            <p className="text-white/80 text-xs font-medium">{tx.label}</p>
                            <p className="text-white/30 text-xs">{tx.time}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-bold ${tx.credit ? 'text-green-400' : 'text-white/60'}`}>{tx.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-float-simple" style={{ animationDelay: '1s' }}>
                  ✓ Instant delivery
                </div>
                <div className="absolute -top-3 -left-3 bg-white text-brand-dark text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-float-simple" style={{ animationDelay: '0.5s' }}>
                  🔒 Bank-grade security
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────── */}
      <section id="services" className="bg-gray-50 px-5 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">What we offer</p>
            <h2 className="text-gray-900 text-3xl lg:text-4xl font-black">Everything you need,<br className="hidden sm:block" /> one wallet.</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SERVICES.map(({ icon: Icon, label, desc, color, border, glow }, i) => (
              <div
                key={label}
                className={`bg-white rounded-2xl p-5 border ${border} flex flex-col gap-3 transition-all duration-300 cursor-default
                  hover:-translate-y-2 hover:shadow-xl ${glow} hover:shadow-lg`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-transform duration-300 hover:scale-110`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-gray-900 text-sm font-bold leading-tight">{label}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-5 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">Simple process</p>
            <h2 className="text-gray-900 text-3xl lg:text-4xl font-black">Up and running in 3 minutes.</h2>
          </div>

          {/* mobile */}
          <div className="flex flex-col gap-6 md:hidden max-w-lg mx-auto">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-brand-blue flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                    <span className="text-white text-xs font-black">{item.step}</span>
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-2 min-h-[2rem]" />}
                </div>
                <div className="pb-4">
                  <h3 className="text-gray-900 font-bold text-base">{item.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* desktop */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative text-center group">
                <div className="w-20 h-20 rounded-3xl bg-brand-blue flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-blue-500/50">
                  <span className="text-white text-xl font-black">{item.step}</span>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute top-10 left-[calc(50%+3rem)] right-[calc(-50%+3rem)] h-px bg-gradient-to-r from-brand-blue/40 to-transparent" />
                )}
                <h3 className="text-gray-900 font-black text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ───────────────────────────────────── */}
      <section className="bg-gray-50 px-5 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">Why PayPoint</p>
            <h2 className="text-gray-900 text-3xl lg:text-4xl font-black">Built for Nigeria. Built to last.</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {TRUST_POINTS.map(({ icon: Icon, label, desc, color }) => (
              <div key={label}
                className="bg-white rounded-2xl p-6 border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group cursor-default">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                  <Icon size={22} />
                </div>
                <p className="text-gray-900 font-bold text-sm mb-1">{label}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto bg-green-50 border border-green-100 rounded-2xl p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
            <CheckCircle size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-bold">CBN compliant</p>
              <p className="text-green-700/70 text-sm mt-0.5">
                PayPoint operates within CBN guidelines for digital payments and agent banking in Nigeria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────── */}
      <section id="reviews" className="bg-white px-5 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mb-2">Reviews</p>
            <h2 className="text-gray-900 text-3xl lg:text-4xl font-black">Loved by thousands across Nigeria.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:bg-white cursor-default"
                style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="flex gap-0.5 mb-4">
                  {Array(t.rating).fill(0).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center shadow-md shadow-blue-500/20">
                    <span className="text-white text-sm font-bold">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm font-semibold">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="relative bg-brand-dark px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 animate-float-simple">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <h2 className="text-white text-3xl lg:text-4xl font-black mb-4">
            Start paying smarter today.<br />It&apos;s free.
          </h2>
          <p className="text-white/50 text-base mb-10 leading-relaxed">
            Join over 50,000 Nigerians who pay bills, buy airtime and data on PayPoint every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="flex items-center justify-center gap-2 bg-brand-blue text-white font-bold text-base py-4 px-8 rounded-2xl hover:bg-primary-700 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5">
              Create free account
              <ChevronRight size={18} />
            </Link>
            <Link href="/login"
              className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold text-base py-4 px-8 rounded-2xl hover:bg-white/20 active:scale-[0.98] transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="bg-brand-dark border-t border-white/10 px-5 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
                  <Zap size={14} className="text-white fill-white" />
                </div>
                <span className="text-white font-black text-lg">PayPoint</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Nigeria&apos;s fastest digital payments platform. Pay bills, buy airtime and data instantly.
              </p>
            </div>

            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Product</p>
              {['Airtime', 'Data', 'Electricity', 'Cable TV', 'Exam Pins'].map((l) => (
                <p key={l} className="text-white/60 text-sm py-0.5 hover:text-white/80 cursor-pointer transition-colors">{l}</p>
              ))}
            </div>

            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Company</p>
              {['About', 'Contact', 'Privacy Policy', 'Terms of Use'].map((l) => (
                <p key={l} className="text-white/60 text-sm py-0.5 hover:text-white/80 cursor-pointer transition-colors">{l}</p>
              ))}
            </div>

            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Support</p>
              {['Help Center', 'API Docs', 'Status', 'Report Issue'].map((l) => (
                <p key={l} className="text-white/60 text-sm py-0.5 hover:text-white/80 cursor-pointer transition-colors">{l}</p>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-2">
            <p className="text-white/30 text-xs">© {new Date().getFullYear()} PayPoint. All rights reserved.</p>
            <p className="text-white/20 text-xs">A digital payments platform operating in Nigeria.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
