import { autoCorrect } from "./autocorrect"
import { parse } from "./parser"
import { prepareStatement } from "./prepareStatement"
import { improveQuantities } from "./improveQuantities"
import { evaluate } from "./evaluate"
import { scanModule } from "./module"
import { updateCalculations } from "./updateCalculations"
import { calculate } from "./calculate"

/*
 * This file bundles together and exposes the calculation parts of Hurmet.
 * I use Rollup to create a UMD module from this code.
 * That way, one file can expose the same functionality to (1) the Hurmet.app web page,
 * (2) the REPL in the reference manual, (3) the script that transpiles
 * the Hurmet reference manual from Markdown to HTML, and (4) unit testing.
 *
 * Some of Hurmet’s exported functions are valuable only to the Hurmet.app web page.
 * If you wish to use Hurmet’s math parsing and/or calculation abilities,
 * the two functions you want are:
 *   parse(entry: string, decimalFormat?: string)
 *   calculate(entry: string, vars?: Object, draftMode?: boolean, decimalFormat?: string)
 *
 *   parse() returns a TeX string.
 *   calculate() returns either a TeX string or a string in Hurmet calculation syntax.
 *
 * The parameters of those two function are:
 *   entry: The string that a user types into a calculation editing box.
 *   draftMode: Determines if result is in TeX or in Hurmet calculation syntax.
 *   decimalFormat: A string containing one of the options available in the Hurmet ● menu.
 *   vars: If you want to evaluate several statements, the variable "vars" holds variable data.
 *         Initialize it as: vars = {}
 *         Or, if you want to specify a rounding format, initialize it as:
 *             vars = { format: { value: "h3" } }
 *         vars is updated with new variable data each time calculate() is called.
 */

export {
  parse,
  calculate,
  autoCorrect,
  prepareStatement,
  improveQuantities,
  evaluate,
  scanModule,
  updateCalculations
}
