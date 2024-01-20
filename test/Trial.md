---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

This is editable text. You can focus it and start[^1] typing. All[^2]
calculations will update if you press **Enter** to close a calculation cell.

This week’s example:

### Simple span beam

¢` L = 12 'feet' `, length

¢` w = 110 'lbf/ft' `, uniform line load

¢` P = 1000 'lbf' `, mid-span point load

¢` V = (w L)/2 + P/2 = ?? lbf `, maximum shear

¢` M = (w L^2)/8 + (P L)/4 = ?? lbf-ft `, max bending moment

## Drawings

Hurmet’s _draw_ environment enables function plotting. For instance, to get a
sine wave, one can write the following code into a math zone:

+===============================+============+
| ```                           | ![sin x][] |
| draw()                        |            |
|     title "sin x"             |            |
|     frame 250, 150            |            |
|     view -5, 5, -3            |            |
|     axes 2, 1, "labels"       |            |
|     strokewidth 2             |            |
|     plot sin(x), 51           |            |
|     text [1.6, 1.35], "sin x" |            |
| end                           |            |
| ```                           |            |
+-------------------------------+------------+
{.nogrid colWidths="298 null"}


[^1]: Now is the time for all _good_ men to come to **aid** of their party.

[^2]: When in doubt, scratch your head.

[sin x]: ¢` draw()
    title "sin x"
    frame 250, 150
    view -5, 5, -3
    axes 2, 1, "labels"
    strokewidth 2
    plot sin(x), 51
    text [1.6, 1.35], "sin x"
end `
