# Certificate artwork

`background.png` (2246 × 1588, A4 landscape at 192 dpi) is the certificate template without its texts: the frame,
the corner artwork, the ribbon, the divider and the page curl. The name, the score, the date, the number and the
QR code are drawn over it by src/features/iq/certificate-render.tsx.

It was put together from the pictures inside the PowerPoint template (kept outside git as
design/iq-certificate-template.pptx), each at the position the slide gives it. To change the artwork, export a new
picture of the same size and proportions and replace this file; the text positions are in certificate-render.tsx.
