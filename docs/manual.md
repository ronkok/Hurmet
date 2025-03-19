<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Hurmet Manual</title>
   <link rel="manifest" href="/app.webmanifest">
   <link rel="icon" href="/images/favicon.svg">
   <link rel="stylesheet" href="/docStyles.min.css">
   <script>const currencyExchangeRates = { AUD: "1.7237", BGN: "1.9558", BRL: "6.2683", CAD: "1.5691", CHF: "0.9641", CNY: "7.8822", CZK: "25.014", DKK: "7.4601", EUR: "1.0", GBP: "0.84183", HKD: "8.4635", HUF: "399.48", IDR: "17811.63", ILS: "4.0019", INR: "94.6655", ISK: "145.90", JPY: "161.88", KRW: "1582.87", MXN: "21.7571", MYR: "4.8418", NOK: "11.6200", NZD: "1.8985", PHP: "62.372", PLN: "4.1723", RON: "4.9768", SEK: "11.0538", SGD: "1.4536", THB: "36.658", TRY: "39.9381", USD: "1.0889", ZAR: "19.7832" }</script>
</head>

<body>
<main>

# Hurmet Reference Manual

## Introduction

_Hurmet_ is a rich-text editor that gives you the ability to create high
quality calculation documents using standard math notation.

Hurmet calculations are much easier to read and check than spreadsheet
calculations. Hurmet does not hide the active expressions and intermediate
values of a calculation. They’re all open for review in the displayed document.

You are welcome to use the [Hurmet.org][] web page under terms of the
[MIT License][]. The source code is available in Hurmet’s GitHub
[repository][].

[Hurmet.org]: index.html
[MIT License]: https://opensource.org/licenses/MIT/
[repository]: https://github.com/ronkok/Hurmet

### Editor Basics

Hurmet provides rich-text editing capabilities. You can apply styles to a
document range by selecting text, then clicking one of the menu bar buttons:

+:-------------------------------------+:-----------------------------------+
| **≡**                                | Navigate…                          |
+--------------------------------------+------------------------------------+
| \                                    | Open…, Save…, Save as…, \          |
| **File▾**                            | Create a permalink URL,\           |
|                                      | Take a snapshot, Show diff, \      |
|                                      | Set Page Size, Print               |
+--------------------------------------+------------------------------------+
| \                                    | Set Decimal, Font size, \          |
| **Doc▾**                             | Draft Mode, Print header, \        |
|                                      | Delete all comments                |
+--------------------------------------+------------------------------------+
| ![recalc][] ` `                      | Recalculate all                    |
+--------------------------------------+------------------------------------+
| ![undo][]  ![redo][]                 | Undo, Redo                         |
+--------------------------------------+------------------------------------+
| **B**  **_I_**  ![embed][]           | Character styles:\                 |
| **X~2~** **X^2^**                    | Bold, Italic, Code, Subscript,     |
| ![strikethrough][]  **<u>U</u>**     | Superscript, Strikethrough,        |
|                                      | Underline                          |
+--------------------------------------+------------------------------------+
| ![link][] **—** ![upload][]          | Insert:\                           |
| ![image][] ![footnote][] ToC ![C][]  | Link…, Horizontal rule, Uploaded   |
| ![T][] ![scroll][]  ![comment][]     | image…, Link to image…, Footnote,  |
|                                      | Table of Contents…, Calculation…,  |
|                                      | TeX…, Macro expansion, Comment…    |
+--------------------------------------+------------------------------------+
| **¶** ![embed][] **H1 H2**           | Block styles:\                     |
| ![list][] ![numbered list][]         | Plain paragraph, Code block,       |
| ![quotes][] Centered Indented        | Headings, List, Ordered list,      |
| Boxed Note Tip Important Warning ⬚   | Centered Indented Boxed Note       |
|                                      | Important Warning Select Parent    |
+--------------------------------------+------------------------------------+
| ![table][] ![insert-row][]           | Table:\                            |
| ![insert-column][] ![delete-table][] | Insert table, Insert row, Insert   |
| ![delete-row][] ![delete-column][]   | column, Delete table, Delete row,  |
| ![merge][] ![table-caption][]        | Delete column, Toggle cell merge,  |
| ![align-left][] ![align-center][]    | Toggle table caption, Align left,  |
| ![align-right][] Tbl Style           | Align center, Align right,         |
| ![spreadsheet][]                     | Set table style, Toggle spreadsheet|
+--------------------------------------+------------------------------------+
| ![information][]                     | Information                        |
+--------------------------------------+------------------------------------+

[recalc]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 9a7.982 7.982 0 0 0 2.709 6l1.323-1.5a6 6 0 1 1 8.212-8.743L10.001 7h6V1l-2.343 2.343A8 8 0 0 0 .001 9z'/%3E%3C/svg%3E
[undo]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M11.904 16C13.681 12.781 13.98 7.87 7 8.034V12L1 6l6-6v3.881c8.359-.218 9.29 7.378 4.904 12.119z'/%3E%3C/svg%3E
[redo]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M9 3.881V0l6 6-6 6V8.034C2.02 7.87 2.319 12.781 4.096 16-.29 11.259.641 3.663 9 3.881z'/%3E%3C/svg%3E
[embed]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='m9 11.5 1.5 1.5 5-5-5-5L9 4.5 12.5 8zM7 4.5 5.5 3l-5 5 5 5L7 11.5 3.5 8z'/%3E%3C/svg%3E
[strikethrough]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M16 8v1h-3.664c.43.602.664 1.292.664 2 0 1.107-.573 2.172-1.572 2.921C10.501 14.617 9.283 15 8 15s-2.501-.383-3.428-1.079C3.573 13.172 3 12.107 3 11h2c0 1.084 1.374 2 3 2s3-.916 3-2-1.374-2-3-2H0V8h4.68a3.003 3.003 0 0 1-.108-.079C3.573 7.172 3 6.107 3 5s.573-2.172 1.572-2.921C5.499 1.383 6.717 1 8 1s2.501.383 3.428 1.079C12.427 2.828 13 3.893 13 5h-2c0-1.084-1.374-2-3-2s-3 .916-3 2 1.374 2 3 2c1.234 0 2.407.354 3.32 1H16z'/%3E%3C/svg%3E
[link]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M6.879 9.934a.81.81 0 0 1-.575-.238 3.818 3.818 0 0 1 0-5.392l3-3C10.024.584 10.982.187 12 .187s1.976.397 2.696 1.117a3.818 3.818 0 0 1 0 5.392l-1.371 1.371a.813.813 0 0 1-1.149-1.149l1.371-1.371A2.19 2.19 0 0 0 12 1.812c-.584 0-1.134.228-1.547.641l-3 3a2.19 2.19 0 0 0 0 3.094.813.813 0 0 1-.575 1.387z'/%3E%3Cpath d='M4 15.813a3.789 3.789 0 0 1-2.696-1.117 3.818 3.818 0 0 1 0-5.392l1.371-1.371a.813.813 0 0 1 1.149 1.149l-1.371 1.371A2.19 2.19 0 0 0 4 14.188c.585 0 1.134-.228 1.547-.641l3-3a2.19 2.19 0 0 0 0-3.094.813.813 0 0 1 1.149-1.149 3.818 3.818 0 0 1 0 5.392l-3 3A3.789 3.789 0 0 1 4 15.813z'/%3E%3C/svg%3E
[upload]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M7 9h2V5h3L8 1 4 5h3zm3-2.25v1.542L14.579 10 8 12.453 1.421 10 6 8.292V6.75L0 9v4l8 3 8-3V9z'/%3E%3C/svg%3E
[image]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='m14.998 2 .002.002v11.996l-.002.002H1.002L1 13.998V2.002L1.002 2h13.996zM15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z'/%3E%3Cpath d='M13 4.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 13 4.5zM14 13H2v-2l3.5-6 4 5h1L14 7z'/%3E%3C/svg%3E
[cap]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='m14.998 2 .002.002v11.996l-.002.002H1.002L1 13.998V2.002L1.002 2h13.996zM15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z'/%3E%3Cpath d='M13 4.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 13 4.5zM14 13H2v-2l3.5-6 4 5h1L14 7z'/%3E%3C/svg%3E
[C]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' height='16' width='16'%3E%3Cpath d='M14.8 12.3c.9.2 0 1.1-.4 1.4-.7.6-1.4 1-2.2 1.5-1.8.8-3.8 1-5.8.5a7 7 0 0 1-4.3-2.9 8 8 0 0 1-1.2-5c-.1-2.2.8-4.6 2.6-6.1A8 8 0 0 1 8 0a6 6 0 0 1 2.7.4c.8.4 1.8.6 2.7.6.5-.2.4-1.4 1.1-.9.2.4 0 .8.1 1.1v3.7c-.4.8-1-.3-1.1-.8A6.3 6.3 0 0 0 9.6 1c-1-.2-2.3-.1-3 .7-1.4 1.4-1.7 3.4-1.9 5.2-.1 2.1.1 4.3 1 6.1.7 1.2 2 2 3.3 1.9 2 0 4-1 5.5-2.5l.3-.1ZM5.5 1.7c.4-.3.3-.5-.1-.2-1.5.7-2.7 1.9-3.3 3.4a8.5 8.5 0 0 0-.2 5.3 6 6 0 0 0 3.2 4.2c.4.2 1.3.7.7 0-1.2-1.2-1.6-3-1.8-4.6V6c.3-1.5.6-3 1.5-4.2Zm8 1c.2.3.4.3.3 0v-1c-.3.2-.7 0-1 .1.1.4.4.6.7.9z'/%3E%3C/svg%3E
[T]: data:image/svg+xml;utf8,%3Csvg height='16' width='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M.8 4.5V.3c.1-.5.6-.2 1-.3h12.8c.4.2.2.7.3 1v3.5c-.4.7-1.1-.1-1-.7a4 4 0 0 0-2.7-2.7C10.8 1 9.8.6 9.7 1v12.8c0 .8.3 1.5 1.2 1.3.6-.2 1.6.5.8.9H3.9c-.8-.6.4-1 1-.9 1 .2 1-.8 1-1.6V.8c-1.2.2-2.6.5-3.4 1.5-.7.7-.8 1.6-1 2.4-.2.2-.6.1-.7-.2ZM2.6 1c.4-.2.3-.2 0-.2h-1V2ZM9 7.8v-7H6.8l-.1 13.5c.1.4-.4 1 .2.9H9c-.3-.5.1-1.2 0-1.7Zm4.8-6.1c.1 0 .4.5.3 0V.9h-1.3l1 .9z'/%3E%3C/svg%3E
[scroll]: data:image/svg+xml;utf8,%3Csvg height='16' width='16' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M426.667 0c-46.933 0-85.333 38.4-85.333 85.333V192c0 12.8 8.533 21.333 21.333 21.333h128c12.8 0 21.333-8.533 21.333-21.333V85.333C512 38.4 473.6 0 426.667 0zm42.666 170.667H384V85.333c0-23.467 19.2-42.667 42.667-42.667s42.667 19.2 42.667 42.667v85.334zM362.667 384c-12.8 0-21.333 8.533-21.333 21.333v21.333c0 12.8 8.533 21.333 21.333 21.333S384 439.467 384 426.667v-21.333c0-12.801-8.533-21.334-21.333-21.334z M362.667 405.333c-12.8 0-21.333 8.533-21.333 21.333 0 23.467-19.2 42.667-42.667 42.667S256 450.133 256 426.667v-21.333c0-12.8-8.533-21.333-21.333-21.333-12.8 0-21.333 8.533-21.333 21.333v21.333c0 46.933 38.4 85.333 85.333 85.333S384 473.6 384 426.667c0-12.8-8.533-21.334-21.333-21.334z M426.667 0h-320c-36.267 0-64 27.733-64 64v341.333c0 12.8 8.533 21.333 21.333 21.333s21.333-8.533 21.333-21.333V64c0-12.8 8.533-21.333 21.333-21.333H352c-6.4 12.8-10.667 27.733-10.667 42.667v320c0 12.8 8.533 21.333 21.333 21.333S384 418.133 384 405.333v-320c0-23.467 19.2-42.667 42.667-42.667C454.4 42.667 454.4 0 426.667 0z M298.667 469.333c-23.467 0-42.667-19.2-42.667-42.667v-21.333c0-12.8-8.533-21.333-21.333-21.333H21.333C8.533 384 0 392.533 0 405.333v21.333C0 473.6 38.4 512 85.333 512h213.333c27.734 0 27.734-42.667.001-42.667zm-213.334 0c-23.467 0-42.667-19.2-42.667-42.667h170.667c0 14.933 4.267 29.867 10.667 42.667H85.333zM192 106.667h-42.667C136.533 106.667 128 115.2 128 128s8.533 21.333 21.333 21.333H192c12.8 0 21.333-8.533 21.333-21.333S204.8 106.667 192 106.667zM277.333 192h-42.667c-12.8 0-21.333 8.533-21.333 21.333 0 12.8 8.533 21.333 21.333 21.333h42.667c12.8 0 21.333-8.533 21.333-21.333.001-12.8-8.533-21.333-21.333-21.333zM277.333 106.667H256c-12.8 0-21.333 8.533-21.333 21.333S243.2 149.333 256 149.333h21.333c12.8 0 21.333-8.533 21.333-21.333s-8.533-21.333-21.333-21.333zM192 277.333h-42.667c-12.8 0-21.333 8.533-21.333 21.333 0 12.8 8.533 21.333 21.333 21.333H192c12.8 0 21.333-8.533 21.333-21.333 0-12.799-8.533-21.333-21.333-21.333zM277.333 277.333H256c-12.8 0-21.333 8.533-21.333 21.333 0 12.8 8.533 21.333 21.333 21.333h21.333c12.8 0 21.333-8.533 21.333-21.333.001-12.799-8.533-21.333-21.333-21.333zM149.333 192c-12.8 0-21.333 8.533-21.333 21.333 0 12.8 8.533 21.333 21.333 21.333 12.8 0 21.333-8.533 21.333-21.333.001-12.8-8.533-21.333-21.333-21.333z'/%3E%3C/svg%3E
[math]: https://en.wikibooks.org/wiki/LaTeX/Mathematics
[advanced math]: https://en.wikibooks.org/wiki/LaTeX/Advanced_Mathematics
[home page]: https://temml.org/
[supported-functions]: https://temml.org/docs/en/supported.html
[indent]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 1h16v2H0zm6 3h10v2H6zm0 3h10v2H6zm0 3h10v2H6zm-6 3h16v2H0zm0-2V5l4 3z'/%3E%3C/svg%3E
[list]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 0h4v4H0zm6 1h10v2H6zM0 6h4v4H0zm6 1h10v2H6zm-6 5h4v4H0zm6 1h10v2H6z'/%3E%3C/svg%3E
[numbered list]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M6 13h10v2H6zm0-6h10v2H6zm0-6h10v2H6zM3 0v4H2V1H1V0zM2 8.219V9h2v1H1V7.719l2-.938V6H1V5h3v2.281zM4 11v5H1v-1h2v-1H1v-1h2v-1H1v-1z'/%3E%3C/svg%3E
[quotes]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3.516 7a3.5 3.5 0 1 1-3.5 3.5L0 10a7 7 0 0 1 7-7v2a4.97 4.97 0 0 0-3.536 1.464 5.01 5.01 0 0 0-.497.578c.179-.028.362-.043.548-.043zm9 0a3.5 3.5 0 1 1-3.5 3.5L9 10a7 7 0 0 1 7-7v2a4.97 4.97 0 0 0-3.536 1.464 5.01 5.01 0 0 0-.497.578c.179-.028.362-.043.549-.043z'/%3E%3C/svg%3E
[comment]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 1024 1024'%3E%3Cpath d='M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z'/%3E%3C/svg%3E
[footnote]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3.032 13l0.9-3h4.137l0.9 3h1.775l-3-10h-3.488l-3 10h1.776zM5.432 5h1.137l0.9 3h-2.937l0.9-3zM11 13l2.5-4 2.5 4h-5z M13.5 2h-1c-0.276 0-0.5-0.224-0.5-0.5s0.224-0.5 0.5-0.5h2c0.276 0 0.5-0.224 0.5-0.5s-0.224-0.5-0.5-0.5h-2c-0.827 0-1.5 0.673-1.5 1.5 0 0.384 0.145 0.734 0.383 1 0.275 0.307 0.674 0.5 1.117 0.5h1c0.276 0 0.5 0.224 0.5 0.5s-0.224 0.5-0.5 0.5h-2c-0.276 0-0.5 0.224-0.5 0.5s0.224 0.5 0.5 0.5h2c0.827 0 1.5-0.673 1.5-1.5 0-0.384-0.145-0.734-0.383-1-0.275-0.307-0.674-0.5-1.117-0.5z'/%3E%3C/svg%3E
[boxed]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' %3E%3Cpath d='M1 1h14v142h-14zM2 2v13h12v-13z'/%3E%3C/svg%3E
[table]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M17 17v5h2a3 3 0 0 0 3-3v-2h-5Zm-2 0H9v5h6v-5Zm2-2h5V9h-5v6Zm-2 0V9H9v6h6Zm2-8h5V5a3 3 0 0 0-3-3h-2v5Zm-2 0V2H9v5h6Zm9 9.177V19a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v2.823a.843.843 0 0 1 0 .354v7.646a.843.843 0 0 1 0 .354ZM7 2H5a3 3 0 0 0-3 3v2h5V2ZM2 9v6h5V9H2Zm0 8v2a3 3 0 0 0 3 3h2v-5H2Z'/%3E%3C/svg%3E
[insert-row]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M19 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm2.5 5.938a.937.937 0 1 0 0-1.875h-1.25a.312.312 0 0 1-.313-.313V16.5a.937.937 0 1 0-1.875 0v1.25c0 .173-.14.313-.312.313H16.5a.937.937 0 1 0 0 1.875h1.25c.173 0 .313.14.313.312v1.25a.937.937 0 1 0 1.875 0v-1.25c0-.173.14-.313.312-.313h1.25ZM5 2a3 3 0 1 0 0 6h14a3 3 0 0 0 0-6H5Zm0-2h14a5 5 0 0 1 0 10H5A5 5 0 1 1 5 0Z'/%3E%3C/svg%3E
[insert-column]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M19 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm2.5 5.938a.937.937 0 1 0 0-1.875h-1.25a.312.312 0 0 1-.313-.313V16.5a.937.937 0 1 0-1.875 0v1.25c0 .173-.14.313-.312.313H16.5a.937.937 0 1 0 0 1.875h1.25c.173 0 .313.14.313.312v1.25a.937.937 0 1 0 1.875 0v-1.25c0-.173.14-.313.312-.313h1.25ZM2 19a3 3 0 0 0 6 0V5a3 3 0 1 0-6 0v14Zm-2 0V5a5 5 0 1 1 10 0v14a5 5 0 0 1-10 0Z'/%3E%3C/svg%3E
[delete-table]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M19 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-2.5 5.938h5a.937.937 0 1 0 0-1.875h-5a.937.937 0 1 0 0 1.875ZM12.29 17H9v5h3.674c.356.75.841 1.426 1.427 2H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v2.823a.843.843 0 0 1 0 .354V14.1a7.018 7.018 0 0 0-2-1.427V9h-5v3.29a6.972 6.972 0 0 0-2 .965V9H9v6h4.255a6.972 6.972 0 0 0-.965 2ZM17 7h5V5a3 3 0 0 0-3-3h-2v5Zm-2 0V2H9v5h6ZM7 2H5a3 3 0 0 0-3 3v2h5V2ZM2 9v6h5V9H2Zm0 8v2a3 3 0 0 0 3 3h2v-5H2Z'/%3E%3C/svg%3E
[delete-row]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M13.255 15a6.972 6.972 0 0 0-.965 2H5A5 5 0 0 1 5 7h14a5 5 0 0 1 4.671 6.787 7.01 7.01 0 0 0-1.74-1.146A3 3 0 0 0 19 9H5a3 3 0 0 0 0 6h8.255ZM19 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-2.5 5.938h5a.937.937 0 1 0 0-1.875h-5a.937.937 0 1 0 0 1.875Z'/%3E%3C/svg%3E
[delete-column]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M12.641 21.931a7.01 7.01 0 0 0 1.146 1.74A5 5 0 0 1 7 19V5a5 5 0 1 1 10 0v7.29a6.972 6.972 0 0 0-2 .965V5a3 3 0 0 0-6 0v14a3 3 0 0 0 3.641 2.931ZM19 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-2.5 5.938h5a.937.937 0 1 0 0-1.875h-5a.937.937 0 1 0 0 1.875Z'/%3E%3C/svg%3E
[spreadsheet]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M17 22 L 19 22 C20.6569 22 22 20.6569 22 19 L22 7 L 22 5 C 22 3.3431 20.6569 2 19 2 L7 2 L5 2 C 3.3431 2 3 3.3431 2 5 L2 17 L2 19 C 2 20.6569 3.3431 22 5 22 L7 22 Z M24,16.1768671 L24,19 C24,21.7614237 21.7614237,24 19,24 L5,24 C2.23857625,24 2.11453371e-15,21.7614237 1.77635684e-15,19 L0,5 C-3.38176876e-16,2.23857625 2.23857625,2.28362215e-15 5,0 L19,0 C21.7614237,-5.07265313e-16 24,2.23857625 24,5 L24,7.82313285 C24.0122947,7.88054124 24.0187107,7.93964623 24.0187107,8 C24.0187107,8.06035377 24.0122947,8.11945876 24,8.17686715 L24,15.8231329 C24.0122947,15.8805412 24.0187107,15.9396462 24.0187107,16 C24.0187107,16.0603538 24.0122947,16.1194588 24,16.1768671 Z M19 7 H5 V10 H19 Z M19 14 H5 V17 H19 Z'/%3E%3C/svg%3E
[merge]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M2 19a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v14Zm-2 0V5a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5Zm12-9a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1Zm0 6a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1Zm0-13a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1Z'/%3E%3C/svg%3E
[table-caption]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath d='M17,18 L17,22 L19,22 C20.6568542,22,22,20.6568542,22,19 L22,18 L17,18 Z M15,18 L9,18 L9,22 L15,22 L15,18 Z M17,16 L22,16 L22,12 L17,12 L17,16 Z M15,16 L15,12 L9,12 L9,16 L15,16 Z M17,10 L22,10 L22,9 C22,9,22,6,19,6 L17,6 L17,10 Z M15,10 L15,6 L9,6 L9,10 L15,10 Z M24,16.1768671 L24,19 C24,21.7614237,21.7614237,24,19,24 L5,24 C2.23857625,24,0,21.7614237,0,19 L0,9 C0,6,2,4,5,4 L19,4 C21.7614237,4,24,6.23857625,24,9 L24,7.82313285 C24.0122947,7.88054124,24.0187107,7.93964623,24.0187107,8 C24.0187107,8.06035377,24.0122947,8.11945876,24,8.17686715 L24,15.8231329 C24.0122947,15.8805412,24.0187107,15.9396462,24.0187107,16 C24.0187107,16.0603538,24.0122947,16.1194588,24,16.1768671 Z M7,6 L5,6 C3.34314575,6,2,7.34314575,2,9 L2,10 L7,10 L7,6 Z M2,12 L2,16 L7,16 L7,12 L2,12 Z M2,18 L2,19 C2,20.6568542,3.34314575,22,5,22 L7,22 L7,18 L2,18 Z M4,0 H20 V1.75 H4 Z'/%3E%3C/svg%3E
[align-left]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 1h16v2H0zm0 3h10v2H0zm0 6h10v2H0zm0-3h16v2H0zm0 6h16v2H0z'/%3E%3C/svg%3E
[align-center]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 1h16v2H0zm3 3h10v2H3zm0 6h10v2H3zM0 7h16v2H0zm0 6h16v2H0z'/%3E%3C/svg%3E
[align-right]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 1h16v2H0zm6 3h10v2H6zm0 6h10v2H6zM0 7h16v2H0zm0 6h16v2H0z'/%3E%3C/svg%3E
[information]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M7 4.75c0-.412.338-.75.75-.75h.5c.412 0 .75.338.75.75v.5c0 .412-.338.75-.75.75h-.5A.753.753 0 0 1 7 5.25v-.5zM10 12H6v-1h1V8H6V7h3v4h1z'/%3E%3Cpath d='M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z'/%3E%3C/svg%3E

### Save/Open

You can save your work using **Ctrl-S** or the save command in the File menu.
Then reopen it using the File | Open… menu choice. In Chrome and Edge, the
save button is smart enough to re-save your work to the same file you opened earlier. 
In Firefox and Safari, the save button always works like a Save As… button.

### Tracking Changes

The **File▾** menu contains commands that enable you to track changes:

*   _Take a snapshot…_ will store a snapshot of the current document (not including embedded images)
*   _Show diff…_ will display the differences between a chosen snapshot and the current document.
*   _Delete all snapshots…_, for when you no longer need to track changes.

Snapshots and diffs are displayed in Markdown format.

### Print Header

You can create a print header in any document by clicking the File | Print Header menu choice.
Later, when you click the File | Print… menu choice, the header will be printed at the
top of every page (except the cover page). The header is a table and it should
remain a table. Otherwise, edit it any way you want.

If you write `$PAGE` into a print header, Hurmet will print page numbers at
that location. The calculation field `savedate() = @@` will print the date on which the
document was most recently saved.

### Paste

Use **Ctrl-V** to paste into a Hurmet document. Hurmet recognizes either HTML or plain text.
So you can copy and paste from another Hurmet document or from a chatbot. If a chatbot writes
math, instruct it to write in Markdown format. Then the math will paste nicely into Hurmet.

### Macro Expansion

To expand a macro, (1) write the macro name in your document, put the selection
point after the name, and then (2) hit the ![scroll][] button or type **Alt+E**.
Hurmet will replace the macro name with the macro expansion.

To learn how to write macros or how to import macros, see the [macros](#macros) section, below.

### Comments

::: comment
A stitch in time saves nine.
:::

The ![comment][] button enables you to write a comment into the document.

A command in the “Docs” menu will delete all comments in the document.

<br>

### Table of Contents

The **ToC** button creates a Table of Contents at the selection point. The table
will be built from Headings in your document. In the ToC dialog box, you can
choose which heading levels to include.

### Markdown

Hurmet documents are saved in _Markdown_, a lightweight, easy-to-read markup
format. Hurmet's version of Markdown is extended to enable calculations,
complex tables, and more.

<details><summary>Click for more…</summary>

Paragraphs are preceded by a blank line.\
A newline is indicated by a backslash, `\`, at the end of a line.

+------------------------------------------+---------------------------+
| Type…                                    | To get…                   |
+==========================================+===========================+
| `_Italic_`                               | _Italic_                  |
+------------------------------------------+---------------------------+
| `**Bold**`                               | **Bold**                  |
+------------------------------------------+---------------------------+
| `**_Bold Italic_**`                      | **_Bold Italic_**         |
+------------------------------------------+---------------------------+
| `~subscript~`                            | ~subscript~               |
+------------------------------------------+---------------------------+
| `^superscript^`                          | ^superscript^             |
+------------------------------------------+---------------------------+
| `~~strikethrough~~`                      | ~~strikethrough~~         |
+------------------------------------------+---------------------------+
| `` `inline code` ``                      | `inline code`             |
+------------------------------------------+---------------------------+
| ``¢` calcu = la/tion ` `` \              | ¢` calcu = la/tion ` \    |
| `¢¢ "Display Calc" ¢¢`                   | ¢¢ "Display Calc" ¢¢      |
+------------------------------------------+---------------------------+
| `$\TeX$` or ``$`\TeX`$`` \               | ¢` \TeX `                 |
| `$$Display \TeX$$`                       | ¢¢Display \TeX¢¢          |
+------------------------------------------+---------------------------+
| `# Heading 1`                            | # Heading 1               |
+------------------------------------------+---------------------------+
| `## Heading 2`                           | ## Heading 2              |
+------------------------------------------+---------------------------+
| `[Link][link id]`                        | [Link][link id]           |
+------------------------------------------+---------------------------+
| `![alt][id]`                             | ![alt][id]                |
+------------------------------------------+---------------------------+
| `!![image and caption][id]`              | !![image and caption][id] |
+------------------------------------------+---------------------------+
| `[id]: filepath`                         | path to image or link     |
+------------------------------------------+---------------------------+
| `> Blockquote`                           | | Blockquote              |
+------------------------------------------+---------------------------+
| `* List`\                                | * List                    |
| `* List`\                                | * List                    |
| `* List`                                 | * List                    |
+------------------------------------------+---------------------------+
| `1. One`\                                | 1. One                    |
| `2. Two`\                                | 2. Two                    |
| `3. Three`                               | 3. Three                  |
+------------------------------------------+---------------------------+
| `a. Item a`\                             | a. Item a                 |
| `b. Item b`\                             | b. Item b                 |
| `c. Item c`                              | c. Item c                 |
+------------------------------------------+---------------------------+
| `A. Item A`\                             | A. Item A                 |
| `B. Item B`\                             | B. Item B                 |
| `C. Item C`                              | C. Item C                 |
+------------------------------------------+---------------------------+
| ````  ``` ```` \                         | ```                       |
| `#code block` \                          | # code block              |
| `print "Hi!"` \                          | print "Hi!"               |
| ````  ``` ````                           | ```                       |
+------------------------------------------+---------------------------+
|                                          |                           |
| `---------`                              | ------                    |
|                                          |                           |
+------------------------------------------+---------------------------+
| `::: boxed`\                             | ::: boxed                 |
| `Block elements. The attribute` \        | Block elements. The       |
| ``can be `indented`, `centered`,``\      | attribute can be          |
| `` `boxed`, or `header`. ``\             | `indented`,               |
| ``:::``                                  | `centered`, `boxed`, or   |
|                                          | `header`.                 |
|                                          | :::                       |
+------------------------------------------+---------------------------+
| `> [!NOTE]`\                             | > [!NOTE]                 |
| `> Alerts. The attribute can be`\        | > Alerts. The attribute   |
| ``> `NOTE`, `TIP`, `IMPORTANT`, or``\    | > can be `NOTE`, `TIP`,   |
| ``> `WARNING`.``                         | > `IMPORTANT`, or         |
|                                          | > `WARNING`.              |
+------------------------------------------+---------------------------+
{.grid colWidths="380 215"}

Pipe Tables

```
| Head 1  |  Head 2  | Head 3  |
|:--------|:--------:|---------|
| datum 1 | datum 2  | datum 3 |
| datum 4 | datum 5  | datum 6 |
```

Grid tables

```
+-----------+-------------------------+
| Heading 1 |  Merged Heading         |
+:=========:+=========================+
| datum 1   | merged cell             |
+-----------+---------------+---------+
| merged\   | datum 3       | datum 4 |
| cell      +---------------+---------|
|           | datum 5       | datum 6 |
+-----------+---------------+---------+
| datum 7   | * cells can   | datum 8 |
|           | * contain     |         | 
|           | * block       |         |
|           | * elements    |         |
+-----------+---------------+---------+
```

Table in a Figure

```
: Write the caption just above the table, preceded by a :
| Head 1  |  Head 2  | Head 3  |
|:--------|:--------:|---------|
| datum 1 | datum 2  | datum 3 |
| datum 4 | datum 5  | datum 6 |
{.grid float=right}
```

Spreadsheet

```
: sheetName, then the caption
| Head 1  |  Head 2  | Head 3  |
|:--------|:--------:|---------|
| datum 1 | 2300     | =2*B1   |
| datum 4 | 4.3      | "       |
{#sheetname ."grid spreadsheet"}
```

[link id]: http://a.com

[id]: data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='m14.998 2 .002.002v11.996l-.002.002H1.002L1 13.998V2.002L1.002 2h13.996zM15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z'/%3E%3Cpath d='M13 4.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 13 4.5zM14 13H2v-2l3.5-6 4 5h1L14 7z'/%3E%3C/svg%3E

</details>

### TeX

Besides its calculation cells, Hurmet also has cells that emulate the math mode
of ¢` \TeX ` (pronounced _tech_). These cells display, but do not calculate, math.
You can create a TeX cell by clicking the ![T][] button. Type **Enter** to
save the cell.

To create a cell in TeX display mode, create the cell, then re-open it and tap the
“ⅆ” button.

For more information about TeX and LaTeX, good places to start are the Wikibooks
pages for writing [math][] and [advanced math][]; and the Temml [home page][]
and [supported-functions][] page.

Hurmet calculation cells use a different syntax than TeX. In calculation cells,
the syntax is more akin to a programming language, yet it renders like mathematics.

And now, on to the main event, Hurmet’s calculations.

## Calculation Tutorial

<dl class="bold-term">

Create a cell

: Hurmet calculation cells display math and perform numeric calculations. To create
  a calculation cell in  Hurmet.org, select a spot in the document, then click the
  ![C][] button or type **Alt c**.

  While in a cell,\
     **Enter** will close and update the cell.\
     **Shift-Enter** will create a newline inside the cell.\
     **Ctrl-click** on a variable name will go to its definition.\
     **Esc** will close the cell without updating it.\
     Clicking elsewhere will also close the cell.

<div id="statement-container">

Statements

: Inside a calculation cell, we can write an statement and get a numeric result.
  In the demonstration box to the right, try replacing the text with `2 + 2 = ?`.
  Hurmet will render the math and write the result where you place the `?` mark.

</div>

Numbers

: Numbers can be written as integers (33), decimals (2.45), or mixed fractions (3 ⁷⁄₈).
  There is a more detailed description [below](#number).

<div id="arithmetic-container">

Arithmetic

: The symbols: `+ - × / ^ √` are some of Hurmet’s arithmetic operators. Try an
  equation such as `2 × 4 + 3^2/7 = ?`. Play with changes to the values and
  operators to see how they work. See [here](#operators) for more operators.

</div>

Multiplication

: Hurmet accepts several multiplication syntaxes. If ¢` a = 7.1 `, then the
  following all give the same result:

  ::: indented
  ¢`2 × 7.1`\
  ¢`2 * 7.1`\
  ¢`2 · 7.1`\
  ¢`2 ∘ 7.1`\
  ¢`2 a`\
  ¢`(2)(7.1)`
  :::

  To obtain the character ¢` × `, type xx and hit the space bar. Auto-correct
  will give you an ¢`×`.

  A space between variables acts as a multiplication operator.

Roots

: Type `sqrt` and hit the spacebar to auto-correct into `√`.\
  `root 3` and `root 4` will also auto-correct into roots.

Function

: Hurmet treats a word as a function name if it is placed directly before an
  open parenthesis. Example: ¢`sin(π//6) = 0.5`. Hurmet has many
  [built-in functions](#functions).

<div id="variable-container">

Variables

: ¢`L = 3.1`   ← That kind of statement will assign a value to a variable.
  Subsequent cells can then use the variable.<br>Example: `2 L = ?` will result
  in: ¢`2 L = \color(blue)((2))(3.1) \color(black)= 6.2`

  A variable name must be a valid [identifier](#identifiers).

  An assignment statement can also contain a calculation expression. Example:\
  `b = 2 L = ?` will result in ¢` b = 2 L = \color(blue)((2))(3.1) \color(black)= 6.2 `

</div>

Subscripts

: An underscore signals the beginning of a subscript. Examples: `x_left` and
  `y_(i+1)` result in ¢`x_left` and ¢`y_(i+1)`.

Exponents

: A carat signals the beginning of an exponent. Examples: `x^23` and `y^(i+1)`
  result in ¢`x^23` and ¢`y^(i+1)`

<div id="greek-container">

Greek letters

: To write a Greek letter, write the name of the letter and hit the space bar.
  So, `alpha` ↦ α and `beta` ↦ β. More detail [here](#auto-correct).

</div>

Accents and Primes

: To write an accent above a single-letter variable, write the accent name and
  hit the space bar for an auto-correction. Examples:

  ::: indented
  `y bar` ↦ ¢`y̅`\
  `θ hat` ↦ ¢`θ̂`\
  `P vec` ↦ ¢`P⃗`\
  `x dot` ↦ ¢`ẋ`
  :::

  More detail [here](#identifiers).

  To write a prime, type two apostrophes (aka single quotation marks) and hit the
  space bar. So, `f''` will result in ¢`f′`


<div id="q-container">

Units

: After a number, write a Hurmet _unit_ directly after a number, with no intervening
  space, like this: `5meters`, or between two single quotation marks,
  like this: `5 'meters'`. Or, prepend a currency symbol to a number, e.g. `$30`.

Unit-Aware Calcs

: Hurmet can automatically handle unit conversions of quantities. To call for a
  unit-aware calculations, write `??` instead of `?` where you want the result to
  appear. Example:\
  `2 × 3.1m = ?? ft` results in ¢`2 × (3.1m) = 13.1 ft`.

  This is covered in more detail [below](#unit-aware-calculations).

</div>

Result Rounding

: To specify how results are to be rounded, use the format statement. Examples:\
  `format = "f2"`   fixed to 2 places after decimal.\
  `format = "r3"`   rounded to 3 significant digits.\
  `format = "h3"`   like "r3", but doesn’t round integers.\
  More details [below](#rounding-of-results).

Display Mode

: Display mode centers a calculation cell and enlarges summation symbols and
  integration symbols. To get display mode, first set a paragraph to centered,
  then create the cell.

</dl>

## Quick Reference

#### Markup

+---------------+-----------------+------------------------------+-------------------------------+
| Input         | Renders as:     | Input                        | Renders or<br>calculates as:  |
+===============+=================+==============================+===============================+
| `12/25.2`     | ¢`12/25.2`      | `x`                          | ¢`x`                          |
+---------------+-----------------+------------------------------+-------------------------------+
| `(a + b)/c`   | ¢`(a + b)/c`    | `longVarName`                | ¢`longVarName`                |
+---------------+-----------------+------------------------------+-------------------------------+
| `a//b`        | ¢`a//b`         | `"A string."`                | ¢`"A string."`                |
+---------------+-----------------+------------------------------+-------------------------------+
| `a///b`       | ¢`a///b`        | `5 'N.m/s2'`                 | ¢`5 'N.m/s2'`                 |
+---------------+-----------------+------------------------------+-------------------------------+
| `x^23`        | ¢`x^23`         | `(a, b; c, d)`               | ¢`(a, b; c, d)}`              |
+---------------+-----------------+------------------------------+-------------------------------+
| `x^(a+b)`     | ¢`x^(a+b)`      | `[a, b; c, d]`               | ¢`[a, b; c, d]`               |
+---------------+-----------------+------------------------------+-------------------------------+
| `x_subscript` | ¢`x_subscript`  | `{:a, b; c, d:}`             | ¢`{:a, b; c, d:}`             |
+---------------+-----------------+------------------------------+-------------------------------+
| `x_(a+b)`     | ¢`x_(a+b)`      | `[1:4] = ?`                  | ¢`[1; 2; 3; 4]`               |
+---------------+-----------------+------------------------------+-------------------------------+
| `x′`          | ¢`x′`           | `[1:2:5] = ?`                | ¢`[1; 3; 5]`                  |
+---------------+-----------------+------------------------------+-------------------------------+
| `|x|  ‖x‖`    | ¢`|x|˽˽˽‖x‖`    | `{a if b;` \                 | ¢`{a if b; c otherwise}`      |
|               |                 | `c otherwise}`               |                               |
+---------------+-----------------+------------------------------+-------------------------------+
| `A-->note B`  | ¢`A-->note B`   | ``` ``#size	dia	area ``` \   | ¢``` ``#size    	dia	area     |
+---------------+-----------------+ ``         	in 	in² `` \     | 	in 	in²                      |
| `\red("ng")`  | ¢`\red("ng")`   | ``  #3 	0.375  	0.11 ``\     |  #3 	0.375  	0.11             |
|               |                 | ``` #4 	0.5    	0.2 `` ```   |  #4 	0.5	0.2 `` ```           |
+---------------+-----------------+------------------------------+-------------------------------+
{.markup}

Calculation cells also support many of the math-mode TeX functions supported
by [Temml](https://temml.org/docs/en/supported.html). Put function arguments
between parentheses, not braces, as in `\cancel(5)` instead of `\cancel{5}`.

TeX functions are provided for use in displaying math. Not all of them are
valid in calculations.

A few color functions are valid in calculations, but only if their argument is
a string. These are: `\blue`, `\gray`, `\green`, `\orange`, `\pink`, `\purple`,
and `\red`.

#### Auto-correct

Auto-correct kicks in when you type a space inside a math zone.

<div class="auto-correct"></div>

| Type     | Get  | Type         | Get        | Type       | Get     | Type     | Get  |
|----------|------|--------------|------------|------------|---------|----------|------|
| xx       | ×    | sqrt         | √          | Gamma      | Γ       | alpha    | α    |
| .        | ·    | root 3       | ∛          | Delta      | Δ       | beta     | β    |
| ' '      | ′    | x\^2         | x²         | Theta      | Θ       | gamma    | γ    |
| oo       | ∞    | bb M         | 𝐌         | Lambda     | Λ       | delta    | δ    |
| ooo      | °    | bbb E        | 𝔼         | Xi         | Ξ       | epsilon  | ε    |
| `///`    | ∕    | cc P         | 𝒫         | Pi         | Π       | zeta     | ζ    |
| `<=`     | ≤    | \\ceil       | ⎾⏋         | Sigma      | Σ       | eta      | η    |
| `>=`     | ≥    | \\floor      | ⎿⏌         | Phi        | Φ       | theta    | θ    |
| `<>`     | ≠    | `<<`         | ⟨          | Psi        | Ψ       | iota     | ι    |
|          |      | `>>`         | ⟩          | Omega      | Ω       | kappa    | κ    |
| ~=       | ≅    | \^\^         | \∧         | y bar      | y̅      | lambda   | λ    |
| \~~      | ≈    | vv           | ∨          | θ hat      | ¢` θ̂ `  | mu       | μ    |
| \\in     | ∈    | vvv          | ⋁          | P vec      | ¢` P⃗ `  | nu       | ν    |
| \\notin  | ∉    | nn           | ∩          | P harpoon  | ¢` P⃑ `  | xi       | ξ    |
| -=       | ≡    | nnn          | ⋂          | a dot      | ȧ      | pi       | π    |
| :=       | ≔    | uu           | ∪          | a ddot     | ä      | rho      | ρ    |
| -:       | ÷    | uuu          | ⋃          | a grave    | à      | sigma    | σ    |
| +-       | ±    | \\checkmark  | ✓          | a acute    | á      | tau      | τ    |
| -+       | ∓    | \\o          | ø          | a tilde    | ã      | upsilon  | υ    |
| `->`     | →    | \\not        | ¬          | a ring     | å      | phi      | ϕ    |
| `<-`     | ←    | \\xor        | ⊻          | AA         | ∀       | chi      | χ    |
| `<->`    | ↔    | \\sum        | ∑          | EE         | ∃       | psi      | ψ    |
| \\circ   | ∘    | \\int        | ∫          | CC         | ℂ       | omega    | ω    |
| \|\|\|   | ¦    | \\iint       | ∬          | HH         | ℍ       | \\hbar   | ℏ    |
| \\\|     | ‖    | ii           | ¢` √(-1) `  | NN         | ℕ       | \\ell    | ℓ    |
| /_       | ∠    | OO           | ¢` O︀ `      | QQ         | ℚ       | \\euro   | €    |
|          |      | \\c          | ¢          | RR         | ℝ       | \\yen    | ¥    |
|          |      |              |            | ZZ         | ℤ       |          |      |
{.auto-correct}

The font corrections, e.g., `bb …` work on any letter from A to Z or a to z. You can
also make one those letters bold by typing it and then typing **Ctrl+B**.

`-->`, `<--`, and `<-->` will auto correct into extensible arrows, as in:
¢` A ⟶"note" B `.

`<space>` auto-corrects to `˽` in the text editor, which renders as a space.


#### Display Selectors

+------------------+------------------------+--------------------------------------+
| Display selector | Display Selector for   |  Displays:                           |
|                  | Unit-Aware Calculation |                                      |
+:================:+:======================:+======================================+
|        ?         |       ??               | Entire calculation, including        |
|                  |                        | the result and a blue echo of        |
|                  |                        | the expression displaying the        |
|                  |                        | value plugged in to each variable.   |
+------------------+------------------------+--------------------------------------+
|        %         |       %%               | Omits blue echo.                     |
+------------------+------------------------+--------------------------------------+
|        @         |      @@                | Displays only the result, like a     |
|                  |                        | spreadsheet cell.                    |
+------------------+------------------------+--------------------------------------+
|        !         |       !!               | Omits the blue echo and the result.\ |
|                  |                        | Valid only when the result is a data |
|                  |                        | frame.                               |
+------------------+------------------------+--------------------------------------+

<div id="accessor-container">

#### Accessors

+--------------------------------------+-----------------------+-------------------+
| Data Type and Example                | Accessor              | Returns           |
+:=====================================+:======================+:==================+
| string\                              | s[2]\                 | b\                |
| s = "abcde"                          | s[2:4]\               | bce\              |
|                                      | s[3:end]              | cde               |
+--------------------------------------+-----------------------+-------------------+
| Vector\                              | 𝐕[2]\                | 2\                |
| 𝐕 = ¢`[1; 2; 3; 4; 5]`              | 𝐕[2:4]\              | ¢`[2; 3; 4]` \    |
|                                      | 𝐕[3:end]             | ¢`[3; 4; 5]`      |
+--------------------------------------+-----------------------+-------------------+
| Matrix\                              | 𝐌[2, 3]\             | 6\                |
| 𝐌 = ¢`(1, 2, 3; 4, 5, 6; 7, 8, 9)`  | 𝐌[3,:]\              | ¢`[7, 8, 9]` \    |
|                                      | 𝐌[2:3, 1:2]          | ¢`(4, 5; 7, 8)`   |
+--------------------------------------+-----------------------+-------------------+
| Data Frame\                          | DF.B\                 | An entire row\    |
| ¢```DF = ``#name	w	area              | DF["B"]\              | An entire row\    |
|  	in	in²                             | DF.area\              | Column vector\    |
|  A	4	10                              | DF.B.area\            | 22\               |
|  B	6	22                              | DF.area.B\            | 22\               |
|  C	9	59``   ```                      | DF.area.end\          | 59\               |
|                                      | DF["B", "area"]\      | 22\               |
|                                      | DF.w[1]\              | 4\                |
|                                      | DF[["A"; "C"], area]  | [10; 59]          |
+--------------------------------------+-----------------------+-------------------+
| : sheet: Spreadsheet                 | sheet.B2\             | 400 \             |
| | Item | Amt | Dbl   |               | sheet.B or\           | ¢`[500; 400]`     |
| |:-----|----:|-------|               | sheet.Amt             |                   |
| | 1st  | 500 | =2*B1 |               |                       |                   |
| | 2nd  | 400 | "     |               |                       |                   |
| {#sheet ."spreadsheet"}              |                       |                   |
+--------------------------------------+-----------------------+-------------------+
{.grid colWidths="235 210 180"}

</div>

Dot notation can be used only if the property name is a valid [identifier](#identifiers).

## Calculation Forms

Hurmet calculation cells don’t just display math; they compute numerical results.

It’s quite simple to assign a value to a variable:

+-----------------------------------+--------------------+
| Form                              | Examples           |
+===================================+====================+
| ![identifier = value][assignment] | `x = 5`            |
|                                   +--------------------+
|                                   | `L = 3.1 m`        |
|                                   +--------------------+
|                                   | `w = 100 lbf/ft`   |
|                                   +--------------------+
|                                   | name = "James"     |
+-----------------------------------+--------------------+

[assignment]: images/assignment-railroad.svg

To calulate an <span id="expression">expression</span> that contains a variable,
a function, or an operator; write a `?` or `%` or `@` to indicate where the
result should appear. Here are some examples:

| Input                          | Renders as:                                           |
|--------------------------------|-------------------------------------------------------|
| `2 + 2 = ?`                    | ¢`2 + 2 = 4`                                          |
| `2 + 2 = @`                    | ¢`4`                                                  |
| `A = 2 × 4 = ?`                | ¢`A = 2 × 4 = 8`                                      |
| `x = 2 A = ?`                  | ¢`x = 2 A = \color(blue)((2)(8)) \color(black) = 16`  |
| `x = 2 A = %`                  | ¢`x = 2 A = 16`                                       |
| `A = 2m × 4feet = ?? m²`       | ¢`A = 2m × 4 'feet' = 2.4384m²`                       |
{.table-no-wrap}

The statement form is more precisely defined as:

![optional identifier equals expression equals display selector unit name][statement]

[statement]: images/statement-railroad.svg

At the beginning of the statement, you can write an optional variable name.
The result of the calculation will be assigned to that variable. Expressions
later in the document can call the variable. Variable names must qualify as
valid [identifiers](#identifiers). They are case-sensitive and bold-sensitive.
A search for variable _E_ will not find _e_. A search for **M** will not
find _M_.

You can define a unit for the result with a leading currency symbol or a
trailing unit name, but not both in the same statement.

You can also slip in a `;` character just before the final `=` sign in a
statement. That will create a multiple line statement, with aligned `=` signs.

#### Display Selector

Near the end of the statement is the display selector, i.e., `?`, `??`, etc.
It determines how much of the calculation is displayed.

+------------------+------------------------+--------------------------------------+
| Display selector | Display Selector for   |  Displays:                           |
|                  | Unit-Aware Calculation |                                      |
+:================:+:======================:+======================================+
|        ?         |       ??               | Entire calculation, including        |
|                  |                        | the result and a blue echo of        |
|                  |                        | the expression displaying the        |
|                  |                        | value plugged in to each variable.   |
+------------------+------------------------+--------------------------------------+
|        %         |       %%               | Omits blue echo.                     |
+------------------+------------------------+--------------------------------------+
|        @         |      @@                | Displays only the result, like a     |
|                  |                        | spreadsheet cell.                    |
+------------------+------------------------+--------------------------------------+
|        !         |       !!               | Omits the blue echo and the result.\ |
|                  |                        | Valid only when the result is a data |
|                  |                        | frame.                               |
+------------------+------------------------+--------------------------------------+

For an engineer like me, the most common display selector is **??**. I almost
always want to see the entire calculation. Seeing the expression and the
plugged-in values helps me to avoid the kind of unseen
[errors](http://www.eusprig.org/horror-stories.htm) that creep into spreadsheet
calculations. And it makes the calculation reviewable by a second set of eyes.

A doubled selector will prompt a [unit-aware calculation](#unit-aware-calculations).
After you try them, you may wonder how you ever did without them.

I use the **!** selector mostly when I am assigning a [chunk of data](#data-frame) to a variable.

I try to resist the temptation to overuse the **%** selector. When I review work
done by another engineer, I can do without the blue echo if variable values are
assigned directly above the equation where they are used. Otherwise I get grumpy.
You don’t want a grumpy reviewer.

One last variation is possible when assigning values from a single-row data frame.
You can assign such values to more than one variable at a time, like this:

```
A, I, w_self = beam["A", "Ix", "weight"] = !!
```

## Identifiers

Variable names and function names must be written in the form of a valid _identifier_.

*   Identifiers may be multiple characters long.
*   The first character must be a letter from the Latin or Greek alphabet.
    It may be bold or capitalized calligraphic Latin, or ℏ, or ℓ.
*   Subsequent characters may be letters or numerals (0123456789).
*   An under-score within an identifier is allowed and will be interpreted
    to mean the start of a subscript.
*   If an identifier has only one letter, then an accent character may be
    written after it. Hurmet will render the accent above the letter, as in ¢`θ̂`.
*   Primes may be appended to the very end, as in: ¢`f_c′`.
*   The following keywords may not be used as variable names: `π`, `ℏ`, `pi`,
    `true`, `false`, `root`, `if`, `else`, `elseif`, `modulo`, `otherwise`, `end`, `and`, `or`, `in`, `to`.

   ![letter letter-or-digit-or-accent prime](images/identifier-railroad.svg)

The names of those accents are:

|||||
|---------|---------|-----|--------------|
| grave   | acute   | hat | tilde        |
| bar     | breve   | dot | ddot         |
| ring    | check   | ul  | leftharpoon  |
| harpoon | leftvec | vec | leftrightvec |

Hurmet’s auto-correct can help create identifiers.

<div id="identi-correct"></div>

| To create:           | … do this and hit the space bar                 | Example input | Example result |
|----------------------|-------------------------------------------------|---------------|----------------|
| Greek letter         | Type the name of the letter.                    | gamma         | γ              |
| Capital Greek letter | Capitalize the name’s first letter.             | Gamma         | Γ              |
| Bold letter          | Type “bb”, then space, then the desired letter. | bb M          | 𝐌              |
| Calligraphic capital letter  | Type “cc”, then space, then the desired letter. | cc P  | 𝒫              |
| Accent               | Type the name of the accent.                    | y bar         | ¢`y̅`           |
| Prime                | Type two apostrophes.                           | ''            | ′              |

Hurmet will render single Latin letter variable names in _italic_. Function
names and multi-letter variable names are rendered in upright font. As a
convention, I personally use **bold** letters for variables that contain
vectors or matrices.

## Data Types

<dl class="bold-term">

Boolean

: `true` or `false`

String

:   A _string_ literal is a string of text characters enclosed by a pair of
    straight double quotation marks. The string may include any Unicode character
    except a straight double quotation mark, a newline, or a carriage return.

    ```
    "This is a string."
    ```

    You can call a subset of any string with an index or range in brackets. Hurmet
    indices are one-based. Examples:

    ```
    a = "abcdefg"
    a[2]      # returns "b"
    a[2:4]    # returns "bcd"
    a[5:end]  # returns "efg"
    ```

    **Math String**

    Strings will be rendered as math if they are delimited with single backticks
    instead of double quotes. So somthing like `` `M_n` `` will return as ¢`M_n`.
    This is useful mostly when a calculation checks a condition and reports whether
    some computed variable can be accepted.

Number

: Enter as integers (33), decimals (2.45), percentages (3.2%), scientific
  notation (3.1e4), mixed fractions (3 ⁷⁄₈) or hexadecimal (0x2A).

![integers, decimals, percentages, scientific notation, mixed fractions, or hexadecimal](images/NumberRailroad.svg)

::: indented
Notice that a number literal must begin and end with a numeral, not a decimal
symbol. Hurmet will not recognize `5.` as a number.

Hurmet’s default decimal symbol is a dot. You can choose instead to enter
numbers with a decimal comma via a drop-down menu in the **Doc** menu. Numbers are
never entered with a thousands separator, but they can be _displayed_ with one.

Hurmet always saves a decimal symbol as a dot. It’s only the display that changes.

While calculations are underway, Hurmet holds every number in memory in rational
number format. The numerator and denominator are each integers of arbitrary
length. So Hurmet can work precisely with numbers like 0.1 and 0¹⁄₃.
Trignonometry and roots are done in double-precision floating point, good to
about 15 significant digits.
:::

Complex Number

:   One can write a complex number in two forms:

    * ¢`a ± j b `    The letter `j` is identical to ¢`√(-1)` by Hurmet
    definition. Write a space after the j, as in `2 - j 3`.

    * ¢`r∠θ`    The characters `/_` will auto-correct into ∠ and ¢`θ` is in radians.

    Also, the character **°** is now a unit name. So one can also write a polar
    notation as ¢`r∠θ°` and the phase angle will be unit-aware.
    The characters `ooo` will auto-correct into °

    Examples:

    ::: indented
    ¢`z_1 = 2 + j 3`

    ¢` z_2 = 4∠30° `

    ¢`z = z_1 + z_2  = \blue((2 + j 3) + ( 4∠30°)) = 5.46 + j 5`
    :::

Unit

:   A Humet _unit_ can be applied to a numeric value.
    There are four ways to write a Hurmet unit.

    1. A unit name written directly after a number, with no intervening space. 
    2. A unit name between apostrophes, aka single straight quotation marks,
       written after a numeric value. A unit written this way can contain a space,
       like `fluid ounce`.
    3. A unit symbol written after a numeric value.
    4. A currency symbol written before a non-negative number.

    | Input                  | Renders as              |
    |------------------------|-------------------------|
    | `4.2meters`            | ¢`4.2meters`            |
    | `4.2 'meters'`         | ¢`4.2 'meters'`         |
    | `30°`                  | ¢`30°`                  |
    | `$25.10`               | ¢`$25.10`               |
    | `10 'N·m/s'`           | ¢`10 'N·m/s'`           |
    | `[2.1; 15.3] 'feet'`   | ¢`[2.1; 15.3] 'feet'`   |

    ![number or matrix or map apostrophe unit-name apostrophe](images/unit-railroad.svg)

    Hurmet treats the number and the unit together as a single _quantity_.
    Quantities are useful in [unit-aware calculations](#unit-aware-calculations)
    which do automatic unit conversion and also check for unit compatibility.

    Hurmet has many built-in [unit definitions](unit-definitions.html). You can
    write any one of them into a quantity. SI (metric) prefixes are valid on the
    appropriate unit names.

    You can also create compound units on the fly. That is, you can raise any unit
    to a power, and these powers-of-units can be multiplied (or divided) together
    into products. Example:

    | Input          | Renders as      |
    |----------------|-----------------|
    | `4 'kW.hr/m2'` | ¢`4 'kW.hr/m2'` |

    Note that within the unit literal, it is not necessary to write `^` to
    indicate a numeric exponent. Also, a dot or a hyphen within a compound unit
    name will be rendered as a half-high dot.

    Only one division solidus, **/**, may be written into a compound unit.

Matrix

:   A Hurmet _matrix_ is a one or two dimensional arrangement of matrix elements.
    A Hurmet matrix element can be a number, a string, `true`, `false`, or an
    exprression that resolves to one of those simple types.s

    A matrix literal is written between delimiters, either `( )` or `[ ]` or
    `{: }`. Matrix elements are horizontally separated by tabs or commas.
    Matrix rows are separated by semi-colons. So this: `(1, 0; 0, 1)` renders
    as ¢`(1, 0; 0, 1)`.
    
    A Hurmet _vector_ is a one dimensional array. Write a vector
    literal with values separated by commas or semi-colons, but not both.
    
    | Input           | Renders as        |
    |-----------------|-------------------|
    | `[2.1, -15.3]`  | ¢`[2.1, -15.3]`   |
    | `[4; 5]`        | ¢`[4; 5]`         |
    | `[]`            | ¢`[]`             |
        
    Another way to create a Hurmet column vector is to write a range of numbers between
    brackets; the form is `[start:step:end]`.
    A Hurmet calculation of that form will return a column vector with every number
    in the range. The step size is optional (default = 1). Examples:
    
    |    Input      |       Result            |
    |---------------|-------------------------|
    | `[2:5] = ?`   | ¢`[2:5] = [2; 3; 4; 5]` |
    | `[1:2:5] = ?` | ¢`[1:2:5] = [1; 3; 5]`  |

    You can call individual elements with index integers between brackets, as in
    `𝐕[5]` or `𝐌[1, 3]`. You can use a variable name for the index if the variable
    returns an integer. Hurmet indexes are one-based.
    
    You can access a sub-matrix using the range operator, “:”, as in `𝐕[2:5]` or
    `𝐕[2:end]`. Entire rows or columns can be called, as in `𝐌[2,:]` or `𝐌[:,1]`. 

Matrix Operations

:   All the usual math operators can be applied to a numeric matrix. The operators
    mostly work in an element-wise fashion. If you add a scalar to a matrix, or
    pass a matrix to most functions, Hurmet will do an element-by-element calculation
    and return a matrix, as in:

    ::: indented
    ¢` 𝐡 = [5; 10; 15] `

    ¢` 𝐱 = 2 𝐡 + 1 = \color(blue)(2) [5; 10; 15] + 1 \color(black) = [11; 21; 31] `
    :::

    Spreadsheet calculations can often be replaced by calulations using vectors, as
    above. When you really need to get things right, it’s great to be able to see
    the expression and all the plugged-in values.

    <div id="matrix-mult">

    Multiplication of two matrices is different than other operations. Mathematicians
    have several ways to multiply matrices. In Hurmet, you choose the type of
    multiplication by your choice of multiplication operator:

    ¢` 𝐀 ∘ 𝐁 ` ↦ element-wise product, ¢` (𝐀 ∘ 𝐁)_ij = 𝐀_ij × 𝐁_ij `

    ¢` 𝐀˽𝐁 ` or ¢` 𝐀 * 𝐁 ` ↦ [matrix product][], ¢` (𝐀 𝐁)_ij = ∑_(k = 1)^m 𝐀_i) 𝐁_kj `

    ¢` 𝐀 × 𝐁 ` ↦ [cross product][] of a pair of three-vectors
           = ¢` |𝐀||𝐁|sin(θ) 𝐧 `

    [matrix product]: http://www.intmath.com/matrices-determinants/4-multiplying-matrices.php/
    [cross product]: http://www.intmath.com/vectors/8-cross-product-vectors.php/

    ¢` 𝐀 ⋅ 𝐁 ` ↦ dot product = ¢` ∑_(i = 1)^n (𝐀_i 𝐁_i) `

    </div>

    Here are more of Hurmet’s matrix operations:

    ¢` 𝐀^T ` ↦ a transposed matrix.

    ¢` 𝐀^(-1) ` ↦ an inverted matrix, if ¢` 𝐀 ` is square.

    ¢` |𝐀| ` ↦ ¢` {determinant if "𝐀 is square"; magnitude otherwise} `

    ¢` abs(𝐀) ` ↦ element-wise absolute values

    ¢` ‖𝐀‖ ` ↦ ¢` {√(x_1^2 + ⋯ + x_n^2) if "𝐀 is a vector"; √(∑_i ∑_j A_ij^2) if "𝐀 is a matrix" `

    ¢` 𝐀 & 𝐁 ` or ¢` hcat(𝐀, 𝐁) ` ↦ concatenate matrices 𝐀 and 𝐁 horizontally

    ¢` vcat(𝐀, 𝐁) ` ↦ concatenate 𝐀 and 𝐁 vertically
    
    ¢` 𝐀 & e ` ↦ append an element to any vector

    Functions will mostly work element-wise on an matrix. Exception: functions
    `min()` and `max()` will find the minimum or maximum of the elements in the matrix.

    If you want to write a semi-colon inside parentheses and not create a matrix, use `\;`.

Data Frame

:   A _data frame_ is a two dimensional data structure that can be accessed with
    row names and column names or by row indices and column indices.

    Each datum can be a number, a string, `true`, or `false`. A missing item will
    be taken to be `undefined`. All data in a column must be of the same data type.
    A column of numbers can be assigned a unit of measure.

    Data frame literals are written between double backtick delimiters. The text
    between the backticks must be written in TSV format. (tab-separated values)

    Numbers must use a dot decimal. The second row may contain units of measure.
    Tabs and newlines are disallowed in data. Quotation marks, `"`, have no
    special significance.

    Here’s an example of TSV input:

    ```
    rebar = ``#size	diameter	area
     	in     	in²
    #3	0.375  	0.11
    #4	0.5    	0.2
    #5	0.625  	0.31
    #6	0.75   	0.44``
    ```

    … which renders as:

    ¢```
    rebar = ``#size	diameter	area
     	in     	in²
    #3	0.375  	0.11
    #4	0.5    	0.2
    #5	0.625  	0.31
    #6	0.75   	0.44``
    ```

    Hurmet will use the first column as keys to the rest of each row if the
    content of the top left cell begins with a hash tag, #.

    A dataframe literal can also show totals on the bottom line, via the
    `sum(up)` function. So this input:

    ```
    roof = ``#Item             	weight
                               	psf
    2 layers asphalt shingles  	8.0
    1/2 inch plywood           	1.5
    insulation, R19 fiberglass 	0.6
    trusses at 16 inch o.c.    	2.5
    5/8 inch gypsum board      	2.5
    lights, HVAC, miscellaneous	1.5
    total                      	=sum(up)``
    ```

    will render like this:\
    ¢``` roof = ``#Item           	weight
                               	psf
    2 layers asphalt shingles  	8.0
    1/2 inch plywood           	1.5
    insulation, R19 fiberglass 	0.6
    trusses at 16 inch o.c.    	2.5
    5/8 inch gypsum board      	2.5
    lights, HVAC, miscellaneous	1.5
    total                      	=sum(up)`` ```

    Data frames can be quite large, so Hurmet has a `fetch(url)` function to load
    data from a remote TSV file into a data frame. Since Hurmet runs in a browser,
    the url must begin with `http:` or `https:`

    A fetch example:

    ```
    wideFlanges = fetch("https://hurmet.org/example.tsv") = !
    ```

    That example loads in this data:

    ¢```
    ``#name	weight	A 	d   	bf  	tw  	Ix  	Sx
     	lbf/ft	in² 	in  	in  	in  	in⁴ 	in³
    W14X90	90	26.5	14  	14.5	0.44	999 	143
    W12X65	65	19.1	12.1	12  	0.39	533 	87.9
    W10X49	49	14.4	10  	10  	0.34	272 	54.6
    W8X31	31	9.13	8   	8   	0.285	110 	27.5
    W8X18	18	5.26	8.14	5.25	0.23	61.9	15.2
    W6X15	15	4.43	5.99	5.99	0.23	29.1	9.72
    W4X13	13	3.83	4.16	4.06	0.28	11.3	5.46`` ```

    As data frames go, that example is still pretty small. When I assign a data
    frame to a variable, I usually suppress its display by using the **!** display selector.

    I use a data frame most commonly by calling a row from it, like this:

    `beam = wideFlanges.W10X49 = !!` or\
    `beam = wideFlanges["W10X49"] = !!`

    That returns a single-row data frame. Then I can call individual
    properties, like this:

    `A = beam.A = ?? in2` or\
    `A = beam["A"] = ?? in2` or\
    `A = wideFlanges.W10X49.A = ?? in2`

    Hurmet will return a <br> ¢` {"simple type" if "you call a single cell, as in
    df[1, 2]"; "column vector" if "you call a column, as in df[,2]"; "data frame" otherwise} `

    Dot notation, as in `wideFlanges.W10X49`, can be used only if the property name
    is a valid [identifier](#identifiers).

    Here are calls that can return multiple values:\
        `A, S_x = wideFlanges.W8X31["A", "Sx"] = !!`, or\
        `A, S_x = wideFlanges["W8X31"]["A", "Sx"] = !!`
    Multiple returns must use the `!!` display selector, for now.

    <div id="single-row">

    If the data frame has only one row of data, a single accessor will call a datum.\
    Say the data frame is    ¢```aBar =``#size	diameter	area
      	in 	in²
    #4	0.5	0.2`` ```\
    Then one can call ¢` A = aBar.area = 0.2 'in2' `

    </div>

    Numeric cata frames can be multiplied by a unit-less scalar.
    No other math operations are supported for data frames.

    For structural engineers, I’ve put some useful data frames on GitHub. There are
    links [below](#other-resources).

Map

:   A Hurmet _map_ is unit-less data frame in which every value is the same data
    type, either boolean, string, or number. Maps can be the numeric part of
    a quantity.

    ¢```w = ``dead	live	snow
    30	70	40`` 'lbf/ft' ```

    You can do arithmetic on maps and run them through functions. The operation
    will be done on each value in the map. For instance, a beam calculation can
    break the loads down into dead load, live load, snow load, etc.:

    ¢` M = 1//8 w L^2  = ` ¢``` ``dead	live	snow
    0.375	0.875	0.5`` 'k·ft' ```
    
    Or, you could do your calculations in matrices and then annotate the matrix
    by converting it to a map:
    
    ¢` P = (10, 21.2, 15; 11, 25, 14) 'kips' `
    
    ¢``` P_a = matrix2table(P, ["D", "L", "S"], ["Col A", "Col B"]) = ``#	D	L	S
    Col A	10	21.1	15
    Col B	11	25	14`` 'kips' ```

String Interpolation

:   Hurmet can do string interpolation, but only inside a data frame or a map, not
    inside other strings. So data frames can update automatically with values from
    variables defined elsewhere.

    Use `${` before a variable name and `}` after. Hurmet will write the variable
    value into that spot in the data. The value will not be unit-aware. Here’s an example.

    ```
    w_dead = 25 lbf/ft
    w = ``dead	live	snow
    ${w_dead}	30	40`` 'lbf/ft' = %% lbf/ft
    ```

    Note that you must do a calculation. It’s not reading a literal value.

Date

:   A Hurmet _date_ literal is input between single quotation marks with numerals in
    ISO 8601 format: `'yyyy-mm-dd'`.
    
    You can add or subtract a time to a date to get a new date. The calculation must
    be unit-aware.  For example:\
    `'2025-01-12' + 12weeks = ??`.
    
    The default return format is `yyyy-mm-dd`, but you can specify a format and
    a language code in the Docs | Date format… menu. All These are valid date displays:

    ||||
    |:--------------------|:-------------------|
    | `yyyy-mm-dd`        | 2025-01-09         |
    | `dd.mm.yyyy`        | 09.01.2025         |
    | `d mmmm yyyy`       | 9 January 2025     |
    | `d mmm yyyy`        | 9 Jan 2025         |
    | `mmmm d, yyyy`      | January 9, 2025    |
    | `mmm d, yyyy`       | Jan 9, 2025        |
    | `d de mmmm de yyyy` | 9 de enero de 2025 |
    {.nogrid}
    
    In Date format…, you can also choose to a prepend a weekday. Hurmet will then show
    a weekday in its results, but not inside the body of an expression.
    
    Hurmet has two functions that relate to dates: The `today()` function and the
    `savedate()` function, which returns the date on which the current document
    was saved.

</dl>

## Expressions

Hurmet calculations are meant to be recognizeable to anyone familiar with
standard math notation. That is a broad statement. Here are many nuances:

## Constants

<dl>

_π_ or **pi**

: If you write ¢`π` into an expression, Hurmet uses a value of
  3.1415926535897932384626433832795028841971693993751.

_e_

: Hurmet will treat ¢`e` just like any other variable most of the time. But if
  ¢`e` is the base of an exponent, for example: ¢`e^x`, then Hurmet will take
  ¢`e` to mean 2.7182818284590452353602874713527.

_j_

: ¢`j` = ¢`√(-1)`. This value can be overwritten by a Hurmet assignment.

ℏ

: For ℏ, Hurmet uses a value of 1.054571817 × 10⁻³⁴ J·s.

</dl>

## Operators

+---------------+----------------------+---------------------------------------------+
| Operator      | Example              | Description                                 |
+===============+======================+=============================================+
| =             | _x_ = 15             | Assign a value to a variable.               |
+---------------+----------------------+---------------------------------------------+
| →             | ¢`x → cos x`         | Anonymous function. Used when a function is |
|               |                      | passed as an argument to another function.\ |
|               |                      | auto-correct: **->**                        |
+---------------+----------------------+---------------------------------------------+
| \+            |  2 + 2               | Addition                                    |
+---------------+----------------------+---------------------------------------------+
| –             |  5 - 3               | Subtraction                                 |
+---------------+----------------------+---------------------------------------------+
| \-            | ¢`-4`                | Unary minus                                 |
+---------------+----------------------+---------------------------------------------+
| \*            | ¢`2 * 4`             | Multiplication of numbers or matrices.\     |
|               +----------------------+---------------------------------------------+
|               | `"s1"*"s2"`          | Concatenation of strings                    |
+---------------+----------------------+---------------------------------------------+
| ×             |  2 × 4               | Multiplication of numbers.\                 |
|               |                      | Cross product of three-vectors.\            |
|               |                      | auto-correct: **xx**                        |
+---------------+----------------------+---------------------------------------------+
| ·             | ¢`a ⋅ b`             | Multiplication of numbers.\                 |
|               |                      | Dot product of vectors or matrices.\        |
|               |                      | auto-correct: dot between two spaces.       |
+---------------+----------------------+---------------------------------------------+
|               | ¢` (2)(4) `          | Multiplication                              |
+---------------+----------------------+---------------------------------------------+
|               |  `a b`               | Multiplication. (A space acts as an         |
|               |                      | operator when between variables.)           |
+---------------+----------------------+---------------------------------------------+
|               | `2L`                 | Number and unit (2 liters).\                |
|               |                      | Not a multiplication if no space.           |
+---------------+----------------------+---------------------------------------------+
|               | ¢`a2`                | Not a multiplication if no space.\          |
|               |                      | Hurmet reads “a2” as an identifier.         |
+---------------+----------------------+---------------------------------------------+
|               | ¢`sin(2)`            | Function                                    |
+---------------+----------------------+---------------------------------------------+
|               | a (2)                | Multiplication if a space exists before the |
|               |                      | open paren.                                 |
+---------------+----------------------+---------------------------------------------+
| /             | ¢`8/2`               | Division                                    |
+---------------+----------------------+---------------------------------------------+
| //            | ¢`8//2`              | Case fraction                               |
+---------------+----------------------+---------------------------------------------+
| ///           | ¢`8///2`             | Division displayed inline                   |
+---------------+----------------------+---------------------------------------------+
| \^            | ¢`3^2`               | Exponent                                    |
+---------------+----------------------+---------------------------------------------+
| &             | ¢`s_1 & s_2`         | Concatenate strings or horizontally         |
|               |                      | concatenate vectors, or append numbers      |
|               |                      |  onto vectors, or variables into a map,     |
|               |                      |  or append a column vector to a data frame  |
+---------------+----------------------+---------------------------------------------+
| √             | ¢`√`                 | Square root\                                |
|               |                      | auto-correct: sqrt                          |
+---------------+----------------------+---------------------------------------------+
| ¢`root  3 ()` | ¢`root 3 8`          | nth-root\                                   |
|               |                      | auto-correct: root n                        |
+---------------+----------------------+---------------------------------------------+
| |             | ¢`|-4|`              | Absolute value of a scalar, determinant of  |
|               |                      | a matrix, or magnitude of a vector or a     |
|               |                      | complex number.                             |
+---------------+----------------------+---------------------------------------------+
| `\|  \|`        ¢`‖ x ‖`             | ¢`√(x_1^2 + ⋯ + x_n^2)`  if the argument is |
|                                      | a vector of reals                           |
|                                      +---------------------------------------------+
|                                      | ¢`√(∑_i ∑_j A_(i, j)^2)`  if the argument is|
|                                      | a 2-D matrix                                |
+---------------+----------------------+---------------------------------------------+
| ⌊  ⌋          | ¢`⎿4.5⏌`             | Floor. Always rounds down.\                 |
|               |                      | auto-correct: floor                         |
+---------------+----------------------+---------------------------------------------+
| ⌈  ⌉          | ¢`⎾4.5⏋`             | Ceiling. Always rounds up.\                 |
|               |                      | auto-correct: ceil                          |
+---------------+----------------------+---------------------------------------------+
| %             | ¢`10%`               | Percent\                                    |
|               |                      | % is not a remainder operator. If you       |
|               |                      | need a remainder, use the rem() function.   |
+---------------+----------------------+---------------------------------------------+
| ‰             | ¢`10‰`               | Per thousand                                |
+---------------+----------------------+---------------------------------------------+
| modulo        | ¢`5 modulo 4`        | Modulo operator, always returns a positive  |
|               |                      | result                                      |
+---------------+----------------------+---------------------------------------------+
| !             | ¢`5!`                | [Factorial][]\                              |
|               |                      | precision = ¢`{100% if n ≤ 100; 15 digits   |
|               |                      | otherwise} `                                |
|               +----------------------+---------------------------------------------+
|               | ¢`if !x`             | Logical not if preceded by a space          |
+---------------+----------------------+---------------------------------------------+
| ‼             | ¢`5!!`               | [Double Factorial][]                        |
+---------------+----------------------+---------------------------------------------+
| ¢`(n\atop k)` | (5 \atop 3)          | Binomial coefficient. ¢`(n \atop k) =       |
|               |                      | n!//(n!(n!-k!))`                            |
+---------------+----------------------+---------------------------------------------+
| ==            | ¢`x == 15`           | Equality comparison                         |
+---------------+----------------------+---------------------------------------------+
| ≠             | ¢`if b ≠ c`          | Inequality comparison\                      |
| !=            |                      | auto-correct:  <>                           |
+---------------+----------------------+---------------------------------------------+
| `<`           |                      | Less than comparison                        |
+---------------+----------------------+---------------------------------------------+
| `>`           |                      | Greater than comparison                     |
+---------------+----------------------+---------------------------------------------+
| ≤             |                      | auto-correct: <=                            |
+---------------+----------------------+---------------------------------------------+
| ≥             |                      | auto-correct: >=                            |
+---------------+----------------------+---------------------------------------------+
| ∈\            | ¢`c ∈ s` \           | Is an element of a matrix or\               |
| in            | ¢`c in s`            | is a character of a string, or\             |
|               |                      | is a property of a data frame.\             |
|               |                      | auto-correct: \in                           |
+---------------+----------------------+---------------------------------------------+
| ∋             | ¢` d ∋ p `           | d has a property named y\                   |
|               |                      | auto-correct: owns                          |
+---------------+----------------------+---------------------------------------------+
| ∉             | ¢`c ∉ s`             | Is not an element of\                       |
|               |                      | auto-correct: \notin                        |
+---------------+----------------------+---------------------------------------------+
| ∌             | ¢` d ∌ p `           | d does not have a property named y          |
+---------------+----------------------+---------------------------------------------+
| ⊂             | ¢`c ⊂ s`             | Is a subset of\                             |
|               |                      |  auto-correct: \subset or contains          |
+---------------+----------------------+---------------------------------------------+
| ⊄             | ¢`c ⊄ s`             | Is not a subset of\                         |
|               |                      |  auto-correct: \nsubset                     |
+---------------+----------------------+---------------------------------------------+
| and\          | if _a_ and _b_\      | Logical and                                 |
| &&\           | if _a_ && _b_\       |                                             |
| ∧             | if _a_ ∧ _b_         |                                             |
+---------------+----------------------+---------------------------------------------+
| or\           | if _a_ or _b_\       | Logical or                                  |
| ||\           | if _a_ || _b_\       |                                             |
| ∨             | if _a_ ∨ _b_         |                                             |
+---------------+----------------------+---------------------------------------------+
| ⊻             |                      | Logical xor                                 |
+---------------+----------------------+---------------------------------------------+
| ¬\            |  if ¬ _a_\           | Logical not                                 |
| !             |  if !a               |                                             |
+---------------+----------------------+---------------------------------------------+
| :             | 𝐕\[2:3\] \           | Range separator                             |
|               | for _i_ in 1:3       |                                             |
+---------------+----------------------+---------------------------------------------+
{#op-table .grid width=35em}

[Factorial]: https://en.wikipedia.org/wiki/Factorial
[Double Factorial]: https://en.wikipedia.org/wiki/Double_factorial

</div>

## Functions

Hurmet treats an [identifier](#identifiers) as a function name if it is placed
directly before an open parenthesis. So a term like ¢`sinh(x)` is a function.

Functions can return multiple values if the return statement is written in
the form:  `return a, b, c, …, z`

Transcendental functions such as trigonometry or logarithms are done to 15
digits precision.

Hurmet’s built-in functions are described below. Unless noted otherwise, they
can operate on any real or complex number or any matrix containing real numbers.

------

<dl>

abs(z)

: Absolute value of a real number. Magnitude of a complex number.

accumulate(𝐕)

: Takes a vector, 𝐕, and returns a new vector whose elements are each
  the sum of the preceding elements in 𝐕.\
  Example: ¢`accumulate([2, 4, 1]) = [2, 6, 7]`

acos(_z_), asin(_z_), atan(_z_), asec(_z_), acsc(_z_), acot(_z_)

: Inverse trigonometry functions. One can also call an inverse trigonometry
  function with a superscript, as in ¢`cos^(-1) x`.

atan(_x_, _y_)

: When _atan_ is called with two arguments, it returns an angle in the proper
  quadrant. Given a point defined by real coordinates _x_ and _y_, _atan_ returns
  the angle between that point and the positive _x_-axis of a plane. Real numbers only.

angle(_z_)

: Phase angle of a complex number.

ceil(_x_)

: Ceiling. Always rounds up. Real numbers only.

Char(_n_)

: Takes an integer as a argument, treats it as a Unicode code point, and
  returns the corresponding string character.\
  `Char(34)` returns a double quotation mark.

conj(_z_)

: Complex conjugate of a complex number.

cos(𝜃), sin(𝜃), tan(𝜃), sec(𝜃), csc(𝜃), cot(𝜃)

: Trigonometry functions.

  The trig functions listed above will assume that a real argument is in
  radians unless you tell it otherwise. You can tell it otherwise by just
  writing in a unit, as in: `tan(45°)` and running a unit-aware calculation.

  Complex numbers are also valid arguments.

  A positive integer written as a superscript after a trig function name will
  return the function result raised to a power.\
  So that: ¢`sin^2 θ = (sin θ)^2`.

  A superscript ^-1^ indicates an inverse function. In other words, ¢`cos^(-1) x = acos(x)`.

  Three functions: `sin`, `cos`, and `tan`, do not require parentheses around their arguments.

cos~d~(𝜃), sin~d~(𝜃), tan~d~(𝜃), sec~d~(𝜃), csc~d~(𝜃), cot~d~(𝜃)

: The trigonometry functions listed just above will assume that the argument is
  in degrees. Real numbers only. Hurmet will subscript the “d” for you.

cosh(_z_), sinh(_z_), tanh(_z_), sech(_z_), csch(_z_), coth(_z_)

: [Hyperbolic functions](https://en.wikipedia.org/wiki/Hyperbolic_function) or
  real or complex numbers. Notation for inverse functions is similar to trigonometry.

count(_str_, _pattern_)

: The number of times string _pattern_ occurs in string _str_.

dataframe(**a**, **b**, …)

: Takes vectors as arguments and returns a dataframe.

exp(_z_)

: ¢`e^z`

fetch(_url_)

: Fetches the contents of a remote file. It expects the file to be in TSV format
  (tab-separated values) and will return a data range. Fetch functions must be
  stand-alone expressions.

findfirst(_searchstring_, _string_)\
findfirst(_value_, _vector_)\
findfirst(_booleanVector_)

: Searches the _string_ (_vector_) and returns the index of the first occurence of
  _searchstring_ (_value_).\
  If only one (vector) argment is provided, `findfirst` will return the index of the first `true`.
  

findmax(_v_)

: Find the maximum numeric value of a vector. Returns the value and the index. So you
  would call it this way:\
  `max, index = findmax(𝐕) = ?`

floor(_x_)

: floor. Always rounds down. Real numbers only.

gcd(_m_, _n_)

: Greatest common divisor of two integers.

hcat(_v_, _x_)

: Horizontal concatenation of: two strings, or two matrices, or an element onto
  a vector, or a variable onto a map, or a vector onto a data frame.

hypot(_x~1~_, _x~2~_, …, _x~n~_)

: ¢`√(x_1^2 + x_2^2 + ⋯ + x_n^2)`   …done in a way that avoids overflow. Real numbers only.

imag(_z_)

: Imaginary part of a complex number.

isnan(_x_)

: Indicates if the argument is not numeric.

length(a)

: The length of a string or the number of elements in a matrix or vector.

lerp(**X**, **Y**, index)

: Linear interplolation. Locates real index within the vector **X** and returns
  a real number interpolated from the vector **Y**. **X** must contain values
  in ascending order. Real numbers only.

log(_z_), ln(_z_)

: Natural (base _e_) logarithm of real or complex number _z_.

log~10~(_x_)

: Base 10 logarithm. Real numbers only. Hurmet will subscript the numerals for you.

log(_b_, _x_)

: Base _b_ logarithm. Real numbers only.

lfact(_n_)

: Returns the natural logarithm of the factorial of the argument. Valid only
  for non-negative integers. Note that `log(n!)` is a valid alias for
  `lfact(n)`. Real numbers only.

lgamma(_x_)

: Returns the natural logarithm of the gamma function, Γ(_x_). For now,
  Hurmet's lgamma(_x_) function only works on positive rational numbers.

matrix2table(_matrix_, _columnNames_, _rowNames_)

: Returns a map with the contents of the matrix. _columnNames_ and
  the optional _rowNames_ must each be a vector of strings.

¢`min(a,b,c,…),max(a,b,c,…)`

: Minimum or maximum of a list or array. Real numbers only.

mod(_x_, _y_)

: _x_ modulo _y_. This functions divides _x_ by _y_, and returns the absolute value of the remainder.

number(_string_)

: Converts a string, such as "5" or "3.14" to a number.

ones(_m_, _n_)

: Returns a _m_ × _n_ matrix filled with ones.  Arguments must be integers.

rand(), rand(_n_), rand(_m_, _n_)

: Pseudo-random number(s) in the range from 0 to 1 (inclusive of 0, but not 1).
  Good for Monte-Carlo modeling. Not sufficiently random for crypto.
  
  The optional arguments are integers. _rand_ with no arguments will return a
  single random number. If one or two arguments are provided, _rand_ will
  return a matrix filled with random numbers.

real(_z_)

: Real part of a complex number.

rem(_x_, _y_)

: Remainder. This functions divides _x_ by _y_, and returns the remainder.

round(_x_, _spec_)

: Rounds a real number _x_.<br>To round to an integer, omit the spec.\
  To round to _n_ significant digits, write the spec as "r_n_", e.g., "r3".\
  To round to _n_ places after the decimal, write the spec as "f_n_".

savedate()

: Returns the date on which the current document was saved.

sign(_x_)

: Returns ¢`{1 if x > 0; -1 if x < 0; 0 otherwise}`<br>Real numbers only.

string(_x_, _spec_)

: Takes a number, _x_, and returns a string. _spec_ is a rounding specification.
  It can round to a fixed number of digits after the decimal, e.g., "f2", or
  round to a specified number of digits, e.g., "r3".

sum(_a_, _b_, _c_, …), product(_a_, _b_, _c_, …), length(_a_, _b_, _c_, …), range(_a_, _b_, _c_, …), mean(_a_, _b_, _c_, …), variance(_a_, _b_, _c_, …), stddev(_a_, _b_, _c_, …)

: Functions that accumulate a result from a list of arguments or a vector.
  Real numbers only.

sum(_M_, _n_)

: Takes a matrix and sums either the rows or the columns.\
  `sum(𝐌, 1)` will sum the columns and return a row vector.\
  `sum(𝐌, 2)` will sum the rows and return a column vector.

today()

: Returns the current date.

transpose(_M_)

: Transpose a matrix.

vcat(_v_, _x_)

:  Vertical concatenation of: two matrices, or an element onto a vertical vector.

zeros(_m_, _n_)

: Returns a _m_ × _n_ matrix filled with zeros.  Arguments must be integers.

Γ(_z_)

: [Gamma function](http://en.wikipedia.org/wiki/Gamma_function)\
  precision = ¢`{100% if z" is a positive integer ≤ 100"; 15 digits otherwise}`

</dl>

## Operator Precedence

What is the result of the expression ¢`3 + 4 × 2` ?

It depends on whether one does the addition first or the multiplication first.
So the answer could be ¢`(3 + 4)(2)= 14` or it could be ¢`3 + (4 × 2)= 11`.

To resolve this ambiguity, Hurmet performs operations with the following precedence:

+---------------+---------------------------------------------------------------+
| \! %          | Factorials and percents are done first.                       |
+---------------+---------------------------------------------------------------+
| \^            | Then exponents, from right to left.                           |
+---------------+---------------------------------------------------------------+
| √             | Roots                                                         |
+---------------+---------------------------------------------------------------+
| \-            | Unary minus, for example: -4                                  |
+---------------+---------------------------------------------------------------+
| ∠             | To write a complex number in _r_∠θ notation.                  |
+---------------+---------------------------------------------------------------+
| × · /         | Multiplication or division, from left to right.               |
+---------------+---------------------------------------------------------------+
| \+ – & ∑      | Addition or subtraction or concatenation, from left to right. |
|               | Also, summation.                                              |
+---------------+---------------------------------------------------------------+
| < > ≤ ≥ = ≠   | Comparisons (for [If Expressions](#if-expressions))           |
+---------------+---------------------------------------------------------------+
| ∧ ∨ ¬ ⊻       | Logical operators (ditto)                                     |
+---------------+---------------------------------------------------------------+
| :             | Separator for a range of integers, as in **V**[2:3].          |
+---------------+---------------------------------------------------------------+
| , ;           | Argument separators or row separators for functions, matrices,|
|               | dictionaries, or If Expressions.                              |
+---------------+---------------------------------------------------------------+
| ( ) [ ]       | All conventions are over-ridden by parentheses or brackets.   |
+---------------+---------------------------------------------------------------+

Now let’s return to the question that opened this section. We now know that
multiplication has a higher precedence than addition, so the answer to our
question above is: ¢`3 + (4 × 2)= 11`

## If Expressions

Hurmet If Expressions enable you to choose between expressions, based upon one or more conditions, as in:

   ¢`β_1 = {0.85 if f_c′ ≤ 4000; 0.65 if f_c′ ≥ 8000; 0.85 - (f_c′ - 4000)//20000 otherwise}`

This sort of expression is written between the delimiters: `{ }`
The row separator symbol is **;**
Hurmet will automatically align the logic words **if** and **otherwise**.
So the example above can be coded this way:

```
β_1 = {
    0.85                         if f_c′ ≤ 4000 ;
    0.65                         if f_c′ ≥ 8000 ;
    0.85 - (f_c′ - 4000)/20000   otherwise
}
```

The spaces in that code example are not significant. Hurmet always aligns the
words `if` and `otherwise`. In fact, that example could also be coded all onto
one line. To be precise, the form is:

![expression if condition; expression otherwise](images/if-railroad.svg)

Conditions may contain logical operators:  and or not ∧  ∨  ¬  ⊻

¢`x = {2 a if a < b and b = 4; a^2 otherwise}`

Chained comparisons are okay.

¢`x = {1.0 if a < b < 5 < d; 1.2 otherwise}`

## Summation

Hurmet can handle single-index summation terms. Like this one:\
  ¢` ∑_(n=0)⁴ 2 n = 20 `

You write the summation expression like this:\
`\sum_(n=0)^4 2 n = ?`

The `\sum` and `^4` will auto-correct into more descriptive terms and the input
text ends up like this:\
`∑_(n=0)⁴ 2 n = ?`.

## Overloading

Overloading summary. That is, Hurmet  math operators and functions will work on
all the data types tablulated below. They also work on a Hurmet quantity that
takes any of these shapes:

|                           | scalar | vector | matrix | map | map with<br>vector values |
|:--------------------------|:------:|:------:|:------:|:---:|:-------------------------:|
| scalar                    | ✓      | ✓      | ✓      | ✓   | ✓                         |
| vector                    | ✓      | ✓      | ✓      | ✓   |                           |
| matrix                    | ✓      | ✓      | ✓      |     |                           |
| map                       | ✓      | ✓      |        |     |                           |
| map with<br>vector values | ✓      |        |        |     |                           |

Also, a unit-less number can be multiplied times a data frame that has numeric values.

## Unit-Aware Calculations

Hurmet has a data type called a [quantity](#quantity) that contains both a
numeric magnitude and a unit of measure. In a Hurmet calculation editing box,
you transform a number into a quantity literal by appending a unit name.
Either omit any space before the unit name or write the unit name between
single quotation marks. Examples:

+-----------+---------------+---------+
| `4meters` | `7.1 'ft3/s'` | `11N·m` |
+-----------+---------------+---------+
{.nogrid}

Hurmet has a **unit-aware** calculation mode that automatically handles unit
conversions on quantities and also checks that the operands are
unit-compatible. You specify unit-aware mode by writing two question marks
instead of one in the place where you want a result to appear. So if you open
a Hurmet calculation cell and write:

`4ft + 3 'yards' = ?? m`

… the result will render as:

¢`4ft + 3 'yards' = 3.9624 'm'`

You can create composite units on the fly and Hurmet will still convert them
automatically.

¢`(3kW·hr × (20min)) / (800lbf × 1h) = 1.0116402439486971731 'km'`

Use spaces to separate compound units from adjacent variables.\
`20N*m` is a compound unit, but `20N * m` is 20 Newtons times variable `m`.

If you try to add quantities with non-compatible units, Hurmet will return an
error message:

¢`3m + 2V = \color(firebrick) "Error. Adding incompatible units."`

If the calculated units are non-compatible with the units specified for the
result display, Hurmet will return an error message:

¢`3m + 2ft = \color(firebrick) "Error. Calculated units are not
compatible with the desired result unit:"\, "V"`

If you assign a quantity to a variable, a unit-aware calculation will call the
variable’s entire quantity, not just the numeric value.

¢`L = 3ft`

¢`L_2 = 2 L = \color(blue)(2) (3ft) \color(black) = 1.8288 'm'`

If you assign a quantity to a variable, you can still call the variable from a
non-unit-aware calculation. Such a calculation will call the scalar value, not
the quantity.

¢`L_unaware = 2 L = \color(blue)(2) (3) \color(black) = 6`

You’re welcome to view all of Hurmet’s built-in [unit definitions](unit-definitions.html).


#### Currencies

Currency exchange rates change, so Hurmet’s exchange rates are updated with
[data from the European Central Bank](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml).
That update occurs only once per week. 

#### Traditional Units

Many traditional units have had more than one historical definition. Hurmet
currently has the following default treatment of certain traditional units:

*   **pound** is treated as a mass, not a force. (**lbf** and **lbm** are un-ambiguous alternatives.)
*   **psf** and **psi**, on the other hand, are treated as force per area.
*   **ton** is treated as a mass, and is the U.S. customary unit. I also put in a **tonf**, 2000 lbf.
*   **gallon**, **fl oz**, **pint**, **quart**, and **bushel** are the U.S. customary units.
*   Weights are avoirdupois, unless specifically noted as a troy weight.
*   **point** is the adobe point = ¹∕₇₂ inch. **TeX point** is also available.
*   **barrel** and **bbl** are an oil barrel = 42 US gallons.

If you are curious about some of the more unusual units, such as “survey foot”
or “nautical mile”, I recommend Russ Rowlett’s
[dictionary of units of measurement](http://www.ibiblio.org/units/).

## Spreadsheets

Sometimes vectors are just too awkward. For those times, Hurmet can include
simple spreadsheets. The section below contains an example.

#### Vertical Distribution of Seismic Force

From earlier analysis

::: indented
¢` V_base = 400kips `, base shear        ¢` T = 0.75 sec `, fundamental period
of the structure
:::

From ASCE-16 section 12.8.3, Equivalent Lateral Procedure

::: indented
¢%` k = {   1 if T ≤ 0.5;   2 if T ≥ 2.5;   1 + (T - 0.5) // 2 otherwise } = 1.125 `

¢` C_vs = (w × h^k) / (Σ (w × h^k)) `, vertical distribution coefficient, Eq.
12.8-12

¢` F = C_vs V_base `, local force, Eq. 12.8-11
:::

¶

: dist: Vertical Distribution of Seismic Force
+--------+----------+---------+----------+-----------+--------------+--------+
| Floor  | Weight\  | Height\ | w × h^k^ | C~vs~     | Force\       | Shear\ |
|        | kips     | ft      |          |           | kips         | kips   |
+========+:========:+:=======:+:========:+:=========:+:============:+:======:+
| roof   | 950      | 70      | 113,100  | 0.2899    | 116.0        | 116.0  |
+--------+----------+---------+----------+-----------+--------------+--------+
| fifth  | 1,250    | 56      | 115,800  | 0.2968    | 118.7        | 234.7  |
+--------+----------+---------+----------+-----------+--------------+--------+
| fourth | 1,250    | 42      | 83,770   | 0.2147    | 85.90        | 320.6  |
+--------+----------+---------+----------+-----------+--------------+--------+
| third  | 1,250    | 28      | 53,080   | 0.1361    | 54.44        | 375.0  |
+--------+----------+---------+----------+-----------+--------------+--------+
| second | 1,250    | 14      | 24,340   | 0.06240   | 24.96        | 400    |
+--------+----------+---------+----------+-----------+--------------+--------+
| total  | 5,950    | 0       | 390,100  |           | 400          | 400    |
+--------+----------+---------+----------+-----------+--------------+--------+
{#dist .four-rules colWidths="70 71 62 73 88 74 76"}

Next, let’s look at the underlying formulas of that spreadsheet.

¶

: seis: Same table. Toggled to show formulas.
+--------+----------+---------+----------+------------+---------------+---------+
| Floor  | Weight\  | Height\ | w × h^k^ | C~vs~      | Force\        | Shear\  |
|        | kips     | ft      |          |            | kips          | kips    |
+========+:========:+:=======:+:========:+:==========:+:=============:+:=======:+
| roof   | 950      | 70      | =B1×C1^k | =D1/D\_end | ==E1× V\_base | =F1     |
+--------+----------+---------+----------+------------+---------------+---------+
| fifth  | 1,250    | 56      | "        | "          | "             | =G1+F2  |
+--------+----------+---------+----------+------------+---------------+---------+
| fourth | "        | 42      | "        | "          | "             | "       |
+--------+----------+---------+----------+------------+---------------+---------+
| third  | "        | 28      | "        | "          | "             | "       |
+--------+----------+---------+----------+------------+---------------+---------+
| second | "        | 14      | "        | "          | "             | "       |
+--------+----------+---------+----------+------------+---------------+---------+
| total  | =sum(up) | 0       | =sum(up) |            | =sum(up)      | =F\_end |
+--------+----------+---------+----------+------------+---------------+---------+
{.grid colWidths="70 71 62 73 88 74 76 null"}

This example illustrates several things about Hurmet spreadsheets.

1.  Spreadsheets start out as a Hurmet table.

2.  A spreadsheet must have a caption. The caption’s first word will be the
    spreadsheet’s name. Create a table caption by selecting a table and tapping
    the ![table-caption][] button.

3.  After all editing is complete, toggle the table into a spreadsheet by tapping
    the ![spreadsheet][] button. Hurmet spreadsheets toggle the entire table, not
    just one cell.

4.  No merged cells are allowed

5.  The top row contains headings, not formulas.

6.  A unit-of-measure can be assigned to a column. Type a newline (Shift-Enter) into
    a heading and write the unit’s name on the second line.

7.  Cells can contain data: numbers, strings, true, or false. Spreadsheet cells cannot
    contain matrices.

8.  Cells can also contain a formula.

    a.  Formulas start with an `=` sign and can contain references to other cells or to
        variables in the Hurmet document.

    b.  Refer to a cell with `A1` format. No range names or R1C1 references. The row
        number is indexed so that number 1 refers to the first data row. A
        formula cannot refer to a heading.

    c.  Refer to a column’s bottom cell with `_end` format. Example: `B_end`.

    d.  To make a cell unit-aware, start the formula with a double `==` sign.

    e.  A formula can contain the functions `sum(up)` or `sum(left)`.

9.   A  single `"` mark will be treated as a _ditto_ instruction. Hurmet will treat
     that cell as a copy of the data or formula above it, with adjusted row numbers.

10. Order of calculation is column-wise.

11. Hurmet math zones outside the spreadsheet can refer to a spreadsheet cell with
    the sheet name, column heading, and row heading. An exterior cell that
    calls `dist.Shear.total = ?` would get `400` for a result.

## Numeral display

There are two aspects to how numbers are displayed: (1) decimal separators, and
(2) rounding format for results.

### Decimal separator

In some countries, the usual decimal separator symbol is a dot. Other countries
use a comma. Hurmet starts up with a decimal separator based upon the browser’s
language setting. Hurmet also allows the reader (not the document author) to
select which display they prefer. Use the use the drop-down menu labeled
Doc | Set Decimal.

The same menu choice also selects how Hurmet displays thousands separators.

This menu choice changes nothing internally. It changes only the display. All
Hurmet documents are saved with numbers that have a dot decimal and no
thousands separator.

### Rounding of Results

Hurmet stores numbers internally as rational numbers in arbitrary precision,
but its default result display is a decimal fraction with up to 15 significant
digits. You can command Hurmet to _display_ results differently. Just write a
format statement into a Hurmet calculation cell. The specified format will
apply to every calculation result below that statement (until another format
statement). Here’s a format statement example:

`format = "f2"`

That statement specifies a fixed decimal format. Results after it will display
exactly two digits after the decimal. If you would rather specify the number of
significant digits, I suggest one of these statements:

`format = "r3"`\
`format = "h3"`

`"r3"` will display a result rounded to exactly three significant digits. If
your client freaks out because integer values have been rounded and look “wrong”,
the `"h3"` format will round only the fractional part of a number.

That was the short explanation. Now the long one. The rounding format
specification string must take the form: "**TN∠**", where:

| Specification<br>Letter | Description         | Use one of:      | Default |
|:-----------------------:|:------------------- |:---------------- |:-------:|
| T                       | Type of rounding    | bEefhkNnprSstx%  | h       |
| N                       | Number of digits    | \[0-9\]+         | 15      |
| ∠                       | Optional polar      | ∠ °              |         |

#### Type of rounding

Let _N_ be the number of digits specified. Then:

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
| f      | Rounds to                 | 3\.236    | f0          | 3              |
|        | exactly _N_ places after  |           +-------------+----------------+
|        | the decimal.              |           | f2          | 3\.24          |
|        |                           |           +-------------+----------------+
|        |                           |           | f4          | 3\.2360        |
+--------+---------------------------+-----------+-------------+----------------+
| h      | Hurmet’s default format   | 31\.345   | h3          | 31\.3          |
|        | will round a decimal      +-----------+-------------+----------------+
|        | fraction to               | 65,809    | h3          | 65,809         |
|        | display _N_ significant   +-----------+-------------+----------------+
|        | digits and omit trailing  | 1\.1000   | h3          | 1\.1           |
|        | zeros, but it will not    |           |             |                |
|        | round an integer.         |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| k      | Abbreviated and followed  | 22,000    | k3          | 22\.0k         |
|        | by a symbol from the SI   |           |             |                |
|        | prefixes. Rounds to _N_   |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| n or N | Engineering notation,     | 22,000    | n3          | 22\.0·10³      |
|        | i.e. scientific notation  |           +-------------+----------------+
|        | with exponents that are   |           | N3          | 22\.0×10³      |
|        | even multiples of 3.      |           |             |                |
|        | Rounds to _N_             |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| r      | Rounds to _N_ significant | 31\.345   | r3          | 31\.3          |
|        | digits.                   +-----------+-------------+----------------+
|        |                           | 65,809    | r3          | 65,800         |
+--------+---------------------------+-----------+-------------+----------------+
| s or S | Scientific notation.      | 22,000    | s3          | 2\.20·10⁴      |
|        | Rounds                    |           +-------------+----------------+
|        | to _N_ significant        |           | S3          | 2\.20×10⁴      |
|        | digits.                   |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| p or % | Percentage display.\      | 0\.2812   | %1          | 28\.1%         |
|        | “%” is fixed to           +-----------+-------------+----------------+
|        | exactly _N_ places after  | 1\.28     | p2          | 130%           |
|        | the decimal.\             |           |             |                |
|        | “p” rounds to _N_         |           |             |                |
|        | significant digits.       |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| t      | Truncates to a whole      | 31\.6     | t           | 31             |
|        | number.                   |           |             |                |
+--------+---------------------------+-----------+-------------+----------------+
| x or X | Hexadecimal               | 62        | x           | 0x3e           |
|        |                           |           +-------------+----------------+
|        |                           |           | X           | 0x3E           |
+--------+---------------------------+-----------+-------------+----------------+
| ∠ or ° | Polar notation of complex | 2 + j 3   | h3          | 2 + j 3        |
|        | numbers                   |           +-------------+----------------+
|        |                           |           | h3∠         | 3\.61∠0.983    |
|        |                           |           +-------------+----------------+
|        |                           |           | h3°         | 3\.61∠56.3°    |
+--------+---------------------------+-----------+-------------+----------------+
{.grid width=30em}

Numeric result display types **f** and **%** can be set to any non-negative
integer. The significant digit display types are limited to no more than 15
significant digits.

## Tests

Hurmet test statements will send an error message if a criterion is not met. 
For example, if you assign numeric values to two variables and then write:

::: indented
`@test P_u ≤ ϕR_n`
:::

The result will be one of these two messages:

+=======================+============================================+
| ¢` P_u ≤ ϕR_n, ok ✓ ` | $P_u \nleq ϕR_n, \colorbox{Salmon}{ n.g.}$ |
+-----------------------+--------------------------------------------+
{.nogrid colWidths="157 178"}

If the test fails, the message is also written to the console. So you can run an
entire document and get notifications in one place if something has gone wrong.
(You can see a browser console by typing Ctrl-Shift-I.)

If you have previously assigned a string to the variable “assert”, a failing
test message takes a more informative format:

::: indented
¢` assert = "The column at location B2 should work." `
:::

   $\colorbox{Salmon}{The column at location B2 should work, but $P_u \nleq ϕR_n $}$

A test statement takes this form:

::: indented
![@test value1 comparison operator value2](images/test-railroad.svg)
:::

If you want a unit-aware comparison, write “@@test” instead of “@test”.

## Drawings

Hurmet’s _draw_ environment can plot functions and render simple sketches. For a
sine wave, you can open a math zone and type the following code…

```
draw()
    title "sin x"
    frame 250, 150
    view -5, 5, -3
    axes 2, 1, "labels"
    strokewidth 2
    plot sin(x), 51
    text [1.6, 1.35], "sin x"
end
```

… which will result in this plot …

![sin x](images/sinx.svg)

Always use _x_ as the variable of a single function. For parametric plots, use
_t_ as the variable and put the two expressions into a row vector, like the
code below.

```
draw()
   title "spiral" 
   frame 200, 200 
   view -8, 8 
   axes
   plot [t*cos(π t), t * sin(π t)], 251, 0, 8 
end
```

… which results in this plot …

![spiral](images/spiral.svg)

You can pass variables into a draw environment. And a draw environment can
execute the same statements as a user-defined function. So you can create
drawings that change dynamically in reaction to the rest of your document.

I’ll write up an example next week.

### Draw environment commands

In the following list, optional arguments are written in
<span class="optional">orange</span>.

<dl>

title "_string_"

: Title of the drawing, for accessibility.

frame _width_, _height_<span class="optional">, position</span>

: _width_ and _height_, in px, define the size of the drawing in the document.
  _position_ can be "inline", "left", or "right".\
  This command must come before anything is drawn.

view _x_~min~, _x_~max~<span class="optional">, yₘᵢₙ, yₘₐₓ,</span>

: This command is usually written directly after `frame`. The arguments set the
  coordinate system. If _y_~min~ is omitted, the x-axis is placed in
  the middle of the picture. If _y_~max~ is omitted, the scales along
  the x-axis and y-axis are the same.

axes _dx_, _dy_<span class="optional">, "labels"</span>

: Draws coordinate axes.

grid _dx_, _dy_<span class="optional">, "labels"</span>

: Draws a background grid.

stroke "_color_"

: Sets the default color for lines, paths, curves and outlines of solid figures.
  Can be any of the [standard HTML predefined color names](https://www.w3schools.com/colors/colors_names.asp).

strokewidth _pixelvalue_

: Sets the width of lines, paths, and shape outlines.

strokedasharray "_dashpixel_ _spacepixel_"

: Set a pattern of dashes and gaps for lines and paths. Default = null.

fill "_color_"

: Sets the default color for filling in the inside of solid figures.

fontfamily "sansserif" | "serif" | "fixed" | "monotype"

: Sets the font type.

fontsize _pixelvalue_

: Sets the font size in px. Default = 13.33 (~10 pt).

marker "none" | "dot" | "arrow" | "arrowdot"

: Sets the default marker symbol that is drawn at the endpoints of lines and paths.
  Dots are also set along the intermediate points of paths and curves.

line [_x_, _y_; _u_, _v_]

: Draws a straight line from coordinate point _x_, _y_ to coordinate point _u_, _v_.

path  (_x₁_, _y₁_; _x₂_, _y₂_; …; _xₙ_, _yₙ_)       or\
path  (_x₁_, _y₁_, 0; _x₂_, _y₂_, _r₂_; …; _xₙ_, _yₙ_, _rₙ_)

: Draws a path connecting all the points in the matrix.
  
  Use the second form of the statement if the path contains any circular arcs. In that case,
  `rₙ` is the radius of the arc. Write a positive radius for arcs drawn counter-clockwise
  and write a negative radius for arcs drawn clockwise.

circle  [_x_, _y_], _r_

: Draws a circle of radius _r_, centered at point _x_, _y_.

dot  [_x_, _y_]<span class="optional">, "open" | "closed", "label", position</span>

: Draws a dot with an optional appended label.  _position_ can be: "above"|"below"|"left"|"right"|"aboveleft"|"aboveright"
  |"belowleft"|"belowright"|null

ellipse  [_x_, _y_], _rx_, _ry_

: Draws an ellipse of radii _rx_ and _ry_, centered at point _x_, _y_.

arc  [_x_, _y_; _u_, _v_], _r_ or [_rx_, _ry_]

: Draws an arc in anticlockwise direction from point _x_, _y_ to point _u_, _v_.
  It will be either a circular arc of radius _r_ or an elliptical arc of radius [_rx_, _ry_].

rect  [_x_, _y_; _u_, _v_]<span class="optional">, r</span>

: Draws a rectangle with corners at points _x_, _y_ and _u_, _v_. The optional _r_
  argument defines the corner radius of a rounded rectangle.

text  [_x_, _y_], "_string_"<span class="optional">, position</span>

: Writes the string at a point keyed to coordinates _x_, _y_.
  
  _position_ can be "above", "below", "middle", "left", "right", "aboveleft",
  "aboveright", "belowleft", or "belowright". The default is "middle".

  The string can be styled with Markdown inline styles: \__italic_\_, \*\***bold**\*\*,
  \``code`\`, `~`~subscript~`~`, `^`^superscript^`^`, and `~~`~~strikethrough~~`~~`.

leader [_x₁_, _y₁_; _x₂_, _y₂_<span class="optional">; x₃, y₃; etc</span>], "_note_"

: Writes a note with an arrow pointing to a location.

dimension [_x₁_, _y₁_; _x₂_, _y₂_; <span class="optional">x₃, y₃; etc;</span> _xLabel_, _yLabel_], "_label_" or ["_label₁_", "_label₂_", etc.]

: Writes a string of dimensions. _xLabel_ and _yLabel_ locate the labels. The
  other points each define a witness line.

plot  _f_ or [_g_, _h_]<span class="optional">, 𝑛, xₘᵢₙ, xₘₐₓ</span>

: Plots a function or a pair of parametric equations. A single function _f()_
  should be written with _x_ as its variable. A pair of parametric equations
  should be written with _t_ as their variable.\
  Values will be plotted from _x_ₘᵢₙ to _x_ₘₐₓ. _n_ determines the
  number of points to be plotted. (Default = 250)

</dl>

## User Defined Functions

If Hurmet’s [built-in functions](#functions) do not satisfy your needs, it is
possible to write your own functions. Example:

```
function multiply(a, b)
   return a × b
end
```

Other Hurmet calculation cells can then call the function:

¢`n = multiply(2, 4) = 8`

Unlike other Hurmet assignments, user defined functions can be placed at the
end of the document and still be called by other expressions.

The function can have any number of arguments, or none, separated by commas.
The function name and each argument (if any) must be valid identifiers.

If any arguments are optional, write them after a semi-colon and provide a
default value.

```
function Ms(section, Fy, Lb; Cb = 1, axis = "x")
```

Function statements end at a line ending, unless the last character is one of:
**( [ { , ; + -** or the following line begins with one of: **} ] )**

Comments can be written after `#`. A space must precede the `#`.

Variables created inside a user-defined function are local and their values
will not be available outside the function. A user-defined function returns
only the result of the expression in a `return` statement.

If you omit any arguments when you call a function, Hurmet will fill out the
argument list with values of `undefined` when it executes the function.

Hurmet does not support function recursion.

#### Code Blocks

Inside a user-defined function, Hurmet supports code blocks and some
additional control words. That is, words such as _if_ and _else_ can control
execution of a _block_ of statements, not just one expression. Statements
between the `if` statement and an `end` statement are in the block. Example:

```
if a ≤ b
    x = a + b²
    y = 2 x
end
```

Indentation is not significant to the parser but is very useful to humans
reading the code. I usually indent by four spaces.

<dl class="bold-term">

if else

:   _if​​…else_ control words make the execution of code blocks dependent on a
    condition. Example:

    ```
    if a ≤ 4000
        b = 0.85
    elseif a ≥ 8000
        b = 0.65
    else
        b = 0.85 - (a - 4000)/20000
    end
    ```

while

:   A _while_ loop executes a code block repeatedly, as long as a condition holds
    true. Example:

    ```
    while b ≠ 0
        h = b
        b = mod(a, b)
        a = h
    end
    ```

for

:   A _for_ loop iterates, executing a code block once with each element of a
    range or collection.

    Examples:

    +-------------------+----------------------------+
    | ```               | ```                        |
    | sum = 0           | reverse = ""               |
    | for i in 1:10     | for ch in "abcdef"         |
    |     sum = sum + i |     reverse = ch & reverse |
    | end               | end                        |
    | ```               | ```                        |
    +-------------------+----------------------------+
    {.grid}

    ![for index variable in range or matrix or string](images/for-loop-railroad.svg)

    The index variable of a _for_ loop will iterate through each of the numbers in
    a range, the elements in a matrix, or the characters in a string.

break

:   A loop can be terminated early via the _break_ keyword. Example:

    ```
    for i in 1:1000000
        if i ≥ 2
            break
        end
    end
    ```

return

:   A _return_ statement terminates the function.

    ![return optional expression](images/return-railroad.svg)

    If the optional _expression_ is present, the function will return its result.
    If not, the function will return `undefined`.

throw

:   A _throw_ statement terminates the function and returns an optional error message.

    ![throw optional string](images/throw-railroad.svg)

print

:   A _print_ statement writes a message to the browser’s console. You can type
    **Ctrl Shift I** to see it. Such a message can be very useful while debugging
    a function.

    ![print string](images/print-railroad.svg)

one-liner

:   To make early returns less verbose, a one-liner _if_ syntax is available:

    ![one liner](images/one-liner-railroad.svg)

</dl>

#### startSvg

A user-defined function can also operate as a draw envronment. To initiate a
draw environement, write the following line of code into a function:

```
svg = startSvg()
```

After that line is written, all the draw environment commands are valid.

## Remote modules

If some Hurmet code is used repeatedly, it makes sense to write that code once
and import it into other documents. Hurmet modules are text files that serve
that purpose. Modules can contain functions and statements that assign literal
values to a variable. Such a module would have text that might look like this:

```
E = 29000 'ksi'

v = [4, 6, 8]

function multiply(a, b)
    return a × b
end
```

A Hurmet document can load an entire module into one variable with a import
statement. The following statement will import a file that contains the text above.

`mod = import("https://hurmet.org/smallModule.txt") = !`

After a module has been imported and loaded into a variable, its functions and
values can be called by writing the module name and variable/function name in
dot notation, as in:

`E = mod.E = ?? psi`

`n = mod.multiply(2, 4) = ?`

#### Imported Parameters

The Hurmet variable name `importedParameters` has a special purpose. It loads
module values into multiple variables instead of into one variable. An example
of such an import is:

`importedParameters = import("https://hurmet.org/parent.txt") = !`

That statement will render like this:

<div style="font-size: 16px">

¢` {:f_c′, f_c′′, f_yr, β_1, ρ_0;
ρ_max, E_c, G_c,  E, G;
n_c, σ_a, σ_as, μ_s, σ_p;
p_pl, ρ_g, C_e, I_s, V_w;
EC, k_zt, α, z_g, SC;
S_DS, S_D1, I_E,,} = import("https://hurmet.org/parent.txt") `

</div>

Such a statement is handy in a big project, where you break the calculations
into several documents. Since any big project often has several common
variables, you want a way to keep them synchronized. Put an
`importedParameters` statement into each of the documents and you’re good. As
an added benefit, a reviewer can see what you are doing.

## Macros

A _macro_ enables you to save typing. You type the macro name, hit **Alt-E**,
and a larger section appears in your document. The macro name serves as an
abbreviation for the macro expansion.

A Hurmet macro is written in a module. The macro expansion is a section of a
Hurmet document, written in Markdown format. The expansion is contained
within `"""…"""` delimiters. Here’s an example:

```
ab = """¢` A_b = (π d_b^2) / 4 = ?? in² `, bolt area"""
```

As you can see, the macro expansion contains an equation to find the area of a
bolt. That expression is written into a module. If you’re writing macros, you
typically write several macros into each module.

A user can invoke the macro in two steps. First, import the module into a
document, as in this example:

<div style="width: 30em; overflow-x: scroll">

```
macros = import("https://gist.githubusercontent.com/ronkok/317f8ce0f706608fa9b3e3258ecea138/raw/csMacros.txt") = !
```

</div>

Then the user types the macro name, `ab`, and hits **Alt-E**. The macro
expansion appears in the document.

It doesn’t really matter what you name the module. When a user invokes the
**Alt-E** command, Hurmet will search all active variables to see if they
contain the desired macro name.

**Gists**

Hurmet is a web app, so it can import text files only from addresses that begin
with `http` or `https`. An easy way to create such a file is a Github
[Gist](https://gist.github.com/). I've written an example Gist for imported
parameters:

<div style="width: 30em; overflow-x: scroll">

`https://gist.githubusercontent.com/ronkok/c6c564cf162008cccf03ab8afeb09a83/raw/ParentFileExample.txt`

</div>

If you create your own Gists, you'll see that the addresses of the raw files
are very long. If you want a permalink to your file, delete the 40
random characters after "/raw/". Github keeps a copy of every draft of your
file and the random part after "/raw/" is the revision ID.

## Batch Mode

Suppose you want to operate in batch mode and run the calculations on an entire
document, or multiple documents, all at once. You can do that.

There is an altenate version of Hurmet that runs in Node.js from a command-line
interface (CLI). It exposes one method, `hurmet2html()`, which takes Hurmet’s
version of Markdown input and returns an HTML document. The code below shows how
one might apply it in Node.js:

```
// Read a Markdown file, run the calcs, and write an HTML file.
const fs = require('fs')
const hurmet = require('filePath/hurmet.cjs')
const temml = require('filePath/temml.cjs') // Math rendering library
globalThis.temml = temml
const titleRegEx = /([^.\\/]+)\.md$/;  // A helper.

// The main function has to be async.
(async function main() {
  const inputPath = 'filePath/fileName.md'
  const title = titleRegEx.exec(inputPath)[1];
  const outputPath = `filePath/${title}.html`
  // Read the file.
  const md = fs.readFileSync(inputPath).toString('utf8')
  // Run the calculations and convert to HTML.
  const html = await hurmet.hurmet2html(md, title)
  fs.writeFileSync(outputPath, html)
})();
```

In the code above, you need to customize the `filePath` and `fileName` callouts. 

The HTML file `<head>` contains references to a CSS (style) file and two fonts.
You can get those files, and the `hurmet.js` file that runs all this, from Hurmet’s
[GitHub repository](https://github.com/ronkok/Hurmet). Find the green
button labeled “code” and get a zip file.

In that zip file, the `preview` folder contains the files: `hurmet.js`, `styles.css`,
`latinmodernmath.woff2`, and `Temml.woff2`. The CSS and font files need to be
copied to the same folder as your HTML files.

## Troubleshooting

#### Typing lag

A big document with a lot of math may cause typing lag. You can regain speed by
clicking on the Draft Mode toggle button at **File | Draft mode**. It will
render math as plain text and omit the blue echos.

#### Matrix multiplication

To get element-wise multiplication of two matrices, the operator symbol must be
[explicitly](#matrix-mult) written as `∘` or `.*`.

####  Offline

If Hurmet does not work offline, it may be because the browser is deleting cookies.
If that is the case, whitelist "hurmet.org".

## Gists

Hurmet can export or import a document in
[Markdown](https://guides.github.com/features/mastering-markdown/ "Markdown")
format. This is useful for collaboration.

Say that you have written a calculation. It’s awesome and you want to share it
so that others can use it as a template. An easy way to share work is via a
GitHub [Gist](https://gist.github.com/). Then anyone can view it,
download it, or comment on it. Here’s an
[example](https://gist.githubusercontent.com/ronkok/7fec7d11f6fb6a031e5a0827e3531d68/raw/EndPlateConnectionExample.md).

Hurmet’s version of Markdown adds some extensions that GitHub does not recognize,
such as calculation cells, indented paragraphs, and merged cells in tables.

## Coming Attractions

*   A `distribution` data type, to enable calculations with uncertainty

## Other Resources

Civil and structural engineers may also find these items useful:

* Concrete Column Interaction [Diagram](https://observablehq.com/@ronkok/concrete-column-interaction-diagram)
* Fetchable TSV files with steel shape data: [wide flanges][], [channels][], [HSS][], [pipes][], [tees][],
  [double angles][], [HP][], and [MS][].
* Importable [module](https://gist.githubusercontent.com/ronkok/f4d93a4921ebd24c9a40578831d926b7/raw/steelStrengthPerAISC360-16.txt) with functions for steel member strength.
* A set of macros for civil and structural engineers. Here’s a [description][macroDesc] and a [link][macroLink] to the source.

[wide flanges]: https://gist.githubusercontent.com/ronkok/d2ae5b3c74889e71c7bb8422b6017067/raw/AISC-v15-wideFlanges.tsv
[channels]: https://gist.githubusercontent.com/ronkok/320677ddf9225afecf79bc831d5e1694/raw/AISC-v15-channels.tsv
[HSS]: https://gist.githubusercontent.com/ronkok/a63582e3870c880981845631cbcb302a/raw/AISC-v15-HSS.tsv
[pipes]: https://gist.githubusercontent.com/ronkok/b7d6c68daeedb729ac23ab81cc77a154/raw/AISC-v15-pipes.tsv
[tees]: https://gist.githubusercontent.com/ronkok/0c01e61709ade0b7738106462f831b45/raw/AISC-v15-tees.tsv
[double angles]: https://gist.githubusercontent.com/ronkok/3a1e2d13672be26ef50e880347300536/raw/AISC-v15-2L.tsv
[HP]: https://gist.githubusercontent.com/ronkok/4a489aa649aa955d069b26d761e6df5f/raw/AISC-v15-HP.tsv
[MS]: https://gist.githubusercontent.com/ronkok/93927e8f227109cd9463ccd2409aa73e/raw/AISC-v15-MS.tsv
[macroDesc]: https://gist.github.com/ronkok/cc46b817a1c1760e014fd65f7b12ebcc
[macroLink]: https://gist.githubusercontent.com/ronkok/317f8ce0f706608fa9b3e3258ecea138/raw/csMacros.txt

## Credits

I’m Ron Kok and I created Hurmet because I want practicing engineers to have
the tools they need to write calculations that are clear, complete, and reviewable.

Hurmet is built with the aid of several open source libraries and resources,
for which I am very grateful.

*   [ProseMirror](http://prosemirror.net), an extendable rich-text editor by Marijn Haverbeke.

*   [Temml](https://temml.org/), a LaTeX-to-MathML library, maintained by me.

*   [CodeJar](https://medv.io/codejar/), a light-weight text editor, by Anton Medvedev.

*   Many of Hurmet’s menu buttons show images from [icomoon](https://icomoon.io).

*   This document’s railroad diagrams are modified versions of images created
    with [regexper.com](https://regexper.com), by Jeff Avalone.

<br>

Copyright © 2020-2024 Ron Kok. Released under the [MIT License][]

<br>

</main>

<nav>
<div id="sidebar">
<h3><a href="#top">Contents</a></h3>

<ul class="toc">
<li><a href="#introduction">Introduction</a></li>
<li>
<details><summary>Editor</summary>

* [Basics](#editor-basics)
* [Save/Open](#save/open)
* [Tracking Changes](#tracking-changes)
* [Print Header](#print-header)
* [Comments](#comments)
* [Table of Contents](#table-of-contents)
* [Markdown](#markdown)
* [TeX](#tex)

</details>
</li>
<li>
<details><summary>Tutorial</summary>

* [Create a cell](#calculation-tutorial)
* [Statements](#statements)
* [Multiplication](#multiplication)
* [Roots](#roots)
* [Functions](#function)
* [Variables](#variables)
* [Subscripts](#subscripts)
* [Exponents](#exponents)
* [Greek letters](#greek-letters)
* [Accents and Primes](#accents-and-primes)
* [Units](#units)
* [Unit-Aware Calcs](#unit-aware-calcs)
* [Result Rounding](#result-rounding)
* [Display Mode](#display-mode)

</details>
</li>
<li>
<details><summary>Quick Reference</summary>

* [Markup](#markup)
* [Auto-correct](#auto-correct)
* [Display Selectors](#display-selectors)
* [Accessors](#accessors)

</details>
</li>
<li><a href="#calculation-forms">Calculation Forms</a></li>
<li><a href="#identifiers">Identifiers</a></li>
<li>
<details><summary>Data Types</summary>

* [Boolean](#boolean)
* [String](#string)
* [Number](#number)
* [Complex Number](#complex-number)
* [Unit](#unit)
* [Matrix](#matrix)
* [Data Frame](#data-frame)
* [Map](#map)
* [Date](#date)
* [String Interpolation](#string-interpolation)

</details>
</li>
<li>
<details><summary>Expressions</summary>

* [General](#expressions)
* [Constants](#constants)
* [Operators](#operators)
* [Functions](#functions)
* [Operator Precedence](#operator-precedence)
* [If Expressions](#if-expressions)
* [Summation](#summation)
* [Overloading](#overloading)

</details>
</li>
<li>
<details><summary>Units</summary>

* [Unit-Aware Calcs](#unit-aware-calculations)
* [Currencies](#currencies)
* [Traditional Units](#traditional-units)

</details>
</li>
<li><a href="#spreadsheets">Spreadsheets</a></li>
<li><a href="#numeral-display">Numeral Display</a></li>
<li><a href="#tests">Tests</a></li>
<li><a href="#drawings">Drawings</a></li>
<li>
<details><summary>UDFs</summary>
<ul>
<li><a href="#user-defined-functions">User-Defined Functions</a></li>
<li><a href="#code-blocks">Code blocks</a></li>
<li>
<details><summary>Control Flow</summary>

* [if…else](#if-else)
* [while loops](#while)
* [for loops](#for)
* [break](#break)
* [return](#return)
* [throw](#throw)
* [print](#print)

</details>
</li>
<li><a href="#startsvg">startSvg</a></li>
</ul>
</details>
</li>
<li>
<details><summary>Modules</summary>

* [Remote Modules](#remote-modules)
* [Imported Parameters](#imported-parameters)
* [Macros](#macros)

</details>
</li>
<li><a href="#batch-mode">Batch Mode</a></li>
<li>
<details><summary>End notes</summary>

* [Troubleshooting](#troubleshooting)
* [Gists](#gists)
* [Coming Attractions](#coming-attractions)
* [Other Resources](#other-resources)
* [Credits](#credits)

</details>
</li>
</ul>

</div>
</nav>

<div id="mobile-nav">
<input id="navicon-checkbox" type="checkbox">
<label for="navicon-checkbox" id="navicon"><img src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512px' height='512px'%3E%3Crect x='96' y='241' width='320' height='32'/%3E%3Crect x='96' y='145' width='320' height='32'/%3E%3Crect x='96' y='337' width='320' height='32'/%3E%3C/svg%3E" alt='≡' width='24'></label>
  <ul id="mobile-menu">
    <li><a href="#editor-basics">Editor</a></li>
    <li><a href="#calculation-tutorial">Tutorial</a></li>
    <li><a href="#calculation-forms">Calculations</a></li>
    <li><a href="#identifiers">Identifiers</a></li>
    <li><a href="#data-types">Data Types</a></li>
    <li><a href="#expressions">Expressions</a></li>
    <li><a href="#unit-aware-calculations">Units</a></li>
    <li><a href="#numeral-display">Numeral Display</a></li>
    <li><a href="#user-defined-functions">UDFs</a></li>
    <li><a href="#remote-modules">Modules</a></li>
  </ul>
</div>

<div id="demo">
<p>format = "<input type="text" id="formatBox" value="h3" style="width: 2em;">"</p>
<p></p>
<div>Give it a try. (It’s interactive.)</div>
<div id="input-container"><form><div id="demo-input"></div></form></div>
<div id="demo-output"></div>
</div> <!-- demo -->

<script type="module" src="./demo.min.js"></script>
</body>
</html>
