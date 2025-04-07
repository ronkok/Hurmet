---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

::: hidden
¢` format = "h3" `

¢` w = 252 lbf/ft `

¢` L = 9.4 ft `

¢` F_y = 36 ksi `

¢` t_w = 0.2 in `

¢` d = 6 in `

¢` Ω_v = 1.67 `
:::

# Why Hurmet?

_[Hurmet](../index.html)_ is a rich-text editor that can perform and display live calculations.
Why use Hurmet instead of some other calculation method?

## Reason #1: Correctness

Picture this situation: You are an engineer, doing a calculation in a
spreadsheet. It’s really, really important that the result is correct. In the
spreadsheet, you look at the result of your calculation and you see something
like looks like this:  $\boxed{2.78}$

When you wrote the formula for that calculation, did you make any mistakes? When
the spreadsheet plugged in a value for a variable, did it plug in the correct
value? Are you sure? Don’t you want to check?

Hurmet solves this problem. With Hurmet, the formula is always visible, even in
the printed output. So are all the values that Hurmet assigns to variables. So
your calculation now looks like this:

¢` M = (w L²)/8 = ?? k·ft `

With Hurmet, you get to see what your calculation is doing. So you can get it
right.

## Reason #2: Communication

An engineering calculation is not complete when you have demonstrated a result
to yourself. You must also communicate your work to others. Among those others are:

* the designer with whom you are working
* the designer’s checker
* your checker
* the engineer-of-record (who may or may not be the same person as your checker)
* the official who issues a building permit
* yourself, five years from now when the client wants a modification

Everyone on that list is busy. They don’t have time to finish work that is only
partly written down. They don’t have time to decipher cryptic comments. You
need to be complete. You need to be clear.

You need to convey the calculations you have done and the values you have used.
The work should be annotated with descriptions that guide the reader through
your chain of thought. A calculation should be at least as detailed as this
snippet:

::: indented
Check shear

:::::: indented
¢` V = (w L)/2 = ?? kips `, shear

¢` V_allow = 1//Ω_v·0.6 F_y t_w d = ?? kips `¢` {"> V, ok" if V_allow > V;
\red("< V, ng") otherwise} = @ `
::::::
:::

## Reason #3: Unit-Aware Calculations

In 1983, Air Canada Flight 143 ran out of fuel in midair. It had refueled
incorrectly because a calculation contained a unit-conversion error. Before you
scoff, know that this sort of thing can easily slip into a calculation. It’s a
problem.

Hurmet calculations can include units-of-measure. And it does unit conversions
automatically. If you want to mix metric and imperial units, go ahead. Then
specify that the result be written in units of your choice.  Let
unit-conversion errors be a thing of the past.

::: indented
¢` 200 'lbf/ft'· 100 'm/min'· 2 'hrs' = ?? kN `
:::

Incompatible units return an error message: 

::: indented
¢` 2 'meters' + 3 'hours' = ?? `
:::

## Reason #4: Rapid Adjustment

Need to make a change? No problem. Re-define a variable with a new value. Hurmet
will immediately recalculate all the dependencies.

## Reason #5: Chatbot Coordination

Hurmet makes it easy to co-author with a chatbot. Hurmet’s native file format is
Markdown, a light-weight markup format. Chatbots know Markdown well. Just tell
your chatbot to write its work in Markdown. Then copy it and paste into your
document with Ctrl-V.
