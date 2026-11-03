# The One Rail visual system

This project adapts the supplied Coursera design reference into a railway reservation interface. It uses the reference's clear grid, cool blue surfaces, readable sans-serif type and prominent action color. Do not reuse Coursera branding, text, artwork or identity.

## Product tone

- Organized, direct and easy to scan.
- Put journey details, availability, fare and the next action in a clear order.
- Use cool blue and white as the base, with orange for the main action.
- Clearly label sample timetables, simulated availability, payments, PNRs and tickets.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Primary blue | `#0454d4` | Links, active navigation and selected controls |
| Deep blue | `#0d2f60` | Strong headings and occasional emphasis panels |
| Raised surface | `#e4ebfb` | Selected panels, route highlights and soft section backgrounds |
| Action orange | `#de6000` | Primary buttons and the most important action |
| Muted blue-gray | `#b4c2d4` | Quiet borders and secondary structure |
| Page background | `#f6f8fc` | Shared page background |
| Card surface | `#ffffff` | Forms, dialogs and content cards |
| Body text | `#172234` | Primary copy |

Status colors should appear with labels or icons, not color alone: success `#287a43`, warning `#a7505a`, and information `#0454d4`.

## Typography and spacing

- Use Source Sans Pro when available, with Segoe UI and Arial fallbacks.
- Hero title: around 48 px, 600 weight, line-height around 1.17.
- Page title: 30–36 px. Section titles: 20–28 px.
- Body copy: 16 px, line-height 1.5. Buttons and labels: 14–16 px.
- Use a 16 px spacing rhythm, with 32 px between major sections.
- Keep train numbers, times, prices and seat numbers easy to compare.

## Layout and components

- Maximum content width: 1440 px.
- Use a light sticky navigation with clear active state and a visible account area.
- The home page pairs a direct travel-search headline with a route information card, a prominent search panel, and a three-feature section.
- Use simple grids for search results, booking steps, account summaries and admin content.
- Cards use white surfaces, restrained shadows and radii from 8 to 24 px. Use 32 px radii only for large, friendly surfaces.
- Inputs and controls need visible labels, keyboard focus, clear errors and touch-friendly sizing.
- Primary actions use orange. Secondary actions use white surfaces with blue-gray borders.
- Coach layouts retain their class-specific shape and seat status indicators.

## Accessibility and trust

- Provide loading, empty, error and success states.
- Preserve visible keyboard focus and reduced-motion behavior.
- Pair status color with text or an icon.
- Never describe simulated fares, availability, payment, PNR or tickets as official railway data.

## Implementation

Shared page styles and tokens are maintained in `frontend/src/index.css`. Reuse the common style system across pages and avoid adding page-specific colors or control styles unless a page needs a clear functional distinction.
