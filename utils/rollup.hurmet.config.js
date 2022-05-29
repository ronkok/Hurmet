export default [
  {
    input: "./src/hurmet.js",
    output: { format: "es", name: "hurmet", exports: "auto", file: "./utils/hurmet.mjs" }
  },
  {
    input: "./src/hurmet.js",
    output: { format: "cjs", name: "hurmet", file: "./test/hurmet.cjs" }
  }
]
