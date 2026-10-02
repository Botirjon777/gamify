# Certificate fonts

Used only to draw the IQ certificate (src/features/iq/certificate-render.tsx). They are the faces of the certificate
template (plus PT Serif), taken from their official sources — unchanged.

| File | Font | Licence | Source |
|---|---|---|---|
| Parisienne-Regular.ttf | Parisienne, by Astigmatic | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/parisienne |
| texgyretermes-regular.otf, texgyretermes-bold.otf | TeX Gyre Termes, by GUST e-foundry | GUST Font License (LPPL-based) | https://www.gust.org.pl/projects/e-foundry/tex-gyre/termes |
| PTSerif-BoldItalic.ttf | PT Serif, by ParaType | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/ptserif |

The first two have no Cyrillic and no Uzbek ʻ ʼ: the renderer sets ʻ ʼ as ‘ ’ (the same shapes), and names written
in Cyrillic are set in PT Serif (it has ў қ ғ ҳ). Inter (../og) is the last resort for anything else.
