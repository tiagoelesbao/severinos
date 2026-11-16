import type { Preview } from "@storybook/react-vite";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: "padded",
  },
};

export default preview;
