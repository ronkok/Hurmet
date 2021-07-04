<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Hurmet Manual</title>
   <link rel="shortcut icon" href="../../images/equal-sign.ico">
   <link rel="stylesheet" media="print" href="../../print.css">
   <link rel="stylesheet" href="../../cm/codemirror.css">
   <link rel="stylesheet" href="../docstyles.css">
   <link rel="stylesheet" href="../../katex/katex.min.css">
   <script src="../../cm/codemirror.js"></script>
   <script src="../../cm/closebrackets.js"></script>
   <script src="../../cm/matchbrackets.js"></script>
   <script src="../../katex/katex.min.js"></script>
   <script src="../../hurmet.min.js"></script>
   <script src="../demonstration.js"></script>
</head>

<body>
<main id="main">

# Hurmet Reference Manual

## Introduction

_Hurmet_ is a rich-text editor that gives you the ability to create high quality calculation documents using standard math notation.

Hurmet calculations are much easier to read and check than spreadsheet calculations. Hurmet does not hide the active expressions and intermediate values of a calculation. They’re all open for review in the displayed document.

You are welcome to use the [Hurmet.app] web page under terms of the [MIT License]. The source code is available in Hurmet’s GitHub <a href="https://github.com/ronkok/Hurmet" target="_blank">repository</a>.

Hurmet is in active development. You are free to use it, but be aware that there may be bugs and that I have plans for [more features]. As I add those features, it’s possible that some of the existing features may break.

[Hurmet.app]: ../../index.html
[MIT License]: https://opensource.org/licenses/MIT/
[more features]: #coming-attractions

## Editor Basics

Hurmet provides rich-text editing capabilities. You can apply styles to a document range by selecting text, then clicking one of the menu bar buttons:

|||
|:--------------------------------------------------------|:-----------------------------------|
|__≡__ ![folder-open] ![save] **M** ● ![draft] ![recalc] ![header] ![printer]| Document operations:<br>Navigate…, Open file…, Save file…, Import/Export to Markdown, Set decimal format, Draft mode, Recalculate all, Create print header, Print…
|![undo]  ![redo]                                         | Editing: Undo, Redo
|__B__  __*I*__  ![embed] __X<sub>2</sub>__  __X<sup>2</sup>__ ![strikethrough]  __<u>U</u>__ | Character styles:<br>Bold, Italic, Code, Subscript, Superscript, Strikethrough, Underline
|![link] __—__ ![upload] ![image] ![plus] ![integral]     | Insert:<br>Link…, Horizontal rule, Uploaded image…, Link to image…, Hurmet calculation…, TeX…
|__¶__ ![embed] __H1 H2__ ![align-center] ![indent] ![noprint] ![list] ![list-numbered] ![quotes] |Block styles:<br>Plain paragraph, Code block, Headings, Centered paragraph, Indent, Non-printing paragraph, List, Ordered list, Block quote
|![table] ![insert-row] ![insert-column] ![delete-table] ![delete-row] ![delete-column] ![merge] ![align-left] ![align-center] ![align-right] Tbl Style | Table:<br>Insert table, Insert row, Insert column, Delete table, Delete row, Delete column, Toggle cell merge, Align left, Align center, Align right, Set table style
|![info]   | Information

[folder-open]: ../../images/folder-open.svg  "Open file"
[save]: ../../images/save.svg "save"
[header]: ../../images/header.svg "header"
[draft]: ../../images/draft.svg "draft"
[recalc]: ../../images/recalc.svg "recalc"
[printer]: ../../images/printer.svg "printer"
[noprint]: ../../images/noprint.svg "no printer"
[undo]: ../../images/undo.svg "undo"
[redo]: ../../images/redo.svg "redo"
[embed]: ../../images/embed.svg "embed"
[strikethrough]: ../../images/strikethrough.svg "strikethrough"
[link]: ../../images/link.svg "link"
[upload]: ../../images/upload.svg "upload"
[image]: ../../images/image.svg "image"
[plus]: ../../images/plus.svg "plus"
[integral]: ../../images/integral.svg "integral"
[math]: https://en.wikibooks.org/wiki/LaTeX/Mathematics
[advanced math]: https://en.wikibooks.org/wiki/LaTeX/Advanced_Mathematics
[home page]: https://katex.org/
[supported-functions]: https://katex.org/docs/supported.html
[indent]: ../../images/indent.svg "indent"
[list]: ../../images/list.svg "list"
[list-numbered]: ../../images/list-numbered.svg "ordered list"
[quotes]: ../../images/quotes.svg "quotes"
[table]: ../../images/table.svg "table"
[insert-row]: ../../images/insert-row.svg "insert row"
[insert-column]: ../../images/insert-column.svg "insert column"
[delete-table]: ../../images/delete-table.svg "delete table"
[delete-row]: ../../images/delete-row.svg "delete row"
[delete-column]: ../../images/delete-column.svg "delete column"
[merge]: ../../images/merge.svg "merge"
[align-left]: ../../images/align-left.svg "align left"
[align-center]: ../../images/align-center.svg "align center"
[align-right]: ../../images/align-right.svg "align-right"
[info]: ../../images/info.svg "information"

Hurmet’s foremost feature is its calculation cells. The rest of this document is about them. But first I'll note one other feature:

#### TeX

Besides its calculation cells, Hurmet also has cells that emulate the math mode of ¢\TeX¢. These cells display, but do not calculate, math. You can insert a TeX cell by clicking the ![integral] button. Type __Shift-Enter__ to save the cell.

To create a cell in TeX display mode, first change the paragraph format to center-justified, then create the cell.

For more information about TeX and LaTeX, good places to start are the Wikibooks pages for writing [math] and [advanced math]; and the KaTeX [home page] and [supported-functions] page.

Hurmet calculation cells use a different syntax than TeX. In calculation cells, the syntax is more akin to a programming language, yet it renders like mathematics.

And now, on to the main event, Hurmet’s calculations.

## Tutorial

###### Create a cell
<div>

Hurmet calculation cells display math and perform numeric calculations. To create a calculation cell in  Hurmet.app, select a spot in the document, then click the ![plus] button or type __Alt c__.

While in a cell,<br>
      __Enter__ will close and update the cell.<br>
      __Shift-Enter__ will create a newline inside the cell.<br>
      __Esc__ will close the cell without updating it.<br>
      Clicking elsewhere will also close the cell.

</div>
<div id="statement-container">

###### Statements

Inside a calculation cell, we can write an statement and get a numeric result. In the demonstration box to the right, try replacing the text with `2 + 2 = ?` . Hurmet will render the math and write the result where you place the `?` mark.
</div>

###### Numbers

Numbers can be written as integers (33), decimals (2.45), or mixed fractions (3 ⁷⁄₈). There is a more detailed description [below](#number). 
<div id="arithmetic-container">

###### Arithmetic

The symbols: `+ - × / ^ √` are some of Hurmet’s arithmetic operators. Try an equation such as `2 × 4 + 3^2/7 = ?`. Play with changes to the values and operators to see how they work. See [here](#operators) for more operators.
</div>

###### Multiplication
<div>

Hurmet accepts several multiplication syntaxes. If ¢a = 7.1¢, then the following all give the same result:
<div class="indented">

¢2 × 7.1¢  
¢2 * 7.1¢  
¢2 · 7.1¢  
¢2 a¢  
¢(2)(7.1)¢
</div>

To obtain the character ¢×¢, type xx and hit the space bar. Auto-correct will give you an ¢×¢.

A space between variables acts as a multiplication operator.
</div>

###### Roots

Type `sqrt` and hit the spacebar to auto-correct into ¢√˽¢<br>`root 3` and `root 4` will also auto-correct into roots.

###### Function

Hurmet treats a word as a function name if it is placed directly before an open parenthesis. Example: ¢sin(π//6) = 0.5¢. Hurmet has many [built-in functions](#functions).
<div id="variable-container">

###### Variables
<div>

¢L = 3.1¢   ← That kind of statement will assign a value to a variable. Subsequent cells can then use the variable.<br>Example: `2 L = ?` will result in: ¢2 L = \color(blue)((2))(3.1) \color(black)= 6.2¢

A variable name must be a valid [identifier](#identifiers).

An assignment statement can also contain a calculation expression. Example:<br>
`b = 2 L = ?` will result in ¢b = 2 L = \color(blue)((2))(3.1) \color(black)= 6.2¢
</div>
</div>

###### Subscripts

An underscore signals the beginning of a subscript. Examples: `x_left` and `y_(i+1)` result in ¢x_left¢ and ¢y_(i+1)¢.
<div id="greek-container">

###### Greek letters

To write a Greek letter, write the name of the letter and hit the space bar. So, `alpha` ↦ α and `beta` ↦ β. More detail [here](#auto-correct).

###### Accents and Primes
<div>

To write an accent above a single-letter variable, write the accent name and hit the space bar for an auto-correction. Examples:
<div class="indented">

`y bar` ↦ ¢y̅¢  
`θ hat` ↦ ¢θ̂¢  
`P vec` ↦ ¢P⃗¢  
`x dot` ↦ ¢ẋ¢
</div>

More detail [here](#identifiers).

To write a prime, type two apostrophes (aka single quotation marks) and hit the space bar. So, `f''` will result in ¢f′¢
</div>
</div>
<div id="q-container">

###### Quantities

A Hurmet *quantity* contains both a magnitude and a unit of measure. Write a quantity between two single quotation marks, like this: `'3.1 m'`

###### Unit-Aware Calcs
<div>

Hurmet can automatically handle unit conversions of quantities. To call for a unit-aware calculations, write `??` instead of `?` where you want the result to appear.<br>Example:<br>`2 × '3.1 m' = ?? ft` results in ¢2 × ('3.1 m') = 13.1 ft¢.

This is covered in more detail [below](#unit-aware-calculations).
</div>
</div>

###### Result Rounding

To specify how results are to be rounded, use the format statement. Examples:<br>
`format = "f2"`   fixed to 2 places after decimal.<br>
`format = "r3"`   rounded to 3 significant digits.<br>
`format = "h3"`   like "r3", but doesn’t round integers.<br>
More details [below](#rounding-of-results).

###### Display Mode

Display mode centers a calculation cell and enlarges summation symbols and integration symbols. To get display mode, first set a paragraph to centered, then create the cell.

## Quick Reference

#### Markup

<div class="table-markup"></div>

| Input         | Renders as:   | Input                        | Renders or<br>calculates as: |
| ------------- | ------------- | ---------------------------- | -----------------------------|
| `12/25.2`     | ¢12/25.2¢     | `x`                          | ¢x¢                          |
| `(a + b)/c`   | ¢(a + b)/c¢   | `longVarName`                | ¢longVarName¢                |
| `a//b`        | ¢a//b¢        | `"A string."`                | ¢"A string."¢                |
| `a///b`       | ¢a///b¢       | `'5 N.m/s2'`                 | ¢'5 N.m/s2'¢                 |
| `x^23`        | ¢x^23¢        | `\(a, b; c, d)`              | ¢\(a, b; c, d)}¢             |
| `x^(a+b)`     | ¢x^(a+b)¢     | `\[a, b; c, d]`              | ¢\[a, b; c, d]¢              |
| `x_subscript` | ¢x_subscript¢ | `{:a, b; c, d:}`             | ¢{:a, b; c, d:}¢             |
| `x_(a+b)`     | ¢x_(a+b)¢     | `[1:4] = ?`                  | ¢[1, 2, 3, 4]¢               |
| `x′`          | ¢x′¢          | `[1:2:5] = ?`                | ¢[1, 3, 5]¢                  |
| `A-->note B`  | ¢A ⟶note B¢  | `{"w": 24, "h": 30}`         | ¢{"w": 24, "h": 30}¢         |
| `\red("ng")`  | ¢\red("ng")¢  | `\|x\|   ‖x‖`                | ¢\|x\|¢   ¢‖x‖¢              |
|               |               | `{a if b;`<br>`c otherwise}` | ¢{a if b;c otherwise}¢       |

Calculation cells also support many of the math-mode TeX functions [supported by KaTeX](https://katex.org/docs/supported.html). Put function arguments between parentheses, not braces, as in `\cancel(5)` instead of `\cancel{5}`.

TeX functions are provided for use in displaying math. Not all of them are valid in calculations.

A few color functions are valid in calculations, but only if their argument is a string. These are: `\blue`, `\gray`, `\green`, `\orange`, `\pink`, `\purple`, and `\red`. 

#### Auto-correct

Auto-correct kicks in when you type a space.

<div class="table-auto-correct"></div>

| Type    | Get | Type        | Get     | Type      | Get  | Type    | Get |
|:--------|:----|:------------|:--------|:----------|:-----|:--------|:----|
| xx      | ×   | sqrt        | √       | Gamma     | Γ    | alpha   | α   |
| .       | ·   | root 3      | ∛       | Delta     | Δ    | beta    | β   |
| ' '     | ′   | x^2         | x²      | Theta     | Θ    | gamma   | γ   |
| oo      | ∞   | bb M        | 𝐌      | Lambda    | Λ    | delta   | δ   |
| ooo     | °   | bbb E       | 𝔼      | Xi        | Ξ    | epsilon | ε   |
| `///`   | ∕   | cc P        | 𝒫      | Pi        | Π    | zeta    | ζ   |
| `<=`    | ≤   | \\ceil      | ⎾⏋      | Sigma     | Σ    | eta     | η   |
| `>=`    | ≥   | \\floor     | ⎿⏌      | Phi       | Φ    | theta   | θ   |
| `!=`    | ≠   | `<<`        | ⟨       | Psi       | Ψ    | iota    | ι   |
| `<>`    | ≠   | `>>`        | ⟩       | Omega     | Ω    | kappa   | κ   |
| \~=     | ≅   | ^^          | ∧       | y bar     | y̅   | lambda  | λ   |
| \~\~    | ≈   | vv          | ∨       | θ hat     | ¢θ̂¢ | mu      | μ   |
| \\in    | ∈   | vvv         | ⋁       | P vec     | ¢P⃗¢ | nu      | ν   |
| \\notin | ∉   | nn          | ∩       | P harpoon | ¢P⃑¢ | xi      | ξ   |
| -=      | ≡   | nnn         | ⋂       | a dot     | ȧ   | pi      | π   |
| :=      | ≔   | uu          | ∪       | a ddot    | ä   | rho     | ρ   |
| -:      | ÷   | uuu         | ⋃       | a grave   | à   | sigma   | σ   |
| +-      | ±   | \\checkmark | ✓       | a acute   | á   | tau     | τ   |
| -+      | ∓   | \\o         | ø       | a tilde   | ã   | upsilon | υ   |
| `->`    | →   | \\not       | ¬       | a ring    | å   | phi     | ϕ   |
| `<-`    | ←   | \\xor       | ⊻       | AA        | ∀    | chi     | χ   |
| `<->`   | ↔   | \\sum       | ∑       | EE        | ∃    | psi     | ψ   |
| `=>`    | ⇒   | \\int       | ∫       | CC        | ℂ    | omega   | ω   |
| \\circ  | ∘   | \\iint      | ∬       | HH        | ℍ    | \\hbar  | ℏ   |
| \|\|\|  | ¦   | ii          | ¢√(-1)¢ | NN        | ℕ    | \\ell   | ℓ   |
| \|\|    | ‖   | OO          | ¢O︀¢    | QQ        | ℚ    | \\euro  | €   |
| /_      | ∠   |             |         | RR        | ℝ    | \\yen   | ¥   |
|         |     |             |         | ZZ        | ℤ    |         |     |

The font corrections, e.g., `bb …` work on any letter from A to Z or a to z.

`-->`, `<--`, and `<-->` will auto correct into extensible arrows, as in: ¢A ⟶"note" B¢.

`\<space>` auto-corrects to `˽` in the text editor, which renders as a space.


#### Display Selectors

| Display selector | Display Selector for Unit-Aware Calculation    | Displays:             |
|:----------------:|:----------------------------------------------:| --------------------- |
|        ?         |       ??     | Entire calculation, including the result and a blue echo of the expression displaying the value plugged in to each variable.
|        %         |       %%     | Omits blue echo.
|        @         |      @@      | Displays only the result, like a spreadsheet cell.
|        !         |       !!     | Omits the blue echo and the result.<br>Valid only when the result is a data frame or a dictionary.

<div id="accessor-container">

#### Accessors

<div class="table-grid"></div>

| Data Type and Example                       | Accessor                         | Returns      |
|:--------------------------------------------|:---------------------------------|:-------------|
| string<br>s = "abcde"                       | s[2]<br>s[2:4]<br>s[3:]          | b<br>bce<br>cde
| Vector<br>𝐕 = ¢\[1, 2, 3, 4, 5]¢             | 𝐕[2]<br>𝐕[2:4]<br>𝐕[3:]          | 2<br>¢[2, 3, 4]¢<br>¢[3, 4, 5]¢
| Matrix<br>𝐌 = ¢\(1, 2, 3; 4, 5, 6; 7, 8, 9)¢ | 𝐌[2, 3]<br>𝐌[3,]<br>𝐌[2:3, 1:2] | 6<br>¢\[7, 8, 9]¢<br>¢\[4, 5; 7, 8]¢
| Dictionary<br>D = ¢{ "w": 31, "h": 9.13 }¢    | D.h<br>D["h"]<br>D["h", "w"]     | 9.13<br>9\.13<br>9\.13, 31
| Data Frame<br><img src="../../images/dataframe.png" alt="dataframe" width="180"/> | DF.B<br>DF["B"]<br>DF.area<br>DF.B.area<br>DF["B"].area<br>DF["B", "area"]<br>DF.w[1]| An entire row<br>An entire row<br>Column vector<br>22<br>22<br>22<br>4

</div>

Dot notation can be used only if the property name is a valid [identifier](#identifiers).

## Calculation Forms

Hurmet calculation cells don’t just display math; they compute numerical results.

It’s quite simple to assign a value to a variable:

<table>
  <tr><th>Form</th>  <th>Examples</th></tr>
  <tr>
    <td rowspan="4"><img src="../../images/assignment-railroad.svg" alt="identifier = value"></td>
    <td><code>x = 5</code></td>
  </tr>
  <tr><td><code>L = '3.1 m'</code></td></tr>
  <tr><td><code>w = '100 lbf/ft'</code></td></tr>
  <tr><td><code>name = "James"</code></td></tr>
</table>

To calulate an <span id="expression">expression</span> that contains a variable, a function, or an operator; write a `?` or `%` or `@` to indicate where the result should appear. Here are some examples:

<div class="table-no-wrap"></div>
    
| Input                          | Renders as:                                          |
| ------------------------------ | ---------------------------------------------------- |
| `2 + 2 = ?`                    | ¢2 + 2 = 4¢
| `2 + 2 = @`                    | ¢4¢
| `A = 2 × 4 = ?`                | ¢A = 2 × 4 = 8¢
| `x = 2 A = ?`                  | ¢x = 2 A = \color(blue)((2)(8)) \color(black) = 16¢
| `x = 2 A = %`                  | ¢x = 2 A = 16¢
| `A = '2 m' × '4 feet' = ?? m²` | ¢A = '2m' × ('4 feet') = '2.4384 m²'¢

The expression form is more precisely defined as:

![optional identifier = expression = (display selector) unit name](../../images/statement-railroad.svg)

At the beginning of the statement, you can write an optional variable name. The result of the calculation will be assigned to that variable. Expressions later in the document can call the variable. Variable names must qualify as valid [identifiers](#identifiers). They are case-sensitive and bold-sensitive. A search for variable *E* will not find *e*. A search for __M__ will not find *M*.

You can define a unit for the result with a leading currency symbol or a trailing unit name, but not both in the same statement.

#### Display Selector

Near the end of the statement is the display selector, i.e., `?`, `??`, etc. It determines how much of the calculation is displayed.

| Display selector | Display Selector for Unit-Aware Calculation    | Displays:             |
|:----------------:|:----------------------------------------------:| --------------------- |
|        ?         |       ??     | Entire calculation, including the result and a blue echo of the expression that displays the value plugged in to each variable.
|        %         |       %%     | Omits blue echo.
|        @         |      @@      | Displays only the result, like a spreadsheet cell.
|        !         |       !!     | Omits the blue echo and the result.<br>Valid only when the result is a data frame or a dictionary.

For an engineer like me, the most common display selector is **??**. I almost always want to see the entire calculation. Seeing the expression and the plugged-in values helps me to avoid the kind of unseen [errors](http://www.eusprig.org/horror-stories.htm) that creep into spreadsheet calculations. And it makes the calculation reviewable by a second set of eyes.

A doubled selector will prompt a [unit-aware calculation](#unit-aware-calculations). After you try them, you may wonder how you ever did without them.

I use the **!** selector mostly when I am assigning a [chunk of data](#data-table) to a variable.

I try to resist the temptation to overuse the **%** selector. When I review work done by another engineer, I can do without the blue echo if variable values are assigned directly above the equation where they are used. Otherwise I get grumpy. You don’t want a grumpy reviewer.

One last variation is possible when assigning values from a [dictionary](#dictionary). You can assign such values to more than one variable at a time, like this:

    A, I, w_self = beam["A", "Ix", "weight"] = !!

Multiple assignment statements must suppress the result display.

## Identifiers

Variable names and function names must be written in the form of a valid _identifier_.

*   Identifiers may be multiple characters long.
*   The first character must be a letter from the Latin or Greek alphabet. It may be bold or capitalized calligraphic Latin, or ℏ, or ℓ.
*   Subsequent characters may be letters or numerals (0123456789).
*   An under-score within an identifier is allowed and will be interpreted to mean the start of a subscript.
*   If an identifier has only one letter, then an accent character may be written after it. Hurmet will render the accent above the letter, as in ¢θ̂¢.
*   Primes may be appended to the very end, as in: ¢f_c′¢.
*   The following keywords may not be used as variable names: `π`, `ℏ`, `true`, `false`, `root`, `if`, `otherwise`, `and`, `or`, `modulo`, `in`, `to`.

<div class="indented">

![letter letter-or-digit-or-accent prime](../../images/identifier-railroad.svg)

</div>

The names of those accents are:

|||||
|:-------:|:-------:|:---:|:------------:|
| grave   | acute   | hat | tilde        |
| bar     | breve   | dot | ddot         |
| ring    | check   | ul  | leftharpoon  |
| harpoon | leftvec | vec | leftrightvec |

Hurmet’s auto-correct can help create identifiers.

<div id="identi-correct"></div>

| To create:           | … do this and hit the space bar                 | Example input | Example result |
| -------------------- | ----------------------------------------------- | ------------- | -------------- |
| Greek letter         | Type the name of the letter.                    | gamma         | γ
| Capital Greek letter | Capitalize the name’s first letter.             | Gamma         | Γ
| Bold letter          | Type “bb”, then space, then the desired letter. | bb M          | 𝐌
| Calligraphic capital letter  | Type “cc”, then space, then the desired letter. | cc P          | 𝒫
| Accent               | Type the name of the accent.                    | y bar         | ¢y̅¢
| Prime                | Type two apostrophes.                           | ''            | ′

Hurmet will render single Latin letter variable names in *italic*. Function names and multi-letter variable names are rendered in upright font. As a convention, I personally use __bold__ letters for variables that contain vectors or matrices.

## Data Types

###### Boolean

`true` or `false`

###### String
<div>

A *string* literal is a string of text characters enclosed by a pair of straight double quotation marks. The string may include any Unicode character except a straight double quotation mark, a newline, or a carriage return.

    "This is a string."

You can call a subset of any string with an index or range in brackets. Hurmet indices are one-based. Examples:

    a = "abcdefg"
    a[2]     # returns "b"
    a[2:4]   # returns "bcd"
    a[5:]    # returns "efg"

__Math String__

Strings will be rendered as math if they are delimited with single backticks instead of double quotes. So somthing like `` `M_n` `` will return as ¢M_n¢. This is useful mostly when a calculation checks a condition and reports whether some computed variable can be accepted.
</div>

###### Number

Enter as integers (33), decimals (2.45), percentages (3.2%), scientific notation (3.1e4), mixed fractions (3 ⁷⁄₈) or hexadecimal (0x2A).

<img src="../../images/NumberRailroad.svg" alt="integers, decimals, percentages, scientific notation, mixed fractions, or hexadecimal" height="275" style="margin-left: -1em;" id="number-rr">

<div class="indented">

Notice that a number literal must begin and end with a numeral, not a decimal symbol. Hurmet will not recognize `5.` as a number.

Hurmet’s default decimal symbol is a dot. You can choose instead to enter numbers with a decimal comma via a drop-down menu labeled “●”. Numbers are never entered with a thousands separator, but they can be *displayed* with one. The ● menu also controls that display.

Hurmet always saves a decimal symbol as a dot. It’s only the display that changes.

While calculations are underway, Hurmet holds every number in memory in rational number format. The numerator and denominator are each integers of arbitrary length. So Hurmet can work precisely with numbers like 0.1 and 0¹⁄₃. Trignonometry and roots are done in double-precision floating point, good to about 15 significant digits.
</div>

<!-- Integers may also be written as a hexadecimal literal:

![0x 0-9 or af](../../images/hex-railroad.svg) -->

###### Quantity
<div>

A Hurmet _quantity_ contains both a numeric magnitude and a unit of measure. Quantity literals are written between apostrophes, aka single straight quotation marks. Examples:

| Input                 | Renders as            |
| --------------------- | --------------------- |
| `'4.2 meters'`        | ¢'4.2 meters'¢
| `'-$25.10'`           | ¢'-$25.10'¢
| `'30°'`               | ¢'30°'¢
| `'10 N·m/s'`          | ¢'10 N·m/s'¢
| `'\[2.1; 15.3] feet'`  | ¢'\[2.1; 15.3] feet'¢

![single quote number or matrix or map unit-name single quote](../../images/quantity-railroad.svg)

Quantities are useful in [unit-aware calculations](#unit-aware-calculations) which do automatic unit conversion and also check for unit compatibility.

Hurmet has many built-in [unit definitions](unit-definitions.html). You can write any one of them into a quantity. SI (metric) prefixes are valid on the appropriate unit names.

You can also create compound units on the fly. That is, you can raise any unit to a power, and these powers-of-units can be multiplied (or divided) together into products. Example:

| Input          | Renders as     |
| -------------- | -------------- |
| `'4 kW.hr/m2'` | ¢'4 kW.hr/m2'¢ |

Note that within the quantity literal, it is not necessary to write `^` to indicate a numeric exponent. Also, a dot or a hyphen within a compound unit name will be rendered as a half-high dot.

Only one division solidus, **/**, may be written into a compound unit.
</div>

###### Matrix
<div>

A Hurmet *matrix* is a one or two dimensional arrangement of matrix elements. A Hurmet matrix element can be a number, a string, `true`, `false`, or an exprression that resolves to one of those simple types.

A Hurmet *vector* is a one dimensional matrix, either a row vector or a column vector.

A matrix literal is written between delimiters, either `\( )` or `\[ ]` or `{: }`. Matrix elements are separated by commas. Matrix rows are separated by semi-colons. Be sure to write a space after comma separators so they are not confused with decimals inside a number. Here are some matrix examples:

| Input           | Renders as     |
| --------------- | -------------- |
| `\(1, 0; 0, 1)`  | ¢\(1, 0; 0, 1)¢ |
| `\[2.1; -15.3]`  | ¢\[2.1; -15.3]¢ |
| `{:1, 0; 0, 1}` | ¢{:1, 0; 0, 1}¢ |

Another way to create a Hurmet vector is to write a range of numbers between brackets; the form is <span style="white-space: nowrap;">`[start:step:end]`</span>. A Hurmet calculation of that form will return a row vector with every number in the range. The step size is optional (default = 1). Examples:

|    Input      |       Result           |
| ------------- | ---------------------- |
| `[2:5] = ?`   | ¢[2:5] = \[2, 3, 4, 5]¢ |
| `[1:2:5] = ?` | ¢[1:2:5] = \[1, 3, 5]¢  |

You can call individual elements with index integers between brackets, as in `𝐕[5]` or `𝐌[1, 3]`. You can use a variable name for the index if the variable returns an integer.

You can access a sub-matrix using the range operator, “:”, as in `𝐌[2:5, 1]`. Entire rows or columns can be called by omitting an index, as in `𝐌[2,]` or `𝐌[,1]`. Hurmet indexes are one-based.
</div>

###### Matrix Operations
<div>

All the usual math operators can be applied to a numeric matrix. The operators mostly work in an element-wise fashion. If you add a scalar to a matrix, or pass a matrix to most functions, Hurmet will do an element-by-element calculation and return a matrix, as in:

<div class="indented">

¢𝐡 = \[5; 10; 15]¢

¢𝐱 = 2 𝐡 + 1 = \color(blue)(2) \[5; 10; 15] + 1 \color(black) = \[11; 21; 31]¢

</div>

Spreadsheet calculations can often be replaced by calulations using vectors, as above. When you really need to get things right, it’s great to be able to see the expression and all the plugged-in values.

<div id="matrix-mult">

Multiplication of two matrices is different than other operations. Mathematicians have several ways to multiply matrices. In Hurmet, you choose the type of multiplication by your choice of multiplication operator:

¢𝐀 * 𝐁¢ ↦ element-wise product, ¢(𝐀 * 𝐁)_ij = 𝐀_ij × 𝐁_ij¢

¢𝐀˽𝐁¢ ↦ [matrix product], ¢(𝐀 𝐁)_ij = ∑_(k = 1)^m 𝐀_i) 𝐁_kj¢

¢𝐀 × 𝐁¢ ↦ [cross product] of a pair of three-vectors  
       = ¢|𝐀||𝐁|sin(θ) 𝐧¢

[matrix product]: http://www.intmath.com/matrices-determinants/4-multiplying-matrices.php/
[cross product]: http://www.intmath.com/vectors/8-cross-product-vectors.php/

¢𝐀 ⋅ 𝐁¢ ↦ dot product = ¢∑_(i = 1)^n (𝐀_i 𝐁_i)¢
</div>

Here are more of Hurmet’s matrix operations:

¢𝐀^T¢ ↦ a transposed matrix.

¢𝐀^(-1)¢ ↦ an inverted matrix, if ¢𝐀¢ is square.

¢|𝐀|¢ ↦ ¢{determinant if "𝐀 is square"; magnitude otherwise}¢

¢abs(𝐀)¢ ↦ element-wise absolute values

¢‖𝐀‖¢ ↦ ¢{√(x_1^2 + ⋯ + x_n^2) if "𝐀 is a vector"; √(∑_i ∑_j A_ij^2) if "𝐀 is a matrix"¢

Functions will mostly work element-wise on an matrix. Exception: functions `min()` and `max()` will find the minimum or maximum of the elements in the matrix.

If you want to write a comma or a semi-colon inside parentheses and not create an matrix, use `\,` or `\;`.
</div>

###### Data Frame
<div>

A *data frame* is a two dimensional data structure that can be accessed with row names and column names or by row indices and column indices.

Each datum can be a number, a string, `true`, or `false`. A missing item will be taken to be `undefined`. All data in a column must be of the same data type. A column of numbers can be assigned a unit of measure. 

Data frame literals are written between double backtick delimiters. The text between the backticks must be written in CSV (comma-separated values) format. Numbers must use a dot decimal. The second row may contain units of measure. The first column will be indexed if the first word is “name” or “index”.

Here’s an example of CSV input:

    rebar = ``,diameter,area
    ,in ,in²
    #3,0.375,0.11
    #4,0.5  ,0.2
    #5,0.625,0.31
    #6,0.75 ,0.44``

… which renders as:

<p><span class="tex">\mathrm{rebar} = \begin{array}{l|c c}&amp;\mathrm{diameter}&amp;\mathrm{area} \\ &amp;{\text{in}}&amp;{\text{in}^{2}} \\ \hline\text{\#3}&amp;0.375 &amp;0.11  \\ \text{\#4}&amp;0.5 &amp;0.2  \\ \text{\#5}&amp;0.625 &amp;0.31  \\ \text{\#6}&amp;0.75 &amp;0.44\end{array}</span></p>

Data frames can be quite large, so Hurmet has a`fetch(url)` function to load data from a remote CSV file into a data frame. Since Hurmet runs in a browser, the url must begin with `http:` or `https:`

A fetch example:

    wideFlanges = fetch("https://hurmet.app/example.csv") = !

That example loads in this data:

<p><span class="tex">\begin{array}{l|c c c c c c c c}&amp;{\text{weight}}&amp;{A}&amp;{d}&amp;{\text{bf}}&amp;{\text{tw}}&amp;{\text{Ix}}&amp;{\text{Sx}}&amp;{\text{rx}} \\  &amp; {\text{lbf/ft}}&amp; {\text{in}^{2}}&amp; {\text{in}}&amp; {\text{in}}&amp; {\text{in}}&amp; {\text{in}^{4}}&amp; {\text{in}^{3}}&amp; {\text{in}} \\ \hline \text{W14X90}&amp;90&amp;26.5&amp;14&amp;14.5&amp;0.44&amp;999&amp;143&amp;6.14 \\ \text{W12X65}&amp;65&amp;19.1&amp;12.1&amp;12&amp;0.39&amp;533&amp;87.9&amp;5.28 \\ \text{W10X49}&amp;49&amp;14.4&amp;10&amp;10&amp;0.34&amp;272&amp;54.6&amp;4.35 \\ \text{W8X31}&amp;31&amp;9.13&amp;8&amp;8&amp;0.285&amp;110&amp;27.5&amp;3.47 \\ \text{W8X18}&amp;18&amp;5.26&amp;8.14&amp;5.25&amp;0.23&amp;61.9&amp;15.2&amp;3.43 \\ \text{W6X15}&amp;15&amp;4.43&amp;5.99&amp;5.99&amp;0.23&amp;29.1&amp;9.72&amp;2.56 \\ \text{W4X13}&amp;13&amp;3.83&amp;4.16&amp;4.06&amp;0.28&amp;11.3&amp;5.46&amp;1.72\end{array}</span></p>

As data frames go, that example is still pretty small. When I assign a data frame to a variable, I usually suppress its display by using the __!__ display selector.

I use a data frame most commonly by calling a row from it, like this:

`beam = wideFlanges.W10X49 = !!` or  
`beam = wideFlanges["W10X49"] = !!`

That returns a Hurmet [dictionary](#dictionary). Then I can call individual properties, like this:

`A = beam.A = ?? in2` or  
`A = beam["A"] = ?? in2` or  
`A = wideFlanges.W10X49.A = ?? in2`

You can also call an individual element, a column, or a group of elements. The index can be either a number or a string. Examples:

<div class="table-no-wrap"></div>

| This call:                   | … will return:                             |
| ---------------------------- | ------------------------------------------ |
| `wideFlanges.W10X49.A`       | ¢'14.4 in2'¢
| `wideFlanges["W10X49"]["A"]` | ¢'14.4 in2'¢
| `wideFlanges["W10X49", "A"]` | ¢'14.4 in2'¢
| `wideFlanges["W10X49", 1:2]` | ¢{"name": "W10X49"; "weight": '49 lbf/ft'}¢
| `wideFlanges[1:2, "A"]`      | ¢\[26.5; 19.1]¢

Hurmet will return a <br> ¢{"simple type" if "you call a single cell, as in df[1, 2]"; "column vector" if "you call a column, as in df[,2]"; "dictionary" if "you call a row, as in df[3,]"; "data frame" otherwise}¢

Dot notation, as in `wideFlanges.W10X49`, can be used only if the property name is a valid [identifier](#identifiers).

Here are calls that can return multiple values:<br>
    `A, S_x = wideFlanges.W8X31["A", "Sx"] = !!`, or<br>
    `A, S_x = wideFlanges["W8X31"]["A", "Sx"] = !!`, or<br>
    `A, S_x = wideFlanges["W10X49", \["A", "Sx"]] = !!`<br>
Multiple returns must use the `!!` display selector, for now.

For structural engineers, I’ve put some useful data frames on GitHub. There are links [below](#other-resources).

</div>

###### Dictionary
<div>

A _dictionary_ is a data structure in which you can store values and access each one with a unique name. Put another way, a dictionary is a collection of key:value pairs. It’s what Hurmet returns when you call one row of a data frame.

Dictionary literals are written between `{ }` delimiters. Each key must be a string, i.e., between double quotation marks. Keys are separated from values by a colon and key:value pairs are separated from each other by commas or semi-colons (but not both commas and semi-colons in the same dictionary).

Example:  `barArea = {"#4": 0.22, "#5": 0.31}`

A value may be any Hurmet data type except a data frame or a nested dictionary.

Call individual values from a dictionary with a key in brackets, as in `A = barArea["#3"]`. This notation also enables one to use a variable name for the key. Or, if the key qualifies as a valid [identifier](#identifiers), you can use dot notation, as in `W8X31.weight`

You can assign multiple values from a dictionary in one statement using bracket notation, like this:

    A, I, w_self = W8X31["A", "Ix", "weight"] = !!

Multiple assignment statements must have the result display suppressed.
</div>

###### Map
<div>

A Hurmet *map* is a dictionary in which every value is the same data type and, if numeric, carries the same unit-of-measure. Maps can be the numeric part of a quantity. 

    barArea = '{"#4": 0.22, "#5": 0.31} in2'

You can do arithmetic on maps and run them through functions. The operation will be done on each value in the map. For instance, a beam calculation can break the loads down into dead load, live load, snow load, etc.:

¢w = '{"D": 20; "L": 40; "S": 30} lbf/ft'¢        ¢L = '12 ft'¢

¢M = 1//8 w L^2  = \color(blue)(1/8 ('{"D": 20; "L": 40; "S": 30} lbf/ft')('12 ft')^2) \color(black) = '{"D": 0.54, "L": 0.72, "S": 0.36} k·ft'¢

Dictionaries with values of varying units-of-measure can be multiplied by a unit-less scalar. No other math operations are supported for non-map dictionaries.
</div>

## Expressions

Hurmet calculations are meant to be recognizeable to anyone familiar with standard math notation. That is a broad statement. Here are many nuances:

## Constants

*π*

: If you write ¢π¢ into an expression, Hurmet uses a value of 3.1415926535897932384626433832795028841971693993751.

*e*

: Hurmet will treat ¢e¢ just like any other variable most of the time. But if ¢e¢ is the base of an exponent, for example: ¢e^x¢, then Hurmet will take ¢e¢ to mean 2.7182818284590452353602874713527.

ℏ

: For ℏ, Hurmet uses a value of 1.054571817 × 10⁻³⁴ J·s.

## Operators
  
<div style="width:35em;">

<div class="table-grid" id="op-table"></div>
  
| Operator | Example              | Description                              |
| -------- | -------------------- | ---------------------------------------- |
| =        | *x* = 15                | Assign a value to a variable.
| =        | if *x* = 15             | Equality test if in a comparison position.<br>That is, “=” tests for equality if there is something other than a identifier to the left of it or a display selector to the right of it.
| \+       |  2 + 2                  | Addition
| –        |  5 - 3                  | Subtraction
| \-       | ¢-4¢                   | Unary minus
| \*       | ¢2 * 4¢                | Multiplication of numbers.<br>Element-wise product of matrices.
| ×        |  2 × 4                  | Multiplication of numbers.<br>Cross product of three-vectors.<br>auto-correct: **xx**
| ·        | ¢a ⋅ b¢                 | Multiplication of numbers.<br>Dot product of matrices.<br>auto-correct: dot between two spaces.
|          | ¢(2)(4)¢                | Multiplication
|          | `a b`                   | Multiplication. (A space acts as an operator when between variables.)
|          | ¢2 a¢                   | Multiplication
|          | ¢a2¢                    | Not a multiplication if no space.<br>Hurmet reads “a2” as an identifier.
|          | ¢sin(2)¢                | Function
|          | a (2)                   | Multiplication if a space exists before the open paren.
| /        | ¢8/2¢                   | Division
| //       | ¢8//2¢                  | Case fraction
| ///      | ¢8///2¢                 | Division displayed inline
| ÷        | ¢8 ÷ 2¢                 | Inline division<br>auto-correct: -:
| ^        | ¢3^2¢                   | Exponent
| &        |                         | Concatenate strings or vectors, or concatenate numbers onto vectors, or append column vectors to data frames
| √        | ¢√¢                     | Square root<br>auto-correct: sqrt
| ¢root 3 ()¢ | ¢root 3 8¢           | nth-root<br>auto-correct: root n
| \| \|    | ¢\|-4\|¢                | Absolute value of a scalar, determinant of a matrix, or magnitude of a vector.
| \|\| \|\|   | ¢\\Vert x \\Vert¢    | ¢√(x_1^2 + ⋯ + x_n^2)¢ if the argument is a vector of reals
| \|\| \|\|   | ¢\\Vert x \\Vert¢    | ¢√(∑_i ∑_j A_(i, j)^2)¢ if the argument is a 2-D matrix
| ⌊ ⌋      | ¢⎿4.5⏌¢                | Floor. Always rounds down.<br>auto-correct: floor
| ⌈ ⌉      | ¢⎾4.5⏋¢                | Ceiling. Always rounds up.<br>auto-correct: ceil
| %       | ¢10%¢                   | Percent
| ‰       | ¢10‰¢                   | Per thousand
| \!      | ¢5!¢                    | [Factorial](https://en.wikipedia.org/wiki/Factorial)<br>precision = ¢{100% if n ≤ 100; 15 digits otherwise}¢
| modulo  | `10` `modulo` `5`       | Always returns a positive remainder.
| ¢(n \atop k)¢ | (5 \atop 3)       | Binomial coefficient. ¢(n \atop k) = n!//(n!(n!-k!))¢
| =       | ¢if x = 15¢             | Equality comparison
| ≠       | ¢if b ≠ c¢              | Inequality comparison<br>auto-correct: != or <>
| `<`     |                         |
| `>`     |                         |
| ≤       |                         | auto-correct: <=
| ≥       |                         | auto-correct: >=
| ∈       | ¢c ∈ s¢                 | Is an element of a matrix or is a character of a string, or is a property of a dictionary<br>auto-correct: \in
| ∉       | ¢c ∉ s¢                 | Is not an element of<br>auto-correct: \notin
| ⋐      | ¢c ⋐ s¢                  | Is a proper subset of<br>auto-correct: \Subset
| and     | if *a* and *b*          | Logical and
| or      |                         | Logical or
| ∧       |                         | Logical and.      auto-correct: ^^
| ∨       |                         | Logical or.        auto-correct: vv
| ⊻       |                         | Logical xor
| ¬       |  if ¬ *a*               | Logical not
| :       | {"a": 10}<br>𝐕\[2:3\]<br>for *i* in 1:3 | Key:value separator if within a dictionary. Range separator otherwise.

</div>

## Functions

Hurmet treats an [identifier](#identifiers) as a function name if it is placed directly before an open parenthesis. So a term like ¢sinh(x)¢ is a function.

Hurmet’s built-in functions are described below. Unless noted otherwise, they can operate on any real number or any matrix containing real numbers. (Complex numbers are coming).

Transcendental functions, like trigonometry and logarithms, are done to 15 digits precision.

* * *
<dl>

abs(x)

: Absolute value of a real number

acos(*x*), asin(*x*), atan(*x*), asec(*x*), acsc(*x*), acot(*x*)

: Inverse trigonometry functions. One can also call an inverse trigonometry function with a superscript, as in ¢cos^(-1) x¢.

atan(*x*, *y*)

: When _atan_ is called with two arguments, it returns an angle in the proper quadrant. Given a point defined by real coordinates *x* and *y*, *atan* returns the angle between that point and the positive *x*-axis of a plane.

chr(*n*)

: Takes an integer as a argument, treats it as a Unicode code point, and returns the corresponding string character.<br>`chr(34)` returns a double quotation mark.

cos(𝜃), sin(𝜃), tan(𝜃), sec(𝜃), csc(𝜃), cot(𝜃)
<dd>

Trigonometry functions.

The trig functions listed above will assume that the argument is in radians unless you tell it otherwise. You can tell it otherwise by just writing in a unit, as in: `tan('45°')` and running a unit-aware calculation.

A positive integer written as a superscript after a trig function name will return the function result raised to a power. <br>So that: ¢sin^2 θ = (sin θ)^2¢.

A superscript <sup>-1</sup> indicates an inverse function. In other words, ¢cos^(-1) x = acos(x)¢.

Three functions: `sin`, `cos`, and `tan`, do not require parentheses around their arguments.
</dd>

cos<sub>d</sub>(𝜃), sin<sub>d</sub>(𝜃), tan<sub>d</sub>(𝜃), sec<sub>d</sub>(𝜃), csc<sub>d</sub>(𝜃), cot<sub>d</sub>(𝜃)

: The trigonometry functions listed just above will assume that the argument is in degrees. Hurmet will subscript the “d” for you.

cosh(*x*), sinh(*x*), tanh(*x*), sech(*x*), csch(*x*), coth(*x*)

: [Hyperbolic functions](https://en.wikipedia.org/wiki/Hyperbolic_function). Notation for inverse functions is similar to trigonometry.

count(*str*, *pattern*)

: The number of times string *pattern* occurs in string *str*.

dataframe(**a**, **b**, …)

: Takes vectors as arguments and returns a dataframe.

exp(*x*)

: ¢e^x¢

fetch(*url*)

: Fetches the contents of a remote file. It expects the file to be in CSV format and will return a data range. Fetch functions must be stand-alone expressions.

gcd(*m*, *n*)

: Greatest common divisor of two integers.

isNaN(*x*)

: Indicates if the argument is not numeric.

length(a)

: The length of a string or the number of elements in a matrix or vector.

lerp(__X__, __Y__, index)

: Linear interplolation. Locates real index within the vector __X__ and returns a real number interpolated from the vector __Y__. __X__ must contain values in ascending order.

log(*x*), ln(*x*)

: Natural (base _e_) logarithm of _x_.

log<sub>10</sub>(*x*)

: Base 10 logarithm. Hurmet will subscript the numerals for you.

log(*b*, *x*)

: Base _b_ logarithm.

logFactorial(*n*)

: Returns the natural logarithm of the factorial of the argument. Valid only for non-negative integers. Note that `log(n!)` is a valid alias for `logFactorial(n)`.

logΓ(*x*)

: Returns the natural logarithm of the Gamma function, Γ(*x*). For now, Hurmet's logΓ(*x*) function only works on positive rational numbers.

¢min(a,b,c,…),max(a,b,c,…)¢

: Minimum or maximum of a list or array. Real numbers only.

random()

: A pseudo-random number in the range from 0 to 1 (inclusive of 0, but not 1). Good for Monte-Carlo modeling. Not sufficiently random for crypto.

round(_x_, _spec_)

: Rounds a real number _x_.<br>To round to an integer, omit the spec.<br>To round to _n_ significant digits, write the spec as "r*n*", e.g., "r3".<br>To round to _n_ places after the decimal, write the spec as "f*n*".

sign(_x_)

: Returns ¢{1 if x > 0; -1 if x < 0; 0 otherwise}¢<br>Real numbers only.

sum(_a_, _b_, _c_, …), product(_a_, _b_, _c_, …), length(_a_, _b_, _c_, …), range(_a_, _b_, _c_, …), mean(_a_, _b_, _c_, …), variance(_a_, _b_, _c_, …), stddev(_a_, _b_, _c_, …)

: Functions that accumulate a result from a list of arguments.

zeros(_m_, _n_)

: Returns a _m_ × _n_ matrix filled with zeros.

Γ(*z*)

: [Gamma function](http://en.wikipedia.org/wiki/Gamma_function)<br>precision = ¢{100% if z" is a positive integer ≤ 100"; 15 digits otherwise}¢
</dl>

## Operator Precedence

What is the result of the expression ¢3 + 4 × 2¢ ?

It depends on whether one does the addition first or the multiplication first. So the answer could be ¢(3 + 4)(2)= 14¢ or it could be ¢3 + (4 × 2)= 11¢.

To resolve this ambiguity, Hurmet performs operations with the following precedence:

|||
| ------------- | ------------------------------------------------------------------------------------------- |
| \! %          | Factorials and percents are done first.                                                     |
| ^             | Then exponents, from right to left.                                                         |
| √             | Roots                                                                                       |
| \-            | Unary minus, for example: -4                                                                |
| ∠             | To write a complex number in *r*∠θ notation. (Coming later this year)                       |
| × · / ÷       | Multiplication or division, from left to right.                                             |
| \+ – &        | Addition or subtraction or concatenation, from left to right.                               |
| < > ≤ ≥ = ≠   | Comparisons (for [If Expressions](#if-expressions))                                         |
| ∧ ∨ ¬ ⊻       | Logical operators (ditto)                                                |
| :             | Separator for a range of integers, as in **V**\[2:3\].                                      |
| , ;           | Argument separators or row separators for functions, matrices, dictionaries, or If Expressions.  |
| ( ) \[ \]     | All conventions are over-ridden by parentheses or brackets.                                 |

Now let’s return to the question that opened this section. We now know that multiplication has a higher precedence than addition, so the answer to our question above is: ¢3 + (4 × 2)= 11¢

## If Expressions

Hurmet If Expressions enable you to choose between expressions, based upon one or more conditions, as in:
  
  <div class="indented">
  
¢β_1 = {0.85 if f_c′ ≤ 4000; 0.65 if f_c′ ≥ 8000; 0.85 - (f_c′ - 4000)//20000 otherwise}¢
  
  </div>
  
This sort of expression is written between the delimiters: `{ }`  
The row separator symbol is **;**  
Hurmet will automatically align the logic words **if** and **otherwise**.  
So the example above can be coded this way:

    β_1 = {
        0.85                         if f_c′ ≤ 4000 ;
        0.65                         if f_c′ ≥ 8000 ;
        0.85 - (f_c′ - 4000)/20000   otherwise
    }

The spaces in that code example are not significant. Hurmet always aligns the words `if` and `otherwise`. In fact, that example could also be coded all onto one line. To be precise, the form is:

![#{expression if condition; expression otherwise}](../../images/if-railroad.svg)

Conditions may contain logical operators:  and or not ∧  ∨  ¬  ⊻

¢x = {2 a if a < b and b = 4; a^2 otherwise}¢

Chained comparisons are okay.

¢x = {1.0 if a < b < 5 < d; 1.2 otherwise}¢

## Overloading

Overloading summary. That is, Hurmet  math operators and functions will work on all the data types tablulated below. They also work on a Hurmet quantity that takes any of these shapes:

|                           | scalar | vector | matrix | map | map with<br>vector values |
|:--------------------------|:------:|:------:|:------:|:---:|:-------------------------:|
| scalar                    | ✓      | ✓      | ✓      | ✓   | ✓                         |
| vector                    | ✓      | ✓      | ✓      | ✓   |                           |
| matrix                    | ✓      | ✓      | ✓      |     |                           |
| map                       | ✓      | ✓      |        |     |                           |
| map with<br>vector values | ✓      |        |        |     |                           |

There are a few operators that also work on dictionaries. For instance, a unit-less number can be multiplied times a dictionary that has numeric values.

## Unit-Aware Calculations

Hurmet has a data type called a [quantity](#quantity) that contains both a numeric magnitude and a unit of measure. In a Hurmet calculation editing box, you write quantity literals between single quotation marks. Examples:

<table class="nogrid">
   <tr>
     <td><pre><code>'4 meters'</code></pre></td>
     <td><pre><code>'7.1 ft3/s'</code></pre></td>
     <td><pre><code>'11 N·m'</code></pre></td>
   </tr>
</table>


Hurmet has a **unit-aware** calculation mode that automatically handles unit conversions on quantities and also checks that the operands are unit-compatible. You specify unit-aware mode by writing two question marks instead of one in the place where you want a result to appear. So if you open a Hurmet calculation cell and write:

    '4 ft' + '3 yards' = ?? m

… the result will render as:

¢'4 ft' + '3 yards' = '3.9624 m'¢

You can create composite units on the fly and Hurmet will still convert them automatically.

¢('3 kW·hr' × ('20 min')) / ('800 lbf' × '1 h') = '1.0116402439486971731 km'¢

If you try to add quantities with non-compatible units, Hurmet will return an error message:

¢'3 m' + '2 V' = \color(firebrick) "Error. Adding incompatible units."¢

If the calculated units are non-compatible with the units specified for the result display, Hurmet will return an error message:

¢'3 m' + '2 ft' = \color(firebrick) "Error. Calculated units are not compatible with the desired result unit:"\, "V"¢

If you assign a quantity to a variable, a unit-aware calculation will call the variable’s entire quantity, not just the numeric value.

¢L = '3 ft'¢

¢L_2 = 2 L = \color(blue)(2) ('3 ft') \color(black) = '1.8288 m'¢

If you assign a quantity to a variable, you can still call the variable from a non-unit-aware calculation. Such a calculation will call the scalar value, not the quantity.

¢L_unaware = 2 L = \color(blue)(2) (3) \color(black) =\\, 6¢

You’re welcome to view all of Hurmet’s built-in [unit definitions](unit-definitions.html "Unit Definitions").

#### Custom Units

If the Hurmet built-in unit definitions are not sufficient, you can define a set of custom units in a dictionary like this:

    units = { "smoot": '67 inches', "sol": '24.6229622 hours' }

#### Currencies

Currency exchange rates change, so Hurmet’s exchange rates are updated with [data from the European Central Bank](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml). That update occurs only once per week. For many purposes, such rates are insufficiently accurate, so you can override them and define your own exchange rates in a dictionary named **currencies**. Such a statement might be coded like this:

    currencies = { "USD": 1, "CAD": 1.25 }

The keys in that dictionary are standard three-letter [currrency codes](https://www.xe.com/iso4217.php). 

The variable name **currencies** may not be used for any other purpose.

#### Traditional Units

Many traditional units have had more than one historical definition. Hurmet currently has the following default treatment of certain traditional units:

*   __pound__ is treated as a mass, not a force. (__lbf__ and __lbm__ are un-ambiguous alternatives.)
*   __psf__ and __psi__, on the other hand, are treated as force per area.
*   __ton__ is treated as a mass, and is the U.S. customary unit. I also put in a __tonf__, 2000 lbf.
*   __gallon__, __fl oz__, __pint__, __quart__, and __bushel__ are the U.S. customary units.
*   Weights are avoirdupois, unless specifically noted as a troy weight.
*   __point__ is the adobe point = ¹∕₇₂ inch. __TeX point__ is also available.
*   __barrel__ and __bbl__ are an oil barrel = 42 US gallons.

If you are curious about some of the more unusual units, such as “survey foot” or “nautical mile”, I recommend Russ Rowlett’s [dictionary of units of measurement](http://www.ibiblio.org/units/).

## Numeral display

There are two aspects to how numbers are displayed: (1) decimal separators, and (2) rounding format for results.

### Decimal separator

In some countries, the usual decimal separator symbol is a dot. Other countries use a comma. Hurmet starts up with a decimal separator based upon the browser’s language setting. Hurmet also allows the reader (not the document author) to select which display they prefer. Just use the use the drop-down menu labeled “●”.

The same menu choice also selects how Hurmet displays thousands separators.

This menu choice changes nothing internally. It changes only the display. All Hurmet documents are saved with numbers that have a dot decimal and no thousands separator.

### Rounding of Results

Hurmet stores numbers internally as rational numbers in arbitrary precision, but its default result display is a decimal fraction with up to 15 significant digits. You can command Hurmet to _display_ results differently. Just write a format statement into a Hurmet calculation cell. The specified format will apply to every calculation result below that statement (until another format statement). Here’s a format statement example:

    format = "f2"

That statement specifies a fixed decimal format. Results after it will display exactly two digits after the decimal. If you would rather specify the number of significant digits, I suggest one of these statements:

    format = "r3"
    format = "h3"

`"r3"` will display a result rounded to exactly three significant digits. If your client freaks out because integer values have been rounded and look “wrong”, the `"h3"` format will round only the fractional part of a number.

That was the short explanation. Now the long one. The rounding format specification string must take the form: "**TN**", where:

| Specification<br>Letter | Description         | Use one of:      | Default |
|:-----------------------:|:------------------- |:---------------- |:-------:|
| T                       | Type of rounding    | bEefhkNnprSstx%  | h       |
| N                       | Number of digits    | \[0-9\]+         | 15      |


#### Type of rounding

Let _N_ be the number of digits specified. Then:
    
<div style="width:30em;">
 <table class="grid">
   <thead>
     <tr>
       <th rowspan="2">Type</th>
       <th rowspan="2">Description</th>
       <th colspan="3">Examples</th>
     </tr>
     <tr>
       <th>Number</th>
       <th>Format spec</th>
       <th>Result display</th>
     </tr>
   </thead>
   <tbody>
     <tr>
       <td>b</td>
       <td>Binary</td>
       <td>5</td>
       <td>b</td>
       <td>0b101</td>
     </tr>
     <tr>
       <td rowspan="2">e  or  E</td>
       <td rowspan="2">A programmer’s version of scientific notation. Rounds to <em>N</em> significant digits.</td>
       <td rowspan="2">22,000</td>
       <td>e3</td>
       <td>2.20e4</td>
     </tr>
     <tr>
       <td>E3</td>
       <td>2.20E4</td>
     </tr>
     <tr>
       <td rowspan="3">f</td>
       <td rowspan="3">Rounds to exactly <em>N</em> places after the decimal.</td>
       <td rowspan="3">3.236</td>
       <td>f0</td>
       <td>3</td>
     </tr>
     <tr>
       <td>f2</td>
       <td>3.24</td>
     </tr>
     <tr>
       <td>f4</td>
       <td>3.2360</td>
     </tr>
     <tr>
       <td rowspan="3">h</td>
       <td rowspan="3">
         Hurmet’s default format will round a decimal fraction to display <em>N</em> significant digits and omit trailing zeros, but it will not round an integer.
       </td>
       <td>31.345</td>
       <td>h3</td>
       <td>31.3</td>
     </tr>
     <tr>
       <td>65,809</td>
       <td>h3</td>
       <td>65,809</td>
     </tr>
     <tr>
       <td>1.1000</td>
       <td>h3</td>
       <td>1.1</td>
     </tr>
     <tr>
       <td>k</td>
       <td>Abbreviated and followed by a symbol from the SI prefixes. Rounds to <em>N</em> significant digits.</td>
       <td>22,000</td>
       <td>k3</td>
       <td>22.0k</td>
     </tr>
<!--     <tr>
       <td rowspan="2">m</td>
       <td rowspan="2">Mixed fraction. If <em>N</em> is specified, fraction is displayed with denominator no larger than <em>N</em>.</td>
       <td>2.25</td>
       <td>m</td>
       <td>2 ¹⁄₄</td>
     </tr>
     <tr>
       <td>5.1874</td>
       <td>m16</td>
       <td>5 ³⁄₁₆</td>
     </tr> -->
     <tr>
       <td rowspan="2">n  or  N</td>
       <td rowspan="2">Engineering notation, i.e. scientific notation with exponents that are even multiples of 3. Rounds to <em>N</em> significant digits.</td>
       <td rowspan="2">22,000</td>
       <td>n3</td>
       <td>22.0·10³</td>
     </tr>
     <tr>
       <td>N3</td>
       <td>22.0×10³</td>
     </tr>
     <tr>
       <td rowspan="2">r</td>
       <td rowspan="2">Rounds to <em>N</em> significant digits.</td>
       <td>31.345</td>
       <td>r3</td>
       <td>31.3</td>
     </tr>
     <tr>
       <td>65,809</td>
       <td>r3</td>
       <td>65,800</td>
     </tr>
     <tr>
       <td rowspan="2">s  or  S</td>
       <td rowspan="2">Scientific notation. Rounds to <em>N</em> significant digits.</td>
       <td rowspan="2">22,000</td>
       <td>s3</td>
       <td>2.20·10⁴</td>
     </tr>
     <tr>
       <td>S3</td>
       <td>2.20×10⁴</td>
     </tr>
     <tr>
       <td rowspan="2">p  or  %</td>
       <td rowspan="2">Percentage display.<br>“%” is fixed to exactly <em>N</em> places after the decimal.<br>“p” rounds to <em>N</em> significant digits.</td>
       <td>0.2812</td>
       <td>%1</td>
       <td>28.1%</td>
     </tr>
     <tr>
       <td>1.28</td>
       <td>p2</td>
       <td>130%</td>
     </tr>
     <tr>
       <td>t</td>
       <td>Truncates to a whole number.</td>
       <td>31.6</td>
       <td>t</td>
       <td>31</td>
     </tr>
     <tr>
       <td rowspan="2">x or X</td>
       <td rowspan="2">Hexadecimal</td>
       <td rowspan="2">62</td>
       <td>x</td>
       <td>0x3e</td>
     </tr>
     <tr>
       <td>X</td>
       <td>0x3E</td>
     </tr>
   </tbody>
 </table>
</div>

Numeric result display types __f__ and __%__ can be set to any non-negative integer. The significant digit display types are limited to no more than 15 significant digits. 


## User Defined Functions

If Hurmet’s [built-in functions](#functions) do not satisfy your needs, it is possible to write your own functions. Example:

    function multiply(a, b)
        return a × b

Other Hurmet calculation cells can then call the function:

¢n = multiply(2, 4) = 8¢

The function can have any number of arguments, or none, separated by commas. So the form of the first line is:

![functionName open paren arguments close paren](../../images/function-railroad.svg)

The function name and each argument (if any) must be valid identifiers.

Function statements end at a line ending, unless the last character is one of: **( [ { , ; + -** or the following line begins with one of: **} ] )**

Comments can be written after `#`. A space must precede the `#`.

Variables created inside a user-defined function are local and their values will not be available outside the function. A user-defined function returns only the result of the expression in a `return` statement.

If you omit any arguments when you call a function, Hurmet will fill out the argument list with values of `undefined` when it executes the function.

Hurmet does not support function recursion.

#### Code Blocks

Inside a user-defined function, Hurmet supports code blocks and some additional control words. That is, words such as _if_ and _else_ can control execution of a _block_ of statements, not just one expression. A code block is distinguished from other code by its indentation. That is, in a block, the beginning of every logical line is indented by the same amount. Example:

    if a ≤ b
        x = a + b²
        y = 2 x

Indentation may be done with only with spaces, not with tabs. I usually indent by four spaces.

A decrease in indentation is treated by Hurmet as equivalent to an `end` statement in some languages.

###### if​​ else
<div>

_if​​…else_ control words make the execution of code blocks dependent on a condition. Example:

        if a ≤ 4000
            b = 0.85
        else if a ≥ 8000
            b = 0.65
        else
            b = 0.85 - (a - 4000)/20000
</div>

###### while
<div>

A _while_ loop executes a code block repeatedly, as long as a condition holds true. Example:

        while b ≠ 0
            h = b
            b = a modulo b
            a = h
</div>

###### for
<div>

A _for_ loop iterates, executing a code block once with each element of a range or collection.

Examples:

<table class="grid">
  <tr>
    <td><pre><code>sum = 0
for i in 1:10
    sum = sum + i</code></pre>
    </td>
    <td><pre><code>reverse = ""
for ch in "abcdef"
    reverse = ch & reverse</code></pre>
    </td>
  </tr>
</table>

![for index variable in range or matrix or string](../../images/for-loop-railroad.svg)

The index variable of a *for* loop will iterate through each of the numbers in a range, the elements in a matrix, or the characters in a string.
</div>

###### break
<div>
A loop can be terminated early via the _break_ keyword. Example:

        for i in 1:1000000
            if i ≥ 2
                break
</div>

###### return
<div>

A _return_ statement terminates the function.

![return optional expression](../../images/return-railroad.svg)

If the optional _expression_ is present, the function will return its result. If not, the function will return `undefined`.
</div>

###### raise
<div>

A *raise* statement terminates the function and returns an optional error message.

![raise optional string](../../images/raise-railroad.svg)
</div>

###### echo
<div>

A *echo* statement writes a message to the browser’s console. You can type __Ctrl Shift I__ to see it. Such a message can be very useful while debugging a function.

![echo string](../../images/echo-railroad.svg)
</div>

## Remote modules

If some Hurmet code is used repeatedly, it makes sense to write that code once and import it into other documents. Hurmet modules are text files that serve that purpose. Modules can contain functions and statements that assign literal values to a variable. Such a module would have text that might look like this:

    E = '29000 ksi'

    v = \[4, 6, 8]

    function multiply(a, b)
        return a × b
    
A Hurmet document can load an entire module into one variable with a import statement. The following statement will import a file that contains the text above.

    mod = import("https://hurmet.app/smallModule.txt") = !

After a module has been imported and loaded into a variable, its functions and values can be called by writing the module name and variable/function name in dot notation, as in:

    E = mod.E = ?? psi

    n = mod.multiply(2, 4) = ?

#### Imported Parameters

The Hurmet variable name `importedParameters` has a special purpose. It loads module values into multiple variables instead of into one variable. An example of such an import is:

    importedParameters = import("https://hurmet.app/parent.txt") = !

That statement will render like this:

<div style="font-size: 16px;">

¢{:f_c′, f_c′′, f_yr, β_1, ρ_0;
ρ_max, E_c, G_c,  E, G;
n_c, σ_a, σ_as, μ_s, σ_p;
p_pl, ρ_g, C_e, I_s, V_w;
EC, k_zt, α, z_g, SC;
S_DS, S_D1, I_E,,} = import("https://hurmet.app/parent.txt")¢

</div>

Such a statement is handy in a big project, where you break the calculations into several documents. Since any big project often has several common variables, you want a way to keep them synchronized. Put an `importedParameters` statement into each of the documents and you’re good. As an added benefit, a reviewer can see what you are doing.

#### Gists

Hurmet is a web app, so it can import text files only from addresses that begin with `http` or `https`. An easy way to create such a file is a Github [Gist](https://gist.github.com/ "Gist"). I've written two example modules in Gists:

<div style="width: 30em; overflow-x: scroll">

*  https://gist.githubusercontent.com/ronkok/d42b0efdc66dc4f6135fee3b8d22a83e/raw/ which finds the structural strength of steel members per AISC 360-16.

*  https://gist.githubusercontent.com/ronkok/cbbf6cde15ac1b4c1e65cc338970043a/raw/ which duplicates the parent file above.
</div>

If you create your own Gists, you'll see that the addresses of the raw files are longer than my links. If you want a permalink to your file, delete everything after "/raw/". Github keeps a copy of every draft of your file and the part after "/raw/" is the revision ID.

## Troubleshooting

#### Typing lag

A big document with a lot of math may cause typing lag. You can regain some speed by using Firefox instead of Chrome or Edge, and gain more speed by clicking on the Draft Mode toggle button, ![draft]. It will render math as plain text and omit the blue echos.

I expect that Chrome and Edge will get a performance boost later this year when they support MathML and fix [this bug](https://bugs.chromium.org/p/chromium/issues/detail?id=1076718).

#### Matrix multiplication

To get element-wise multiplication of two matrices, the operator symbol must be [explicitly](#matrix-mult) written as `*`.

#### Word wrap

Hurmet soft line breaks occur after top level binary operators and relation operators. An operator inside a paren does not qualify. If a calculation runs past the edge of the page, try to rearrange it so less of it is inside parens.

#### Safari

Hurmet will run in the Safari browser as soon as it supports a BigInt data type. It is currently working in Safari's Technology Preview version.

#### Saving files

Tired of saving files to the Download folder? You can pick the folder where you save files, but first you have to change a browser setting.  In Chrome and Edge, go to ⋯ | Settings | Advanced | Downloads and in Firefox, go to ≡ | Options | Downloads.

#### Printing page numbers

Browsers will print page numbers only if you check the *Headers and footers* box. Unfortunately, that will usually include other unwanted information. Firefox is the only browser that enables you to customize the print header and footer. Here are the [complicated instructions](https://support.mozilla.org/en-US/questions/1323433). 

## Markdown

Hurmet can export or import a document in [Markdown](https://guides.github.com/features/mastering-markdown/ "Markdown") format. This is useful for collaboration.

Say that you have written a calculation. It’s awesome and you want to share it so that others can use it as a template. An easy way to share work is via a GitHub [Gist](https://gist.github.com/ "Gist"). Then anyone can view it, download it, or comment on it. If it is in Markdown format, you can read the Gist right there on GitHub. Here’s an [example](https://gist.github.com/ronkok/7fec7d11f6fb6a031e5a0827e3531d68).

Hurmet’s version of Markdown adds two extensions that GitHub does not recognize, those being TeX math content between `$…$` delimiters and calculation cells between `¢…¢` delimiters. It’s okay to write math into your document. It’s just that GitHub will not render it as math. Instead, GitHub will display the raw code. You can still read it.

GitHub Gists work best for simple content. Markdown does not recognize indented paragraphs or table styles. Markdown table cells cannot be merged and cannot contain lists or multiple paragraphs.

## Coming Attractions

*   Save files via Ctrl+S
*   Image captions
*   Charts
*   A `distribution` data type, to enable calculations with uncertainty
*   A `date` data type
*   Complex numbers

## Other Resources

Civil and structural engineers may also find these items useful:

* Beam Analysis [Diagram](https://hurmet.app/ce/beamanalysis.html)
* Concrete Column Interaction [Diagram](https://observablehq.com/@ronkok/concrete-column-interaction-diagram)
* Fetchable CSV files with steel shape data: [wide flanges], [channels], 
* [Module](https://gist.githubusercontent.com/ronkok/d42b0efdc66dc4f6135fee3b8d22a83e/raw/steelStrengthPerAISC360-16.hrms) with functions for steel member strength.

[wide flanges]: https://gist.githubusercontent.com/ronkok/a9f465e08be54cb4b46449768511acec/raw/AISC-v15-wideFlanges.csv "wideFlanges"
[channels]: https://gist.githubusercontent.com/ronkok/24987345bc31878e624edc39bfa08827/raw/AISC-v15-channels.csv "channels"

## Credits

I’m Ron Kok and I created Hurmet because I want practicing engineers to have the tools they need to write calculations that are clear, complete, and reviewable.

Hurmet is built with the aid of several open source libraries and resources, for which I am very grateful.

*   [ProseMirror](http://prosemirror.net), an extendable rich-text editor by Marijn Haverbeke.
*   [KaTeX](https://katex.org "KaTeX"), fast math rendering on the web, by Khan Academy and volunteer contributors.
*   [CodeMirror](https://codemirror.net/), a text editor, also by Marijn Haverbeke.
*   [Marked.js](https://marked.js.org/), for light-weight Markdown parsing, by the [Marked team](https://marked.js.org/#/AUTHORS.md).
*   [exchangeratesapi.io](https://exchangeratesapi.io "exchangeratesapi.io"), currency exchange rates updated daily, by Madis Väin.
*   Many of Hurmet’s menu buttons show images from [icomoon](https://icomoon.io "icomoon").
*   This document’s railroad diagrams are modified versions of images created with [regexper.com](https://regexper.com), by Jeff Avalone.

<br>

<span class="reduced">Copyright © 2020-2021 Ron Kok. Released under the [MIT License](https://opensource.org/licenses/MIT)</span>

<br>

</main>

<nav>
<div id="sidebar">
<h3><a href="#top">Contents</a></h3>

<ul class="toc">
<li><a href="#introduction">Introduction</a></li>
<li>
<details><summary>Tutorial</summary>

* [Create a cell](#create-a-cell)
* [Statements](#statements)
* [Multiplication](#multiplication)
* [Roots](#roots)
* [Functions](#function)
* [Variables](#variables)
* [Subscripts](#subscripts)
* [Greek letters](#greek-letters)
* [Accents and Primes](#accents-and-primes)
* [Quantities](#quantities)
* [Unit-Aware Calcs](#unit-aware-calcs)
* [Result Rounding](#result-rounding)
* [Display Mode](#display-mode)

</details>
</li>
<li>
<details><summary>Quick Reference</summary>

* [Markup](#markup)
* [Auto-correct](#auto-correct)
* [Display Selectors](#display-selectors)
* [Accessors](#accessors)

</details>
</li>
<li><a href="#calculation-forms">Calculation Forms</a></li>
<li><a href="#identifiers">Identifiers</a></li>
<li>
<details><summary>Data Types</summary>

* [Boolean](#boolean)
* [String](#string)
* [Number](#number)
* [Quantity](#quantity)
* [Matrix](#matrix)
* [Data Frame](#data-frame)
* [Dictionary](#dictionary)
* [Map](#map)

</details>
</li>
<li>
<details><summary>Expressions</summary>

* [General](#expressions)
* [Constants](#constants)
* [Operators](#operators)
* [Functions](#functions)
* [Operator Precedence](#operator-precedence)
* [If Expressions](#if-expressions)
* [Overloading](#overloading)

</details>
</li>
<li>
<details><summary>Units</summary>

* [Unit-Aware Calcs](#unit-aware-calculations)
* [Custom Units](#custom-units)
* [Currencies](#currencies)
* [Traditional Units](#traditional-units)

</details>
</li>
<li><a href="#numeral-display">Numeral Display</a></li>
<li>
<details><summary>UDFs</summary>
<ul>
<li><a href="#user-defined-functions">User-Defined Functions</a></li>
<li><a href="#code-blocks">Code blocks</a></li>
<li>
<details><summary>Control Flow</summary>

* [if…else](#if-else)
* [while loops](#while)
* [for loops](#for)
* [break](#break)
* [return](#return)
* [raise](#raise)
* [echo](#echo)

</details>
</li>
</ul>
</details>
</li>
<li><a href="#remote-modules">Modules</a></li>
<li>
<details><summary>End notes</summary>

* [Troubleshooting](#troubleshooting)
* [Markdown](#markdown)
* [Coming Attractions](#coming-attractions)
* [Other Resources](#other-resources)
* [Credits](#credits)

</details>
</li>
</ul>
  
</div>  <!-- sidebar -->
</nav>

<div id="mobile-nav">
  <!--On very small screens, the sidebar TOC is replaced by a button with a drop-down menu. -->
  <div id="navicon">
    <details><summary><img src="../../images/navicon.svg" alt="≡" width="24" height="24"></summary>
      <ul class="mobile-menu">
        <li><a href="#top">Top</a></li>
        <li><a href="#math-editor">Calculation</a></li>
        <li><a href="#identifiers">Identifiers</a></li>
        <li><a href="#data-types">Data Types</a></li>
        <li><a href="#expressions">Expressions</a></li>
        <li><a href="#unit-aware-calculations">Units</a></li>
        <li><a href="#numeral-display">Numeral Display</a></li>
        <li><a href="#user-defined-functions">UDFs</a></li>
        <li><a href="#remote-modules">Modules</a></li>
      </ul>
    </details>
  </div>
</div>

<div id="demo">
<p>format = "<input type="text" id="formatBox" value="h3" onchange="updateFormat()" style="width: 1.5em;">"</p>
<p></p>
<div>Give it a try. (It’s interactive.)</div>
<div id="input-container"><form><textarea id="demo-input"></textarea></form></div>
<div id="demo-output"></div>
</div> <!-- demo -->


<script>
  // Render math via KaTeX.
  const texSpans = document.getElementById("main").getElementsByClassName("tex");
  const isFF = 'MozAppearance' in document.documentElement.style;
  [...texSpans].forEach(span => {
     const tex = span.textContent.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
     katex.render(tex, span, { strict: false, throwOnError: false, output: isFF ? "mathml" : "htmlAndMathml" })
  })
  
  // Start the demonstration editor
  const editor = CodeMirror.fromTextArea(document.getElementById("demo-input"), {
    autoCloseBrackets: true,
    lineWrapping: true,
    matchBrackets: true
  });
  const demoOutput = document.getElementById("demo-output");
  editor.on('change', () => demonstration.renderMath(editor.doc, demoOutput))
  editor.doc.setValue("Hi!")

  // The next line is called by the format input box.
  updateFormat = () => demonstration.renderMath(editor.doc, document.getElementById("demo-output"))

  // Change the content of the demonstration box to match the currently scrolled topic.
  var observer = new IntersectionObserver(function(entries) {
    for (const entry of entries) {
      if (entry.intersectionRatio === 1.0) {
	      editor.doc.setValue(demonstration.prompts[entry.target.id])
        break
      }
    }
  }, {
  root: null,
  rootMargin: '0px',
  threshold: 1.0
});

  observer.observe(document.getElementById("statement-container"))
  observer.observe(document.getElementById("arithmetic-container"))
  observer.observe(document.getElementById("variable-container"))
  observer.observe(document.getElementById("greek-container"))
  observer.observe(document.getElementById("q-container"))
  observer.observe(document.getElementById("markup"))
  observer.observe(document.getElementById("auto-correct"))
  observer.observe(document.getElementById("display-selectors"))
  observer.observe(document.getElementById("accessor-container"))
  observer.observe(document.getElementById("calculation-forms"))
  observer.observe(document.getElementById("identifiers"))
  observer.observe(document.getElementById("identi-correct"))
  observer.observe(document.getElementById("data-types"))
  observer.observe(document.getElementById("number-rr"))
  observer.observe(document.getElementById("quantity"))
  observer.observe(document.getElementById("matrix"))
  observer.observe(document.getElementById("matrix-mult"))
  observer.observe(document.getElementById("data-frame"))
  observer.observe(document.getElementById("dictionary"))
  observer.observe(document.getElementById("functions"))
  observer.observe(document.getElementById("if-expressions"))
  observer.observe(document.getElementById("unit-aware-calculations"))
  observer.observe(document.getElementById("remote-modules"))

</script>

</body>
</html>