import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  external: ['./katex.js', './temml.js'],
  input: "./src/index.js",
  output: {
    format: "es",
    name: "prosemirror",
    sourcemap: false,
    file: "preview/prosemirror.js"
  },
  plugins: [resolve(), commonjs()]
};
