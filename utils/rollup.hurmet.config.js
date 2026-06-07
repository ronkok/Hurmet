import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"

export default [
  {
    input: "./src/hurmet.js",
    output: {
      format: "cjs",
      name: "hurmet",
      sourcemap: false,
      file: "utils/hurmet.cjs"
    },
    plugins: [resolve(), commonjs()]
  }
]
