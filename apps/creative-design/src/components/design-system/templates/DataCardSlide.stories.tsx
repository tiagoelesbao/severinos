import type { Meta, StoryObj } from '@storybook/react';
import { DataCardSlide } from './DataCardSlide';

const meta: Meta<typeof DataCardSlide> = {
  title: 'Design System/Templates/DataCardSlide',
  component: DataCardSlide,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataCardSlide>;

export const PercentageHero: Story = {
  args: {
    kicker: 'CAC · 90 dias',
    number: '60',
    unitSuffix: '%',
    headline: 'Menos com creators que importam',
    bodyText:
      'Trocamos 12 anúncios de tráfego frio por 8 creators de nicho. Resultado: CAC despencou e LTV subiu 2x.',
    callToThink: 'Quantos creators você conhece de NOME hoje?',
  },
};

export const RawNumberWithBg: Story = {
  args: {
    kicker: 'Bastidor · maio',
    number: '12k',
    unitSuffix: '/mês',
    headline: 'Sistema AIOX rodando sozinho',
    bodyText:
      'Pipeline de produção de conteúdo full-auto. Sem agência, sem freelancer no meio.',
    callToThink: 'Você ainda paga alguém para fazer isso?',
    backgroundImage:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1080&auto=format&fit=crop',
  },
};

export const ShortRatio: Story = {
  args: {
    kicker: 'Antes vs Depois',
    number: '3x',
    headline: 'Em retenção de criativo',
    callToThink: 'Você ainda otimiza pela métrica errada?',
  },
};

export const LongNumber: Story = {
  args: {
    kicker: 'Mineração de marcas',
    number: 'R$ 247k',
    headline: 'Em pipeline de novos clientes em 30 dias',
    bodyText:
      'Tudo via Hunter Ads, prospecção fria + intent signals. Zero ads pagos.',
  },
};
