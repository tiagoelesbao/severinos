import React, { useState, useRef } from 'react';
import { ArrowRight, Lock, Unlock, Sparkles, CheckCircle2, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { UserLead } from '../types';
import { RESOURCES_DATA, CATEGORY_LABELS } from '../data/resources';

interface MarqueeCardProps {
  title: string;
  categoryLabel: string;
  badgeClass: string;
  onClick: () => void;
  /** Cópia usada só para fechar o loop da animação — inerte para tecnologia assistiva. */
  duplicate: boolean;
}

/** Card da esteira de prévia. É um <button> porque leva o usuário ao formulário. */
const MarqueeCard: React.FC<MarqueeCardProps> = ({
  title,
  categoryLabel,
  badgeClass,
  onClick,
  duplicate,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-hidden={duplicate || undefined}
    tabIndex={duplicate ? -1 : undefined}
    className="bg-[#12121c]/90 border border-zinc-800 hover:border-purple-500/50 rounded-xl px-4 py-3 w-[280px] flex-shrink-0 cursor-pointer flex flex-col justify-between transition-all hover:bg-[#181828] group shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
  >
    <div className="flex items-center justify-between gap-2 mb-1.5 w-full">
      <span
        className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}
      >
        {categoryLabel}
      </span>
      <Lock
        className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 transition-colors"
        aria-hidden="true"
      />
    </div>
    <p className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-1 text-left w-full">
      {title}
    </p>
  </button>
);

interface HeroSectionProps {
  unlocked: boolean;
  onUnlockSubmit: (lead: UserLead) => void;
  userLead: UserLead | null;
  onGoToVaultPage: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  unlocked,
  onUnlockSubmit,
  userLead,
  onGoToVaultPage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Form State
  const [fullName, setFullName] = useState(userLead?.fullName || '');
  const [email, setEmail] = useState(userLead?.email || '');
  const [countryCode, setCountryCode] = useState('+55');
  const [phone, setPhone] = useState(userLead?.phone || '');
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Escreve o brilho direto no DOM para não re-renderizar o hero a cada pixel.
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !glowRef.current) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.background =
      `radial-gradient(750px circle at ${x}px ${y}px, rgba(147, 51, 234, 0.28), rgba(126, 34, 206, 0.08) 45%, transparent 75%)`;
  };

  const setGlowOpacity = (opacity: string) => {
    if (glowRef.current) glowRef.current.style.opacity = opacity;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (fullName.trim().length < 3) {
      setErrorMsg('Por favor, informe seu nome completo');
      return;
    }
    // Validação de e-mail: usuário@dominio.tld
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setErrorMsg('Por favor, informe um e-mail válido');
      return;
    }
    // Telefone é opcional, mas se preenchido precisa ter DDD + número (10 a 13 dígitos)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 0 && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      setErrorMsg('Telefone incompleto — informe DDD + número, ou deixe o campo vazio');
      return;
    }
    if (!agreed) {
      setErrorMsg('Você precisa aceitar os termos para prosseguir');
      return;
    }

    setErrorMsg('');
    onUnlockSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phoneDigits ? `${countryCode} ${phone.trim()}` : '',
      agreedToTerms: agreed,
    });
  };

  const handlePreviewCardClick = () => {
    if (unlocked) {
      onGoToVaultPage();
    } else if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
      formRef.current.classList.add('ring-2', 'ring-purple-500');
      setTimeout(() => {
        formRef.current?.classList.remove('ring-2', 'ring-purple-500');
      }, 1500);
    }
  };

  const row1Resources = RESOURCES_DATA.slice(0, 10);
  const row2Resources = RESOURCES_DATA.slice(10, 20);

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setGlowOpacity('1')}
      onMouseLeave={() => setGlowOpacity('0.6')}
      className="relative min-h-[90vh] pt-12 sm:pt-16 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between bg-[#08080C] bg-grid-pattern border-b border-zinc-800/60 overflow-hidden select-none"
    >
      {/* Interactive Purple Spotlight Glow following mouse cursor */}
      <div 
        ref={glowRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: 0.6,
          background: 'radial-gradient(750px circle at 50% 40%, rgba(147, 51, 234, 0.28), rgba(126, 34, 206, 0.08) 45%, transparent 75%)',
        }}
      />

      {/* Secondary ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Content Center Box */}
      <div className="relative z-10 max-w-xl w-full mx-auto text-center mb-16">
        
        {/* FREE FOREVER Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-semibold tracking-widest uppercase mb-6 shadow-lg shadow-purple-950/50 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" /> GRATUITO PARA SEMPRE
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-[1.15]">
          Acesse todos os nossos <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-purple-200">
            recursos gratuitos
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-zinc-300 mb-8 max-w-lg mx-auto font-normal leading-relaxed">
          Desbloqueie todos os guias, prompts, blocos e sistemas do cofre — <span className="text-white font-medium">além de tudo o que adicionarmos no futuro.</span>
        </p>

        {/* Form or Unlocked Card */}
        {!unlocked ? (
          <div 
            ref={formRef}
            className="bg-[#101018]/90 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 text-left backdrop-blur-xl shadow-2xl relative transition-all"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  aria-label="Nome completo"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#181824] border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-label="Seu melhor e-mail"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181824] border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  required
                />
              </div>

              {/* Phone with Country Code */}
              <div className="flex gap-2">
                <select
                  aria-label="Código do país"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-[#181824] border border-zinc-800 text-white rounded-xl px-3 py-3 text-sm font-mono outline-none cursor-pointer focus:border-purple-500"
                >
                  <option value="+55">+55 (BR)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+351">+351 (PT)</option>
                  <option value="+34">+34 (ES)</option>
                  <option value="+44">+44 (UK)</option>
                </select>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel-national"
                  inputMode="tel"
                  aria-label="Telefone ou WhatsApp com DDD (opcional)"
                  placeholder="Telefone / WhatsApp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#181824] border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded bg-[#181824] border-zinc-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-600"
                />
                <label htmlFor="terms" className="text-[11px] leading-relaxed text-zinc-400 select-none">
                  Concordo com os <a href="#terms" className="text-purple-400 hover:underline">Termos e Condições</a> e <a href="#privacy" className="text-purple-400 hover:underline">Política de Privacidade</a> e autorizo receber e-mails, SMS e mensagens de WhatsApp de ORACLUM TECH nos dados fornecidos. Você pode cancelar a inscrição a qualquer momento.
                </label>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl"
                >
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/10 hover:shadow-purple-500/20 active:scale-[0.99] cursor-pointer"
              >
                Desbloquear o cofre <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

            </form>
          </div>
        ) : (
          /* Unlocked Success Card */
          <div className="bg-[#12121e]/90 border border-purple-500/50 rounded-2xl p-6 sm:p-8 text-center backdrop-blur-xl shadow-2xl space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500 text-purple-300 mb-1">
              <CheckCircle2 className="w-6 h-6 text-purple-400" />
            </div>
            
            <h2 className="text-xl font-extrabold text-white">Acesso ao Cofre Liberado!</h2>
            <p className="text-xs text-zinc-300 max-w-md mx-auto">
              Bem-vindo, {userLead?.fullName || 'Membro VIP'}. Você agora tem acesso total a todos os 26+ blueprints de prompts, conectores MCP e sistemas de automação.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onGoToVaultPage}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer hover:scale-105"
              >
                <Unlock className="w-4 h-4" aria-hidden="true" /> Acessar o Cofre completo de prompts →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Horizontal Scrolling Preview Ticker Section ("UMA PRÉVIA DO QUE VOCÊ IRÁ DESBLOQUEAR") */}
      <div className="relative z-10 w-full max-w-7xl mx-auto pt-6 border-t border-zinc-800/60">
        <div className="text-center mb-6">
          <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
            UMA PRÉVIA DO QUE VOCÊ IRÁ DESBLOQUEAR
          </h2>
        </div>

        {/* 2 Scrolling Marquee Rows */}
        <div className="space-y-3 overflow-hidden mask-horizontal-fade">

          {/* Row 1 Moving Left */}
          <div className="animate-marquee flex gap-3 py-1">
            {row1Resources.concat(row1Resources).map((res, index) => (
              <MarqueeCard
                key={`r1-${res.id}-${index}`}
                title={res.title}
                categoryLabel={CATEGORY_LABELS[res.category]}
                onClick={handlePreviewCardClick}
                badgeClass="text-purple-300 bg-purple-950/80 border-purple-800/80"
                // A segunda metade só existe para o loop da animação: some do
                // leitor de tela e da ordem de tabulação para não duplicar conteúdo.
                duplicate={index >= row1Resources.length}
              />
            ))}
          </div>

          {/* Row 2 Moving Right */}
          <div className="animate-marquee-reverse flex gap-3 py-1">
            {row2Resources.concat(row2Resources).map((res, index) => (
              <MarqueeCard
                key={`r2-${res.id}-${index}`}
                title={res.title}
                categoryLabel={CATEGORY_LABELS[res.category]}
                onClick={handlePreviewCardClick}
                badgeClass="text-indigo-300 bg-indigo-950/80 border-indigo-800/80"
                duplicate={index >= row2Resources.length}
              />
            ))}
          </div>

        </div>
      </div>

    </section>
  );
};
