# Changelog

## 0.1.0 (2026-11-15)

First release.

- **Tank:** fill level with slowly moving oil and rising bubbles (off with `animations: false` or reduced motion),
  reserve line, room for a delivery, litres above the reserve, last delivery from helpers
- **Consumption** from the level's long-term statistics: a rise of more than `refill_threshold` (100 L) in a day is a
  delivery, smaller rises are noise. Three scrubbable views: 30 days (7-day mean, outdoor temperature, litres per
  heating degree day), 12 months next to the previous year, and the level over time with deliveries and the forecast
- **Range:** the tank is run down day by day with the consumption per calendar month; scenarios mean, last 12 months,
  the year before and cold winter, plus the linear and the sensor's own projection. Drives “lasts until …” in the
  header and “order by …”
- **Price:** weekly means of the price sensor (no forecast), low/high by calendar week, change against the price paid,
  delivery weeks marked
- **12 months compared:** litres, heating degree days, litres per degree day and summer base load against the previous
  year with Δ badges, only over months complete in both years; the running month up to today in both
- **Footer:** this month and year against last year, costs of the month, value of the oil in the tank
- **Mini card** `custom:oil-overview-mini-card` with the same range; opens the full card as a popup or expands it
- Visual editor for both cards, new cards prefilled from an OilFox device; German and English
