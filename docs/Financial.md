---------------
decimalFormat: 1,000,000.
fontSize: 12
pageSize: letter
---------------

Terms

::: indented
¢`P`: principal\
¢`FV`: future value\
¢`PV`: present value\
¢`PMT`: payment\
¢`k`: number of payments per year\
¢`n`: number of years\
¢`r`: interest rate
:::

Loan Amortization

::: indented
¢` P = PMT × {(1-(1 + r∕k)^(n k))/(r∕k) if r ≠ 0; n k otherwise} `
:::

Future value of periodic payments

1.  Payment due at end of periods\
   ¢` FV = PV (1+r//k)^(n k) + PMT ((1 + r∕k)^(n k) - 1)/(r∕k)) `

2.  Payment due at beginning of period\
   ¢` FV = PV (1+r//k)^(n k) + PMT ((1 + r∕k)^(n k))/(r∕k))(1 + r/k) `

3.  if ¢` r= 0 `\
   ¢` FV = PV + PMT × n k `


¢` Compound interest method `

1.  ¢` FV = PV × (1 + r//k)^(n k) `, where ¢` r ` is the nominal rate

2.  ¢` FV = PV × (1 + R)^n `, where ¢` R ` is the effective rate


Equal repayment of principal

1.  ¢` PMT_j = P × (1 + (n k - j + 1) r)/(n k) `

2.  ¢` FV_j = P × (1 - j/(n k) `, where ¢` j ` is the number of periods


¶