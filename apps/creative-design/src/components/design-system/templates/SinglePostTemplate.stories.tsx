import type { Meta, StoryObj } from '@storybook/react';
import { SinglePostTemplate } from './SinglePostTemplate';

const meta: Meta<typeof SinglePostTemplate> = {
  title: 'Design System/Templates/SinglePostTemplate',
  component: SinglePostTemplate,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SinglePostTemplate>;

export const TextOverImage: Story = {
  args: {
    variant: 'text-over-image',
    headline: 'O Futuro do Design é Automatizado',
    bodyText: 'Conheça o Virals Vision System, onde a criatividade encontra a escala através de componentes inteligentes.',
    ctaText: 'Ver Detalhes',
    backgroundImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    theme: 'dark',
  },
};

export const ImageFirst: Story = {
  args: {
    variant: 'image-first',
    headline: 'Design de Alta Performance',
    bodyText: 'Sua marca consistente em todos os canais.',
    ctaText: 'Saiba Mais',
    backgroundImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop',
    theme: 'dark',
    logoPosition: 'bottom-right',
  },
};

export const LightTheme: Story = {
  args: {
    variant: 'text-over-image',
    headline: 'Simplicidade é a sofisticação máxima',
    bodyText: 'Focamos no que importa: resultados reais para sua marca.',
    ctaText: 'Começar Agora',
    theme: 'light',
  },
};
