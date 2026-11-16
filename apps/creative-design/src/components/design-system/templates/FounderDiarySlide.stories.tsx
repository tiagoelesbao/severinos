import type { Meta, StoryObj } from '@storybook/react';
import { FounderDiarySlide } from './FounderDiarySlide';

const meta: Meta<typeof FounderDiarySlide> = {
  title: 'Design System/Templates/FounderDiarySlide',
  component: FounderDiarySlide,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FounderDiarySlide>;

export const SubtleGrain: Story = {
  args: {
    slideNumber: 1,
    totalSlides: 5,
    photo:
      'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?q=80&w=1080&auto=format&fit=crop',
    caption: 'Reunião de squad às 22h. A energia muda quando o número aparece na tela.',
    dateLabel: '23/05 · bastidor do call',
    grainIntensity: 'subtle',
  },
};

export const StrongGrain: Story = {
  args: {
    slideNumber: 3,
    totalSlides: 5,
    photo:
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1080&auto=format&fit=crop',
    caption: 'Quem decide rápido, vence devagar.',
    dateLabel: '21/05 · escritório',
    grainIntensity: 'strong',
  },
};

export const NoDateLabel: Story = {
  args: {
    slideNumber: 2,
    totalSlides: 4,
    photo:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1080&auto=format&fit=crop',
    caption: 'Não é sobre o creator perfeito. É sobre o creator certo.',
    grainIntensity: 'subtle',
  },
};

export const LongCaption: Story = {
  args: {
    slideNumber: 4,
    totalSlides: 5,
    photo:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1080&auto=format&fit=crop',
    caption:
      'O cliente que tem fome de verdade não pergunta o preço primeiro. Pergunta o método. Aprendi isso da pior maneira em 4 reuniões na mesma semana.',
    dateLabel: '20/05 · reunião comercial',
    grainIntensity: 'subtle',
  },
};
