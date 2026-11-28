import root from "../../eslint.config.mjs";

export default [
  ...root,
  // A framework-free package: plain <img>, not next/image.
  { rules: { "@next/next/no-img-element": "off" } },
];
