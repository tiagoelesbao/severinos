import type { Meta, StoryObj } from '@storybook/react';
import { ProvocationHeroSlide } from './ProvocationHeroSlide';

const meta: Meta<typeof ProvocationHeroSlide> = {
  title: 'Design System/Templates/ProvocationHeroSlide',
  component: ProvocationHeroSlide,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProvocationHeroSlide>;

export const Short: Story = {
  args: {
    quote: 'Quem ainda acha que isso é hype, vou esperar.',
  },
};

export const Medium: Story = {
  args: {
    quote: 'Founder não posa de guru. Mostra o trabalho. Mostra o erro. Mostra o número.',
  },
};

export const Long: Story = {
  args: {
    quote:
      'O jogo mudou: quem não documenta o processo perde a chance de virar autoridade. O bastidor é o novo conteúdo nobre — e quem tem fome assiste até o fim.',
  },
};

export const WithBackgroundPhoto: Story = {
  args: {
    quote: 'Você está olhando esse gráfico do jeito errado. Repara aqui ↓',
    backgroundImage:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1080&auto=format&fit=crop',
  },
};

export const NoRole: Story = {
  args: {
    quote: 'Se você é founder e ainda não fez essa pergunta, está atrasado.',
    authorRole: undefined,
  },
};
