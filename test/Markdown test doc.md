---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

# Hurmet Markdown Input Test

Paragraphs are blocks of text separated by empty lines. For a hard line-break,
Hurmet writes a backslash, `\`, at the end of a line, like this:\
Hurmet also reads two spaces at the end of a line as a line break, line this:\
Otherwise, newlines in a paragraph are treated as spaces.

## Inline Style

Hurmet standard notation: _italic_, **bold**, and _**bold-italic**_.

A paragraph with alternate _italic_, **bold**, and _**bold-italic**_.

Hurmet writes a sub~script~ with tildes. It can also read a sub~script~ written
with HTML tags.

### Code Blocks

```
Here is some code.
And some more 
```

Two consecutive blank lines parse like a single blank line. Like the two
preceding lines.

¶

An empty paragraph is designated by a pilcrow symbol, ¶, by itself on its own
line, like the preceding one.

::: comment
A Hurmet comment is inside a speech bubble.

It can contain more than one paragraph.
:::

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua.

::: indented
There are some divs with special styling.

This one is indented.

:::::: indented
Nested indentation is possible.
::::::
:::

::: boxed
For engineer’s results, this div is boxed.
:::

::: centered
This div is centered.

Special divs can contain more than one paragraph.
:::

>  The grand-daddy of all these special divs is the blockquote.
>
> The Hurmet schema for blockquote is the template for other special divs.

>  A second blockquote

¶

> [!NOTE]
> A note alert contains information the user should notice even if skimming.
>
> An alert can contain multiple paragraphs.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Essential information required for user success.

> [!WARNING]
> Negative potential consequences of an action.

>  `Check a blockquote after an alert.`

### TeX

Hurmet reads inline TeX written between `$` delimiters:\
The obligatory logo: $\TeX$. A second TeX on the same line: $\frac a b + c_2$.

As in Pandoc, the opening $ must have a non-space character immediately to its
right, and the closing $ must have a non-space character immediately to its
left. The closing $ must not be followed immediately by a digit. Thus,
$20,000 and $30,000 won’t parse as math.

Display TeX is written between `$$` delimiters:

$$ \oint_C \vec{B}\circ d\vec{l} = \mu_0 \left( I_{\text{enc}} + \varepsilon_0
\frac{d}{d t} \int_S \vec{E} \circ \hat{n}\; d a \right) $$

While we’re here, let’s test the equation numbering system.

$$ \begin{equation} x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \end{equation} $$

### Calculations

For inline calculations, the delimiters are `` ¢`…` ``:

¢` L = 3 'ft' `. Another calc on the same line: ¢` w = 0.2 'kips/ft' `

¢` M = (w L²)/8 = ?? kip-ft `

Hurmet data frame literals are written between double backticks: ``` `` ```. In that case, the calculation delimiters use triple backticks: ```` ``` ````:

¢``` rebar =
``#name	area	diameter
	in^2	in
#3	0.22	0.375
#4	0.31	0.5`` ```

Hurmet calculations also have a display mode, written between `¢¢` delimiters:

¢¢ E = m c² ¢¢

## Links

Here is a [regular link][1] and here is a [reference link][2]. Another [ref
link][3]. And here is an auto-link: <http://example.com/>

## Images

Here’s an inline tank ![tank][] image.

!![Tank Isometric][5]

The nearby tank image has been placed in a figure with a float-right directive
and a caption. Notice the double exclamation mark!! That indicates a figure.
We'll fill out the paragraph with some Lorem ipsum dolor sit amet, consectetur
adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
aliqua. Dolor sit amet consectetur adipiscing elit pellentesque habitant morbi.
Sit amet risus nullam eget felis eget. Velit dignissim sodales ut eu sem
integer vitae justo. Sit amet nulla facilisi morbi tempus iaculis urna. Duis at
consectetur lorem donec massa sapien faucibus et molestie. Placerat in egestas
erat imperdiet. Faucibus et molestie ac feugiat. Elit sed vulputate mi sit amet
mauris commodo quis. Lectus proin nibh nisl condimentum id. At ultrices mi
tempus imperdiet nulla malesuada pellentesque. Lacus vestibulum sed arcu non
odio. Congue nisi vitae suscipit tellus mauris a. Ut faucibus pulvinar
elementum integer enim neque volutpat ac. Justo laoreet sit amet cursus sit
amet dictum sit amet. Elementum integer enim neque volutpat ac tincidunt vitae
semper quis. Sed adipiscing diam donec adipiscing tristique risus nec feugiat.

While we’re doing images, let’s display a few Hurmet drawings.

![Tank Dimensions][]           ![Angle][]         ![Angle 2][]

## Lists

First, test that an inline asterisk does not\
create a list: * Not a list item.

*   A bullet list

*   … can have nested lists

    *   nuts

    *   fruit

        *   apples 

            *   macintosh
            *   red

        *   bananas

1.  An ordered  list

2.  … can also have nested lists

   1.  nuts

   2.  fruit

      1.  apples 

         1.  macintosh
         2.  red

                  

      2.  bananas

            

      


A list can be started in the line after a paragraph. An empty line is
unnecessary.  

*   A list can be started in the line after a (loose) list item.

*   An empty line is unnecessary.   

    *   apples

    *   bananas

Hurmet can also parse a tight list. 

*   But a tight list: 

    *   cannot have
    *   … a nested list on the line following
    *   … a list item.

*   A list after a tight list needs an intervening newline.

*   That's because, in the Hurmet schema, a tight\_list\_item 

    *   … cannot contain a block element.
    *   So it is impossible
    *   … to nest a list inside the list item of a tight list.

*   In a loose list …

    *   a list item can contain

        … a second paragraph.

        … and another paragraph

    *   And the next list item.

        … can also contain multiple paragraphs

Ordered lists can begin with numbers other than one. 

4.  Item 4
5.  Item 5
6.  Item 6


*   Bullet lists can contain

*   … nested lists that are

    1.  Ordered lists, and what's more,

    2.  The nested, ordered list can contain a list that is

       *   a bullet list
       *   Yay!

        

## Tables

#### Pipe Tables

A typical pipe table:

| Head 1  | Head 2  | Head 3             |
|---------|:-------:|--------------------|
| datum 1 | datum 2 | datum 3            |
| datum 4 | datum 5 | ¢` x = 2 + 2 = ? ` |
{.grid colWidths="null null null"}

We can write a pipe table without a heading. Its top line consists of empty
cells, e.g., `|||||`. Below is an example:

|||||
|---------|---------|-----|--------------|
| grave   | acute   | hat | tilde        |
| bar     | breve   | dot | ddot         |
| ring    | check   | ul  | leftharpoon  |
| harpoon | leftvec | vec | leftrightvec |
{.grid colWidths="null null null null"}

#### Grid tables

Hurmet can write tables with merged cells and block elements inside a cell. For
format, we use the grid table from reStructuredText. Like the example below:

+--------+---------------------------+---------------------------------------+
| Type   | Description               | Examples                              |
|        |                           +--------+-------------+----------------+
|        |                           | Number | Format spec | Result display |
+========+===========================+========+=============+================+
| b      | Binary                    | 5      | b           | 0b101          |
+--------+---------------------------+--------+-------------+----------------+
| e or E | A programmer’s version of | 22,000 | e3          | 2.20e4         |
|        | scientific notation.      |        +-------------+----------------+
|        | Rounds to _N_             |        | E3          | 2.20E4         |
|        | significant digits.       |        |             |                |
+--------+---------------------------+--------+-------------+----------------+
{.grid colWidths="null null null null null"}

However, we use `:` in the header border to show column alignment. Pandoc does
the same thing.

+-----------+------------------------------+
| Heading 1 | Merged Heading               |
+:=========:+==============================+
| datum 1   | merged cell                  |
+-----------+--------------------+---------+
| merged\   | datum 3            | datum 4 |
| cell      +--------------------+---------+
|           | datum 5            | datum 6 |
+-----------+--------------------+---------+
| datum 7   | *   block elements | datum 8 |
|           | *   inside a       |         |
|           | *   cell           |         |
+-----------+--------------------+---------+
{.grid colWidths="null null null"}

Another grid table example.

+----------------------+----------------------+----------+----------+
| Header row, column 1 | Header 2             | Header 3 | Header 4 |
+======================+:====================:+==========+=========:+
| body row 1, column 1 | column 2             | column 3 | column 4 |
+----------------------+----------------------+----------+----------+
| body row 2           | Cells may span columns.                    |
+----------------------+----------------------+---------------------+
| body row 3           | Cells may span rows. | *   Table cells     |
+----------------------+                      | *   may contain     |
| body row 4           |                      | *   block elements. |
+----------------------+----------------------+---------------------+
{.grid colWidths="null null null null"}

Grid tables can also be written without a header. Just omit the `====` border.

|||
|-----|:---------------------------------------:|
| ! % | Factorials and percents are done first. |
| \^  | Then exponents, from right to left.     |
| √   | Roots                                   |
{.grid colWidths="null null"}

#### Table Captions

: View
| H1 | H2  | H3    |
|----|:---:|:-----:|
| s1 | 12  | 55    |
| s2 | 9.5 | 28.44 |
{.three-rules float="right" colWidths="53 73 62"}

A table can be placed within a figure. The figure then may have a caption
applied to it. The entire figure can be floated right or left.

The caption is preceded by `:`, as per Pandoc. The float is written into the
table directives.

Next, let’s make sure that we can read nested tables.

+===========================================+===========================================+
| : Caption\                                | +-----------------------------+---------+ |
| with a newline                            | | Item                        | weight\ | |
| +-----------------------------+---------+ | |                             | psf     | |
| | Item                        | weight\ | | +=============================+=========+ |
| |                             | psf     | | | 2 layers asphalt shingles   | 8       | |
| +=============================+=========+ | +-----------------------------+---------+ |
| | 2 layers asphalt shingles   | 8       | | | 1/2″ plywood                | 1.5     | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | 1/2″ plywood                | 1.5     | | | insulation, R19 fiberglass  | 0.6     | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | insulation, R19 fiberglass  | 0.6     | | | trusses at 16″ o.c.         | 2.5     | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | trusses at 16″ o.c.         | 2.5     | | | 5/8″ gypsum board           | 2.5     | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | 5/8″ gypsum board           | 2.5     | | | lights, HVAC, miscellaneous | 1.5     | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | lights, HVAC, miscellaneous | 1.5     | | | total                       | =Σ      | |
| +-----------------------------+---------+ | +-----------------------------+---------+ |
| | total                       | =Σ      | | {.four-rules colWidths="201 72"}          |
| +-----------------------------+---------+ |                                           |
| {.four-rules colWidths="201 72"}          |                                           |
+-------------------------------------------+-------------------------------------------+
{.nogrid colWidths="318 318"}

## Spreadsheets

Tables can be converted into spreadsheets. The section below contains an
example.

¢` format = "h4" `

#### Vertical Distribution of Seismic Force

From earlier analysis

::: indented
¢` V_base = 400kips `, base shear        ¢` T = 0.75 sec `, fundamental period
of the structure
:::

From ASCE-16 section 12.8.3, Equivalent Lateral Procedure

::: indented
¢` k = {   1 if T ≤ 0.5;   2 if T ≥ 2.5;   1 + (T - 0.5) / 2 otherwise } = % `

¢` C_vs = (w × h^k) / (Σ (w × h^k)) `, vertical distribution coefficient, Eq.
12.8-12

¢` F = C_vs V_base `, local force, Eq. 12.8-11
:::

: dist: Vertical Distribution of Seismic Force
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| Floor  | Weight\  | Height\ | w × h<sup>k</sup> | C~vs~     | Force\       | Shear\ | Overturning\   |
|        | kips     | ft      |                   |           | kips         | kips   | kip·ft         |
+========+:========:+:=======:+:=================:+:=========:+:============:+:======:+:==============:+
| roof   | 950      | 70      | =B1×C1^k          | =D1/D_end | ==E1× V_base | =F1    | 0              |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| fifth  | 1,250    | 56      | "                 | "         | "            | =G1+F2 | =H1+G1×(C1-C2) |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| fourth | "        | 42      | "                 | "         | "            | "      | "              |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| third  | "        | 28      | "                 | "         | "            | "      | "              |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| second | "        | 14      | "                 | "         | "            | "      | "              |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
| total  | =sum(up) | 0       | =sum(up)          |           | =sum(up)     | =F_end | "              |
+--------+----------+---------+-------------------+-----------+--------------+--------+----------------+
{#dist ."four-rules spreadsheet" colWidths="70 71 62 73 88 74 76 null"}

¢` V_bottom = dist.Shear.total = ?? kips `


[1]: https://hurmet.org/

[2]: https://hurmet.org/

[3]: https://hurmet.org/

[tank]: https://hurmet.org/images/IsoTankCourses.svg
{.inline alt="tank"}

[5]: https://hurmet.org/images/IsoTankCourses.svg
{.right alt="Tank Iso"}

[Tank Dimensions]: ¢` draw()
    title "Tank Dimensions"
    frame 252, 459, "inline"
    view -12, 15, -3.5
    rect [-11, -1.5; 11, 0]
    rect [-9, 0; -8, 19]
    rect [8, 0; 9, 19]
    rect [-9, 19; 9, 20]
    line [-8, 17; 8, 17]
    line [-5, 16.5; -2, 16.5]
    line [-4.5, 16; -2.5, 16]
    line [-4, 15.5; -3, 15.5]
    dimension [1, 0; 1, 17; 1, 10], "H~L~"
    dimension [11, 0; 9, 19; 12.5, 10], "H"
    marker "arrow"
    line [-10, 12; -9, 12]
    line [-7, 12; -8, 12]
    text [-7, 12], "t~w~", "right"
    line [-5, 1; -5, 0]
    line [-5, -2.5; -5, -1.5]
    text [-5, 1.25], "t~b~", "above"
    line [-5, 21; -5, 20]
    line [-5, 18; -5, 19]
    text [-5, 21.25], "t~r~", "above"
    marker "none"
    circle [0, 34], 11
    circle [0, 34], 9
    dimension [-8, 34; 8, 34; 0, 34], "D"
    strokedasharray "5 5"
    circle [0, 34], 8
end `

[Angle]: ¢` draw()
    title "Angle"
    frame 150, 150
    view -0.2, 3.8, -0.2, 3.8
    strokewidth 1
    fill "#EEEEEE"
    path (0, 3, 0; 3, 3, 0; 2.75, 2.75, -0.25; 0.5, 2.75, 0; 0.25, 2.5, 0.25; 0.25, 0.25, 0; 0, 0, -0.25; 0, 3, 0)
end `

[Angle 2]: ¢` draw()
    title "Angle 2"
    frame 150, 150
    view -0.2, 3.8, -0.2, 3.8
    fill "#EEEEEE"
    strokewidth 1
    path (0, 3, 0; 0, 0, 0; 0.25, 0.25, 0.25; 0.25, 2.5, 0; 0.5, 2.75, -0.25; 2.75, 2.75, 0; 3, 3, 0.25; 0, 3, 0)
end `
