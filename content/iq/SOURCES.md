# Picture IQ questions — sources and licences

1060 matrix puzzles ("which figure completes the pattern?"), listed in [pictures.yaml](pictures.yaml). Each one is a
question picture plus an answers picture with 8 options (4 columns x 2 rows, read left to right).

The pictures are not in git. [scripts/iq-collect.py](../../scripts/iq-collect.py) rebuilds them from the original
downloads into `.media/iq/` (the local media store); `pnpm media:push --yes` sends them to the server.

## Sandia Matrices — 840 items, `iq/sandia/`

- Source: https://github.com/sandialabs/Matrices (`Matzen_et_al_2010_norming_stim.zip`)
- Licence: BSD 3-Clause — commercial use allowed; keep the notice below wherever the pictures are redistributed.
- Pictures are unchanged, except that the grid lines between the answers are cut out (the app frames each answer). Answer key and the share of people who solved each puzzle come from the
  norming study. Each puzzle was shown to 4 people only, so that share is rough.
- Cite: Matzen, L. E., Benz, Z. O., Dixon, K. R., Posey, J., Kroger, J. K., & Speed, A. E. (2010). Recreating Raven's:
  Software for systematically generating large numbers of Raven-like matrix problems with normed properties.
  *Behavior Research Methods, 42*(2), 525–541. https://doi.org/10.3758/BRM.42.2.525

```
Copyright (c) 2010 Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the Sandia Corporation nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL SANDIA CORPORATION BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Open Matrices Item Bank (OMIB) — 220 items, `iq/omib/`

- Source: https://osf.io/4km79/
- Licence: GPLv3 (stated in the paper). Commercial use is allowed; the pictures stay under GPLv3, so anyone who gets
  them may reuse them, and the pictures and scripts/iq-collect.py have to remain available on request.
- The matrices are redrawn from the published item codes and checked against the published pictures.
  **The answer options are ours**: in the original the person builds the answer from 20 elements, so there are no wrong
  options. iq-collect.py makes 7 of them per item (other cells of the matrix, the answer with 1–2 elements changed).
  The published difficulty was measured in the build-it-yourself format — with options the items are easier.
- Cite: Koch, M., Spinath, F. M., Greiff, S., & Becker, N. (2022). Development and Validation of the Open Matrices
  Item Bank. *Journal of Intelligence, 10*(3), 41. https://doi.org/10.3390/jintelligence10030041

## Looked at and not taken

| Bank | Why not |
| --- | --- |
| ICAR (matrix, 3D rotation) | Non-commercial research only; the authors turn down commercial requests |
| MaRs-IB (80 items) | CC BY-NC — non-commercial |
| openpsychometrics.org Full Scale IQ | CC BY-NC-SA — non-commercial |
| Raven's Progressive Matrices, Mensa and "free IQ test" sites | Copyrighted, no licence to reuse |
| RAVEN / I-RAVEN datasets | Built for training models: 160 px pictures, GPL code — worse than the two above |

## More items

Both banks come with generators, so the base can grow without new sources: the Sandia tool
(Python port: https://github.com/DH-Oz/raven-matrix, BSD-3, SVG output) builds new puzzles for any of the normed
structure codes, and OMIB items are a 9-cell code over 20 elements that iq-collect.py already draws.
