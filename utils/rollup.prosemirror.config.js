import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

function forceLf() {
  return {
    name: 'force-lf',
    renderChunk(code) {
      return {
        code: code.replace(/\r\n?/g, '\n'),
        map: null
      };
    }
  };
}

export default {
  input: "./src/index.js",
  output: {
    format: "es",
    name: "prosemirror",
    sourcemap: false,
    file: "preview/prosemirror.js"
  },
  plugins: [resolve(), commonjs(), forceLf()]
};
