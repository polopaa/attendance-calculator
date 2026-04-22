# Slot-Based Attendance Calculator (Responsive Web App)

This is a **client-side** attendance calculator that uses a **slot-based timetable** to estimate remaining classes and lets you simulate how attending/skipping future classes affects your final attendance %.

## How it works

- Enter current attendance as `attended/total` (example: `34/42`)
- Pick a slot combination from the dropdown (it auto-adds)
- Remaining classes are counted from **today → 20 May**
- **1 May** (Friday) is treated as a holiday (not counted)
- You can override the start date using the **From** date field
- Adjust how many of the remaining classes you’ll attend / skip
- The app updates totals and percentages instantly (no reload)

## Run

Open `index.html` directly in a browser, or run a local server:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## Customize the timetable

Edit `app.js` and update:

- `SLOT_COMBINATIONS` (the pre-made combinations users can pick)
- `TIMETABLE_EVENTS` (the weekly timetable sessions)

Each entry represents **one class session per week**:

```js
{ day: "Tue", time: "09:00", label: "09:00–09:50", slots: ["A1", "SE2"] }
```

If a timetable cell contains multiple slot codes (like `A1/SE2`), list them under `slots`.  
The calculator counts the session **once** if any selected slot matches.
