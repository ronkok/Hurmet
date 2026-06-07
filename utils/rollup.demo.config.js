import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"

export default {
  input: "./src/demonstration.js",
  output: { format: "es", sourcemap: false, file: "preview/demo.js" },
  plugins: [resolve(), commonjs()]
}
