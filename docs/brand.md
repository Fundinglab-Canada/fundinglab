# Funding Lab — brand in code

The palette is sampled from the supplied logo (`public/brand/funding-lab-logo.png`): the deep teal-blue of "Funding", the teal of "Lab", and the leaf green in the mark. Typography, voice and required copy follow the Funding Lab brand guide.

| Token (Tailwind) | Hex | Use | Contrast |
|---|---|---|---|
| `navy` | #0C3447 | Headings (`ink`), footer, snapshot header, ledger | 13.1:1 on white |
| `navy-700` | #14506A | "Funding" in the logo; primary button hover | 8.8:1 with white text |
| `teal` | #17716F | Primary buttons, progress, gauge, links (`teal-text`) | 5.8:1 with white text; 5.4:1 on `page` |
| `teal-bright` | #2F9A9A | "Lab" in the logo — decorative only, never text | 3.4:1 (fails as text) |
| `teal-soft` | #E3F3F1 | Selected options, grant match header, success pills | `teal` text 5.1:1 |
| `leaf` / `leaf-onnavy` | #64B063 / #7FD18A | Accents; `leaf-onnavy` for figures on navy | 7.1:1 on navy |
| `page` / white / `muted` | #F4F8F8 / #FFFFFF / #E8F0F0 | Surfaces | — |
| `body` / `subtle` | #1D3340 / #556B78 | Body text / helper text | 13:1 / 5.1:1 on `page` |
| `line` / `line-strong` | #D3E0E1 / #7A909B | Dividers / form-control borders | control borders ≥ 3:1 |
| `warning`, `danger`, `info` (+ `-soft`) | | Status, always with a word | ≥ 5:1 on their soft tints |

Type: **Schibsted Grotesk** (headlines), **Public Sans** (UI and body), **IBM Plex Mono** (every amount, date and score, tabular figures). Self-hosted via Fontsource.

Required copy lives in `lib/constants.ts` (`BRAND`, `CONSENT`): the securities disclaimer, the grant data source line, the consent wording and the footer contact line. Change it there, never inline.

Logo usage:
- Use the full lockup on white or `page`. Use the mark alone (`funding-lab-mark.png`) for favicons, app icons and anything under 120px wide.
- Don't place the full lockup on navy: the dark "Funding" wordmark disappears. The mark alone works on navy.
