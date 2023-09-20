---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

::: hidden

¢` colDiagram1 =
import("https://gist.githubusercontent.com/ronkok/6ea53b79cd49a0ab5c6c60e3f9e8c874/raw/concreteColumnInteraction.txt") = ! `

¢``` col =
``f_c′	f_y	width	depth	barSize	bars	cover	tieSize
psi	psi	in	in			in	
4500	60000	24	24	#7	12	2	#4`` = @ ```
:::

# Concrete Column Interaction Diagram

This guide is aimed at civil and structural engineers. It shows how Hurmet can
produce a concrete column interaction diagram, like this one:

¢` colDiagram1.draw(col, 100, 200) = @ `

It’s a three-step process. First, one must import a module. To do that, open a
math zone (Alt-C) and copy in this code:

```
colDiagram = import("https://gist.githubusercontent.com/ronkok/6ea53b79cd49a0ab5c6c60e3f9e8c874/raw/concreteColumnInteraction.txt") = !
```

That module exposes one function, which works through a loop that sets the neutral
axis in 25 different locations and finds the axial strength and bending strength
that results from each neutral axis location. The process is described in [ACI E702.2][1].
And you can look at the function’s [source code][2].

Your second step is to define the parameters of your column in a data frame.
Here’s an example:

```
col =
``f_c′	f_y	width	depth	barSize	bars	cover	tieSize
psi	psi	in	in			in	
4500	60000	24	24	#7	12	2	#4`` = @
```

Note that the diagram function is not unit-aware. You have to use the same units
as the example.

Finally, invoke the function with this code:

```
colDiagram.draw(col) = @
```

In your document, the results will look like this:

::: indented
¢` colDiagram =
import("https://gist.githubusercontent.com/ronkok/6ea53b79cd49a0ab5c6c60e3f9e8c874/raw/concreteColumnInteraction.txt") = ! `

¢``` col =
``f_c′	f_y	width	depth	barSize	bars	cover	tieSize
psi	psi	in	in			in	
4500	60000	24	24	#7	12	2	#4`` = @ ```

¢` colDiagram.draw(col) = @ `
:::

# Variations

## Bar Pattern

The bar arrangement need not be doubly symmetric. You can define a bar pattern
in the form: 𝐦x𝐧, where 𝐦 and 𝐧 are integers ≥ 2. Like this example:

::: indented
¢``` col =
``f_c′	f_y	width	depth	barSize	bars	cover	tieSize
psi	psi	in	in			in	
4500	60000	24	24	#7	5x4	2	#4`` = @ ```

¢` colDiagram.draw(col) = @ `
:::

## Material Properties

Your calculation package may have previously defined values for ¢` f_c′ ` and ¢` f_y `.
Like this:

::: indented
¢` f_c′ = 3000 psi `

¢` f_y = 60000 psi `
:::

In that case, you can define the column by appending ¢` f_c′ ` and ¢` f_y ` to
a slightly smaller data frame.

```
col =
``width	depth	barSize	bars	cover	tieSize
in	in			in	
24	24	#7	12	2	#4`` & f_c′ & f_y = @
```

… which will result in this:

::: indented
¢``` col =
``width	depth	barSize	bars	cover	tieSize
in	in			in	
24	24	#7	12	2	#4`` & f_c′ & f_y = @ ```

¢` colDiagram.draw(col) = @ `
:::

## Strength Demand

The function has two optional arguments: `Pu` and `Mu`. If you supply both of
them, the function will draw a dot on the diagram that represents your strength
demand.

::: indented
¢` P_u = 150 kips `

¢` M_u = 80 k·ft `
:::

You then invoke the function with the optional arguments:

```
colDiagram.draw(col, P_u, M_u) = @
```

… with this result:

::: indented
¢` colDiagram.draw(col, P_u, M_u) = @ `
:::

# Limitations

The remote module works only with rectangular columns with ties. If you want
a diagram that deals with circular cross-sections, octagons, or spirals,
check out [this utility][3].

This function is not the last word on concrete capacity. For one thing, it deals
only with short columns. Slenderness must be addressed elsewhere. Also, ACI 318
has several prescriptive requirements that must be met in order for this
diagram to be valid. Such as: maximum bar spacing, minimum ρ values, and
minimum cover. You are responsible to check those prescriptive requirements. 

Only qualified engineers should use this diagram.


[1]: https://www.concrete.org/portals/0/files/pdf/e702.2_interaction_diagram_for_concrete_columns_2007-02-20.pdf

[2]: https://gist.githubusercontent.com/ronkok/6ea53b79cd49a0ab5c6c60e3f9e8c874/raw/concreteColumnInteraction.txt

[3]: https://observablehq.com/@ronkok/concrete-column-interaction-diagram
