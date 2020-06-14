import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: "./src/index.js",
  output: {
    format: "iife",
    name: "prosemirror",
    sourcemap: false,
    file: "preview/prosemirror.js"
  },
  plugins: [resolve(), commonjs()]
};
