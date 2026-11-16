import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook do design system (VEX-07 — decisão do dono): documentação viva
 * dos tokens e componentes do Video Studio. `npm run storybook`.
 */
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // O Vite do Storybook lê o mesmo postcss.config.mjs (Tailwind v4) do app.
};

export default config;
