import type { Meta, StoryObj } from '@storybook/react';
import { StepListSlide } from './StepListSlide';

const meta: Meta<typeof StepListSlide> = {
  title: 'Design System/Templates/StepListSlide',
  component: StepListSlide,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StepListSlide>;

export const Hook: Story = {
  args: {
    slideNumber: 1,
    totalSlides: 6,
    variant: 'HOOK',
    headline: 'O jogo do CAC mudou',
    bodyText: 'Reduzi 60% rodando creators reais. Sem hype. Veja como.',
    backgroundImage:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1080&auto=format&fit=crop',
  },
};

export const Step: Story = {
  args: {
    slideNumber: 3,
    totalSlides: 6,
    variant: 'STEP',
    stepNumber: 3,
    headline: 'Mineração de marcas com sinal real',
    bodyText:
      'Cada brand candidate passa por 3 filtros: receita, dependência de Meta Ads e fome do founder. Sem isso, qualquer creator vira ruído.',
  },
};

export const StepShortText: Story = {
  args: {
    slideNumber: 2,
    totalSlides: 5,
    variant: 'STEP',
    stepNumber: 2,
    headline: 'Pôr a pele em jogo',
    bodyText: 'Revenue share de 1%. Sem ele, ninguém me leva a sério.',
  },
};

export const CtaThink: Story = {
  args: {
    slideNumber: 6,
    totalSlides: 6,
    variant: 'CTA_THINK',
    headline: 'Se você ainda não fez essa pergunta, está atrasado.',
    bodyText: 'Quantos creators você conhece de NOME?',
  },
};
