export default [
  {
    external: ['./katex.js', './temml.js'],
    input: "./src/hurmet.js",
    output: { format: "es", name: "hurmet", sourcemap: false, file: "preview/hurmet.js" }
  }
]
