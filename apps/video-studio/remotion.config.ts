// Config do Remotion (standalone). Render headless usa H.264/mp4.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setConcurrency(2);
