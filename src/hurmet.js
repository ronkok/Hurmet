import { parse } from "./parser"
import { calculate } from "./calculate"
import { md2ast } from "./md2ast"
import { md2html } from "./md2html"
import { hurmet2html } from "./hurmet2html.js"
import { tex2Calc } from "./tex2Calc.js"
import { compile } from "./compile"
import temml from "./temml.js"
import { scanModule } from "./module"
import { updateCalculations } from "./updateCalculations"
import { Rnl } from "./rational"

/*
 * This file bundles together and exposes the calculation parts of Hurmet.
 * I use Rollup to create a UMD module from this code.
 * That way, one file can expose the same functionality to (1) the Hurmet.org web page,
 * (2) the REPL in the reference manual, (3) the script that transpiles
 * the Hurmet reference manual from Markdown to HTML, and (4) unit testing.
 *
 * Some of Hurmet’s exported functions are valuable only to the Hurmet.org web page.
 * If you wish to use Hurmet’s math parsing and/or calculation abilities,
 * the two functions you want are:
 *   parse(entry: string, formats?: { decimalFormat: string, dateFormat: string })
 *   calculate(entry: string, vars?: Object, draftMode?: boolean,
 *             formats?: { decimalFormat: string, dateFormat: string })
 *
 *   parse() returns a TeX string.
 *   calculate() returns either a TeX string or a string in Hurmet calculation syntax.
 */

const render = (tex, dom, options) => {
  temml.render(tex, dom, options)
}

export default {
  parse,
  calculate,
  compile,
  md2ast,
  md2html,
  hurmet2html,
  scanModule,
  tex2Calc,
  updateCalculations,
  render,
  Rnl
}
