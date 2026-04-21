/* eslint-disable max-len */
/* eslint-disable comma-spacing */
/* eslint-disable indent-legacy */
/* eslint-disable no-console */

const fs = require('fs') // Node.js file system
const hurmet = require('../utils/hurmet.cjs');
const currencyString = fs.readFileSync('./site/currencyRates.json').toString('utf8')
globalThis.currencyRates = JSON.parse(currencyString)

/* Unit tests.
 * For unit tests, I merely check if module outputs match their expected output.
 * I may switch to Jest when it can handle BigInt. Code coverage data would be nice.
 */

const parserTests = [
  // This array tests the parser's TeX output. RPN output is tested below.
  // input, expected output
  ["sin(a+b)/2", "\\dfrac{\\sin(a + b)}{2}"],
  ["a/b c", "\\dfrac{a}{b} c"],
  ["(w L)/8 (e)", "\\dfrac{w L}{8}\\, (e)"],
  ["(w length)/8 (e)", "\\dfrac{w \\,\\mathrm{length}}{8}\\, (e)"],
  ["M = (w L^2)/8", "M = \\dfrac{w L^{2}}{8}"],
  ["M = sin x/8", "M = \\dfrac{\\sin{x}}{8}"],
  ["a/b", "\\dfrac{a}{b}"],
  ["(a b)", "(a b)"],
  ["{a b}", "\\{a b \\}"],
  ["(a)³/4", "\\dfrac{(a)^{3}}{4}"],
  ["(a)^3/4", "\\dfrac{(a)^{3}}{4}"],
  ["a (b \\atop c) d", "a \\left({{b}\\atop{c}}\\right) d"],
  ["(a	b; c	d)", "\\begin{pmatrix}a & b \\\\ c & d \\end{pmatrix}"],
  [
    "{a if b; c if d}",
    "\\begin{cases}a & \\text{if}~ b \\\\ c & \\text{if}~ d \\end{cases}"
  ],
  ["f_c′=4500 'psi'", "f{_\\text{c}'} = 4{,}500 \\; {\\text{psi}}"],
  ["f_c′=4500psi", "f{_\\text{c}'} = 4{,}500 \\; {\\text{psi}}"],
  ["root 3 x", "\\sqrt[3]{x}"],
  ["5 modulo 4", "5 \\mathbin{modulo} 4"],
  ["sqrt(a b)", "\\sqrt{a b}"],
  ["sin^2 x", "\\sin^{2}{x}"],
  ["sin^(-1) x", "\\sin^{\\text{-}1}{x}"],
  ["log10 x", "\\log_{10}{x}"],
  ["v_(x=0)/n", "\\dfrac{v_{x = 0}}{n}"],
  ["w^sin x y", "w^{\\sin{x}} y"],
  ["x_wind L", "x{_\\text{wind}} L"],
  ["root 3 (a + b)", "\\sqrt[3]{a + b}"],
  ["sin^(a+b) x", "\\sin^{a + b}{x}"],
  ["(π (D - I))/4", "\\dfrac{π (D - I)}{4}"],
  ["f_c′/200", "\\dfrac{f{_\\text{c}'}}{200}"],
  ["(b^2/2)", "\\left(\\dfrac{b^{2}}{2}\\right)"],
  ["sqrt f_c′", "\\sqrt{f{_\\text{c}'}}"],
  ["sqrt \\hat θ^2", "\\sqrt{\\hat{θ}^{2}}"],
  ["sin^2 \\hat θ", "\\sin^{2}{\\hat{θ}}"],
  ["((n (n+1))/2)", "\\left(\\dfrac{n (n + 1)}{2}\\right)"],
  [
    "β_1 = {0.85 if f_c′ <= 4000; 0.65 if f_c′ >= 8000; 0.85 - f_c′/20000 otherwise}",
    "β{_\\text{1}} = \\begin{cases}0.85 & \\text{if}~ f{_\\text{c}'} ≤ 4{,}000 \\\\ 0.65 & \\text{if}~ f{_\\text{c}'} ≥ 8{,}000 \\\\ 0.85 - \\dfrac{f{_\\text{c}'}}{20{,}000}& \\text{otherwise}~ \\end{cases}"
  ],
  ["x = (-b +- sqrt(b^2-4 a c))/(2 a)", "x = \\dfrac{\\text{-} b ± \\sqrt{b^{2}- 4 \\, a c}}{2 \\, a}"],
  [
    `f(x) = \\int_(-∞)^∞ \\hat f (ξ)  e^(2 π i ξ x)  "d" ξ`,
    "f(x)= ∫_{\\text{-} ∞}^{∞}\\hat{f} (ξ) e^{2 \\, π i ξ x}\\text{d}ξ"
  ],
  ["\\int_(-∞)^∞ \\hat f", "∫_{\\text{-} ∞}^{∞}\\hat{f}"],
  [
    "r = 1/((|cos θ|^p + |sin θ|^p)^(1///p))",
    "r = \\dfrac{1}{(|\\cos{θ}|^{p}+ |\\sin{θ}|^{p})^{1 / p}}"
  ],
  [
    'b \\uarr n = \\underbrace(b·b·b \\cdots b)_(n " copies of " b) =',
    "b \\uarr n = \\underbrace{b ⋅ b ⋅ b ⋯ b}_{n \\text{ copies of\\,}b}="
  ],
  ["\\underbrace(b·b)_(n)", "\\underbrace{b ⋅ b}_{n}"],
  ["|y^n|/3", "\\dfrac{|y^{n}|}{3}"],
  ["A_0^n n/k", "A{_\\text{0}}^{n} \\dfrac{n}{k}"],
  ["C = <<n \\atop k>>", "C = \\left\u27E8{{n}\\atop{k}}\\right\u27E9"],
  ["(exp(-exp(u)))/((u+γ)^2+π^2)", "\\dfrac{\\exp(\\text{-} \\exp(u))}{(u + γ)^{2}+ π^{2}}"],
  [
    'α = ``B	C	D\n7.0	9.5	11.5``["C"]',
    "α = \\renewcommand{\\arraycolsep}{8pt}\\renewcommand{\\arraystretch}{1.15}\\begin{array}{ccc}{B}&{C}&{D} \\\\ \\hline 7&9.5&11.5\\end{array}[\\text{C}]"
  ],
  ["H^2 = \\dot a/a", "H^{2}= \\dfrac{\\dot{a}}{a}"],
  ["P = (1.2(D/H))", "P = \\left(1.2 \\left(\\dfrac{D}{H}\\right)\\right)"],
  ["M = (\\mathcal O (a b))/5", "M = \\dfrac{\\mathcal{O}(a b)}{5}"],
  [
    "c_s = (n_c A_s)/b (√(1 + (2 b d)/(n_c A_s))-1)",
    "c{_\\text{s}} = \\dfrac{n{_\\text{c}} A{_\\text{s}}}{b} \\left(\\sqrt{1 + \\dfrac{2 \\, b d}{n{_\\text{c}} A{_\\text{s}}}}- 1 \\right)"
  ],
  ['A --> "heat" B', "A \\xrightarrow{\\text{heat}}B"],
  [
    "i \\mathbf ℏ ∂/(∂t) |ψ (t)⟩ = \\hat 𝐇 |ψ (t)⟩",
    "i \\mathbf{ℏ}\\dfrac{∂}{∂ t}|ψ (t)⟩= \\hat{𝐇}|ψ (t)⟩"
  ],
  ["⟨ϕ|", "⟨ϕ |"],
  ["(n \\atop k) = n!/(n! (n - k)!)", "\\left({{n}\\atop{k}}\\right)= \\dfrac{n!}{n! (n - k)!}"],
  [
    "δ I (y\\; v) = \\lim_(ε→0)(I (y+ε v)-I [y])/ε ≡ \\left. d/(d ε) I (y + ε v) |_(ε=0)",
    "δ I (y ;\\: v)= \\lim_{ε → 0}\\dfrac{I (y + ε v)- I [y]}{ε}≡ \\left.\\dfrac{d}{d ε} I (y + ε v)\\right|_{ε = 0}"
  ],
  ["8 'm2'", "8 \\; {\\text{m}^{2}}"],
  ["7.495e-6 'AU3/days2'", "7.495\\text{e-}6 \\; {\\text{AU}^{3}\\text{/days}^{2}}"],
  ["tan^2 θ", "\\tan^{2}{θ}"],
  [
    "(1 - ε) tan²(θ/2) = (1 - ε) tan²(E/2)",
    "(1 - ε) \\tan^{2}\\left(\\dfrac{θ}{2}\\right)= (1 - ε) \\tan^{2}\\left(\\dfrac{E}{2}\\right)"
  ],
  [
    "σ^2 = 1/(n (n-1)) (n ∑_(i=1)^n x_i^2 - (∑_(i=1)^n x_k)^2)",
    "σ^{2}= \\dfrac{1}{n (n - 1)}\\left(n ∑_{i = 1}^{n} x{_\\text{i}}^{2}- \\left(∑_{i = 1}^{n} x{_\\text{k}} \\right)^{2}\\right)"
  ],
  ["(2 n)!!/(2 n+1)^2", "\\dfrac{(2 \\, n)!!}{(2 \\, n + 1)^{2}}"],
  ["(1	2; 3	4)", "\\begin{pmatrix}1 & 2 \\\\ 3 & 4 \\end{pmatrix}"],
  ["cos⁻¹ 0.5", "\\cos^{\\text{-}1}{0.5}"],
  ["(1/2 A + 1/2 B) / 8 =", "\\dfrac{\\frac{1}{2}\\, A + \\frac{1}{2}\\, B}{8}="],
  ["‖a‖", "‖a ‖"],
  ["5 2/3", "5\\,\\sfrac{2}{3}"]
]

console.log("Now testing the parser…")
console.log("")
let numTests = 0
let numErrors = 0
for (let i = 0; i < parserTests.length; i++) {
  numTests += 1
  const input = parserTests[i][0]
  const output = hurmet.parse(input)
  const expectedOutput = parserTests[i][1]
  if (output !== expectedOutput) {
    numErrors += 1
    console.log("input:    " + input)
    console.log("expected: " + expectedOutput)
    console.log("actual:   " + output)
    console.log("")
  }
}

const resultFormatterTests = [
  // input number, format spec, decimal spec, expected output
  ["1.5", "", "", "1.5"],
  ["-1.5", "", "", "-1.5"],
  ["1", "", "", "1"],
  ["12000", "", "", "12{,}000"],
  ["4000", "", "", "4{,}000"],
  ["12000.5", "", "", "12{,}000.5"],
  ["1.50", "", "", "1.5"],
  ["12000.5", "", "1.000.000,", "12.000{,}5"],
  ["12000.5", "", "1 000 000.", "12 000.5"],
  ["12.100", "f2", "", "12.10"],
  ["12", "f2", "", "12.00"],
  ["12000", "f2", "1.000.000,", "12.000{,}00"],
  ["12000", "f2", "1 000 000,", "12 000{,}00"],
  ["12.100", "r2", "", "12"],
  ["1.100", "h3", "", "1.1"],
  ["1", "r3", "", "1.00"],
  ["1", "h3", "", "1"],
  ["-155.75", "h3", "", "-156"],
  ["155.75", "h3", "", "156"],
  ["-155.75", "h4", "", "-155.8"],
  ["155.75", "h4", "", "155.8"],
  ["12.100", "h3", "1.000.000,", "12{,}1"],
  ["12.100", "r3", "", "12.1"],
  ["12.100", "r4", "", "12.10"],
  ["12.100", "h4", "", "12.1"],
  ["49.999999999999999", "f2", "", "50.00"],
  ["49.999999999999999", "f0", "", "50"],
  ["49.999999999999999", "h3", "", "50"],
  ["12345.100", "r3", "", "12{,}300"],
  ["12345.100", "h3", "", "12{,}345"],
  ["1.23", "h3", "", "1.23"],
  ["12", "r3", "", "12.0"],
  ["12", "h3", "", "12"],
  ["0.5", "S3", "", "5.00×10^{-1}"],
  ["12.348", "S3", "", "1.23×10^{1}"],
  ["12.348", "s3", "", "1.23\\mkern2mu{\\cdot}\\mkern1mu10^{1}"],
  ["0.5", "s3", "", "5.00\\mkern2mu{\\cdot}\\mkern1mu10^{-1}"],
  ["12348", "e3", "", "1.23\\text{e}4"],
  ["12348", "e3", "1.000.000,", "1{,}23\\text{e}4"],
  ["12348", "E3", "", "1.23\\text{E}4"],
  ["12348", "E3", "1.000.000,", "1{,}23\\text{E}4"],
  ["12348", "k3", "", "12.3k"],
  ["12348", "k3", "", "12.3k"],
  ["12.348", "t", "", "12"],
  ["-12.348", "t", "", "-12"],
  ["15", "x", "", "0xf"],
  ["-15", "x", "", "-0xf"],
  ["15.2", "x", "", "\\textcolor{firebrick}{\\text{Error. Hurmet can do binary or hexadecimal format only on integers.}}"],
  ["15", "b", "", "0b1111"],
  ["-15", "b", "", "-0b1111"],
  ["15.2", "b", "", "\\textcolor{firebrick}{\\text{Error. Hurmet can do binary or hexadecimal format only on integers.}}"],
  ["0.15" , "%1", "", "15.0\\%"],
  ["0.151" , "%0", "", "15\\%"],
  ["0.151" , "p3", "", "15.1\\%"],
  ["0.151" , "p2", "", "15\\%"],
  ["0.151" , "p1", "", "20\\%"],
  ["-0.151" , "p1", "", "-20\\%"],
  ["'2025-01-09'", "", "yyyy-mm-dd", "\\class{date-result}{\\text{2025-01-09}}"],
  ["'2025-01-09'", "", "dd.mm.yyyy", "\\class{date-result}{\\text{09.01.2025}}"],
  ["'2025-01-09'", "", "d mmmm yyyy", "\\class{date-result}{\\text{9 January 2025}}"],
  ["'2025-01-09'", "", "d mmm yyyy", "\\class{date-result}{\\text{9 Jan 2025}}"],
  ["'2025-01-09'", "", "mmmm d, yyyy", "\\class{date-result}{\\text{January 9, 2025}}"],
  ["'2025-01-09'", "", "mmm d, yyyy", "\\class{date-result}{\\text{Jan 9, 2025}}"],
  ["'2025-01-09'", "", "d de mmmm de yyyy es", "\\class{date-result}{\\text{9 de enero de 2025}}"],
  ["'2025-01-09'", "", "wwww, mmmm d, yyyy", "\\class{date-result}{\\text{Thursday, January 9, 2025}}"],
  ["'2025-01-09'", "", "wwww, d de mmmm de yyyy es", "\\class{date-result}{\\text{jueves, 9 de enero de 2025}}"]
];

console.log("Now testing the result formatter…")
console.log("")
for (let i = 0; i < resultFormatterTests.length; i++) {
  numTests += 1
  const numStr = resultFormatterTests[i][0]
  const formatSpec = resultFormatterTests[i][1] || "h15"
  const decimalFormat = resultFormatterTests[i][2] || "1,000,000."
  const dateFormat = resultFormatterTests[i][2] || "yyyy-mm-dd"
  const formats = { decimalFormat, dateFormat }
  const expectedOutput = resultFormatterTests[i][3]
  const formatVars = { format: { value: formatSpec } }
  const output = hurmet.calculate(numStr + "= @", formatVars, false, formats)
  if (output !== expectedOutput) {
    numErrors += 1
    console.log("input numStr:    " + numStr)
    console.log("input format:    " + formatSpec + " " + formats)
    console.log("expected output: " + expectedOutput)
    console.log("actual output:   " + output)
    console.log("")
  }
}

  /* eslint-disable no-irregular-whitespace */
  // Assignment statements, w/o any calculation.
  // Some of these are here just to enable calculations below.
  const vars = { format: { value: "h15" }, currencies: { "USD": 1, "CAD": 1.33 } }
  const assignmentTests = [
    // input string, template for output, expected output
    ["b = true", "b = @", ""],
    ['str = "abcdef"', "str = @", "abcdef"],
    ["num = 4.2", "num = @", "4.2"],
    ["z1 = 2.34 - j 5.67", "z1 = @", "2.34 - j 5.67"],
    ["z2 = -10.2 + j 9.6", "z2 = @", "-10.2 + j 9.6"],
    ["mixedFrac = 0 7/8", "mixedFrac = @", "0.875"],
    ["half = 0.5", "half = @", "0.5"],
    ["unaryMinus = -88.1", "unaryMinus = @", "-88.1"],
    ["sci = 3.3e4", "sci = @", "33,000"],
    ["negExpo = 3.555e-2", "negExpo = @", "0.03555"],
    ["frac = 5 7/8", "frac = @", "5.875"],
    ['θ = 0.52359877559829887307710723054658', "θ = @", "0.523598775598299"], // π/6
    ["degAngle = 30°", "degAngle = @@ rad", "0.523598775598299 rad"],
    ["D = 25 ft", "D = @@ m", "7.62 m"],
    ["D = 25 'ft'", "D = @@ m", "7.62 m"],
    ["L = 12 'feet'", "L = @@ m", "3.6576 m"],
    ["w = 110 'lbf/ft'", "w = @@ N/m", "1,605.3293230927 N/m"],
    ["n = 10 'N·m/s'", "n = @@ N·m/s", "10 N·m/s"],
    ["P = 1000 'lbf'", "P = @@ N", "4,448.2216152605 N"],
    ["𝐏 = [10; 15]", "𝐏 = @", "[10; 15]"],
    ["𝐏q = [10; 15] 'kips'", "𝐏q = @", "[10; 15]"],
    ["vector = [2.1; -15.3; 11]", "vector = @", "[2.1; -15.3; 11]"],
    ["matrix = (2.1, 7.5; -15.3, 33)", "matrix = @", ""],
    ['frameRow = ``\\#4	#5	area\n 0.22	0.31	0.44``', "frameRow = @", "``#4	#5	area\n0.22	0.31	0.44``"],
    ["radius = [0.375; 0.25; 0.3125; 0.375] 'in'", "radius = @", ""],
    ["barArea = ``\\#4	#5	area\n 0.22	0.31	0.44`` 'in2'", "barArea = @", ""],
    ["unitLessBarArea = ``\\#4	#5	area\n 0.22	0.31	0.44``", "unitLessBarArea = @", ""],
    ["rebar = ``#name	diameter	area\nunit	in	in²\n#3	0.375	0.11\n#4	0.5	0.2\n#5	0.625	0.31\n#6	0.75	0.44``", "rebar = @", ""],
    ["wideFlanges = ``#name	weight	area	d	bf	tw	tf	Ix	Sx	rx	Iy	Sy	ry\nunit	lbf/ft	in^2	in	in	in	in	in^4	in^3	in	in^4	in^3	in\nW10X49	49	14.4	10	10	0.34	0.56	272	54.6	4.35	93.4	18.7	2.54\nW8X31	31	9.13	8	8	0.285	0.435	110	27.5	3.47	37.1	9.27	2.02\nW8X18	18	5.26	8.14	5.25	0.23	0.33	61.9	15.2	3.43	7.97	3.04	1.23``", "wideFlanges = @", ""],
    ["aDate = '2025-01-20'", "aDate = @", "2025-01-20"],
    ["x_2= 4", "x₂ = @", "4"],
    ["f_2′= 4", "f₂′ = @", "4"],
    ["ph = 35 psi_", "ph = @", "35"], // trailing underscore does not change assigned value
    ["p = 15%", "p = @", "0.15"],
    ["b2 = false", "b2 = @", "false"]
  ];

  const tex2CalcTests = [
    ["\\sqrt{f_c'} = 3000", "√(f_c′) = 3000"],
    ["3000 \\text{psi} = 3 \\mathrm{ksi}", '3000 "psi"= 3 ksi'],
    ["\\Gamma(\\hat{\\theta}) = \\sin \\alpha = \\cos(y)", "Γ (θ̂) = sin α = cos(y)"],
    ["\\frac{a + b}{c + d} = \\tfrac{a + b}{c + d} = \\dfrac{wL^2}{c + d}", "(a + b)//(c + d) = (a + b)//(c + d) = (w L^2) / (c + d)"],
    ["\\approx a/b = f(a, b) = \\frac{9}{128}ql^2", "≈ a ∕ b = f(a, b) = (9)//(128) q l^2"],
    ["= {a + c \\over c +d} \\approx", "= (a + c)/(c + d) ≈"],
    ["\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", "(a, b; c, d)"],
    ["\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", "[a, b; c, d]"],
    ["\\begin{cases} a &\\text{if } b \\\\ c &\\text{if } d \\end{cases}", '{a if b; c if d}'],
    ["\\begin{rcases} a &\\text{if } b \\\\ c &\\text{if } d \\end{rcases}", '\\rcases(a, "if "b; c, "if "d)'],
    ["\\begin{array}{cc} a & b \\\\ c & d\\end{array}", "\\array(cc)(a, b; c, d)"],
    ["\\begin{darray}{cc} a & b \\\\ c & d\\end{darray}", "\\darray(cc)(a, b; c, d)"],
    ["\\sum_{\\begin{subarray}{l} i\\in\\Lambda\\\\ 0 \\lt j > n \\end{subarray}}", "∑_(\\subarray(l)(i ∈ Λ; 0 \\lt j > n))"],
    ["\\begin{alignat}{2} 10&x+ &3&y = 2 \\\\ 3&x+&13&y = 4 \\end{alignat}", "\\alignat(2)(10, x +, 3, y = 2; 3, x +, 13, y = 4)"],
    ["\\bordermatrix{ & 1 & 2 & 3 \\\\ 1 & A & B & C \\\\ 2 & D & E & F}", "\\bordermatrix(, 1, 2, 3; 1, A, B, C; 2, D, E, F)"],
    ["\\bordermatrix[{[]}]{ & 1 & 2 & 3 \\\\ 1 & A & B & C \\\\ 2 & D & E & F}", "\\bordermatrix[{[]}](, 1, 2, 3; 1, A, B, C; 2, D, E, F)"],
    [
      "x^2 + x^{a + b}! \\ast x¹² \\times F_i = M_{\\text{max}} \\pm F_{a + c} + \\cancel{M} + \\mathbf{M}",
      "x^2 + x^(a + b)! ∗ x¹²× F_i = M_max ± F_(a + c) + \\cancel(M) + 𝐌"
    ],
    ['\\frac a b', '(a)//(b)'],
    ['\\sqrt[3]{4} + \\sqrt[5]{8}', '∛(4) + root(5)(8)'],
    ['M_i + M_\\text{abc} + M_\\mathrm{abc} + M_{abc}', 'M_i + M_abc + M_abc + M_abc'],
    [`\\textcolor{blue}{F=ma}`, "\\textcolor(blue)(F = m a)"],
    [`a\\kern2emb`, "a \\kern(2em)b"],
    [`a\\kern{2em}b`, "a \\kern(2em)b"]
  ];

  console.log("Now testing tex2Calc…")
  console.log("")
  for (let i = 0; i < tex2CalcTests.length; i++) {
    numTests += 1
    const input = tex2CalcTests[i][0]
    const output = hurmet.tex2Calc(input)
    const expectedOutput = tex2CalcTests[i][1]
    if (output !== expectedOutput) {
      numErrors += 1
      console.log("input:    " + input)
      console.log("expected: " + expectedOutput)
      console.log("actual:   " + output)
      console.log("")
    }
  }

  console.log("Now testing assignments…")
  console.log("")
  for (let i = 0; i < assignmentTests.length; i++) {
    numTests += 1
    const entry = assignmentTests[i][0];
    const template = assignmentTests[i][1];
    const expectedValue = assignmentTests[i][2];
    hurmet.calculate(entry, vars)
    const value = hurmet.calculate(template, vars, true)
    if (expectedValue.length > 0) {
      if (value !== expectedValue) {
        numErrors += 1
        console.log("input:   " + entry)
        if (value !== expectedValue) {
          console.log("expected value: " + expectedValue)
          console.log("actual value:   " + value)
        }
        console.log("")
      }
    }
  }

  // Write a few functions into the vars object, so they can be tested.
  hurmet.calculate(`function isIn(item, array)
  # Binary search to see if an item is in an array.
  # This works only if the array is sorted.
  iHigh = length(array)
  if iHigh = 0
     return false
  end
  iLow = 1
  while iLow < iHigh
     i = ⎿(iLow + iHigh) / 2⏌
     if item > array[i]
        iLow = i + 1
     else
        iHigh = i
     end
  end
  return (item = array[iLow])
end`, vars)

hurmet.calculate(`function testFor(a, b)
   sum = 0
   for i in a:b
      sum = sum + i
   end
   return sum
end`, vars)

hurmet.calculate(`function reverse(str)
   rev = ""
   for ch in str
      rev = ch & rev
   end
   return rev
end`, vars)

hurmet.calculate(`function sumVec(V)
  sum = 0
  for el in V
    sum = sum + el
  end
  return sum
end`, vars)

hurmet.calculate(`function testWhile(b)
   sum = 0
   i = 1
   while i <= b
      sum = sum + i
      i = i + 1
   end
   return sum
end`, vars)

hurmet.calculate(`function testBreak()
   print "This is a print test."
   sum = 0
   for i in 1:100
      if i > 3
         break
      end
      sum = sum + i
   end
   return sum
end`, vars)

hurmet.calculate(`function testThrow()
   sum = 0
   for i in 1:100
      if i > 3
         throw "Error."
      end
      sum = sum + i
   end
   return sum
end`, vars)

hurmet.calculate(`function newton(f, fPrime, guess; ε = 1e-15)
x = guess
for i in 1:1000
    fx = f(x)
    if |fx| ≤ ε return x
    x = x - fx / fPrime(x)
end
throw "Error. Function did not converge."
end`, vars)

  // Calculations.
  const calcTests = [
    // input string, expected RPN, expected result
    [`wideFlanges.area.end = @`, `¿wideFlanges "area" . "end" .`, "5.26"],
    [`2^3^4 = @`, "®2/1 ®3/1 ®4/1 ^ ^", "2,417,851,639,229,258,349,412,352"],
    [`2 × 3ft·in = @@ in²`, "®2/1 ®3/1 applyUnit ft·in ×", "72 in²"],
    [`2 × 3ft·in/ft = @@ in`, "®2/1 ®3/1 applyUnit ft·in/ft ×", "6 in"],
    [`5 modulo 4 = @`, `®5/1 ®4/1 modulo`, "1"],
    ["b = @", "¿b", "true"],
    ["str[2] = @", "¿str ®2/1 [] 1", "b"],
    ["str[2:4] = @", "¿str ®2/1 ®4/1 : [] 1", "bcd"],
    ["str[3:end] = @", `¿str ®3/1 "∞" : [] 1`, "cdef"],
    ["1/0 = @", "®1/1 ®0/1 /", "Error. Divide by zero."],
    ["(w L^2)/8 + (P L)/4 = @@ lbf·ft", "¿w ¿L ®2/1 ^ ⌧ ®8/1 / ¿P ¿L ⌧ ®4/1 / +", "4,980 lbf·ft"],
    ["sin(θ) = @", "¿θ sin", "0.5"],
    ["cos(θ) = @", "¿θ cos", "0.866025403784439"],
    ["tan(θ) = @", "¿θ tan", "0.577350269189626"],
    ["sin θ = @", "¿θ sin", "0.5"],
    ["cos θ = @", "¿θ cos", "0.866025403784439"],
    ["tan θ = @", "¿θ tan", "0.577350269189626"],
    ["asin(half) = @", "¿half asin", "0.523598775598299"],
    ["acos(half) = @", "¿half acos", "1.0471975511966"],
    ["atan(half) = @", "¿half atan", "0.463647609000806"],
//    ["sin(degAngle) = @@", "¿degAngle sin", "0.5"],
    ["2 + 2 = @", "®2/1 ®2/1 +", "4"],
    ["1 - 0.9999375^1000 = @", "®1/1 ®9999375/10000000 ®1000/1 ^ -", "0.0605887720523238"],
    ["(3 num)/2 = @", "®3/1 ¿num ⌧ ®2/1 /", "6.3"],
    [`rebar["#3"]["area"] =@`, `¿rebar "#3" [] 1 "area" [] 1`, "0.11"],
    [`{ 5 if n ≤ 4; 2 if n ≥ 12; 5 - (n - 4)/20 otherwise } =@`, "¿n ®4/1 ≤ ¿n ®12/1 ≥ true cases 3 ®5/1 ®2/1 ®5/1§¿n§®4/1§-§®20/1§/§-", "4.7"],
    ["[2:5...] = @", "®2/1 ®5/1 : matrix 1 1", "[2; 3; 4; 5]"],
    ["[1:2:5...] = @", "®1/1 ®2/1 : ®5/1 : matrix 1 1", "[1; 3; 5]"],
    ["vector[2] = @", "¿vector ®2/1 [] 1", "-15.3"],
    ["vector[1:2] = @", "¿vector ®1/1 ®2/1 : [] 1", "[2.1; -15.3]"],
    ["vector[1:end] = @", `¿vector ®1/1 "∞" : [] 1`, "[2.1; -15.3; 11]"],
    ["matrix[1, 2] = @", "¿matrix ®1/1 ®2/1 [] 2", "7.5"],
    ["matrix[1:2, 2] = @", "¿matrix ®1/1 ®2/1 : ®2/1 [] 2", "[7.5; 33]"],
    ["matrix[1, 1:2] = @", "¿matrix ®1/1 ®1/1 ®2/1 : [] 2", "[2.1, 7.5]"],
    ["matrix[1,:] = @", '¿matrix ®1/1  ®1/1 "∞" : [] 2', "[2.1, 7.5]"],
    ["matrix[:, 1:2] = @", '¿matrix  ®1/1 "∞" : ®1/1 ®2/1 : [] 2', "(2.1, 7.5; -15.3, 33)"],
    ["matrix[:, 1:end] = @", `¿matrix  ®1/1 "∞" : ®1/1 "∞" : [] 2`, "(2.1, 7.5; -15.3, 33)"],
    ["2 vector = @", "®2/1 ¿vector ⌧", "[4.2; -30.6; 22]"],
    ["vector·vector = @", "¿vector ¿vector ·", "359.5"],
    ["vector∘vector = @", "¿vector ¿vector ∘", "[4.41; 234.09; 121]"],
    ["vector^T = @", "¿vector ¿T ^", "[2.1, -15.3, 11]"],
    ["matrix⁻¹ = @", "¿matrix ®-1/1 ^", "(0.179299103504482, -0.0407497962510187; 0.0831295843520782, 0.0114099429502852)"],
    ["|matrix| = @", "¿matrix |", "0.0054333061668025"],
    ["|vector| = @", "¿vector |", "18.9604852258585"],
    ["abs(vector) = @", "¿vector abs", "[2.1; 15.3; 11]"],
    ["[2; 3] ∘ matrix = @", "®2/1 ®3/1 matrix 2 1 ¿matrix ∘", "(4.2, 15; -45.9, 99)"],
    ["[2, 3] ∘ matrix = @", "®2/1 ®3/1 matrix 1 2 ¿matrix ∘", "(4.2, 22.5; -30.6, 99)"],
    ["[2; 3] matrix = @", "®2/1 ®3/1 matrix 2 1 ¿matrix ⌧", "Error. Mis-matched number of elements"],
    ["[2, 3] matrix = @", "®2/1 ®3/1 matrix 1 2 ¿matrix ⌧", "[-41.7, 114]"],
    ["[2; 3] [4, 5] = @", "®2/1 ®3/1 matrix 2 1 ®4/1 ®5/1 matrix 1 2 ⌧", "(8, 10; 12, 15)"],
    ["matrix ∘ [2; 3] = @", "¿matrix ®2/1 ®3/1 matrix 2 1 ∘", "(4.2, 15; -45.9, 99)"],
    ["matrix ∘ [2, 3] = @", "¿matrix ®2/1 ®3/1 matrix 1 2 ∘", "(4.2, 22.5; -30.6, 99)"],
    [`frameRow["#4"] =@`, `¿frameRow "#4" [] 1`, "0.22"],
    [`frameRow.area = @`, `¿frameRow "area" .`, "0.44"],
    [`barArea["#4"] = @`, `¿barArea "#4" [] 1`, "0.22"],
    [`barArea.area = @`, `¿barArea "area" .`, "0.44"],
    [`("area" ∈ rebar) = @`, '"area" ¿rebar ∈', "true"],
    [`("#3" ∈ rebar) = @`, '"#3" ¿rebar ∈', "true"],
    [`("bogus" ∈ rebar) = @`, '"bogus" ¿rebar ∈', "false"],
    [`unitLessBarArea["#4"] = @`, `¿unitLessBarArea "#4" [] 1`, "0.22"],
    [`unitLessBarArea.area = @`, `¿unitLessBarArea "area" .`, "0.44"],
    ["wideFlanges.W8X31 = @", `¿wideFlanges "W8X31" .`, "``	weight	area	d	bf	tw	tf	Ix	Sx	rx	Iy	Sy	ry\nunit	lbf/ft	in^2	in	in	in	in	in^4	in^3	in	in^4	in^3	in\nW8X31	31	9.13	8	8	0.285	0.435	110	27.5	3.47	37.1	9.27	2.02``"],
    ["wideFlanges[2] = @", `¿wideFlanges ®2/1 [] 1`, "[49; 31; 18]"],
    ["wideFlanges.W8X31.area = @", `¿wideFlanges "W8X31" . "area" .`, "9.13"],
    ["wideFlanges.W8X31.area = @", `¿wideFlanges "W8X31" . "area" .`, "9.13"],
    ["wideFlanges.area.W8X31 = @@ in²", `¿wideFlanges "area" . "W8X31" .`, "9.13 in²"],
    ['wideFlanges["area"].W8X31 = @@ in²', `¿wideFlanges "area" [] 1 "W8X31" .`, "9.13 in²"],
    ['wideFlanges.W8X31["area"] = @', `¿wideFlanges "W8X31" . "area" [] 1`, "9.13"],
    ['wideFlanges["area"]["W8X31"] = @@ in²', `¿wideFlanges "area" [] 1 "W8X31" [] 1`, "9.13 in²"],
    ['wideFlanges["W8X31"]["area"] = @@ in²', `¿wideFlanges "W8X31" [] 1 "area" [] 1`, "9.13 in²"],
    ['wideFlanges["W8X31", "area"] = @@ in²', `¿wideFlanges "W8X31" "area" [] 2`, "9.13 in²"],
    [`wideFlanges[["W10X49"; "W8X31"]]["area", "d"] = @`, `¿wideFlanges "W10X49" "W8X31" matrix 2 1 [] 1 "area" "d" [] 2`, "``area	d\nin^2	in\n14.4	10\n9.13	8``"],
    [`wideFlanges[2:3, 2] = @`, `¿wideFlanges ®2/1 ®3/1 : ®2/1 [] 2`, `[31; 18]`],
    [`wideFlanges[2, 2] = @`, `¿wideFlanges ®2/1 ®2/1 [] 2`, `31`],
    [`wideFlanges.W8X31.end = @`, `¿wideFlanges "W8X31" . "end" .`, "2.02"],
    ['"ab" & "cd" = @', `"ab" "cd" &`, 'abcd'],
    [`1.2 & 3.4 = @`, `®12/10 ®34/10 &`, "[1.2, 3.4]"],
    [`vector & 3.6 = @`, `¿vector ®36/10 &`, "[2.1; -15.3; 11; 3.6]"],
    [`1.2 & vector = @`, `®12/10 ¿vector &`, "[1.2; 2.1; -15.3; 11]"],
    [`vector & vector = @`, `¿vector ¿vector &`, "(2.1, 2.1; -15.3, -15.3; 11, 11)"],
    [`vcat(vector, vector) = @`, `¿vector ¿vector vcat`, "[2.1; -15.3; 11; 2.1; -15.3; 11]"],
    [`vector^T & vector^T = @`, `¿vector ¿T ^ ¿vector ¿T ^ &`, "[2.1, -15.3, 11, 2.1, -15.3, 11]"],
    [`vcat(vector^T, vector^T) = @`, `¿vector ¿T ^ ¿vector ¿T ^ vcat`, "(2.1, -15.3, 11; 2.1, -15.3, 11)"],
    [`matrix & vector[1:2] = @`, `¿matrix ¿vector ®1/1 ®2/1 : [] 1 &`, "(2.1, 7.5, 2.1; -15.3, 33, -15.3)"],
    [`vcat(matrix, vector[1:2]^T) = @`, `¿matrix ¿vector ®1/1 ®2/1 : [] 1 ¿T ^ vcat`, "(2.1, 7.5; -15.3, 33; 2.1, -15.3)"],
    [`vector[1:2] & matrix  = @`, `¿vector ®1/1 ®2/1 : [] 1 ¿matrix &`, "(2.1, 2.1, 7.5; -15.3, -15.3, 33)"],
    [`vcat(vector[1:2]^T, matrix)  = @`, `¿vector ®1/1 ®2/1 : [] 1 ¿T ^ ¿matrix vcat`, "(2.1, -15.3; 2.1, 7.5; -15.3, 33)"],
    [`matrix & matrix = @`, `¿matrix ¿matrix &`, "(2.1, 7.5, 2.1, 7.5; -15.3, 33, -15.3, 33)"],
    [`vcat(matrix, matrix) = @`, `¿matrix ¿matrix vcat`, "(2.1, 7.5; -15.3, 33; 2.1, 7.5; -15.3, 33)"],
    [`vcat(3, 4) = @`, "®3/1 ®4/1 vcat", "[3; 4]"],
    [`rebar & radius = @`, `¿rebar ¿radius &`, "``	diameter	area	radius\nunit	in	in²	in\n#3	0.375	0.11	0.375\n#4	0.5	0.2	0.25\n#5	0.625	0.31	0.3125\n#6	0.75	0.44	0.375``"],
    ["2 frameRow = @", `®2/1 ¿frameRow ⌧`, "``#4	#5	area\n0.44	0.62	0.88``"],
    [`(2)(4) + 1 = @`, `®2/1 ®4/1 ⌧ ®1/1 +`, "9"],
    [`(2) (4) + 1 = @`, `®2/1 ®4/1 ⌧ ®1/1 +`, "9"],
    ["{ 5 if n == 10; 0 otherwise } = @", `¿n ®10/1 == true cases 2 ®5/1 ®0/1`, "5"],
    ["√4 = @", `®4/1 √`, "2"],
    ["[1:3...] = @", `®1/1 ®3/1 : matrix 1 1`, "[1; 2; 3]"],
    ["num³ √9 = @", `¿num ®3/1 ^ ®9/1 √ ⌧`, "222.264"],
    [`abs(0.5) num = @`, `®5/10 abs ¿num ⌧`, "2.1"],
    [`num (1/4) = @`, `¿num ®1/1 ®4/1 / ⌧`, "1.05"],
    [`num² (1/4) = @`, `¿num ®2/1 ^ ®1/1 ®4/1 / ⌧`, "4.41"],
    [`num.name = @`, `¿num "name" .`, "Error. Cannot call a property from variable \"num\" because it has no properties."],
    [`real(z1) = @`, `¿z1 real`, "2.34"],
    [`imag(z1) = @`, `¿z1 imag`, "-5.67"],
    [`|z1| = @`, `¿z1 |`, "6.13388131609995"],
    [`angle(z1) = @`, `¿z1 angle`, "-1.17939119866969"],
    [`angle(z1) = @@°`, `¿z1 angle`, "-67.5741380786482°"],
    [`conj(z1) = @`, `¿z1 conj`, `2.34 + j 5.67`],
    [`z1 + z2 = @`, `¿z1 ¿z2 +`, `-7.86 + j 3.93`],
    [`z1 - z2 = @`, `¿z1 ¿z2 -`, `12.54 - j 15.27`],
    [`z1 * z2 = @`, `¿z1 ¿z2 *`, `30.564 + j 80.298`],
    [`z1 / z2 = @`, `¿z1 ¿z2 /`, `-0.399082568807339 + j 0.180275229357798`],
    [`exp(z1) = @`, `¿z1 exp`, "8.48997358364912 + j 5.9741460578346"],
    [`z1^z2 = @`, `¿z1 ¿z2 ^`, `-0.000298758431332015 - j 0.000701551058304068`],
    [`e^z1 = @`, `®27182818284590452353602874713527/10000000000000000000000000000000 ¿z1 ^`, `8.48997358364912 + j 5.9741460578346`],
    [`z1^2 = @`, `¿z1 ®2/1 ^`, `-26.6733 - j 26.5356`],
    [`log(z1) = @`, `¿z1 log`, "1.8138277169721 - j 1.17939119866969"],
    [`sin(z1) = @`, `¿z1 sin`, `104.191039452235 + j 100.867493660997`],
    [`cos(z1) = @`, `¿z1 cos`, `-100.869891869637 + j 104.188562282423`],
    [`tan(z1) = @`, `¿z1 tan`, `-0.0000237630984835444 - j 1.00000076964914`],
    [`sec(z1) = @`, `¿z1 sec`, `-0.00479647799229388 - j 0.00495428454193483`],
    [`csc(z1) = @`, `¿z1 csc`, `0.0049543947050827 - j 0.00479635656901285`],
    [`cot(z1) = @`, `¿z1 cot`, `-0.0000237630618916713 + j 0.999999229786767`],
    [`acos(z1) = @`, `¿z1 acos`, `1.18401194128206 + j 2.51168447526487`],
    [`asin(z1) = @`, `¿z1 asin`, `0.386784385512841 - j 2.51168447526487`],
    [`atan(z1) = @`, `¿z1 atan`, `1.507249055069 - j 0.151248494468883`],
    [`asec(z1) = @`, `¿z1 asec`, `1.50926098758867 - j 0.150417594430335`],
    [`acsc(z1) = @`, `¿z1 acsc`, `0.0615353392062235 + j 0.150417594430335`],
    [`acot(z1) = @`, `¿z1 acot`, `0.0635472717258978 + j 0.151248494468883`],
    [`sinh(z1) = @`, `¿z1 sinh`, `4.20559750043281 + j 3.0147901210343`],
    [`cosh(z1) = @`, `¿z1 cosh`, `4.2843760832163 + j 2.9593559368003`],
    [`tanh(z1) = @`, `¿z1 tanh`, `0.993602208058447 + j 0.017357843091781`],
    [`acosh(z1) = @`, `¿z1 acosh`, `2.51168447526487 - j 1.18401194128206`],
    [`asinh(z1) = @`, `¿z1 asinh`, `2.5022646683643 - j 1.17463800510206`],
    [`atanh(z1) = @`, `¿z1 atanh`, `0.0608824294425492 - j 1.42066283698233`],
    [`asech(z1) = @`, `¿z1 asech`, `0.150417594430335 + j 1.50926098758867`],
    [`acsch(z1) = @`, `¿z1 acsch`, `0.0628676963183102 + j 0.150975247719299`],
    [`acoth(z1) = @`, `¿z1 acoth`, `0.0608824294425491 + j 0.150133489812563`],
    [`2 (4∠30°) = @@`, `®2/1 ®4/1 ®30/1 applyUnit ° ∠ ⌧`, "6.92820323027551 + j 4"],
    [`⎿33.2⏌ = @`, `®332/10 ⎿⏌`, `33`],
    [`testFor(1, 3) = @`, `®1/1 ®3/1 function testFor 2`, `6`],
    [`reverse("abc") = @`, `"abc" function reverse 1`, "cba"],
    [`sumVec(vector) = @`, `¿vector function sumVec 1`, `-2.2`],
    [`testWhile(3) = @`, `®3/1 function testWhile 1`, `6`],
    [`testBreak() = @`, `function testBreak 0`, `6`],
    [`testThrow() = @`, `function testThrow 0`, `Error.`],
    [`2 'ft' + 3 'inch' = @@ inch`, `®2/1 applyUnit ft ®3/1 applyUnit inch +`, '27 inch'],
    [`1micron = @@ m`, "®1/1 applyUnit micron", "0.000001 m"],
    [`2ft + 3inch = @@ inch`, `®2/1 applyUnit ft ®3/1 applyUnit inch +`, '27 inch'],
    [`2 'ft' + 3 'inch' = @@ V`, `®2/1 applyUnit ft ®3/1 applyUnit inch +`, 'Error. Calculated units are not compatible with the desired result unit: V'],
    [`[1; 2] < [2; 4] = @`, `®1/1 ®2/1 matrix 2 1 ®2/1 ®4/1 matrix 2 1 <`, `[true; true]`],
    [`[3; 2] < [2; 4] = @`, `®3/1 ®2/1 matrix 2 1 ®2/1 ®4/1 matrix 2 1 <`, `[false; true]`],
    [`{"Good" if [1; 2] < [2; 4]; "Bad" otherwise} = @`, `®1/1 ®2/1 matrix 2 1 ®2/1 ®4/1 matrix 2 1 < true cases 2 "Good" "Bad"`, "Good"],
    [`{"Good" if [3; 2] < [2; 4]; "Bad" otherwise} = @`, `®3/1 ®2/1 matrix 2 1 ®2/1 ®4/1 matrix 2 1 < true cases 2 "Good" "Bad"`, "Bad"],
    [`accumulate([2; 3; 0; 4]) = @`, `®2/1 ®3/1 ®0/1 ®4/1 matrix 4 1 accumulate 1`, `[2; 5; 5; 9]`],
    [`cos⁻¹ 0.5 = @`, "®5/10 acos", "1.0471975511966"],
    [`cos^(-1) 0.5 = @`, "®5/10 acos", "1.0471975511966"],
    [`gamma(5) = @`, "®5/1 gamma", "24"],
    [`Γ(5) = @`, "®5/1 Γ", "24"],
    [`factorial(4) = @`, "®4/1 factorial", "24"],
    [`lgamma(5) = @`, "®5/1 lgamma", "3.17805383034795"],
    [`lfact(4) = @`, "®4/1 lfact", "3.17805383034795"],
    [`isnan("five") = @`, `"five" isnan`, "true"],
    [`Char(87) = @`, "®87/1 Char", "W"],
    [`!true = @`, "true ¬", "false"],
    [`true && false = @`, "true false &&", "false"],
    [`true == false = @`, "true false ==", "false"],
    [`true = false = @`, "true false =", 'Error. Use "==" instead of "=" to check for equality.'],
    ["true or false = @", "true false or", "true"],
    ["true || false = @", "true false ||", "true"],
    ["ceil(4.5) = @", "®45/10 ceil", "5"],
    ["floor(-4.5) = @", "®-45/10 floor", "-5"],
    [`matrix2table(matrix, ["D", "L"], ["A", "B"]) = @`, `¿matrix "D" "L" matrix 1 2 "A" "B" matrix 1 2 matrix2table 3`, "``\tD\tL\nA\t2.1\t7.5\nB\t-15.3\t33``"],
    [`@test 2 < 3`, "®2/1 ®3/1 <", "2 < 3, ok ✓"],
    [`@test 2 > 3`, "®2/1 ®3/1 >", "2 !> 3, n.g."],
    [`sum(matrix, 2) = @`, "¿matrix ®2/1 sum 2", "[9.6; 17.7]"],
    [`ones(2, 3) = @`, "®2/1 ®3/1 ones", "(1, 1, 1; 1, 1, 1)"],
    [`findfirst([false; false; true; false]) = @`, "false false true false matrix 4 1 findfirst 1", "3"],
    [`findfirst(4, [1; 3; 4; 6; 3]) = @`, "®4/1 ®1/1 ®3/1 ®4/1 ®6/1 ®3/1 matrix 5 1 findfirst 2", "3"],
    [`findmax([1; 4; 6; 3]) = @`, "®1/1 ®4/1 ®6/1 ®3/1 matrix 4 1 findmax", "``6\t3``"],
    [`5!! = @`, "®5/1 !!", "15"],
    [`30!! = @`, "®30/1 !!", "42,849,873,690,624,000"],
    [`newton(x → cos x, y → -sin y, 1.5) = @`, `"x" "¿x§cos" → "y" "¿y§sin§~" → ®15/10 function newton 3`, "1.5707963267949"],
    [`4 ∑_(n=1)³ 2 n + 3 = @`, `®4/1 "n" ®1/1 ®3/1 "®2/1§¿n§⌧" ∑ ⌧ ®3/1 +`, "51"],
    [`∑_(n=0)⁴ 2 n = @`, `"n" ®0/1 ®4/1 "®2/1§¿n§⌧" ∑`, "20"],
    [`1 'in⁻¹' × 2 'in⁻²' = @@ in⁻³`, `®1/1 applyUnit in⁻¹ ®2/1 applyUnit in⁻² ×`, "2 in⁻³"],
    [`'2025-01-20' + 12weeks = @@`, "⌾1737331200 ®12/1 applyUnit weeks +", "2025-04-14"],
    [`'2025-04-18' - '2000-1-1' = @@ days`, "⌾1744934400 ⌾946684800 -", "9,239 days"],
    [`savedate() = @@`, "savedate", "Error. The current document has not been saved."],
    [`aDate + 12weeks = @@`, "¿aDate ®12/1 applyUnit weeks +", "2025-04-14"],
    [`‖vector‖ = @`, "¿vector ‖", "18.9604852258585"],
    [`‖matrix‖ = @`, "¿matrix ‖", "37.1987903029117"],
    [`hypot(3, 4) = @`, `®3/1 ®4/1 hypot 2`, "5"],
    [`hypot(3, 4, 5) = @`, `®3/1 ®4/1 ®5/1 hypot 3`, "7.07106781186548"],
    [`5 mod 3 = @`, `®5/1 ®3/1 modulo`, "2"],
    [`5 2/3 + 1 1/3 = @`, `®17/3 ®4/3 +`, "7"],
    [`1USD = @@ USD`, `®1/1 applyUnit USD`, "1 USD"],
    [`2CAD = C$@@`, `®2/1 applyUnit CAD`, "C$2"],
    [`2 ph = @@ psi`, `®2/1 ¿ph ⌧`, "70 psi"],
    [`2/5  =  @%`, `®2/1 ®5/1 /`, "40%"],
    ["2 p = @%", `®2/1 ¿p ⌧`, "30%"],
    ["2 p = @@%", `®2/1 ¿p ⌧`, "30%"],
    [`0.2 × 2 = %%`, `®2/10 ®2/1 ×`, "0.2 × 2 = 0.4"],
    [`0.2 × 2 = %\\%`, `®2/10 ®2/1 ×`, "0.2 × 2 = 40%"],
    [`b2 or false = @`, "¿b2 false or", "false"]
  ];

  const testRegEx = /^(@{1,2})test /
  console.log("Now testing calculations…")
  console.log("")
  for (let i = 0; i < calcTests.length; i++) {
    numTests += 1
    const inputStr = calcTests[i][0];
    const expectedRPN = calcTests[i][1];
    const expectedOutput = calcTests[i][2];
    const pos = inputStr.lastIndexOf("=")
    let str = pos > -1 ? inputStr.slice(0, pos).trim() : inputStr
    str = str.replace(testRegEx, "")
    const [_, rpn] = hurmet.parse(str, { decimalFormat:"1,000,000.", dateFormat: "yyy-mm-dd" }, true)
    const output = hurmet.calculate(inputStr, vars, true)
    if (output !== expectedOutput || rpn !== expectedRPN) {
      numErrors += 1
      console.log("input:   " + inputStr)
      console.log("expected RPN: " + expectedRPN)
      console.log("actual RPN:   " + rpn)
      console.log("expected result: " + expectedOutput)
      console.log("actual result:   " + output)
      console.log("")
    }
  }

console.log("Done.")
console.log("Number of tests =  " + numTests)
console.log("Number of errors = " + numErrors)
