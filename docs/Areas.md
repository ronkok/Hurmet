---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

## Areas

Terms:

::: indented
$P$: perimeter distance\
$A$: area\
$r$: radius\
$D$: diameter\
$n$: number of sides
:::

Triangles![Triangle][]

::: indented
¢` h = b sin θ = a (tan θ tan θ_1) / (tan θ + tan θ_1) `

¢` A = 1//2 a h = 1//2 a b sin θ = a²/2 (sin θ sin θ_1 ) / (sin θ + sin θ_1) `

           ¢` s = (a + b + c)/2 `, then ¢` A = s √((s - a)(s - b)(s - c) ) `  \
(Heron’s formula)

¢` P = a + b + √(a² + b² - 2 a b cos θ) = a (1 + sin α / sin(θ + θ_1) + sin θ /
sin(θ + θ_1)) `
:::

Equilateral Triangle![Equilateral Triangle][]

::: indented
¢` h = √3//2 a `          ¢` P = 3 a `         ¢` A = √3//4 a² = 1/√3 h² `
:::

Isosceles triangle![Isosceles Triangle][]

::: indented
¢` h = a//2 tan θ = b sin θ `            ¢` θ = tan⁻¹ ((2 h) / a) `

¢` a = 2 b cos θ `          ¢` b = √(h² + a²/4) `

¢` A = 1//2 b² sin θ `
:::

Square

::: indented
¢` P = 4 a `              ¢` A = a² `
:::

Rectangle

::: indented
¢` P = 2 (a + b) `            ¢` A = a b `
:::

Trapezoid![Trapezoid][]

::: indented
¢` A = (a + b)/2 h `
:::

Regular Polygon

::: indented
¢` P = n a `           ¢` θ = 180° (1 - 2//n) `, peak angle      ¢` ϕ = 180°/n
`, central angle![Regular polygon][]\
¢` A = (a n²) / (4 tan(π//n) ) `             ¢` a = √((4A tan(π//n))/n) `

if ¢` n ` is even:        ¢` L_sharps = L_flats / cos ϕ `             ¢` a =
L_flats tan ϕ `
:::

Irregular Polygon

::: indented
![Irregular Polygon][]Area

:::::: indented
Find vertex coordinates, listed in a counter-clockwise order: (x1, y1), (x2,
y2), …, (xn, yn). Then:

¢` A = 1//2 (x_1 y_2 - x_2 y_1 + x_2 y_3 - x_3 y_2 + … + x_n y_1 - x_1 y_n) `
::::::
:::

Circle![Circle][]

::: indented
¢` P = π D = 2 π r `              ¢` A = π r² = (π D²)/4 `
:::

Ellipse

::: indented
¢` A = π a b `![Ellipse][]

Circumference. No closed formula exists, so we have approximations and series
expansions. 

:::::: indented
¢` h = (a - b)² / (a + b)² `

¢` P ≅ π (a+b) (1 + 3h / ( 10 + √(4-3h))) `       (Ramanujan 1914)

¢` P = π (a + b) (1 + 1//4 h + \displaystyle \sum_(i=2)^∞ ((2i - 3)!! /
(2i)!!)^2 h^i) `    (Bessel 1825)
::::::
:::

Hollow circle

::: indented
¶
:::

Circular Sector![Circlular sector][]

::: indented
¢` L = r θ `        ¢` c = 2 r sin(θ//2) `      ¢` A = 1//2 r² θ `     
:::

Circular Segment

::: indented
¢` L = r θ `

¢` c = 2 r sin(θ//2) = 2 r_p tan (1//2 θ) = 2 √(r² - r_p²) = 2 √(h (2 r - h))
`![Circlular segment][]

¢` r_p = r - h = r cos(1//2 θ) = 1//2 c cot(1//2 θ) = 1//2 √(4 r² - c²) `

¢` θ = L/r = 2 cos⁻¹(r_p/r) = 2 tan⁻¹(c /(2 r_p)) = 2 sin⁻¹(c/(2r)) `

¢` A = 1//2 r² (θ - sin θ) = 1//2 (r L - r_p c) = r² cos⁻¹(r_p/r) - r_p √(r² -
r_p²) = r² cos⁻¹((r - h)/r) - (r - h)·√(2 r h - h²) `
:::

Elliptical Sector![Elliptical sector][]

::: indented
¢` A = F(θ_1) - F(θ_0) `, where:

¢` F(θ) = (a b)/2 (θ - tan⁻¹(((b-a) sin(2 θ)) / (b² cos²θ + a²sin²θ))) `
:::

¶

¶

¶

¶

¶


[Triangle]: ¢` draw()
    title "Triangle"
    frame 150, 120, "right"
    view -1.1, 1.1, -0.2, 0.8
    fill "#D9F2FB"
    path [-1, 0; 0.3, 0.7; 1, 0; -1, 0]
    line [0.3, 0; 0.3, 0.7]
    text [0, 0], "a", "below"
    text [0.3, 0.3], "h", "left"
    text [-0.3, 0.4], "b", "left"
    text [0.6; 0.4], "c", "right"
    text [-0.8, -0.02], "θ", "aboveright"
    text [0.95, -0.02], "θ~1~", "aboveleft"
end `

[Equilateral Triangle]: ¢` draw()
    title "Equilateral Triangle"
    frame 150, 120, "right"
    view -1.1, 1.1, -0.3, 1.9
    fill "#D9F2FB"
    path [-1, 0; 0, 1.732; 1, 0; -1, 0]
    line [0, 0; 0, 1.732]
    text [0, 0], "a", "below"
    text [0.3, 0.7], "h", "left"
    text [-0.5, 0.9], "a", "left"
    text [-0.8, -0.02], "θ", "aboveright"
end `

[Isosceles Triangle]: ¢` draw()
    title "Isosceles Triangle"
    frame 150, 120, "right"
    view -1.1, 1.1, -0.3, 1.82
    fill "#D9F2FB"
    path [-0.7, 0; 0, 1.8; 0.7, 0; -0.7, 0]
    line [0, 0; 0, 1.8]
    text [0, 0], "a", "below"
    text [0.3, 0.7], "h", "left"
    text [-0.3, 0.9], "b", "left"
    text [0.3; 0.9], "b", "right"
    text [-0.6, -0.02], "θ", "aboveright"
    text [0.6, -0.02], "θ", "aboveleft"
end `

[Trapezoid]: ¢` draw()
    title "Trapezoid"
    frame 120, 90, "right"
    view -1.1, 1.1, -0.35, 1.4
    fill "#D9F2FB"
    path [-1, 0; -0.5, 1.1; 0.4, 1.1; 1, 0; -1, 0]
    line [-0.2, 0; -0.2, 1.1]
    text [0, 1.1], "a", "above"
    text [-0.2, 0.6], "h", "right"
    text [0, 0], "b", "below"
end `

[Regular polygon]: ¢` draw()
    title "Regular polygon"
    frame 130, 140, "right"
    view -0.6, 0.6, -0.5
    fill "#D9F2FB"
    path [0, 0.7694; 0.4045, 0.4755; 0.25, 0; -0.25, 0; -0.4045, 0.4755; 0, 0.7694]
    text [-0.3, 0.2], "a", "left"
    text [0, 0.7694], "θ", "below"
end `

[Irregular Polygon]: data:image/png;base64,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
{.right width=180 alt="Irregular Polygon"}

[Circle]: ¢` draw()
    title "Circle"
    frame 100, 100, "right"
    view -1.1, 1.1, -1.1
    fill "#D9F2FB"
    circle [0, 0], 1
    line [0, 0; 1, 0]
    text [0.4, 0], "r", "above"
end `

[Ellipse]: ¢` draw()
    title "Ellipse"
    frame 150, 75, "right"
    view -1.1, 1.1, -0.55
    fill "#D9F2FB"
    ellipse [0, 0], 1, 0.5
    line [0, 0; 1, 0]
    line [0, 0; 0, 0.5]
    text [0.4, 0], "a", "above"
    text [0, 0.25], "b", "left"
end `

[Circlular sector]: ¢` draw()
    title "Circlular sector"
    frame 100, 100, "right"
    view -0.8, 0.8, 0
    fill "#D9F2FB"
    path [0, 0, 0; 0.7071, 0.7071, 0;-0.7071, 0.7071, 1; 0, 0, 0]
    line [-0.7071, 0.7071; 0.7071, 0.7071]
    text [0.4, 0], "r", "above"
    text [0, 0.65], "c", "above"
    text [0, 1], "L", "above"
    text [0, 0], "θ", "above"
end `

[Circlular segment]: ¢` draw()
    title "Circlular segment"
    frame 100, 100, "right"
    view -0.8, 0.8, 0
    fill "#D9F2FB"
    line [0, 0; 0.7071, 0.7071]
    line [0, 0; -0.7071, 0.7071]
    path [0.7071, 0.7071, 0; -0.7071, 0.7071, 1; 0.7071, 0.7071, 0]
    line [-0.7071, 0.7071; 0.7071, 0.7071]
    line [0, 0.7071; 0, 1]
    text [0.4, 0], "r", "above"
    text [-0.25, 0.8], "c", "below"
    text [-0.05, 0.85], "h", "right"
    text [-0.4, 0.9], "L", "above"
    text [0, 0], "θ", "above"
end `

[Elliptical sector]: ¢` draw()
    title "Elliptical sector"
    frame 200, 100, "right"
    view -1.4, 1.4, -0.7
    ellipse [0, 0], 1, 0.5
    line [-1.2, 0; 1.2, 0]
    line [0, -0.7; 0, 0.7]
    text [0.9, 0.1], "a", "belowright"
    text [-0.05, 0.6], "b", "right"
    line [0, 0; 0.91, 0.2]
    text [0.9, 0.2], "θ~0~", "right"
    line [0, 0; 0.31, 0.47]
    text [0.25, 0.55], "θ~1~", "right"
end `
