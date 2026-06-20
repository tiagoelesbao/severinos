import type { Meta, StoryObj } from '@storybook/react';
import { AccentElement } from './AccentElement';

const meta: Meta<typeof AccentElement> = {
  title: 'Design System/Atoms/AccentElement',
  component: AccentElement,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'dot', 'square'],
    },
    color: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AccentElement>;

export const DefaultLine: Story = {
  args: {
    variant: 'line',
    width: 'w-48',
    height: 'h-3',
  },
};

export const AccentDot: Story = {
  args: {
    variant: 'dot',
  },
};

export const AccentSquare: Story = {
  args: {
    variant: 'square',
  },
};
