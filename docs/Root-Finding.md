---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

## Root Finding

For finding roots of a function, ¢` f `.

Bisection method

::: indented
Slow but sure. Select ¢` a ` and ¢` b ` such that ¢` f(a) ` and ¢` f(b) ` have
opposite signs. The optional argument ε  enables you to define a desired
precision.
:::

¢` function bisection(f, a, b; ε = 1e-15)
    fa = f(a)
    fb = f(b)
    if fa × fb > 0 throw "Error. Invalid starting bracket."
    while true
        x = (a + b) / 2
        fx = f(x)
        if |fx| ≤ ε return x
        if sign(fa) == sign(fx)
            a = x
        else
            b = x
        end
    end
end `

Newton’s method

::: indented
Much faster than bisection when it works. Sometimes it does not converge. It’s
not a good idea to use Newton’s method for a periodic function. It will freeze
the browser tab.

Input the function _f_, its first derivative _f_ ′, and a starting guess. The
_ε_  is optional.
:::

¢` function newton(f, fPrime, guess; ε = 1e-15)
    x = guess
    while true
        fx = f(x)
        if |fx| ≤ ε return x
        x = x - fx / fPrime(x)
    end
end `

Brent’s method

::: indented
Converges faster than bisection. Sure to find a result, so long as the function
is continuous.\
Select ¢` a ` and ¢` b ` such that ¢` f(a) ` and ¢` f(b) ` have opposite signs.

Adapted from John D Cook: [Three Methods for Root-finding in C#][1]

¢` function brent(f, a, b; ε = 1e-15)
    fa = f(a)
    fb = f(b)
    if fa × fb > 0 throw "Error. Invalid starting bracket."
    c = a
    fc = fa
    e = b - a
    d = e
    while true
        if |fb| ≤ ε return b
        if (fb > 0.0 and fc > 0.0) or (fb ≤ 0.0 and fc ≤ 0.0)
            c = a
            fc = fa
            e = b - a
            d = e
        end
        if |fc| < |fb|
            a = b
            b = c
            c = a
            fa = fb
            fb = fc
            fc = fa
        end
        tol = 2 ε · |b| + ε
        m = 0.5 · (c - b)  # error estimate
        if |m| > tol and fb ≠ 0.0
            if |e| < tol or |fa| ≤ |fb|
                # Use bisection
                e = m
                d = e
            else
                s = fb / fa
                if a == c
                    # linear intepolation
                    p = 2 m s
                    q = 1.0 - s
                else
                    # Inverse quadratic interpolation
                    q = fa / fc
                    r = fb / fc
                    p = s * (2 m q * (q - r) - (b - a) * (r - 1.0))
                    q = (q - 1.0) * (r - 1.0) * (s - 1.0)
                end
                if p > 0.0
                    q = -q
                else
                    p = -p
                end
                s = e
                e = d
                if 2 p < 3 m q - |tol * q| and p < |0.5 s q|
                    d = p / q
                else
                    e = m
                    d = e
                end
            end
            a = b
            fa = fb
            if |d| > tol
                b = b + d
            elseif m > 0.0
                b = b + tol
            else
                b = b - tol
            end
            fb = f(b)
        else
          return b
        end
    end
end `
:::

## Examples

You can pass a function as an argument to another function. One way to do that
is with arrow notation, e.g., ¢` x → cos x `. (Note: `->` will auto-correct into →)

Use bisection to find a root of ¢` cos x `.

::: indented
¢` x = bisection(x → cos x, 1, 2) = % `
:::

Use Newton’s method to find the cube root of five.

::: indented
¢` x = newton(x → x³ - 5, y → 3 y², 1) = ? `
:::

Use Brent’s method to find a root of ¢` cos x `

::: indented
¢` x = brent(x → cos x, 1, 2) = ? `
:::

## Remote Module

I’ve saved these three functions in a GitHub Gist, so you can call them without
having to copy them into your document.

First, open a math zone (Alt-C) and copy in this code:

```
findRoot = import("https://gist.githubusercontent.com/ronkok/a6c48bbb3b65c973d7cee69f2735c42f/raw/rootFinding.txt") = !
```

Then call a function like this example:

::: indented
¢` x = findRoot.newton(x → x³ - 5, y → 3 y², 1) = ? `
:::

[1]: https://www.codeproject.com/Articles/79541/Three-Methods-for-Root-finding-in-C
