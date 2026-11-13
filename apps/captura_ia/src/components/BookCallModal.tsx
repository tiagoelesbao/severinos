import React, { useState } from 'react';
import { X, ArrowRight, CalendarCheck, Sparkles, ExternalLink } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { CALENDLY_URL, calendlyUrlWithTracking, newTrackingId, registerBooking } from '../lib/api';

interface BookCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BOOKING_STORAGE_KEY = 'oraclum_booking';

/** Nichos que atendemos — ordenados por proximidade com os serviços prestados. */
const BUSINESS_TYPES = [
  'Agência Digital / Marketing',
  'Criador de Conteúdo / Influenciador',
  'Coach / Mentor',
  'Infoprodutor / Educação Online',
  'Consultoria / Serviços B2B',
  'Clínica / Estética / Saúde',
  'Academia / Personal / Nutrição',
  'Advocacia / Escritório Jurídico',
  'Imobiliária / Corretor',
  'E-commerce / Loja Virtual',
  'SaaS / Startup de Tecnologia',
  'Serviços Locais (reforma, instalação, manutenção)',
  'Restaurante / Food Service',
  'Outro',
];

export const BookCallModal: React.FC<BookCallModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scheduleUrl, setScheduleUrl] = useState(CALENDLY_URL);

  // Hooks must run on every render — the early return comes after all of them.
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 3) {
      setErrorMsg('Informe seu nome completo');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setErrorMsg('Informe um telefone com DDD');
      return;
    }

    if (!businessType) {
      setErrorMsg('Selecione o seu modelo de negócio');
      return;
    }

    setErrorMsg('');

    // O rastreio é gerado aqui, antes de qualquer rede: a aba do Calendly
    // precisa abrir no mesmo gesto do clique, senão o bloqueador de pop-up
    // derruba. O UUID é opaco — não leva dado pessoal na query string.
    const trackingId = newTrackingId();
    const url = calendlyUrlWithTracking(trackingId);
    setScheduleUrl(url);

    try {
      localStorage.setItem(
        BOOKING_STORAGE_KEY,
        JSON.stringify({
          trackingId,
          name: name.trim(),
          phone: phone.trim(),
          businessType,
          at: new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.warn('Não foi possível salvar o contato localmente:', err);
    }

    window.open(url, '_blank', 'noopener,noreferrer');

    // Cria o card no ClickUp em segundo plano. Se falhar, a reunião continua
    // de pé — perdemos o registro, não o agendamento.
    void registerBooking({
      trackingId,
      name: name.trim(),
      phone: phone.trim(),
      businessType,
    });

    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Marcar reunião de estratégia"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f1a] border border-purple-900/50 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
      >

        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!isSubmitted ? (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-[10px] font-bold uppercase mb-2">
                <Sparkles className="w-3 h-3 text-purple-400" /> MENTORIA 1:1 COM IA
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                Marcar Reunião de Estratégia de Conteúdo & Anúncios com IA
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Uma conversa de 30 minutos com a equipe ORACLUM TECH para automatizar o conteúdo, os anúncios e o CRM da sua empresa. Você escolhe o horário na próxima etapa.
              </p>
            </div>

            <form onSubmit={handleBooking} className="space-y-4">

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Seu Nome Completo"
                  aria-label="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161622] border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                  required
                />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Seu Melhor Contato (WhatsApp com DDD)"
                  aria-label="Seu melhor contato — telefone com DDD"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#161622] border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="business-type" className="text-xs text-zinc-400 mb-1 block">
                  Modelo de Negócio
                </label>
                <select
                  id="business-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-[#161622] border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-purple-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    Selecione o seu segmento
                  </option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
              >
                Marcar Reunião <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                Você será levado à nossa agenda para escolher o dia e o horário.
              </p>

            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-900/60 border border-purple-500 text-purple-300 flex items-center justify-center mx-auto">
              <CalendarCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Agenda aberta em uma nova aba</h3>
            <p className="text-xs text-zinc-300 max-w-xs mx-auto leading-relaxed">
              Escolha o melhor dia e horário por lá para confirmar a reunião. Se a aba não abriu, use o botão abaixo.
            </p>

            <a
              href={scheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Abrir a agenda <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div>
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
