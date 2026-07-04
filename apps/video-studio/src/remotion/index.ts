import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Entry point do Remotion (standalone). Usado por `remotion studio` e pelo
// render headless (scripts/render.mjs).
registerRoot(RemotionRoot);
