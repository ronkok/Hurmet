import { parse } from "./parser"
import { calculate } from "./calculate"
import { md2html } from "./md2html"

/*
 * This file bundles together and exposes the calculation parts of Hurmet for use
 * as a CLI app. That is, for unit testing and for the CLI Markdown-to-HTML utility.
 *
 * It exposes three methods
 *   parse() returns a TeX string and, if asked, an RPN string.
 *   calculate() returns either a TeX string or a string in Hurmet calculation syntax.
 *   md2html() returns an HTML string.
 *
 * The parameters of the first two methods are:
 *   entry: The string that a user types into a calculation editing box.
 *   draftMode: Determines if result is in TeX or in Hurmet calculation syntax.
 *   decimalFormat: A string containing one of the options available in the Hurmet ● menu.
 *   vars: If you want to evaluate several statements, the variable "vars" holds variable data.
 *         Initialize it as: vars = {}
 *         Or, if you want to specify a rounding format, initialize it as:
 *             vars = { format: { value: "h3" } }
 *         vars is updated with new variable data each time calculate() is called.
 */

export const hurmet = {
  parse,
  calculate,
  md2html
}
