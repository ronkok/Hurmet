---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

# Hurmet Markdown Input Test

Paragraphs are blocks of text separated by empty lines. For a hard line break,
Hurmet writes a backslash, `\`, at the end of a line, like this:\
Hurmet also reads two spaces at the end of a line as a line break, line this:\
Otherwise, newlines in a paragraph are treated as spaces.


Two consecutive blank lines parse like a single blank line. Like the two
preceding lines.

¶

An empty paragraph is designated by a pilcrow symbol, ¶, by itself on its own
line, like the preceding one.

::: comment
A Hurmet comment is a paragraph inside a speech bubble.
:::

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua.

### TeX

Hurmet reads inline TeX written between `$` delimiters:\
The obligatory logo: $\TeX$. A second TeX on the same line: $\frac a b + c_2$.

As in Pandoc, the opening \$ must have a non-space character immediately to its
right, and the closing \$ must have a non-space character immediately to its
left. The closing \$ must not be followed immediately by a digit. Thus,
\$20,000 and \$30,000 won’t parse as math.

Display TeX is written between `$$` delimiters:

$$
\oint_C \vec{B}\circ d\vec{l} = \mu_0 \left( I_{\text{enc}} + \varepsilon_0
\frac{d}{d t} \int_S \vec{E} \circ \hat{n}\; d a \right)
$$

While we’re here, let’s test the equation numbering system.

$$
\begin{equation} x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \end{equation}
$$

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

### Links

Here is a [regular link][1] and here is a [reference link][2]. Another [ref
link][3]. And here is an auto-link: <http://example.com/>

### Images

![This is a caption for a tank image.][4]

Here’s an inline tank ![tank][] image.

### Lists

First, test that an inline asterisk does not create a list: * Not a list item.

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

        2. bananas


A list can be started in the line after a paragraph. An empty line is unnecessary.
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

    1. Ordered lists, and what's more,

    2. The nested, ordered list can contain a list that is

        * a bullet list
        * Yay!


#### Pipe Tables

A typical pipe table:

| Head 1  | Head 2  | Head 3  |
|---------|:-------:|---------|
| datum 1 | datum 2 | datum 3 |
| datum 4 | datum 5 | datum 6 |
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

Hurmet can write tables with merged cells and block elements inside a cell.
For format, we use the grid table from reStructuredText. Like the example below:

+--------+---------------------------+---------------------------------------+
| Type   | Description               | Examples                              |
|        |                           +--------+-------------+----------------+
|        |                           | Number | Format spec | Result display |
+========+===========================+========+=============+================+
| b      | Binary                    | 5      | b           | 0b101          |
+--------+---------------------------+--------+-------------+----------------+
| e or E | A programmer’s version of | 22,000 | e3          | 2\.20e4        |
|        | scientific notation.      |        +-------------+----------------+
|        | Rounds to _N_             |        | E3          | 2\.20E4        |
|        | significant digits.       |        |             |                |
+--------+---------------------------+--------+-------------+----------------+
{.grid colWidths="null null null null null"}

However, we use `:` in the header border to show column alignment. Pandoc does
the same thing.

+-----------+------------------------------+
| Heading 1 |  Merged Heading              |
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

+=====+:=======================:+
| ! % | Factorials and percents |
|     | are done first.         |
+-----+-------------------------+
| ^   | Then exponents, from    |
|     | right to left.          |
+-----+-------------------------+
| √   | Roots                   |
+-----+-------------------------+
{.grid colWidths="null null"}

#### Inline Style

Hurmet standard notation: _italic_, **bold**, and _**bold-italic**_.

A paragraph with alternate _italic_, **bold**, and _**bold-italic**_.

Hurmet writes a sub~script~ with tildes. It can also read a sub~script~ written
with HTML tags.

### Code Blocks

```
Here is some code.
And some more 
```

A paragraph


[1]: https://hurmet.app/

[2]: https://hurmet.app/

[3]: https://hurmet.app/

[4]: https://hurmet.app/images/IsoTankCourses.svg
{ alt="4"}

[tank]: https://hurmet.app/images/IsoTankCourses.svg
{.inline alt="tank"}
