---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

# Beam Diagrams

This guide is aimed at civil engineers. It shows how Hurmet can produce a beam
diagram, like this one:

¢``` beam =
``#item	value
plan	△ 12′ △ 10′ △
E	29000 ksi
I	131 in⁴
dead	-0.031 kips/ft
live	-0.4 kips/ft
live	-2 kips, 4′`` ``` ¢` beamDiagram(beam) = @ `

¶

¶

¶

¶

¶

¶

¶

¶

A service load analysis, as shown above, is a two-step process. The first step
is to define the beam parameters. To do this, open a math zone and write a data
frame like this one:

```
beam =
``#item	value
plan	△ 12′ △ 10′ △
E	29000 ksi
I	131 in⁴
dead	-0.031 kips/ft
live	-0.4 kips/ft
live	-2 kips, 4′``
```

Let’s go through that data line-by-line.

::: indented
Line 0 contains headings, but Hurmet doesn't read the words in that line. Write
headings in whatever language you want.

Line 1 describes the beam’s nodes and span lengths. Span units can be `m`, `ft`,
or `′`. Nodes are written with the following symbols:

:::::: indented

| Restraint Type | Symbol | Alternate<br>Symbol |
|----------------|:------:|:--:|
| pinned         | p      | △  |
| fixed          | f      | ⫢  |
| hinge          | h      | ∘  |
| spring         | s      | ⌇  |
| pinned hinge   | ph     | ⫯  |
| no restraint   | \-     | \- |
{.grid colWidths="170 80 110"}
::::::

Next come two optional lines. One must be named `I`, for moment of inertia in
`in⁴` or `cm⁴`. The other must be named `E`, for modulus of elasticity in `ksi`
or `MPa`. If you omit E and I, Hurmet will not create a displacement diagram.

If the beam contains one or more spring supports, include a line named `k`, for
a spring constant in `kips/in` or `kN/m`.

The default moment diagram shows positive moment on the compression side. If you
prefer the other convention include a line named `+M`, whose only datum is `←→`.

All the remaining lines will describe loads. Name your loads whatever you want.
Point loads can take units of `kips` or `kN`. Distributed loads can take units
of `kips/ft` or `kN/m`. Load locations are measured from the left end of the
beam. Moments take units of `k·ft` or `kN·M`.
:::

The second step is the easy part. Open a math zone and call the `beamDiagram`
function, like this:

```
beamDiagram(beam) = @
```

# Variations

## Distributed Loads

Write the location of a distributed load as a `start:stop` range. Like the live
load in this example:

¢``` beam2 =
``#item	value
plan	△ 12′ △ 10′ △
E	29000 ksi
I	131 in⁴
dead	-0.031 kips/ft
live	-0.4 kips/ft, 9:14 ft
live	-2 kips, 4′`` ```¢` beamDiagram(beam2) = @ `

¶

¶

¶

¶

¶

¶

¶

¶

Write a sloping load as a `startLoad:endLoad` range.

¢``` bm3 =
``#item	value
plan	△ 12′ △ 10′ △
E	29000 ksi
I	131 in⁴
dead	-0.031 kips/ft
live	-0.2:-0.4 k/ft, 9:14 ft
live	-2 kips, 4′`` ``` ¢` beamDiagram(bm3) = @ `

¶

¶

¶

¶

¶

¶

¶

## Units

Hurmet can write output in either SI units or imperial units. It takes its cue
from the span lengths in line 1. If those lengths are written in `ft` or `′`,
output will be in `kips` and `feet`. Input lengths in `m` or `mm` will result in
output in `KN` and `m`. Remember that span lengths without units will be taken
as `mm`.

¢```beam4 =
``#item	value
plan	△ 3.5m △ 3000 △
E	200 GPa
I	5450 cm⁴
dead	-0.542 kN/m
live	-5.84 kN/m
live	-9 kN, 1200`` ```   ¢` beamDiagram(beam4) = @ `

¶

¶

¶

¶

¶

¶

## Load Combinations

Strength-level analysis requires load factors in several different combinations.
You can define your own combinations in a data frame. 

 ¢``` loadFactors = 
``dead	live
1.4	0
1.2	1.6`` ```

… then the function call includes an optional argument:

```
beamDiagram(beam, loadFactors) = @
```

… and the result looks like this:

¢` beamDiagram(beam, loadFactors) = @ `

Yes, the shapes of this diagram are very similar to the first diagram. But look
closely. The shear and bending magnitudes are larger.

¶

¶

¶

¶

¶

¶

¶

¶

¶

¶

You can also get patterned live loads by marking a load type with an asterisk:

¢``` loadFactors = 
``dead	live*
1.4	0
1.2	1.6`` ```¢` beamDiagram(beam, loadFactors) = @ `

¶

¶

¶

¶

¶

¶

¶

¶

¶

¶

¶

¶

To get diagrams that automatically update with new data, use string interpolation
to define values. For instance, you can write `${L_1}` to get the value of ¢` L_1 `.

¢` L_1 = 10 ft`,    ¢`L_2 = 14 ft`

¢```
beam = ``#item	value
plan	△ ${L_1}′ △ ${L_2}′ △
E	29000 ksi
I	131 in⁴
dead	-0.031 kips/ft
live	-0.4 kips/ft
live	-2 kips, 4′`` = %
```
