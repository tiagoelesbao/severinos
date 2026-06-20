import type { Meta, StoryObj } from '@storybook/react';
import { ModeledCarouselSlide } from './ModeledCarouselSlide';

const meta: Meta<typeof ModeledCarouselSlide> = {
  title: 'Design System/Templates/ModeledCarouselSlide',
  component: ModeledCarouselSlide,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ModeledCarouselSlide>;

export const PremiumHook: Story = {
  args: {
    slideNumber: 1,
    totalSlides: 10,
    type: 'hook',
    subHeadline: 'Tendência 2026',
    headline: 'O Futuro é Visual e Inteligente',
    bodyText: 'Como a Inteligência Artificial está redefinindo os limites do design criativo em escala industrial.',
    backgroundImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    mainObjectImage: 'https://cdn-icons-png.flaticon.com/512/6298/6298377.png', // Exemplo de objeto 3D/Float
  },
};

export const PremiumValue: Story = {
  args: {
    slideNumber: 4,
    totalSlides: 10,
    type: 'valor',
    subHeadline: 'Design System',
    headline: 'Fidelidade Absoluta',
    bodyText: 'Cada pixel é calculado para manter a integridade da sua marca em qualquer formato, de forma automatizada.',
    backgroundImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
  },
};

export const PremiumCTA: Story = {
  args: {
    slideNumber: 10,
    totalSlides: 10,
    type: 'cta',
    subHeadline: 'Próximo Passo',
    headline: 'Construa seu Futuro Agora',
    bodyText: 'Acesse virals.ai e transforme sua produção criativa hoje mesmo.',
    backgroundImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop',
    accentColor: '#00D1FF',
  },
};
