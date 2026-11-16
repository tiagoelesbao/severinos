import React, { useState } from 'react';
import { Resource } from '../types';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, HelpCircle, AlertCircle, Calendar, Sparkles, BookOpen } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/resources';
import { ROUTES } from '../lib/router';

/** Links internos usam o roteador por hash (#/recursos/...); o resto abre em nova aba. */
const isInternal = (url: string) => url.startsWith('#');

interface ResourceArticleViewProps {
  resource: Resource;
  onBackToVault: () => void;
  onBookCall: () => void;
}

export const ResourceArticleView: React.FC<ResourceArticleViewProps> = ({
  resource,
  onBackToVault,
  onBookCall
}) => {
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#08080C] text-zinc-100 font-sans selection:bg-purple-500/30 selection:text-purple-200 pb-24">
      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#08080C]/90 backdrop-blur-md border-b border-zinc-800 px-4 lg:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a
            href={ROUTES.vault}
            onClick={(e) => {
              e.preventDefault();
              onBackToVault();
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-zinc-800/60 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Voltar ao Cofre</span>
          </a>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
              {resource.estimatedReadTime || '5 min de leitura'}
            </span>
            <button
              type="button"
              onClick={onBookCall}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-1.5 rounded-full text-xs transition-colors shadow-sm shadow-purple-900/40 cursor-pointer"
            >
              Agendar reunião
            </button>
          </div>
        </div>
      </header>

      {/* Main Article Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* Category Tag */}
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider text-purple-300 bg-purple-950/70 border border-purple-800/80 rounded-full uppercase">
            {CATEGORY_LABELS[resource.category]}
          </span>
        </div>

        {/* Article Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          {resource.title}
        </h1>

        {/* Subtitle / Intro */}
        {resource.subtitle && (
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal mb-8 pb-8 border-b border-zinc-800/80">
            {resource.subtitle}
          </p>
        )}

        {/* What You'll Be Able To Do */}
        {resource.whatYouWillDo && resource.whatYouWillDo.length > 0 && (
          <div className="mb-10 bg-gradient-to-b from-purple-950/30 to-zinc-900/60 border border-purple-800/40 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" aria-hidden="true" />
              <span>O que você será capaz de fazer</span>
            </h2>
            <ul className="space-y-3">
              {resource.whatYouWillDo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-zinc-200 text-sm leading-relaxed">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-purple-300 text-xs font-bold">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Before You Start */}
        {resource.beforeYouStart && resource.beforeYouStart.length > 0 && (
          <div className="mb-10 bg-[#12121c] border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" aria-hidden="true" />
              <span>Antes de começar</span>
            </h2>
            <ul className="space-y-2.5">
              {resource.beforeYouStart.map((req, idx) => (
                <li key={idx} className="flex items-start gap-3 text-zinc-300 text-sm">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary Prompt Snippet */}
        {resource.promptText && !resource.steps && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-3">
              {/* h2, não h3: sem os blocos opcionais acima este é o primeiro
                  subtítulo depois do h1 e não pode pular nível. */}
              <h2 className="text-sm font-semibold text-zinc-200">Prompt do Sistema / Comando Copiável</h2>
              <button
                type="button"
                onClick={() => handleCopy(resource.promptText!, 'mainPrompt')}
                className="inline-flex items-center gap-1.5 text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50 px-3 py-1.5 rounded-lg transition-colors font-semibold cursor-pointer"
              >
                {copiedMap['mainPrompt'] ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar prompt</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-[#050508] border border-zinc-800 p-5 rounded-2xl font-mono text-xs sm:text-sm text-purple-200/90 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {resource.promptText}
            </pre>
          </div>
        )}

        {/* Step-by-Step Instructions */}
        {resource.steps && resource.steps.length > 0 && (
          <div className="space-y-8 mb-14">
            <h2 className="text-2xl font-extrabold text-white tracking-tight border-b border-zinc-800 pb-3">
              Guia Passo a Passo de Configuração
            </h2>

            {resource.steps.map((step) => (
              // Âncora estável por passo. Ainda não é linkável de fora: o
              // fragmento da URL já pertence ao roteador (#/recursos/slug).
              // Passa a valer quando o roteamento migrar para History API.
              <div
                key={step.stepNumber}
                id={`passo-${step.stepNumber}`}
                className="bg-[#101018] border border-zinc-800/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl scroll-mt-24"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center text-sm">
                    {step.stepNumber}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Passo {step.stepNumber} — {step.title}
                  </h3>
                </div>

                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                  {step.description}
                </p>

                {step.copyableText && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-400">Texto do Prompt / Entrada:</span>
                      <button
                        type="button"
                        aria-label={`Copiar o texto do passo ${step.stepNumber}`}
                        onClick={() => handleCopy(step.copyableText!, `step-${step.stepNumber}`)}
                        className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer"
                      >
                        {copiedMap[`step-${step.stepNumber}`] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-[#050508] border border-zinc-800 p-4 rounded-xl font-mono text-xs sm:text-sm text-purple-200/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {step.copyableText}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Troubleshooting Section */}
        {resource.troubleshooting && resource.troubleshooting.length > 0 && (
          <div className="mb-14 bg-amber-950/20 border border-amber-800/40 rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold text-amber-300 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />
              <span>Solução de Problemas (Troubleshooting)</span>
            </h2>
            <ul className="space-y-2.5">
              {resource.troubleshooting.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  <span className="text-amber-400 font-bold flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Go Deeper Links */}
        {resource.goDeeperLinks && resource.goDeeperLinks.length > 0 && (
          <div className="mb-14 bg-[#101018] border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>Aprofunde-se</span>
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {resource.goDeeperLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  {...(isInternal(link.url) ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="inline-flex items-center gap-2 text-xs font-medium bg-zinc-800/80 hover:bg-purple-950/60 hover:border-purple-600/50 text-zinc-200 hover:text-purple-200 border border-zinc-700/80 px-3.5 py-2 rounded-lg transition-all"
                >
                  <span>{link.label}</span>
                  {isInternal(link.url) ? (
                    <ArrowRight className="w-3 h-3 text-purple-400" aria-hidden="true" />
                  ) : (
                    <ExternalLink className="w-3 h-3 text-zinc-400" aria-hidden="true" />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* High Converting CTA Box */}
        <div className="bg-[#0e0c18] border-2 border-purple-600/60 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <span className="inline-block px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/50 text-xs font-bold uppercase tracking-wider">
            IMPLEMENTAÇÃO COMPLETA PARA SEU NEGÓCIO
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Automatize seu Conteúdo, Vendas e Anúncios com IA
          </h2>

          <p className="text-zinc-300 text-sm max-w-lg mx-auto leading-relaxed">
            Instalamos agentes Claude sob medida e pipelines de vendas na sua empresa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onBookCall}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-8 py-3.5 rounded-full shadow-lg shadow-purple-900/50 text-sm transition-all cursor-pointer hover:scale-105"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Agendar reunião de estratégia →</span>
            </button>
          </div>
        </div>

        {/* Bottom Back Link */}
        <nav aria-label="Navegação do artigo" className="mt-12 text-center">
          <a
            href={ROUTES.vault}
            onClick={(e) => {
              e.preventDefault();
              onBackToVault();
            }}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Voltar ao Cofre</span>
          </a>
        </nav>

      </main>
    </div>
  );
};
