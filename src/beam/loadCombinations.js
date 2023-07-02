/* The list below enumerates the load combinations and load
 * factors used by Hurmet for beam analysis.
 *
 * Hurmet always does one service load analysis that includes
 * all load types. Load factor = 1.0 in that analysis.
 *
 * Then Hurmet examines each line below, If the beam is loaded
 * by any of the load types listed in the first column, Hurmet will
 * perform an analysis with the load factor combination listed
 * on that line.
 *
 * NOTATION
 *   D=Dead, F=Fluid, L=Live, H=Horizontal, £=Roof Live
 *   S=Snow, R=Rain,  W=Wind, E=Earthquake
 *
 *   LLF=either 1 or 0.5, per user input
 *
 *   For earthquake cases, Hurmet finds SDS from user input.
 *   If SDS <= 0.125, Hurmet sets SDS = 0.
 */

export const loadCombinations = Object.freeze({
  "service": [
    ["DFLH£SRWE", "0 1 1 1 1 1 1 1 1 1"]
  ],
  "ASCE 7-16": [
    //      Eqn  D            F            L   H     £    S    R    W   EQ
    ["DFH", "1  1.4          1.4           0  1.6    0    0    0    0    0"],
    ["L",   "2  1.2          1.2         1.6  1.6    0    0    0    0    0"],
    ["L£",  "2  1.2          1.2         1.6  1.6  0.5    0    0    0    0"],
    ["LS",  "2  1.2          1.2         1.6  1.6    0  0.5    0    0    0"],
    ["LR",  "2  1.2          1.2         1.6  1.6    0    0  0.5    0    0"],
    ["£",   "3  1.2          1.2           0  1.6  1.6    0    0    0    0"],
    ["£L",  "3  1.2          1.2         LLF  1.6  1.6    0    0    0    0"],
    ["£W",  "3  1.2          1.2           0  1.6  1.6    0    0  0.5    0"],
    ["S",   "3  1.2          1.2           0  1.6    0  1.6    0    0    0"],
    ["SL",  "3  1.2          1.2         LLF  1.6    0  1.6    0    0    0"],
    ["SW",  "3  1.2          1.2           0  1.6    0  1.6    0  0.5    0"],
    ["R",   "3  1.2          1.2           0  1.6    0    0  1.6    0    0"],
    ["RL",  "3  1.2          1.2         LLF  1.6    0    0  1.6    0    0"],
    ["RW",  "3  1.2          1.2           0  1.6    0    0  1.6  0.5    0"],
    ["W",   "4  1.2          1.2           0  1.6    0    0    0  1.0    0"],
    ["WL",  "4  1.2          1.2         LLF  1.6    0    0    0  1.0    0"],
    ["W£",  "4  1.2          1.2           0  1.6  0.5    0    0  1.0    0"],
    ["WL£", "4  1.2          1.2         LLF  1.6  0.5    0    0  1.0    0"],
    ["WS",  "4  1.2          1.2           0  1.6    0  0.5    0  1.0    0"],
    ["WLS", "4  1.2          1.2         LLF  1.6    0  0.5    0  1.0    0"],
    ["WR",  "4  1.2          1.2           0  1.6    0    0  0.5  1.0    0"],
    ["WLR", "4  1.2          1.2         LLF  1.6    0    0  0.5  1.0    0"],
    ["W",   "6  0.9          0             0  1.6    0    0    0  1.0    0"],
    ["E",   "6  1.2+0.2×SDS  1.2+0.2×SDS   1  1.6    0  0.2    0    0    1"],
    ["E",   "7  0.9-0.2×SDS  0.9-0.2×SDS   0  1.6    0    0    0    0    1"]
  ],
  "ASCE 7-16 ASD": [
    //      Eqn  D             F           L    H    £    S    R    W   EQ
    ["DF",  "1   1             1           0    1    0    0    0    0    0"],
    ["L",   "2   1             1           1    1    0    0    0    0    0"],
    ["£",   "3   1             1           0    1    1    0    0    0    0"],
    ["S",   "3   1             1           0    1    0    1    0    0    0"],
    ["R",   "3   1             1           0    1    0    0    1    0    0"],
    ["L£",  "4   1             1         0.75   1   0.75  0    0    0    0"],
    ["LS",  "4   1             1         0.75   1    0   0.75  0    0    0"],
    ["LR",  "4   1             1         0.75   1    0    0   0.75  0    0"],
    ["W",   "5   1             1           0    1    0    0    0   0.6   0"],
    ["LW",  "6   1             1         0.75   1    0    0    0   0.45  0"],
    ["£W",  "6   1             1           0    1   0.75  0    0   0.45  0"],
    ["SW",  "6   1             1           0    1    0  0.75   0   0.45  0"],
    ["RW",  "6   1             1           0    1    0    0  0.75  0.45  0"],
    ["L£W", "6   1             1         0.75   1   0.75  0    0   0.45  0"],
    ["LSW", "6   1             1         0.75   1    0  0.75   0   0.45  0"],
    ["LRW", "6   1             1         0.75   1    0    0  0.75  0.45  0"],
    ["W",   "7  0.6            0           0    1    0    0    0   0.6   0"],
    ["E",   "8  1+0.14×SDS   1+0.14×SDS    0    1    0    0    0    0    0.7"],
    ["E",   "9  1+0.105×SDS  1+0.105×SDS  0.75  1    0  0.75   0    0    0.525"],
    ["E",  "10  0.6-0.14×SDS 0.6-0.14×SDS  0    0    0    0    0    0    0.7"]
  ],
  "2021 IBC ASD": [
    //     Eqn   D    F   L   H  £   S   R   W   EQ
    ["DFL", "1   1    1   1   1  0   0   0   0   0"],
    ["£",   "1   1    1   1   1  1   0   0   0   0"],
    ["S",   "1   1    1   1   1  0   1   0   0   0"],
    ["R",   "1   1    1   1   1  0   0   1   0   0"],
    ["W",   "2   1    1   1   1  0   0   0  0.6  0"],
    ["W",   "3   1    1   1   1  0  0.5  0  0.6  0"],
    ["S",   "4   1    1   1   1  0   1   0  0.3  0"],
    ["E",   "5   1    1   1   1  0   1   0   0  0.72"],
    ["E",   "6  0.9  0.9  0   1  0   0   0   0  0.72"]
  ]
})
