/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Turbopack disabled due to WASM binding issues on Windows
  // turbopack: {
  //   rules: {
  //     "*.txt": {
  //       loaders: ["raw-loader"],
  //       as: "*.js",
  //     },
  //   },
  // },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.txt$/,
      use: 'raw-loader',
    });
    return config;
  },
};

export default config;
