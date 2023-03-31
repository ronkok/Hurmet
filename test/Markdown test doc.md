Hurmet Markdown Input Test
==========================

Paragraphs are blocks of text separated by empty lines. A backslash, \\, or two
spaces at the end of a line is treated as a hard line break, like this:\
Otherwise, newlines in a paragraph are treated as spaces.


We just had two consecutive blanks lines. It parsed just fine.

### Calculations and TeX

Write a calculation:

¢` L = 3 'ft' `

¢` 2 L = ?? m `

And some $\TeX$: $ \frac a b + c_2 $

¢```df = ``#name	area	diameter
	in^2	in
#3	0.22	0.375
#4	0.31	0.5`` ```

### Links

Here is a [regular link](https://hurmet.app/) and here is a [reference link][ref link].
Another [ref link][]. And here is an autolink: <http://example.com/>

[ref link]: https://hurmet.app/

### Images

![This is a tank][tank]

Here's a tank ![tank][tank] picture.

### Lists

First, test that an inline asterisk does not create a list: * Not a list item.

A list can be written directly after a paragraph. An empty line is unnecessary.
* fruits
  + apples
  
    - macintosh
    - red 

Now try a loose list.

* An itemization should include

    * The first paragraph in this list item
    
      A second paragraph
    
    * Another list item.

Another paragraph.

1. Item 1 from dotted list

2. Item 2

3. Item 3


1. Item 1 from dotted list
2. Item 2
3. Item 3

Lists can begin with numbers other than one.

4) Item 4 from close paren
5) Item 5
6) Item 6

#### Pipe Tables

| Head 1  |  Head 2  | Head 3  |
|:--------|:--------:|---------|
| datum 1 | datum 2  | datum 3 |
| datum 4 | datum 5  | datum 6 |
{.grid}

|||||
|---------|---------|-----|--------------|
| grave   | acute   | hat | tilde        |
| bar     | breve   | dot | ddot         |
| ring    | check   | ul  | leftharpoon  |
| harpoon | leftvec | vec | leftrightvec |
{.grid}

#### Grid tables

+--------+---------------------------+------------------------------------------+
| Type   | Description               | Examples                                 |
|        |                           +-----------+-------------+----------------+
|        |                           | Number    | Format spec | Result display |
+========+===========================+===========+=============+================+
| b      | Binary                    | 5         | b           | 0b101          |
+--------+---------------------------+-----------+-------------+----------------+
| e or E | A programmer’s version of | 22,000    | e3          | 2\.20e4        |
|        | scientific notation.      |           +-------------+----------------+
|        | Rounds to _N_             |           | E3          | 2\.20E4        |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
{.grid width=30em}

+-----------+----------------------------+
| Heading 1 |  Merged Heading            |
+:=========:+============================+
| datum 1   | merged cell                |
+-----------+------------------+---------+
| merged\   | datum 3          | datum 4 |
| cell      +------------------+---------+
|           | datum 5          | datum 6 |
+-----------+------------------+---------+
| datum 7   | - block elements | datum 8 |
|           | - inside a       |         |
|           | - cell           |         |
+-----------+------------------+---------+
{.grid}

+------------------------+------------+----------+----------+
| Header row, column 1   | Header 2   | Header 3 | Header 4 |
+:=======================+:==========:+:=========+=========:+
| body row 1, column 1   | column 2   | column 3 | column 4 |
+------------------------+------------+----------+----------+
| body row 2             | Cells may span columns.          |
+------------------------+------------+---------------------+
| body row 3             | Cells may  | - Table cells       |
+------------------------+ span rows. | - may contain       |
| body row 4             |            | - block elements.   |
+------------------------+------------+---------------------+
{.grid}

+---------------+:----------------------------------------:+
| ! %           | Factorials and percents are done first.  |
+---------------+------------------------------------------+
| ^             | Then exponents, from right to left.      |
+---------------+------------------------------------------+
| √             | Roots                                    |
+---------------+------------------------------------------+
{.grid}

#### Bold and Italic

Hurmet standard notation: _italic_, **bold**, and **_bold-italic_**.

A paragraph with alternate *italic*, __bold__, and __*bold-italic*__.

#### Section properties:

¢ Timber = 
``#name	width	depth	area	Sx  	Ix  	Sy  	Iy  	weight
     	in  	in  	in² 	in³ 	in⁴ 	in³ 	in⁴ 	lbf/ft
2x4  	1.5 	3.5 	5.25	3.06	5.36	1.31	0.984	1.3
2x6  	1.5 	5.5 	8.25	7.56	20.8	2.06	1.55	2
2x8  	1.5 	7.25	10.9	13.1	47.6	2.72	2.04	2.6
2x10 	1.5 	9.25	13.9	21.4	98.9	3.47	2.60	3.4
2x12 	1.5 	11.25	16.9	31.6	178 	4.22	3.16	4.1
4x4  	3.5 	3.5 	12.25	7.15	12.5	7.15	12.51	3
6x6  	5.5 	5.5 	30.3	27.7	76.3	27.7	76.3	7.4
8x8  	7.5 	7.5 	56.3	70.3	264 	70.3	264 	13.7`` ¢

¢ w = ``
dead	live	snow
30  	70  	40`` 'k·ft' ¢

¢ roof = ``#Item           	weight
                           	psf
2 layers asphalt shingles  	8.0
1/2″ plywood               	1.5
insulation, R19 fiberglass 	0.6
trusses at 16″ o.c.        	2.5
5/8″ gypsum board          	2.5
lights, HVAC, miscellaneous	1.5
total                      	sumAbove()`` ¢

### Code blocks

```
function backtick(a)
    return "hello"
end
```

~~~
function tilde(b)
    return "ahoy"
end
~~~

    function spaces(x)
        return "hi"
    end

A paragraph with a sub<sub>script</sub>.

	function tab(y)
	    return "ho"
	end

[tank]: https://hurmet.app/images/IsoTankCourses.svg
[C]: https://hurmet.app/images/C.svg