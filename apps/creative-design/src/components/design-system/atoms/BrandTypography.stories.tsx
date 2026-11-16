import type { Meta, StoryObj } from '@storybook/react';
import { BrandTypography } from './BrandTypography';

const meta: Meta<typeof BrandTypography> = {
  title: 'Design System/Atoms/BrandTypography',
  component: BrandTypography,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['headline', 'body', 'cta'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandTypography>;

export const Headline: Story = {
  args: {
    variant: 'headline',
    size: 'lg',
    children: 'O Design nunca mais será o mesmo',
  },
};

export const Body: Story = {
  args: {
    variant: 'body',
    size: 'md',
    children: 'Conheça o novo pipeline de automação criativa da Virals.',
  },
};

export const CTA: Story = {
  args: {
    variant: 'cta',
    size: 'sm',
    children: 'Saiba Mais',
  },
};
