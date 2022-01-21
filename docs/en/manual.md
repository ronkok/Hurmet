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
<main>

# Hurmet Reference Manual

## Introduction

_Hurmet_ is a rich-text editor that gives you the ability to create high
quality calculation documents using standard math notation.

Hurmet calculations are much easier to read and check than spreadsheet
calculations. Hurmet does not hide the active expressions and intermediate
values of a calculation. They’re all open for review in the displayed document.

You are welcome to use the [Hurmet.app][] web page under terms of the
[MIT License][]. The source code is available in Hurmet’s GitHub
[repository][].

Hurmet is in active development. You are free to use it, but be aware that
there may be bugs and that I have plans for [more features][]. As I add those
features, it’s possible that some of the existing features may break.

[Hurmet.app]: ../../index.html
[MIT License]: https://opensource.org/licenses/MIT/
[more features]: #coming-attractions
[repository]: https://github.com/ronkok/Hurmet

## Editor Basics

Hurmet provides rich-text editing capabilities. You can apply styles to a
document range by selecting text, then clicking one of the menu bar buttons:

+:-------------------------------------+:-----------------------------------+
| **≡** ![open file][] ![save][]       | Document operations:\              |
| **M** ● ![draft][] ![recalc][]       | Navigate…, Open file…, Save file…, |
| ![header][] ![printer][]             | Import/Export to Markdown, Set     |
|                                      | decimal format, Draft mode,        |
|                                      | Recalculate all, Create print      |
|                                      | header, Print…                     |
+--------------------------------------+------------------------------------+
| ![undo][]  ![redo][]                 | Editing: Undo, Redo                |
+--------------------------------------+------------------------------------+
| **B**  **_I_**  ![embed][]           | Character styles:\                 |
| **X<sub>2</sub>**  **X<sup>2</sup>** | Bold, Italic, Code, Subscript,     |
| ![strikethrough][]  **<u>U</u>**     | Superscript, Strikethrough,        |
|                                      | Underline                          |
+--------------------------------------+------------------------------------+
| ![link][] **—** ![upload][]          | Insert:\                           |
| ![image][] ![plus][] ![integral][]   | Link…, Horizontal rule, Uploaded   |
|                                      | image…, Link to image…, Hurmet     |
|                                      | calculation…, TeX…                 |
+--------------------------------------+------------------------------------+
| **¶** ![embed][] **H1 H2**           | Block styles:\                     |
| ![align-center][] ![indent][]        | Plain paragraph, Code block,       |
| ![list][] ![numbered list][]         | Headings, Centered paragraph,      |
| ![quotes][]                          | Indent, List, Ordered list, Block  |
|                                      | quote                              |
+--------------------------------------+------------------------------------+
| ![table][] ![insert-row][]           | Table:\                            |
| ![insert-column][] ![delete-table][] | Insert table, Insert row, Insert   |
| ![delete-row][] ![delete-column][]   | column, Delete table, Delete row,  |
| ![merge][] ![align-left][]           | Delete column, Toggle cell merge,  |
| ![align-center][] ![align-right][]   | Align left, Align center, Align    |
| Tbl Style                            | right, Set table style             |
+--------------------------------------+------------------------------------+
| ![information][]                     | Information                        |
+--------------------------------------+------------------------------------+

[open file]: ../../images/folder-open.svg
[save]: ../../images/save.svg
[header]: ../../images/header.svg
[draft]: ../../images/draft.svg
[recalc]: ../../images/recalc.svg
[printer]: ../../images/printer.svg
[undo]: ../../images/undo.svg
[redo]: ../../images/redo.svg
[embed]: ../../images/embed.svg
[strikethrough]: ../../images/strikethrough.svg
[link]: ../../images/link.svg
[upload]: ../../images/upload.svg
[image]: ../../images/image.svg
[plus]: ../../images/plus.svg
[integral]: ../../images/integral.svg
[math]: https://en.wikibooks.org/wiki/LaTeX/Mathematics
[advanced math]: https://en.wikibooks.org/wiki/LaTeX/Advanced_Mathematics
[home page]: https://katex.org/
[supported-functions]: https://katex.org/docs/supported.html
[indent]: ../../images/indent.svg
[list]: ../../images/list.svg
[numbered list]: ../../images/list-numbered.svg
[quotes]: ../../images/quotes.svg
[table]: ../../images/table.svg
[insert-row]: ../../images/insert-row.svg
[insert-column]: ../../images/insert-column.svg
[delete-table]: ../../images/delete-table.svg
[delete-row]: ../../images/delete-row.svg
[delete-column]: ../../images/delete-column.svg
[merge]: ../../images/merge.svg
[align-left]: ../../images/align-left.svg
[align-center]: ../../images/align-center.svg
[align-right]: ../../images/align-right.svg
[information]: ../../images/info.svg

Hurmet’s foremost feature is its calculation cells. The rest of this document
is about them. But first I'll note one other feature:

#### TeX

Besides its calculation cells, Hurmet also has cells that emulate the math mode
of ¢` \TeX `. These cells display, but do not calculate, math. You can insert a
TeX cell by clicking the ![integral][] button. Type **Enter** to save the
cell.

To create a cell in TeX display mode, first change the paragraph format to
center-justified, then create the cell.

For more information about TeX and LaTeX, good places to start are the Wikibooks
pages for writing [math][] and [advanced math][]; and the KaTeX [home page][]
and [supported-functions][] page.

Hurmet calculation cells use a different syntax than TeX. In calculation cells,
the syntax is more akin to a programming language, yet it renders like mathematics.

And now, on to the main event, Hurmet’s calculations.

## Tutorial

<dl class="bold-term">

Create a cell

: Hurmet calculation cells display math and perform numeric calculations. To create
  a calculation cell in  Hurmet.app, select a spot in the document, then click the
  ![plus][] button or type **Alt c**.

  While in a cell,\
        **Enter** will close and update the cell.\
        **Shift-Enter** will create a newline inside the cell.\
        **Esc** will close the cell without updating it.\
        Clicking elsewhere will also close the cell.

<div id="statement-container">

Statements

: Inside a calculation cell, we can write an statement and get a numeric result.
  In the demonstration box to the right, try replacing the text with `2 + 2 = ?`.
  Hurmet will render the math and write the result where you place the `?` mark.

</div>

Numbers

: Numbers can be written as integers (33), decimals (2.45), or mixed fractions (3 ⁷⁄₈).
  There is a more detailed description [below](#number).

<div id="arithmetic-container">

Arithmetic

: The symbols: `+ - × / ^ √` are some of Hurmet’s arithmetic operators. Try an
  equation such as `2 × 4 + 3^2/7 = ?`. Play with changes to the values and
  operators to see how they work. See [here](#operators) for more operators.

</div>

Multiplication

: Hurmet accepts several multiplication syntaxes. If ¢`a = 7.1`, then the
  following all give the same result:

  i> ¢`2 × 7.1`\
     ¢`2 * 7.1`\
     ¢`2 · 7.1`\
     ¢`2 a`\
     ¢`(2)(7.1)`

  To obtain the character ¢` × `, type xx and hit the space bar. Auto-correct
  will give you an ¢`×`.

  A space between variables acts as a multiplication operator.

Roots

: Type `sqrt` and hit the spacebar to auto-correct into ¢`√˽`<br>`root 3` and
  `root 4` will also auto-correct into roots.

Function

: Hurmet treats a word as a function name if it is placed directly before an
  open parenthesis. Example: ¢`sin(π//6) = 0.5`. Hurmet has many
  [built-in functions](#functions).

<div id="variable-container">

Variables

: ¢`L = 3.1`   ← That kind of statement will assign a value to a variable.
  Subsequent cells can then use the variable.<br>Example: `2 L = ?` will result
  in: ¢`2 L = \color(blue)((2))(3.1) \color(black)= 6.2`

  A variable name must be a valid [identifier](#identifiers).

  An assignment statement can also contain a calculation expression. Example:\
  `b = 2 L = ?` will result in ¢` b = 2 L = \color(blue)((2))(3.1) \color(black)= 6.2 `

</div>

Subscripts

: An underscore signals the beginning of a subscript. Examples: `x_left` and
  `y_(i+1)` result in ¢`x_left` and ¢`y_(i+1)`.

<div id="greek-container">

Greek letters

: To write a Greek letter, write the name of the letter and hit the space bar.
  So, `alpha` ↦ α and `beta` ↦ β. More detail [here](#auto-correct).

Accents and Primes

: To write an accent above a single-letter variable, write the accent name and
  hit the space bar for an auto-correction. Examples:

  i> `y bar` ↦ ¢`y̅`\
     `θ hat` ↦ ¢`θ̂`\
     `P vec` ↦ ¢`P⃗`\
     `x dot` ↦ ¢`ẋ`

  More detail [here](#identifiers).

  To write a prime, type two apostrophes (aka single quotation marks) and hit the
  space bar. So, `f''` will result in ¢`f′`

</div>

<div id="q-container">

Quantities

: A Hurmet _quantity_ contains both a magnitude and a unit of measure. Write a
  quantity between two single quotation marks, like this: `'3.1 m'`

Unit-Aware Calcs

: Hurmet can automatically handle unit conversions of quantities. To call for a
  unit-aware calculations, write `??` instead of `?` where you want the result to
  appear.<br>Example:<br>`2 × '3.1 m' = ?? ft` results in ¢`2 × ('3.1 m') = 13.1 ft`.

  This is covered in more detail [below](#unit-aware-calculations).

</div>

Result Rounding

: To specify how results are to be rounded, use the format statement. Examples:\
  `format = "f2"`   fixed to 2 places after decimal.\
  `format = "r3"`   rounded to 3 significant digits.\
  `format = "h3"`   like "r3", but doesn’t round integers.\
  More details [below](#rounding-of-results).

Display Mode

: Display mode centers a calculation cell and enlarges summation symbols and
  integration symbols. To get display mode, first set a paragraph to centered,
  then create the cell.

</dl>

## Quick Reference

#### Markup

| Input         | Renders as:    | Input                        | Renders or<br>calculates as:  |
|---------------|----------------|------------------------------|-------------------------------|
| `12/25.2`     | ¢`12/25.2`     | `x`                          | ¢`x`                          |
| `(a + b)/c`   | ¢`(a + b)/c`   | `longVarName`                | ¢`longVarName`                |
| `a//b`        | ¢`a//b`        | `"A string."`                | ¢`"A string."`                |
| `a///b`       | ¢`a///b`       | `'5 N.m/s2'`                 | ¢`'5 N.m/s2'`                 |
| `x^23`        | ¢`x^23`        | `\\(a, b; c, d)`             | ¢`\\(a, b; c, d)}`            |
| `x^(a+b)`     | ¢`x^(a+b)`     | `\\[a, b; c, d]`             | ¢`\\[a, b; c, d]`             |
| `x_subscript` | ¢`x_subscript` | `{:a, b; c, d:}`             | ¢`{:a, b; c, d:}`             |
| `x_(a+b)`     | ¢`x_(a+b)`     | `[1:4] = ?`                  | ¢`[1, 2, 3, 4]`               |
| `x′`          | ¢`x′`          | `[1:2:5] = ?`                | ¢`[1, 3, 5]`                  |
| `A-->note B`  | ¢`A ⟶note B`  | `{"w": 24, "h": 30}`         | ¢`{"w": 24, "h": 30}`         |
| `\red("ng")`  | ¢`\red("ng")`  | `\|x\|   ‖x‖`                | ¢`\|x\|`   ¢`‖x‖`             |
|               |                | `{a if b;`<br>`c otherwise}` | ¢`{a if b;c otherwise}`       |
{.markup}

Calculation cells also support many of the math-mode TeX functions
[supported by KaTeX](https://katex.org/docs/supported.html). Put function
arguments between parentheses, not braces, as in `\cancel(5)` instead of
`\cancel{5}`.

TeX functions are provided for use in displaying math. Not all of them are
valid in calculations.

A few color functions are valid in calculations, but only if their argument is
a string. These are: `\blue`, `\gray`, `\green`, `\orange`, `\pink`, `\purple`,
and `\red`. 

#### Auto-correct

Auto-correct kicks in when you type a space.

<div class="auto-correct"></div>

| Type    | Get | Type        | Get     | Type      | Get  | Type    | Get |
|:--------|:----|:------------|:--------|:----------|:-----|:--------|:----|
| xx      | ×   | sqrt        | √       | Gamma     | Γ    | alpha   | α   |
| .       | ·   | root 3      | ∛       | Delta     | Δ    | beta    | β   |
| ' '     | ′   | x^2         | x²      | Theta     | Θ    | gamma   | γ   |
| oo      | ∞   | bb M        | 𝐌      | Lambda    | Λ    | delta   | δ   |
| ooo     | °   | bbb E       | 𝔼      | Xi        | Ξ    | epsilon | ε   |
| `///`   | ∕   | cc P        | 𝒫      | Pi        | Π    | zeta    | ζ   |
| `<=`    | ≤   | kk          | ()      | Sigma     | Σ    | eta     | η   |
| `>=`    | ≥   | \\ceil      | ⎾⏋      | Phi       | Φ    | theta   | θ   |
| `!=`    | ≠   | \\floor     | ⎿⏌      | Psi       | Ψ    | iota    | ι   |
| `<>`    | ≠   | `<<`        | ⟨       | Omega     | Ω    | kappa   | κ   |
| \~=     | ≅   | `>>`        | ⟩       | y bar     | y̅   | lambda  | λ   |
| \~\~    | ≈   | ^^          | ∧       | θ hat     | ¢`θ̂` | mu      | μ   |
| \\in    | ∈   | vv          | ∨       | P vec     | ¢`P⃗` | nu      | ν   |
| \\notin | ∉   | vvv         | ⋁       | P harpoon | ¢`P⃑` | xi      | ξ   |
| -=      | ≡   | nn          | ∩       | a dot     | ȧ   | pi      | π   |
| :=      | ≔   | nnn         | ⋂       | a ddot    | ä   | rho     | ρ   |
| -:      | ÷   | uu          | ∪       | a grave   | à   | sigma   | σ   |
| +-      | ±   | uuu         | ⋃       | a acute   | á   | tau     | τ   |
| -+      | ∓   | \\checkmark | ✓       | a tilde   | ã   | upsilon | υ   |
| `->`    | →   | \\o         | ø       | a ring    | å   | phi     | ϕ   |
| `<-`    | ←   | \\not       | ¬       | AA        | ∀    | chi     | χ   |
| `<->`   | ↔   | \\xor       | ⊻       | EE        | ∃    | psi     | ψ   |
| `=>`    | ⇒   | \\sum       | ∑       | CC        | ℂ    | omega   | ω   |
| \\circ  | ∘   | \\int       | ∫       | HH        | ℍ    | \\hbar  | ℏ   |
| \|\|\|  | ¦   | \\iint      | ∬       | NN        | ℕ    | \\ell   | ℓ   |
| \|\|    | ‖   | ii          | ¢`√(-1)` | QQ        | ℚ    | \\euro  | €   |
| /_      | ∠   | OO          | ¢`O︀`    | RR        | ℝ    | \\yen   | ¥   |
|         |     |             |         | ZZ        | ℤ    |         |     |
{.auto-correct}

The font corrections, e.g., `bb …` work on any letter from A to Z or a to z.

`-->`, `<--`, and `<-->` will auto correct into extensible arrows, as in:
¢` A ⟶"note" B `.

`\<space>` auto-corrects to `˽` in the text editor, which renders as a space.


#### Display Selectors

+:----------------:+:----------------------:+--------------------------------------+
| Display selector | Display Selector for   |  Displays:                           |
|                  | Unit-Aware Calculation |                                      |
+==================+========================+======================================+
|        ?         |       ??               | Entire calculation, including        |
|                  |                        | the result and a blue echo of        |
|                  |                        | the expression displaying the        |
|                  |                        | value plugged in to each variable.   |
+------------------+------------------------+--------------------------------------+
|        %         |       %%               | Omits blue echo.                     |
+------------------+------------------------+--------------------------------------+
|        @         |      @@                | Displays only the result, like a     |
|                  |                        | spreadsheet cell.                    |
+------------------+------------------------+--------------------------------------+
|        !         |       !!               | Omits the blue echo and the result.\ |
|                  |                        | Valid only when the result is a data |
|                  |                        | frame or a dictionary.               |
+------------------+------------------------+--------------------------------------+

<div id="accessor-container">

#### Accessors

+:-------------------------------------+:----------------------+:------------------+
| Data Type and Example                | Accessor              | Returns           |
+======================================+=======================+===================+
| string\                              | s[2]\                 | b\                |
| s = "abcde"                          | s[2:4]\               | bce\              |
|                                      | s[3:]                 | cde               |
+--------------------------------------+-----------------------+-------------------+
| Vector\                              | 𝐕[2]\                | 2\                |
| 𝐕 = ¢`\[1, 2, 3, 4, 5]`             | 𝐕[2:4]\              | ¢`\[2, 3, 4]`\    |
|                                      | 𝐕[3:]                | ¢`\[3, 4, 5]`     |
+--------------------------------------+-----------------------+-------------------+
| Matrix\                              | 𝐌[2, 3]\             | 6\                |
| 𝐌 = ¢`\(1, 2, 3; 4, 5, 6; 7, 8, 9)` | 𝐌[3,]\               | ¢`\[7, 8, 9]`\    |
|                                      | 𝐌[2:3, 1:2]          | ¢`\[4, 5; 7, 8]`  |
+--------------------------------------+-----------------------+-------------------+
| Dictionary\                          | D.h\                  | 9\.13\            |
| D = ¢`{ "w": 31, "h": 9.13 }`        | D["h"]\               | 9\.13\            |
|                                      | D["h", "w"]           | 9\.13, 31         |
+--------------------------------------+-----------------------+-------------------+
| Data Frame\                          | DF.B\                 | An entire row\    |
| ![dataframe][]                       | DF["B"]\              | An entire row\    |
|                                      | DF.area\              | Column vector\    |
|                                      | DF.B.area\            | 22\               |
|                                      | DF["B"].area\         | 22\               |
|                                      | DF["B", "area"]\      | 22\               |
|                                      | DF.w[1]               | 4                 |
+--------------------------------------+-----------------------+-------------------+
{.grid}

[dataframe]: ../../images/dataframe.png
{width=200}

</div>

Dot notation can be used only if the property name is a valid [identifier](#identifiers).

## Calculation Forms

Hurmet calculation cells don’t just display math; they compute numerical results.

It’s quite simple to assign a value to a variable:

+-----------------------------------+--------------------+
| Form                              | Examples           |
+===================================+====================+
| ![identifier = value][assignment] | `x = 5`            |
┤                                   +--------------------+
|                                   | `L = '3.1 m'`      |
┤                                   +--------------------+
|                                   | `w = '100 lbf/ft'` |
┤                                   +--------------------+
|                                   | name = "James"     |
+-----------------------------------+--------------------+

[assignment]: ../../images/assignment-railroad.svg

To calulate an <span id="expression">expression</span> that contains a variable,
a function, or an operator; write a `?` or `%` or `@` to indicate where the
result should appear. Here are some examples:

| Input                          | Renders as:                                          |
|--------------------------------|------------------------------------------------------|
| `2 + 2 = ?`                    | ¢`2 + 2 = 4`                                         |
| `2 + 2 = @`                    | ¢`4`                                                 |
| `A = 2 × 4 = ?`                | ¢`A = 2 × 4 = 8`                                     |
| `x = 2 A = ?`                  | ¢`x = 2 A = \color(blue)((2)(8)) \color(black) = 16` |
| `x = 2 A = %`                  | ¢`x = 2 A = 16`                                      |
| `A = '2 m' × '4 feet' = ?? m²` | ¢`A = '2m' × ('4 feet') = '2.4384 m²'`               |
{.table-no-wrap}

The expression form is more precisely defined as:

![optional identifier equals expression equals display selector unit name][statement]

[statement]: ../../images/statement-railroad.svg

At the beginning of the statement, you can write an optional variable name.
The result of the calculation will be assigned to that variable. Expressions
later in the document can call the variable. Variable names must qualify as
valid [identifiers](#identifiers). They are case-sensitive and bold-sensitive.
A search for variable _E_ will not find _e_. A search for **M** will not
find _M_.

You can define a unit for the result with a leading currency symbol or a
trailing unit name, but not both in the same statement.

You can also slip in a `;` character just before the final `=` sign in a
statement. That will create a multiple line statement, with aligned `=` signs.

#### Display Selector

Near the end of the statement is the display selector, i.e., `?`, `??`, etc.
It determines how much of the calculation is displayed.

+:----------------:+:----------------------:+--------------------------------------+
| Display selector | Display Selector for   |  Displays:                           |
|                  | Unit-Aware Calculation |                                      |
+==================+========================+======================================+
|        ?         |       ??               | Entire calculation, including        |
|                  |                        | the result and a blue echo of        |
|                  |                        | the expression displaying the        |
|                  |                        | value plugged in to each variable.   |
+------------------+------------------------+--------------------------------------+
|        %         |       %%               | Omits blue echo.                     |
+------------------+------------------------+--------------------------------------+
|        @         |      @@                | Displays only the result, like a     |
|                  |                        | spreadsheet cell.                    |
+------------------+------------------------+--------------------------------------+
|        !         |       !!               | Omits the blue echo and the result.\ |
|                  |                        | Valid only when the result is a data |
|                  |                        | frame or a dictionary.               |
+------------------+------------------------+--------------------------------------+

For an engineer like me, the most common display selector is **??**. I almost
always want to see the entire calculation. Seeing the expression and the
plugged-in values helps me to avoid the kind of unseen
[errors](http://www.eusprig.org/horror-stories.htm) that creep into spreadsheet
calculations. And it makes the calculation reviewable by a second set of eyes.

A doubled selector will prompt a [unit-aware calculation](#unit-aware-calculations).
After you try them, you may wonder how you ever did without them.

I use the **!** selector mostly when I am assigning a [chunk of data](#data-table) to a variable.

I try to resist the temptation to overuse the **%** selector. When I review work
done by another engineer, I can do without the blue echo if variable values are
assigned directly above the equation where they are used. Otherwise I get grumpy.
You don’t want a grumpy reviewer.

One last variation is possible when assigning values from a [dictionary](#dictionary).
You can assign such values to more than one variable at a time, like this:

```
A, I, w_self = beam["A", "Ix", "weight"] = !!
```

Multiple assignment statements must suppress the result display.

## Identifiers

Variable names and function names must be written in the form of a valid _identifier_.

*   Identifiers may be multiple characters long.
*   The first character must be a letter from the Latin or Greek alphabet.
    It may be bold or capitalized calligraphic Latin, or ℏ, or ℓ.
*   Subsequent characters may be letters or numerals (0123456789).
*   An under-score within an identifier is allowed and will be interpreted
    to mean the start of a subscript.
*   If an identifier has only one letter, then an accent character may be
    written after it. Hurmet will render the accent above the letter, as in ¢`θ̂`.
*   Primes may be appended to the very end, as in: ¢`f_c′`.
*   The following keywords may not be used as variable names: `π`, `j`, `ℏ`,
    `true`, `false`, `root`, `if`, `otherwise`, `and`, `or`, `modulo`, `in`, `to`.

i> ![letter letter-or-digit-or-accent prime][identifier]

[identifier]: ../../images/identifier-railroad.svg

The names of those accents are:

+---------+---------+-----+--------------+
| grave   | acute   | hat | tilde        |
+---------+---------+-----+--------------+
| bar     | breve   | dot | ddot         |
+---------+---------+-----+--------------+
| ring    | check   | ul  | leftharpoon  |
+---------+---------+-----+--------------+
| harpoon | leftvec | vec | leftrightvec |
+---------+---------+-----+--------------+

Hurmet’s auto-correct can help create identifiers.

<div id="identi-correct"></div>

| To create:           | … do this and hit the space bar                 | Example input | Example result |
|----------------------|-------------------------------------------------|---------------|----------------|
| Greek letter         | Type the name of the letter.                    | gamma         | γ              |
| Capital Greek letter | Capitalize the name’s first letter.             | Gamma         | Γ              |
| Bold letter          | Type “bb”, then space, then the desired letter. | bb M          | 𝐌              |
| Calligraphic capital letter  | Type “cc”, then space, then the desired letter. | cc P  | 𝒫              |
| Accent               | Type the name of the accent.                    | y bar         | ¢`y̅`            |
| Prime                | Type two apostrophes.                           | ''            | ′              |

Hurmet will render single Latin letter variable names in _italic_. Function
names and multi-letter variable names are rendered in upright font. As a
convention, I personally use **bold** letters for variables that contain
vectors or matrices.

## Data Types

<dl class="bold-term">

Boolean

: `true` or `false`

String

:   A _string_ literal is a string of text characters enclosed by a pair of
    straight double quotation marks. The string may include any Unicode character
    except a straight double quotation mark, a newline, or a carriage return.

    ```
    "This is a string."
    ```

    You can call a subset of any string with an index or range in brackets. Hurmet
    indices are one-based. Examples:

    ```
    a = "abcdefg"
    a[2]     # returns "b"
    a[2:4]   # returns "bcd"
    a[5:]    # returns "efg"
    ```

    **Math String**

    Strings will be rendered as math if they are delimited with single backticks
    instead of double quotes. So somthing like `` `M_n` `` will return as ¢`M_n`.
    This is useful mostly when a calculation checks a condition and reports whether
    some computed variable can be accepted.

Number

: Enter as integers (33), decimals (2.45), percentages (3.2%), scientific
  notation (3.1e4), mixed fractions (3 ⁷⁄₈) or hexadecimal (0x2A).

![integers, decimals, percentages, scientific notation, mixed fractions, or hexadecimal][number]

[number]: ../../images/NumberRailroad.svg
{width=650 #number-rr}

i>  Notice that a number literal must begin and end with a numeral, not a decimal
    symbol. Hurmet will not recognize `5.` as a number.

    Hurmet’s default decimal symbol is a dot. You can choose instead to enter
    numbers with a decimal comma via a drop-down menu labeled “●”. Numbers are
    never entered with a thousands separator, but they can be _displayed_ with one.
    The ● menu also controls that display.

    Hurmet always saves a decimal symbol as a dot. It’s only the display that changes.

    While calculations are underway, Hurmet holds every number in memory in rational
    number format. The numerator and denominator are each integers of arbitrary
    length. So Hurmet can work precisely with numbers like 0.1 and 0¹⁄₃.
    Trignonometry and roots are done in double-precision floating point, good to
    about 15 significant digits.

Complex Number

:   One can write a complex number in two forms:

    * ¢`a + j\ b`    The letter “¢`j`” is identical to ¢`√(-1)` by Hurmet
    definition. Be sure to write a space after ¢`j`.

    * ¢`r∠θ`    The characters `/_` will auto-correct into ∠ and ¢`θ` is in radians.

    Also, the character **°** is now an operator that multiplies the previous
    number by ¢`π//180`. So one can also write a polar notation as ¢`r∠θ°`.
    The characters `ooo` will auto-correct into °

    Examples:

    i>  ¢`z_1 = 2 + j 3`

        ¢`z_2 = 4∠30°`

        ¢`z = z_1 + z_2  = \blue((2 + j 3) + ( 4∠30°)) = 5.46 + j5`

Quantity

:   A Hurmet _quantity_ contains both a numeric magnitude and a unit of measure.
    Quantity literals are written between apostrophes, aka single straight
    quotation marks. Examples:

    | Input                  | Renders as              |
    |------------------------|-------------------------|
    | `'4.2 meters'`         | ¢`'4.2 meters'`         |
    | `'-$25.10'`            | ¢`'-$25.10'`            |
    | `'30°'`                | ¢`'30°'`                |
    | `'10 N·m/s'`           | ¢`'10 N·m/s'`           |
    | `'\\[2.1; 15.3] feet'` | ¢`'\[2.1; 15.3] feet'`  |

    ![single quote number or matrix or map unit-name single quote][quantity]

    [quantity]: ../../images/quantity-railroad.svg

    Quantities are useful in [unit-aware calculations](#unit-aware-calculations)
    which do automatic unit conversion and also check for unit compatibility.

    Hurmet has many built-in [unit definitions](unit-definitions.html). You can
    write any one of them into a quantity. SI (metric) prefixes are valid on the
    appropriate unit names.

    You can also create compound units on the fly. That is, you can raise any unit
    to a power, and these powers-of-units can be multiplied (or divided) together
    into products. Example:

    | Input          | Renders as      |
    |----------------|-----------------|
    | `'4 kW.hr/m2'` | ¢`'4 kW.hr/m2'` |

    Note that within the quantity literal, it is not necessary to write `^` to
    indicate a numeric exponent. Also, a dot or a hyphen within a compound unit
    name will be rendered as a half-high dot.

    Only one division solidus, **/**, may be written into a compound unit.

Matrix

:   A Hurmet _matrix_ is a one or two dimensional arrangement of matrix elements.
    A Hurmet matrix element can be a number, a string, `true`, `false`, or an
    exprression that resolves to one of those simple types.

    A Hurmet _vector_ is a one dimensional matrix, either a row vector or a column vector.

    A matrix literal is written between delimiters, either `\\( )` or `\\[ ]` or
    `{: }`. Matrix elements are separated by commas. Matrix rows are separated by
    semi-colons. Be sure to write a space after comma separators so they are not
    confused with decimals inside a number. Here are some matrix examples:

    | Input            | Renders as       |
    |------------------|------------------|
    | `\\(1, 0; 0, 1)` | ¢`\(1, 0; 0, 1)` |
    | `\\[2.1; -15.3]` | ¢`\[2.1; -15.3]` |
    | `{:1, 0; 0, 1}`  | ¢`{:1, 0; 0, 1}` |

    Another way to create a Hurmet vector is to write a range of numbers between
    brackets; the form is `[start:step:end]`.
    A Hurmet calculation of that form will return a row vector with every number
    in the range. The step size is optional (default = 1). Examples:

    |    Input      |       Result             |
    |---------------|--------------------------|
    | `[2:5] = ?`   | ¢`[2:5] = \[2, 3, 4, 5]` |
    | `[1:2:5] = ?` | ¢`[1:2:5] = \[1, 3, 5]`  |

    You can call individual elements with index integers between brackets, as in
    `𝐕[5]` or `𝐌[1, 3]`. You can use a variable name for the index if the variable
    returns an integer.

    You can access a sub-matrix using the range operator, “:”, as in `𝐌[2:5, 1]`.
    Entire rows or columns can be called by omitting an index, as in `𝐌[2,]` or
    `𝐌[,1]`. Hurmet indexes are one-based.

Matrix Operations

:   All the usual math operators can be applied to a numeric matrix. The operators
    mostly work in an element-wise fashion. If you add a scalar to a matrix, or
    pass a matrix to most functions, Hurmet will do an element-by-element calculation
    and return a matrix, as in:

    i> ¢`𝐡 = \[5; 10; 15]`

       ¢`𝐱 = 2 𝐡 + 1 = \color(blue)(2) \[5; 10; 15] + 1 \color(black) = \[11; 21; 31]`

    Spreadsheet calculations can often be replaced by calulations using vectors, as
    above. When you really need to get things right, it’s great to be able to see
    the expression and all the plugged-in values.

    <div id="matrix-mult">

    Multiplication of two matrices is different than other operations. Mathematicians
    have several ways to multiply matrices. In Hurmet, you choose the type of
    multiplication by your choice of multiplication operator:

    ¢`𝐀 * 𝐁` ↦ element-wise product, ¢`(𝐀 * 𝐁)_ij = 𝐀_ij × 𝐁_ij`

    ¢`𝐀˽𝐁` ↦ [matrix product][], ¢`(𝐀 𝐁)_ij = ∑_(k = 1)^m 𝐀_i) 𝐁_kj`

    ¢`𝐀 × 𝐁` ↦ [cross product][] of a pair of three-vectors  
           = ¢`|𝐀||𝐁|sin(θ) 𝐧`

    [matrix product]: http://www.intmath.com/matrices-determinants/4-multiplying-matrices.php/
    [cross product]: http://www.intmath.com/vectors/8-cross-product-vectors.php/

    ¢`𝐀 ⋅ 𝐁` ↦ dot product = ¢`∑_(i = 1)^n (𝐀_i 𝐁_i)`

    </div>

    Here are more of Hurmet’s matrix operations:

    ¢`𝐀^T` ↦ a transposed matrix.

    ¢`𝐀^(-1)` ↦ an inverted matrix, if ¢`𝐀` is square.

    ¢`|𝐀|` ↦ ¢`{determinant if "𝐀 is square"; magnitude otherwise}`

    ¢`abs(𝐀)` ↦ element-wise absolute values

    ¢`‖𝐀‖` ↦ ¢`{√(x_1^2 + ⋯ + x_n^2) if "𝐀 is a vector"; √(∑_i ∑_j A_ij^2) if "𝐀 is a matrix"`

    Functions will mostly work element-wise on an matrix. Exception: functions
    `min()` and `max()` will find the minimum or maximum of the elements in the matrix.

    If you want to write a comma or a semi-colon inside parentheses and not create
    an matrix, use `\,` or `\;`.

Data Frame

:   A _data frame_ is a two dimensional data structure that can be accessed with
    row names and column names or by row indices and column indices.

    Each datum can be a number, a string, `true`, or `false`. A missing item will
    be taken to be `undefined`. All data in a column must be of the same data type.
    A column of numbers can be assigned a unit of measure. 

    Data frame literals are written between double backtick delimiters. The text
    between the backticks must be written in CSV (which once meant comma-separated
    values, but Hurmet uses pipe-separated values) format. Numbers must use a dot
    decimal. The second row may contain units of measure. The first column will be
    indexed if the first word is “name” or “index”.

    Here’s an example of CSV input:

    ```
    rebar =
    ``|diameter|area
      |in      |in²
    #3|0.375   |0.11
    #4|0.5     |0.2
    #5|0.625   |0.31
    #6|0.75    |0.44``
    ```

    … which renders as:

    ¢```
    rebar =
    ``|diameter|area
      |in      |in²
    #3|0.375   |0.11
    #4|0.5     |0.2
    #5|0.625   |0.31
    #6|0.75    |0.44``
    ```

    Normally, the first column of a Hurmet data frame contains keys. You can use a
    key to access a row of the data frame. If you do not want the first column to
    be treated as keys, then begin the CSV with three back-ticks instead of two.

    Data frames can be quite large, so Hurmet has a`fetch(url)` function to load
    data from a remote CSV file into a data frame. Since Hurmet runs in a browser,
    the url must begin with `http:` or `https:`

    A fetch example:

    ```
    wideFlanges = fetch("https://hurmet.app/example.csv") = !
    ```

    That example loads in this data:

    ¢``` ``name|weight|A|d|bf|tw|Ix|Sx
    |lbf/ft|in^2|in|in|in|in^4|in^3
    W14X90|90|26.5|14|14.5|0.44|999|143
    W12X65|65|19.1|12.1|12|0.39|533|87.9
    W10X49|49|14.4|10|10|0.34|272|54.6
    W8X31|31|9.13|8|8|0.285|110|27.5
    W8X18|18|5.26|8.14|5.25|0.23|61.9|15.2
    W6X15|15|4.43|5.99|5.99|0.23|29.1|9.72
    W4X13|13|3.83|4.16|4.06|0.28|11.3|5.46`` ```

    As data frames go, that example is still pretty small. When I assign a data
    frame to a variable, I usually suppress its display by using the **!** display selector.

    I use a data frame most commonly by calling a row from it, like this:

    `beam = wideFlanges.W10X49 = !!` or\
    `beam = wideFlanges["W10X49"] = !!`

    That returns a Hurmet [dictionary](#dictionary). Then I can call individual
    properties, like this:

    `A = beam.A = ?? in2` or\
    `A = beam["A"] = ?? in2` or\
    `A = wideFlanges.W10X49.A = ?? in2`

    You can also call an individual element, a column, or a group of elements. The
    index can be either a number or a string. Examples:

    | This call:                    | … will return:                               |
    |-------------------------------|----------------------------------------------|
    | `wideFlanges.W10X49.A`        | ¢`'14.4 in2'`                                |
    | `wideFlanges\["W10X49"]["A"]` | ¢`'14.4 in2'`                                |
    | `wideFlanges["W10X49", "A"]`  | ¢`'14.4 in2'`                                |
    | `wideFlanges["W10X49", 1:2]`  | ¢`{"name": "W10X49"; "weight": '49 lbf/ft'}` |
    | `wideFlanges[1:2, "A"]`       | ¢`\[26.5; 19.1]`                             |
    {.table-no-wrap}

    Hurmet will return a <br> ¢`{"simple type" if "you call a single cell, as in
    df[1, 2]"; "column vector" if "you call a column, as in df[,2]"; "dictionary"
    if "you call a row, as in df[3,]"; "data frame" otherwise}`

    Dot notation, as in `wideFlanges.W10X49`, can be used only if the property name
    is a valid [identifier](#identifiers).

    Here are calls that can return multiple values:\
        `A, S\_x = wideFlanges.W8X31["A", "Sx"] = !!`, or\
        `A, S\_x = wideFlanges\["W8X31"]["A", "Sx"] = !!`, or\
        `A, S\_x = wideFlanges["W10X49", \\["A", "Sx"]] = !!`\
    Multiple returns must use the `!!` display selector, for now.

    For structural engineers, I’ve put some useful data frames on GitHub. There are
    links [below](#other-resources).

Dictionary

:   A _dictionary_ is a data structure in which you can store values and access
    each one with a unique name. Put another way, a dictionary is a collection of
    key:value pairs. It’s what Hurmet returns when you call one row of a data frame.

    Dictionary literals are written between `{ }` delimiters. Each key must be a
    string, i.e., between double quotation marks. Keys are separated from values by
    a colon and key:value pairs are separated from each other by commas or
    semi-colons (but not both commas and semi-colons in the same dictionary).

    Example:  `barArea = {"#4": 0.22, "#5": 0.31}`

    A value may be any Hurmet data type except a data frame or a nested dictionary.

    Call individual values from a dictionary with a key in brackets, as in
    `A = barArea["#3"]`. This notation also enables one to use a variable name for
    the key. Or, if the key qualifies as a valid [identifier](#identifiers), you
    can use dot notation, as in `W8X31.weight`

    You can assign multiple values from a dictionary in one statement using bracket
    notation, like this:

    ```
    A, I, w_self = W8X31["A", "Ix", "weight"] = !!
    ```

    Multiple assignment statements must have the result display suppressed.

Map

:   A Hurmet _map_ is a dictionary in which every value is the same data type and,
    if numeric, carries the same unit-of-measure. Maps can be the numeric part of
    a quantity. 

    ```
    barArea = '{"#4": 0.22, "#5": 0.31} in2'
    ```

    You can do arithmetic on maps and run them through functions. The operation
    will be done on each value in the map. For instance, a beam calculation can
    break the loads down into dead load, live load, snow load, etc.:

    ¢`w = '{"D": 20; "L": 40; "S": 30} lbf/ft'`        ¢`L = '12 ft'`

    ¢`M = 1//8 w L^2  = \color(blue)(1/8 ('{"D": 20; "L": 40; "S": 30} lbf/ft')('12 ft')^2)
    \color(black) = '{"D": 0.54, "L": 0.72, "S": 0.36} k·ft'`

    Dictionaries with values of varying units-of-measure can be multiplied by a
    unit-less scalar. No other math operations are supported for non-map dictionaries.

</dl>

## Expressions

Hurmet calculations are meant to be recognizeable to anyone familiar with
standard math notation. That is a broad statement. Here are many nuances:

## Constants

<dl>

_π_

: If you write ¢`π` into an expression, Hurmet uses a value of
  3.1415926535897932384626433832795028841971693993751.

_e_

: Hurmet will treat ¢`e` just like any other variable most of the time. But if
  ¢`e` is the base of an exponent, for example: ¢`e^x`, then Hurmet will take
  ¢`e` to mean 2.7182818284590452353602874713527.

_j_

: ¢`j` = ¢`√(-1)`.

ℏ

: For ℏ, Hurmet uses a value of 1.054571817 × 10⁻³⁴ J·s.

</dl>

## Operators
  
+---------------+----------------------+---------------------------------------------+
| Operator      | Example              | Description                                 |
+===============+======================+=============================================+
| =             | _x_ = 15             | Assign a value to a variable.               |
+---------------+----------------------+---------------------------------------------+
| =             | if _x_ = 15          | Equality test if in a comparison position.\ |
|               |                      | That is, “=” tests for equality if there.   |
|               |                      | is something other than a identifier to the |
|               |                      | left of it or a display selector to the     |
|               |                      | right of it.                                |
+---------------+----------------------+---------------------------------------------+
| \+            |  2 + 2               | Addition                                    |
+---------------+----------------------+---------------------------------------------+
| –             |  5 - 3               | Subtraction                                 |
+---------------+----------------------+---------------------------------------------+
| \-            | ¢`-4`                | Unary minus                                 |
+---------------+----------------------+---------------------------------------------+
| \*            | ¢`2 * 4`             | Multiplication of numbers.<br>Element-wise  |
|               |                      | product of matrices.                        |
+---------------+----------------------+---------------------------------------------+
| ×             |  2 × 4               | Multiplication of numbers.\                 |
|               |                      | Cross product of three-vectors.\            |
|               |                      | auto-correct: **xx**                        |
+---------------+----------------------+---------------------------------------------+
| ·             | ¢`a ⋅ b`             | Multiplication of numbers.\                 |
|               |                      | Dot product of matrices.\                   |
|               |                      | auto-correct: dot between two spaces.       |
+---------------+----------------------+---------------------------------------------+
|               | ¢` (2)(4) `          | Multiplication                              |
+---------------+----------------------+---------------------------------------------+
|               |  `a b`               | Multiplication. (A space acts as an         |
|               |                      | operator when between variables.)           |
+---------------+----------------------+---------------------------------------------+
|               | ¢`2 a`               | Multiplication                              |
+---------------+----------------------+---------------------------------------------+
|               | ¢`a2`                | Not a multiplication if no space.\          |
|               |                      | Hurmet reads “a2” as an identifier.         |
+---------------+----------------------+---------------------------------------------+
|               | ¢`sin(2)`            | Function                                    |
+---------------+----------------------+---------------------------------------------+
|               | a (2)                | Multiplication if a space exists before the |
|               |                      | open paren.                                 |
+---------------+----------------------+---------------------------------------------+
| /             | ¢`8/2`               | Division                                    |
+---------------+----------------------+---------------------------------------------+
| //            | ¢`8//2`              | Case fraction                               |
+---------------+----------------------+---------------------------------------------+
| ///           | ¢`8///2`             | Division displayed inline                   |
+---------------+----------------------+---------------------------------------------+
| ÷             | ¢`8 ÷ 2`             | Inline division\                            |
|               |                      | auto-correct: -:                            |
+---------------+----------------------+---------------------------------------------+
| ^             | ¢`3^2`               | Exponent                                    |
+---------------+----------------------+---------------------------------------------+
| ^*            | ¢`z^*`               | Complex conjugate                           |
+---------------+----------------------+---------------------------------------------+
| &             |                      | Concatenate strings or vectors, or          |
|               |                      | concatenate numbers onto vectors, or append |
|               |                      | column vectors to data frames               |
+---------------+----------------------+---------------------------------------------+
| √             | ¢`√`                 | Square root\                                |
|               |                      | auto-correct: sqrt                          |
+---------------+----------------------+---------------------------------------------+
| ¢`root  3 ()` | ¢`root 3 8`          | nth-root\                                   |
|               |                      | auto-correct: root n                        |
+---------------+----------------------+---------------------------------------------+
| ||            | ¢`|-4|`              | Absolute value of a scalar, determinant of  |
|               |                      | a matrix, or magnitude of a vector or a     |
|               |                      | complex number.                             |
+---------------+----------------------+---------------------------------------------+
| ||  ||        | ¢`\\Vert x \\Vert`   | ¢`√(x_1^2 + ⋯ + x_n^2)` if the argument is  |
|               |                      | a vector of reals                           |
+---------------+----------------------+---------------------------------------------+
| ||  ||        | ¢`\\Vert x \\Vert`   | ¢`√(∑_i ∑_j A_(i, j)^2)` if the argument is |
|               |                      | a 2-D matrix                                |
+---------------+----------------------+---------------------------------------------+
| ⌊  ⌋          | ¢`⎿4.5⏌`             | Floor. Always rounds down.\                 |
|               |                      | auto-correct: floor                         |
+---------------+----------------------+---------------------------------------------+
| ⌈  ⌉          | ¢`⎾4.5⏋`             | Ceiling. Always rounds up.\                 |
|               |                      | auto-correct: ceil                          |
+---------------+----------------------+---------------------------------------------+
| %             | ¢`10%`               | Percent                                     |
+---------------+----------------------+---------------------------------------------+
| ‰             | ¢`10‰`               | Per thousand                                |
+---------------+----------------------+---------------------------------------------+
| !             | ¢`5!`                | [Factorial][]\                              |
|               |                      | precision = ¢`{100% if n ≤ 100; 15 digits   |
|               |                      | otherwise}`                                 |
+---------------+----------------------+---------------------------------------------+
| modulo        | `10` `modulo` `5`    | Always returns a positive remainder.        |
+---------------+----------------------+---------------------------------------------+
| ¢`(n\atop k)` | (5 \atop 3)          | Binomial coefficient. ¢`(n \atop k) =       |
|               |                      | n!//(n!(n!-k!))`                            |
+---------------+----------------------+---------------------------------------------+
| =             | ¢`if x = 15`         | Equality comparison                         |
+---------------+----------------------+---------------------------------------------+
| ≠             | ¢`if b ≠ c`          | Inequality comparison\                      |
|               |                      | auto-correct: != or <>                      |
+---------------+----------------------+---------------------------------------------+
| `<`           |                      |                                             |
+---------------+----------------------+---------------------------------------------+
| `>`           |                      |                                             |
+---------------+----------------------+---------------------------------------------+
| ≤             |                      | auto-correct: <=                            |
+---------------+----------------------+---------------------------------------------+
| ≥             |                      | auto-correct: >=                            |
+---------------+----------------------+---------------------------------------------+
| ∈             | ¢`c ∈ s`             | Is an element of a matrix or is a character |
|               |                      | of a string, or is a property of a          |
|               |                      | dictionary\                                 |
|               |                      | auto-correct: \in                           |
+---------------+----------------------+---------------------------------------------+
| ∉             | ¢`c ∉ s`             | Is not an element of\                       |
|               |                      | auto-correct: \notin                        |
+---------------+----------------------+---------------------------------------------+
| ⋐             | ¢`c ⋐ s`             | Is a proper subset of\                      |
|               |                      |  auto-correct: \Subset                      |
+---------------+----------------------+---------------------------------------------+
| and           | if _a_ and _b_       | Logical and                                 |
+---------------+----------------------+---------------------------------------------+
| or            |                      | Logical or                                  |
+---------------+----------------------+---------------------------------------------+
| ∧             |                      | Logical and.      auto-correct: ^^          |
+---------------+----------------------+---------------------------------------------+
| ∨             |                      | Logical or.        auto-correct: vv         |
+---------------+----------------------+---------------------------------------------+
| ⊻             |                      | Logical xor                                 |
+---------------+----------------------+---------------------------------------------+
| ¬             |  if ¬ _a_            | Logical not                                 |
+---------------+----------------------+---------------------------------------------+
| :             | {"a": 10}\           | Key:value separator if within a dictionary. |
|               | 𝐕\[2:3\]            | Range separator otherwise.                  |
|               | for _i_ in 1:3       |                                             |
+---------------+----------------------+---------------------------------------------+
{#op-table .grid width=35em}

[Factorial]: https://en.wikipedia.org/wiki/Factorial

</div>

## Functions

Hurmet treats an [identifier](#identifiers) as a function name if it is placed
directly before an open parenthesis. So a term like ¢`sinh(x)` is a function.

Hurmet’s built-in functions are described below. Unless noted otherwise, they
can operate on any real or complex number or any matrix containing real numbers.

Transcendental functions such as trigonometry or logarithms are done to 15
digits precision.

------

<dl>

abs(z)

: Absolute value of a real number. Magnitude of a complex number.

acos(_z_), asin(_z_), atan(_z_), asec(_z_), acsc(_z_), acot(_z_)

: Inverse trigonometry functions. One can also call an inverse trigonometry
  function with a superscript, as in ¢`cos^(-1) x`.

atan(_x_, _y_)

: When _atan_ is called with two arguments, it returns an angle in the proper
  quadrant. Given a point defined by real coordinates _x_ and _y_, _atan_ returns
  the angle between that point and the positive _x_-axis of a plane. Real numbers only.

argument(_z_)

: Phase angle of a complex number.

chr(_n_)

: Takes an integer as a argument, treats it as a Unicode code point, and
  returns the corresponding string character.\
  `chr(34)` returns a double quotation mark.

cos(𝜃), sin(𝜃), tan(𝜃), sec(𝜃), csc(𝜃), cot(𝜃)

: Trigonometry functions.

  The trig functions listed above will assume that a real argument is in
  radians unless you tell it otherwise. You can tell it otherwise by just
  writing in a unit, as in: `tan('45°')` and running a unit-aware calculation.

  Complex numbers are also valid arguments.

  A positive integer written as a superscript after a trig function name will
  return the function result raised to a power.\
  So that: ¢`sin^2 θ = (sin θ)^2`.

  A superscript <sup>-1</sup> indicates an inverse function. In other words, ¢`cos^(-1) x = acos(x)`.

  Three functions: `sin`, `cos`, and `tan`, do not require parentheses around their arguments.

cos<sub>d</sub>(𝜃), sin<sub>d</sub>(𝜃), tan<sub>d</sub>(𝜃), sec<sub>d</sub>(𝜃), csc<sub>d</sub>(𝜃), cot<sub>d</sub>(𝜃)

: The trigonometry functions listed just above will assume that the argument is
  in degrees. Real numbers only. Hurmet will subscript the “d” for you.

cosh(_z_), sinh(_z_), tanh(_z_), sech(_z_), csch(_z_), coth(_z_)

: [Hyperbolic functions](https://en.wikipedia.org/wiki/Hyperbolic_function) or
  real or complex numbers. Notation for inverse functions is similar to trigonometry.

count(_str_, _pattern_)

: The number of times string _pattern_ occurs in string _str_.

dataframe(**a**, **b**, …)

: Takes vectors as arguments and returns a dataframe.

exp(_z_)

: ¢`e^z`

fetch(_url_)

: Fetches the contents of a remote file. It expects the file to be in CSV format
  and will return a data range. Fetch functions must be stand-alone expressions.

gcd(_m_, _n_)

: Greatest common divisor of two integers.

hypot(_x_, _y_)

: ¢`√(x² + y²)`   …done in a way that avoids overflow. Real numbers only.

Im(_z_)

: Imaginary part of a complex number.

isNaN(_x_)

: Indicates if the argument is not numeric.

length(a)

: The length of a string or the number of elements in a matrix or vector.

lerp(**X**, **Y**, index)

: Linear interplolation. Locates real index within the vector **X** and returns
  a real number interpolated from the vector **Y**. **X** must contain values
  in ascending order. Real numbers only.

log(_z_), ln(_z_)

: Natural (base _e_) logarithm of real or complex number _z_.

log<sub>10</sub>(_x_)

: Base 10 logarithm. Real numbers only. Hurmet will subscript the numerals for you.

log(_b_, _x_)

: Base _b_ logarithm. Real numbers only.

logFactorial(_n_)

: Returns the natural logarithm of the factorial of the argument. Valid only
  for non-negative integers. Note that `log(n!)` is a valid alias for
  `logFactorial(n)`. Real numbers only.

logΓ(_x_)

: Returns the natural logarithm of the Gamma function, Γ(_x_). For now,
  Hurmet's logΓ(_x_) function only works on positive rational numbers.

matrix2table(_matrix_, _rowNames_, _columnNames_)

: Returns a data frame with the contents of the matrix. _rowNames_ and
  _columnNames_ must each be a vector of strings.

¢`min(a,b,c,…),max(a,b,c,…)`

: Minimum or maximum of a list or array. Real numbers only.

random()

: A pseudo-random number in the range from 0 to 1 (inclusive of 0, but not 1).
  Good for Monte-Carlo modeling. Not sufficiently random for crypto.

Re(_z_)

: Real part of a complex number.

round(_x_, _spec_)

: Rounds a real number _x_.<br>To round to an integer, omit the spec.\
  To round to _n_ significant digits, write the spec as "r_n_", e.g., "r3".\
  To round to _n_ places after the decimal, write the spec as "f_n_".

sign(_x_)

: Returns ¢`{1 if x > 0; -1 if x < 0; 0 otherwise}`<br>Real numbers only.

sum(_a_, _b_, _c_, …), product(_a_, _b_, _c_, …), length(_a_, _b_, _c_, …), range(_a_, _b_, _c_, …), mean(_a_, _b_, _c_, …), variance(_a_, _b_, _c_, …), stddev(_a_, _b_, _c_, …)

: Functions that accumulate a result from a list of arguments. Real numbers only.

zeros(_m_, _n_)

: Returns a _m_ × _n_ matrix filled with zeros.  Real numbers only.

Γ(_z_)

: [Gamma function](http://en.wikipedia.org/wiki/Gamma_function)\
  precision = ¢`{100% if z" is a positive integer ≤ 100"; 15 digits otherwise}`

</dl>

## Operator Precedence

What is the result of the expression ¢`3 + 4 × 2` ?

It depends on whether one does the addition first or the multiplication first.
So the answer could be ¢`(3 + 4)(2)= 14` or it could be ¢`3 + (4 × 2)= 11`.

To resolve this ambiguity, Hurmet performs operations with the following precedence:

+---------------+---------------------------------------------------------------+
| \! %          | Factorials and percents are done first.                       |
+---------------+---------------------------------------------------------------+
| ^             | Then exponents, from right to left.                           |
+---------------+---------------------------------------------------------------+
| √             | Roots                                                         |
+---------------+---------------------------------------------------------------+
| \-            | Unary minus, for example: -4                                  |
+---------------+---------------------------------------------------------------+
| ∠             | To write a complex number in _r_∠θ notation. (Coming later    |
|               | this year)                                                    |
+---------------+---------------------------------------------------------------+
| × · / ÷       | Multiplication or division, from left to right.               |
+---------------+---------------------------------------------------------------+
| \+ – &        | Addition or subtraction or concatenation, from left to right. |
+---------------+---------------------------------------------------------------+
| < > ≤ ≥ = ≠   | Comparisons (for [If Expressions](#if-expressions))           |
+---------------+---------------------------------------------------------------+
| ∧ ∨ ¬ ⊻       | Logical operators (ditto)                                     |
+---------------+---------------------------------------------------------------+
| :             | Separator for a range of integers, as in **V**[2:3].          |
+---------------+---------------------------------------------------------------+
| , ;           | Argument separators or row separators for functions, matrices,|
|               | dictionaries, or If Expressions.                              |
+---------------+---------------------------------------------------------------+
| ( ) [ ]       | All conventions are over-ridden by parentheses or brackets.   |
+---------------+---------------------------------------------------------------+

Now let’s return to the question that opened this section. We now know that
multiplication has a higher precedence than addition, so the answer to our
question above is: ¢`3 + (4 × 2)= 11`

## If Expressions

Hurmet If Expressions enable you to choose between expressions, based upon one or more conditions, as in:

i> ¢`β_1 = {0.85 if f_c′ ≤ 4000; 0.65 if f_c′ ≥ 8000; 0.85 - (f_c′ - 4000)//20000 otherwise}`

This sort of expression is written between the delimiters: `{ }`  
The row separator symbol is **;**  
Hurmet will automatically align the logic words **if** and **otherwise**.  
So the example above can be coded this way:

```
β_1 = {
    0.85                         if f_c′ ≤ 4000 ;
    0.65                         if f_c′ ≥ 8000 ;
    0.85 - (f_c′ - 4000)/20000   otherwise
}
```

The spaces in that code example are not significant. Hurmet always aligns the
words `if` and `otherwise`. In fact, that example could also be coded all onto
one line. To be precise, the form is:

![expression if condition; expression otherwise][if]

[if]: ../../images/if-railroad.svg

Conditions may contain logical operators:  and or not ∧  ∨  ¬  ⊻

¢`x = {2 a if a < b and b = 4; a^2 otherwise}`

Chained comparisons are okay.

¢`x = {1.0 if a < b < 5 < d; 1.2 otherwise}`

## Overloading

Overloading summary. That is, Hurmet  math operators and functions will work on
all the data types tablulated below. They also work on a Hurmet quantity that
takes any of these shapes:

|                           | scalar | vector | matrix | map | map with<br>vector values |
|:--------------------------|:------:|:------:|:------:|:---:|:-------------------------:|
| scalar                    | ✓      | ✓      | ✓      | ✓   | ✓                       |
| vector                    | ✓      | ✓      | ✓      | ✓   |                          |
| matrix                    | ✓      | ✓      | ✓      |     |                           |
| map                       | ✓      | ✓      |        |     |                           |
| map with<br>vector values | ✓      |        |        |     |                           |

There are a few operators that also work on dictionaries. For instance, a unit-less
number can be multiplied times a dictionary that has numeric values.

## Unit-Aware Calculations

Hurmet has a data type called a [quantity](#quantity) that contains both a
numeric magnitude and a unit of measure. In a Hurmet calculation editing box,
you write quantity literals between single quotation marks. Examples:

+--------------+---------------+------------+
| `'4 meters'` | `'7.1 ft3/s'` | `'11 N·m'` |
+--------------+---------------+------------+
{.nogrid}

Hurmet has a **unit-aware** calculation mode that automatically handles unit
conversions on quantities and also checks that the operands are
unit-compatible. You specify unit-aware mode by writing two question marks
instead of one in the place where you want a result to appear. So if you open
a Hurmet calculation cell and write:

'4 ft' + '3 yards' = ?? m

… the result will render as:

¢`'4 ft' + '3 yards' = '3.9624 m'`

You can create composite units on the fly and Hurmet will still convert them
automatically.

¢`('3 kW·hr' × ('20 min')) / ('800 lbf' × '1 h') = '1.0116402439486971731 km'`

If you try to add quantities with non-compatible units, Hurmet will return an
error message:

¢`'3 m' + '2 V' = \color(firebrick) "Error. Adding incompatible units."`

If the calculated units are non-compatible with the units specified for the
result display, Hurmet will return an error message:

¢`'3 m' + '2 ft' = \color(firebrick) "Error. Calculated units are not
compatible with the desired result unit:"\, "V"`

If you assign a quantity to a variable, a unit-aware calculation will call the
variable’s entire quantity, not just the numeric value.

¢`L = '3 ft'`

¢`L_2 = 2 L = \color(blue)(2) ('3 ft') \color(black) = '1.8288 m'`

If you assign a quantity to a variable, you can still call the variable from a
non-unit-aware calculation. Such a calculation will call the scalar value, not
the quantity.

¢`L_unaware = 2 L = \color(blue)(2) (3) \color(black) =\\, 6`

You’re welcome to view all of Hurmet’s built-in [unit definitions](unit-definitions.html).

#### Custom Units

If the Hurmet built-in unit definitions are not sufficient, you can define a
set of custom units in a dictionary like this:

`units = { "smoot": '67 inches', "sol": '24.6229622 hours' }`

#### Currencies

Currency exchange rates change, so Hurmet’s exchange rates are updated with
[data from the European Central Bank](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml).
That update occurs only once per week. For many purposes, such rates are
insufficiently accurate, so you can override them and define your own exchange
rates in a dictionary named **currencies**. Such a statement might be coded
like this:

currencies = { "USD": 1, "CAD": 1.25 }

The keys in that dictionary are standard three-letter [currrency codes](https://www.xe.com/iso4217.php). 

The variable name **currencies** may not be used for any other purpose.

#### Traditional Units

Many traditional units have had more than one historical definition. Hurmet
currently has the following default treatment of certain traditional units:

*   **pound** is treated as a mass, not a force. (**lbf** and **lbm** are un-ambiguous alternatives.)
*   **psf** and **psi**, on the other hand, are treated as force per area.
*   **ton** is treated as a mass, and is the U.S. customary unit. I also put in a **tonf**, 2000 lbf.
*   **gallon**, **fl oz**, **pint**, **quart**, and **bushel** are the U.S. customary units.
*   Weights are avoirdupois, unless specifically noted as a troy weight.
*   **point** is the adobe point = ¹∕₇₂ inch. **TeX point** is also available.
*   **barrel** and **bbl** are an oil barrel = 42 US gallons.

If you are curious about some of the more unusual units, such as “survey foot”
or “nautical mile”, I recommend Russ Rowlett’s
[dictionary of units of measurement](http://www.ibiblio.org/units/).

## Numeral display

There are two aspects to how numbers are displayed: (1) decimal separators, and
(2) rounding format for results.

### Decimal separator

In some countries, the usual decimal separator symbol is a dot. Other countries
use a comma. Hurmet starts up with a decimal separator based upon the browser’s
language setting. Hurmet also allows the reader (not the document author) to
select which display they prefer. Just use the use the drop-down menu labeled “●”.

The same menu choice also selects how Hurmet displays thousands separators.

This menu choice changes nothing internally. It changes only the display. All
Hurmet documents are saved with numbers that have a dot decimal and no
thousands separator.

### Rounding of Results

Hurmet stores numbers internally as rational numbers in arbitrary precision,
but its default result display is a decimal fraction with up to 15 significant
digits. You can command Hurmet to _display_ results differently. Just write a
format statement into a Hurmet calculation cell. The specified format will
apply to every calculation result below that statement (until another format
statement). Here’s a format statement example:

`format = "f2"`

That statement specifies a fixed decimal format. Results after it will display
exactly two digits after the decimal. If you would rather specify the number of
significant digits, I suggest one of these statements:

`format = "r3"`\
`format = "h3"`

`"r3"` will display a result rounded to exactly three significant digits. If
your client freaks out because integer values have been rounded and look “wrong”,
the `"h3"` format will round only the fractional part of a number.

That was the short explanation. Now the long one. The rounding format
specification string must take the form: "**TN∠**", where:

| Specification<br>Letter | Description         | Use one of:      | Default |
|:-----------------------:|:------------------- |:---------------- |:-------:|
| T                       | Type of rounding    | bEefhkNnprSstx%  | h       |
| N                       | Number of digits    | \[0-9\]+         | 15      |
| ∠                       | Optional polar      | ∠ °              |         |

#### Type of rounding

Let _N_ be the number of digits specified. Then:

+--------+---------------------------+-----------┴-------------┴----------------+
| Type   | Description               | Examples                                 |
┤        |                           +-----------+-------------+----------------+
|        |                           | Number    | Format spec | Result display |
+========+===========================+===========+=============+================+
| b      | Binary                    | 5         | b           | 0b101          |
+--------+---------------------------+-----------+-------------+----------------+
| e or E | A programmer’s version of | 22,000    | e3          | 2\.20e4        |
┤        | scientific notation.      |           +-------------+----------------+
|        | Rounds to _N_             |           | E3          | 2\.20E4        |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| f      | Rounds to                 | 3\.236    | f0          | 3              |
┤        | exactly _N_ places after  |           +-------------+----------------+
|        | the decimal.              |           | f2          | 3\.24          |
┤        |                           |           +-------------+----------------+
|        |                           |           | f4          | 3\.2360        |
+--------+---------------------------+-----------+-------------+----------------+
| h      | Hurmet’s default format   | 31\.345   | h3          | 31\.3          |
┤        | will round a decimal      +-----------+-------------+----------------+
|        | fraction to               | 65,809    | h3          | 65,809         |
┤        | display _N_ significant   +-----------+-------------+----------------+
|        | digits and omit trailing  | 1\.1000   | h3          | 1\.1           |
|        | zeros, but it will not    |           |             |                |
|        | round an integer.         |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| k      | Abbreviated and followed  | 22,000    | k3          | 22\.0k         |
|        | by a symbol from the SI   |           |             |                |
|        | prefixes. Rounds to _N_   |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| n or N | Engineering notation,     | 22,000    | n3          | 22\.0·10³      |
┤        | i.e. scientific notation  |           +-------------+----------------+
|        | with exponents that are   |           | N3          | 22\.0×10³      |
|        | even multiples of 3.      |           |             |                |
|        | Rounds to _N_             |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| r      | Rounds to _N_ significant | 31\.345   | r3          | 31\.3          |
┤        | digits.                   +-----------+-------------+----------------+
|        |                           | 65,809    | r3          | 65,800         |
+--------+---------------------------+-----------+-------------+----------------+
| s or S | Scientific notation.      | 22,000    | s3          | 2\.20·10⁴      |
┤        | Rounds                    |           +-------------+----------------+
|        | to _N_ significant        |           | S3          | 2\.20×10⁴      |
|        | digits.                   |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| p or % | Percentage display.\      | 0\.2812   | %1          | 28\.1%         |
┤        | “%” is fixed to           +-----------+-------------+----------------+
|        | exactly _N_ places after  | 1\.28     | p2          | 130%           |
|        | the decimal.\             |           |             |                |
|        | “p” rounds to _N_         |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| t      | Truncates to a whole      | 31\.6     | t           | 31             |
|        | number.                   |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| x or X | Hexadecimal               | 62        | x           | 0x3e           |
┤        |                           |           +-------------+----------------+
|        |                           |           | X           | 0x3E           |
+--------+---------------------------+-----------+-------------+----------------+
| ∠ or ° | Polar notation of complex | 2 + _j_ 3 | h3          | 2 + _j_3       |
┤        | numbers                   |           +-------------+----------------+
|        |                           |           | h3∠         | 3\.61∠0.983    |
┤        |                           |           +-------------+----------------+
|        |                           |           | h3°         | 3\.61∠56.3°    |
+--------+---------------------------+-----------+-------------+----------------+
{.grid width=30em}

Numeric result display types **f** and **%** can be set to any non-negative
integer. The significant digit display types are limited to no more than 15
significant digits. 

## Active Tables

A Hurmet data frame can contain formulas somewhat similar to a spreadsheet.
Here’s an example:

¢`V = '3.1 kips'`

<p><span class="tex" data-tex="\mathrm{dist} =\begin{array}{l|r r r r r}{\text{Level}}&amp;{W}&amp;{h}&amp;{\text{W × h}}&amp;{F}&amp;{V_\text{i}} \\ &amp; {\text{kips}}&amp; {\text{ft}}&amp; {\text{kip}\mkern1mu{\cdot}\mkern1mu\text{ft}}&amp; {\text{kips}}&amp; {\text{kips}} \\ \hline 4\phantom{}&amp;1.2&amp;33\phantom{}&amp;39.6&amp;1.09\phantom{0}&amp;1.09 \\ 3\phantom{}&amp;2.2&amp;22\phantom{}&amp;48.4&amp;1.33\phantom{0}&amp;2.42 \\ 2\phantom{}&amp;2.3&amp;11\phantom{}&amp;25.3&amp;0.694&amp;3.11 \\ 1\phantom{}&amp;4.0&amp;0\phantom{}&amp;0\phantom{.0}&amp;0\phantom{.000}&amp;3.11 \\\hline \text{Sum}&amp;9.7&amp;&amp;113\phantom{.0}&amp;3.11\phantom{0}&amp;3.11\end{array}"></span></p>

Remember that a data frame is written as pipe-separated values. A cell can
contain a formula. So the content of that calculation zone looks like this:

```
dist = 
``Level|  W   | h  |  W × h  |        F         | V_i
   | kips | ft | kip·ft  |       kips       | kips
4  | 1.2  | 33 | = W × h |=: V × Wh / Wh.Sum| = F
3  | 2.2  | 22 |         |                  | = F + V_i′
2  | 2.3  | 11 |         |                  |
1  | 4.0  |  0 |         |                  |
Sum |=sum()|    | =sum()  |       =sum()     | = V_i′``
```

A table formula:

* begins with a “=” just like a spreadsheet.

* has variable names that are column headings, not “A1” type references.

* returns a result not only to its own cell, but also to every non-formula cell below it.

* begins with “=:” if the formula is unit-aware.

In a table’s bottom row, a `sum()` function is valid with no arguments. It will return the sum of the column.

An active table can have units-of-measure. Just write unit names in row 2 of the pipe-separated input.

Data in any one column must all be the same data type and carry the same unit-of-measure.

A table variable can:

* … omit spaces and characters that are invalid for identifiers. So “`Wh`” will call column “W × h”

* … call a value from outside the table, such as `V`.

* … call a cell from the previous row by appending a prime to a column heading, as in `V_i′`.

Table calculations proceed column-wise. Subject to that constraint, you can
call individual cells via dot notation, such as `Wh.Sum`.

Other calculation cells can call data from inside a table, using the same
accessor notation as a data frame. The left column values can be used as keys
to access data in the table.

## User Defined Functions

If Hurmet’s [built-in functions](#functions) do not satisfy your needs, it is
possible to write your own functions. Example:

```
function multiply(a, b)
    return a × b
```

Other Hurmet calculation cells can then call the function:

¢`n = multiply(2, 4) = 8`

Unlike other Hurmet assignments, user defined functions can be placed at the
end of the document and still be called by other expressions.

The function can have any number of arguments, or none, separated by commas. So
the form of the first line is:

![functionName open paren arguments close paren](../../images/function-railroad.svg)

The function name and each argument (if any) must be valid identifiers.

Function statements end at a line ending, unless the last character is one of:
**( [ { , ; + -** or the following line begins with one of: **} ] )**

Comments can be written after `#`. A space must precede the `#`.

Variables created inside a user-defined function are local and their values
will not be available outside the function. A user-defined function returns
only the result of the expression in a `return` statement.

If you omit any arguments when you call a function, Hurmet will fill out the
argument list with values of `undefined` when it executes the function.

Hurmet does not support function recursion.

#### Code Blocks

Inside a user-defined function, Hurmet supports code blocks and some
additional control words. That is, words such as _if_ and _else_ can control
execution of a _block_ of statements, not just one expression. A code block is
distinguished from other code by its indentation. That is, in a block, the
beginning of every logical line is indented by the same amount. Example:

```
if a ≤ b
    x = a + b²
    y = 2 x
```

Indentation may be done with only with spaces, not with tabs. I usually indent
by four spaces.

A decrease in indentation is treated by Hurmet as equivalent to an `end`
statement in some languages.

<dl class="bold-term">

if else

:   _if​​…else_ control words make the execution of code blocks dependent on a
    condition. Example:

    ```
    if a ≤ 4000
        b = 0.85
    else if a ≥ 8000
        b = 0.65
    else
        b = 0.85 - (a - 4000)/20000
    ```

while

:   A _while_ loop executes a code block repeatedly, as long as a condition holds
    true. Example:

    ```
    while b ≠ 0
        h = b
        b = a modulo b
        a = h
    ```

for

:   A _for_ loop iterates, executing a code block once with each element of a
    range or collection.

    Examples:

    +-------------------+----------------------------+
    | ```               | ```                        |
    | sum = sum + i     | reverse = ""               |
    | for i in 1:10     | for ch in "abcdef"         |
    |     sum = sum + i |     reverse = ch & reverse |
    | ```               | ```                        |
    +-------------------+----------------------------+
    {.grid}

    ![for index variable in range or matrix or string](../../images/for-loop-railroad.svg)

    The index variable of a _for_ loop will iterate through each of the numbers in
    a range, the elements in a matrix, or the characters in a string.

break

:   A loop can be terminated early via the _break_ keyword. Example:

    ```
    for i in 1:1000000
        if i ≥ 2
            break
    ```

return

:   A _return_ statement terminates the function.

    ![return optional expression](../../images/return-railroad.svg)

    If the optional _expression_ is present, the function will return its result.
    If not, the function will return `undefined`.

raise

:   A _raise_ statement terminates the function and returns an optional error message.

    ![raise optional string](../../images/raise-railroad.svg)

echo

:   A _echo_ statement writes a message to the browser’s console. You can type
    **Ctrl Shift I** to see it. Such a message can be very useful while debugging
    a function.

    ![echo string](../../images/echo-railroad.svg)

</dl>

## Remote modules

If some Hurmet code is used repeatedly, it makes sense to write that code once
and import it into other documents. Hurmet modules are text files that serve
that purpose. Modules can contain functions and statements that assign literal
values to a variable. Such a module would have text that might look like this:

```
E = '29000 ksi'

v = \[4, 6, 8]

function multiply(a, b)
    return a × b
```

A Hurmet document can load an entire module into one variable with a import
statement. The following statement will import a file that contains the text above.

mod = import("https://hurmet.app/smallModule.txt") = !

After a module has been imported and loaded into a variable, its functions and
values can be called by writing the module name and variable/function name in
dot notation, as in:

`E = mod.E = ?? psi`

`n = mod.multiply(2, 4) = ?`

#### Imported Parameters

The Hurmet variable name `importedParameters` has a special purpose. It loads
module values into multiple variables instead of into one variable. An example
of such an import is:

`importedParameters = import("https://hurmet.app/parent.txt") = !`

That statement will render like this:

<div style="font-size: 16px">

¢` {:f_c′, f_c′′, f_yr, β_1, ρ_0;
ρ_max, E_c, G_c,  E, G;
n_c, σ_a, σ_as, μ_s, σ_p;
p_pl, ρ_g, C_e, I_s, V_w;
EC, k_zt, α, z_g, SC;
S_DS, S_D1, I_E,,} = import("https://hurmet.app/parent.txt") `

</div>

Such a statement is handy in a big project, where you break the calculations
into several documents. Since any big project often has several common
variables, you want a way to keep them synchronized. Put an
`importedParameters` statement into each of the documents and you’re good. As
an added benefit, a reviewer can see what you are doing.

#### Gists

Hurmet is a web app, so it can import text files only from addresses that begin
with `http` or `https`. An easy way to create such a file is a Github
[Gist](https://gist.github.com/). I've written two example modules in Gists:

<div style="width: 30em; overflow-x: scroll">

+  https://gist.githubusercontent.com/ronkok/d42b0efdc66dc4f6135fee3b8d22a83e/raw/ which
   finds the structural strength of steel members per AISC 360-16.

+  https://gist.githubusercontent.com/ronkok/cbbf6cde15ac1b4c1e65cc338970043a/raw/ which
   duplicates the parent file above.

</div>

If you create your own Gists, you'll see that the addresses of the raw files
are longer than my links. If you want a permalink to your file, delete the 40
random characters after "/raw/". Github keeps a copy of every draft of your
file and the part after "/raw/" is the revision ID.

## Troubleshooting

#### Typing lag

A big document with a lot of math may cause typing lag. You can regain some
speed by using Firefox instead of Chrome or Edge, and gain more speed by
clicking on the Draft Mode toggle button, ![draft][]. It will render math as
plain text and omit the blue echos.

I expect that Chrome and Edge will get a performance boost later this year when
they support MathML and fix [this bug](https://bugs.chromium.org/p/chromium/issues/detail?id=1076718).

#### Matrix multiplication

To get element-wise multiplication of two matrices, the operator symbol must be
[explicitly](#matrix-mult) written as `*`.

#### Word wrap

Hurmet soft line breaks occur after top level binary operators and relation
operators. An operator inside a paren does not qualify. If a calculation runs
past the edge of the page, try to rearrange it so less of it is inside parens.

#### Safari

Hurmet will run in the Safari browser as soon as it supports a BigInt data type.
It is currently working in Safari's Technology Preview version.

#### Saving files

Tired of saving files to the Download folder? You can pick the folder where you
save files, but first you have to change a browser setting.  In Chrome and Edge,
go to ⋯ | Settings | Advanced | Downloads and in Firefox, go to ≡ | Options | Downloads.

#### Printing page numbers

Browsers will print page numbers only if you check the _Headers and footers_
box. Unfortunately, that will usually include other unwanted information.
Firefox is the only browser that enables you to customize the print header and
footer. Here are the [complicated instructions](https://support.mozilla.org/en-US/questions/1323433). 

## Markdown

Hurmet can export or import a document in
[Markdown](https://guides.github.com/features/mastering-markdown/ "Markdown")
format. This is useful for collaboration.

Say that you have written a calculation. It’s awesome and you want to share it
so that others can use it as a template. An easy way to share work is via a
GitHub [Gist](https://gist.github.com/ "Gist"). Then anyone can view it,
download it, or comment on it. If it is in Markdown format, you can read the
Gist right there on GitHub. Here’s an
[example](https://gist.github.com/ronkok/7fec7d11f6fb6a031e5a0827e3531d68).

Hurmet’s version of Markdown adds two extensions that GitHub does not recognize,
those being TeX math content between `` $`…` `` delimiters and calculation cells
between ``¢`…` `` delimiters.

GitHub Gists work best for simple content. Markdown does not recognize indented
paragraphs or table styles. Markdown table cells cannot be merged and cannot
contain lists or multiple paragraphs.

## Coming Attractions

*   Image captions
*   Charts
*   A `distribution` data type, to enable calculations with uncertainty
*   A `date` data type
*   Permalinks

## Other Resources

Civil and structural engineers may also find these items useful:

* Beam Analysis [Diagram](https://hurmet.app/ce/beamanalysis.html)
* Concrete Column Interaction [Diagram](https://observablehq.com/@ronkok/concrete-column-interaction-diagram)
* Fetchable CSV files with steel shape data: [wide flanges](https://gist.githubusercontent.com/ronkok/a9f465e08be54cb4b46449768511acec/raw/AISC-v15-wideFlanges.csv), [channels](https://gist.githubusercontent.com/ronkok/24987345bc31878e624edc39bfa08827/raw/AISC-v15-channels.csv)
* [Module](https://gist.githubusercontent.com/ronkok/d42b0efdc66dc4f6135fee3b8d22a83e/raw/steelStrengthPerAISC360-16.hrms) with functions for steel member strength.

## Credits

I’m Ron Kok and I created Hurmet because I want practicing engineers to have
the tools they need to write calculations that are clear, complete, and reviewable.

Hurmet is built with the aid of several open source libraries and resources,
for which I am very grateful.

*   [ProseMirror](http://prosemirror.net), an extendable rich-text editor by Marijn Haverbeke.

*   [KaTeX](https://katex.org), fast math rendering on the web, by Khan Academy and volunteer contributors.

*   [CodeMirror](https://codemirror.net/), a text editor, also by Marijn Haverbeke.

*   Many of Hurmet’s menu buttons show images from [icomoon](https://icomoon.io).

*   This document’s railroad diagrams are modified versions of images created with [regexper.com](https://regexper.com), by Jeff Avalone.

<br>

Copyright © 2020-2021 Ron Kok. Released under the [MIT License](https://opensource.org/licenses/MIT)

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
* [Complex Number](#complex-number)
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
<li><a href="#active-tables">Active Tables</a></li>
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

</div>
</nav>

<div id="mobile-nav">
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
<p>format = "<input type="text" id="formatBox" value="h3" onchange="updateFormat()" style="width: 2em;">"</p>
<p></p>
<div>Give it a try. (It’s interactive.)</div>
<div id="input-container"><form><textarea id="demo-input"></textarea></form></div>
<div id="demo-output"></div>
</div> <!-- demo -->


<script>
  // Render math via KaTeX.
  const texSpans = document.getElementsByClassName("tex");
  const isFF = 'MozAppearance' in document.documentElement.style;
  [...texSpans].forEach(span => {
    const tex = span.dataset.tex.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
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
  observer.observe(document.getElementById("complex-number"))
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
