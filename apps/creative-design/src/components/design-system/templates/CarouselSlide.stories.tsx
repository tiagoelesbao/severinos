import type { Meta, StoryObj } from '@storybook/react';
import { CarouselSlide } from './CarouselSlide';

const meta: Meta<typeof CarouselSlide> = {
  title: 'Design System/Templates/CarouselSlide',
  component: CarouselSlide,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CarouselSlide>;

export const HookSlide: Story = {
  args: {
    slideNumber: 1,
    totalSlides: 7,
    type: 'hook',
    headline: 'O fim do Photoshop para Criadores',
    bodyText: 'Descubra como a Virals está automatizando 90% da produção visual sem perder a alma do design.',
    backgroundImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop',
  },
};

export const ValueSlide: Story = {
  args: {
    slideNumber: 4,
    totalSlides: 7,
    type: 'valor',
    headline: 'Componentes Inteligentes',
    bodyText: 'Nossos templates não são apenas imagens estáticas. Eles são componentes React vivos que entendem o contexto da sua marca.',
    theme: 'dark',
  },
};

export const CTASlide: Story = {
  args: {
    slideNumber: 7,
    totalSlides: 7,
    type: 'cta',
    headline: 'Pronto para Escalar sua Marca?',
    bodyText: 'Acesse virals.ai e comece a produzir conteúdos de alto impacto em segundos. O futuro é automatizado.',
    theme: 'dark',
  },
};

export const LightSlide: Story = {
  args: {
    slideNumber: 2,
    totalSlides: 5,
    type: 'valor',
    headline: 'Design System Unificado',
    bodyText: 'Fidelidade absoluta em todos os pontos de contato com o seu cliente.',
    theme: 'light',
  },
};
