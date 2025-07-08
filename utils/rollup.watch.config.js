import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "./src/watch.js",
    output: { format: "cjs", name: "watch", sourcemap: false, file: "utils/watch.js" },
    plugins: [resolve(), commonjs()]
  }
]
