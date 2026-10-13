import type { Meta, StoryObj } from '@storybook/react';
import { BrandingLogo } from './BrandingLogo';

const meta: Meta<typeof BrandingLogo> = {
  title: 'Design System/Atoms/BrandingLogo',
  component: BrandingLogo,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'v-star'],
    },
    color: {
      control: 'select',
      options: ['original', 'white', 'dark'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'giant'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandingLogo>;

export const FullLogo_Original: Story = {
  args: {
    variant: 'full',
    color: 'original',
    size: 'lg',
  },
};

export const FullLogo_White: Story = {
  args: {
    variant: 'full',
    color: 'white',
    size: 'lg',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const VDramatic_Original: Story = {
  args: {
    variant: 'v-star',
    color: 'original',
    size: 'xl',
  },
};

export const VDramatic_White: Story = {
  args: {
    variant: 'v-star',
    color: 'white',
    size: 'giant',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
