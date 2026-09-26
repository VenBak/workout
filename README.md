# Recomp

A workout planner and cut tracker that runs entirely in the browser. It builds a training split for however many days a week you can train, lists every common gym exercise with variations, and logs workouts, calories and body weight so you can see whether you are losing fat while keeping muscle.

No build step, no dependencies, no account. Data is stored in your browser's `localStorage`.

## Features

**Plan.** Choose 1 to 7 training days, which weekdays, and how long a session can be. Recomp picks an evidence-based split for that number of days (full body for 1–3 days, upper/lower for 4, upper/lower plus push/pull/legs for 5, push/pull/legs twice for 6), and you can switch to the alternatives. With fewer days, each session covers more muscles; with short sessions, lower-priority exercises are dropped first; with time to spare, sets are added. Every exercise can be swapped for another that trains the same muscle. A side panel shows weekly sets per muscle against the 10–20 set range.

**Exercises.** Around 105 gym exercises across 20 muscle groups, each with the muscles it also works, a form tip and variations. Filter by muscle, equipment and type, and add any exercise to today's log.

**Log.** A month calendar showing trained days, the net calorie balance and weight for each day. For each day you can:

- log the workout (fill it in from the plan, then record kg and reps per set; the last session's numbers appear as hints),
- log food either from a list of about 120 foods by quantity or by typing a calorie number,
- enter calories burned in training,
- enter your body weight.

**Weight.** Weigh-ins with a 7-day average trend line, the rate of change over the last four weeks, and an assessment against a safe rate of loss.

**Overview.** This week's sessions shown as plates on a barbell, plus gym visits, average weight and average daily deficit, each compared with the previous week (green or red arrow and percentage).

## How the numbers work

The deficit for a day is

$$\text{deficit} = \text{BMR} + \text{everyday activity} + \text{burned in training} - \text{eaten}$$

A negative result is a surplus. You enter your BMR once in Settings. "Everyday activity" is an optional fixed daily amount for walking and moving around, which BMR does not include; leave it at 0 if you log that as burned calories instead.

The BMR estimator uses Mifflin–St Jeor:

$$\text{BMR} = 10W + 6.25H - 5A + s, \qquad s = +5 \text{ (male)}, \; -161 \text{ (female)}$$

with weight $W$ in kg, height $H$ in cm and age $A$ in years. If you enter a body-fat percentage it also shows Katch–McArdle, $370 + 21.6 \cdot \text{lean mass (kg)}$.

Percentage changes on the overview are $(\text{this period} - \text{previous}) / |\text{previous}|$. Whether an arrow is green or red depends on your goal (lose, maintain or gain).

## Deploy on GitHub Pages

1. Create a new repository and push these files to the `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose one of:
   - **GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`) publishes the site on every push to `main`.
   - **Deploy from a branch**, with branch `main` and folder `/ (root)`. The workflow file is then unused and can be deleted.
4. The site appears at `https://<your-username>.github.io/<repository-name>/` after a minute or two.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Your data

Everything is stored in your browser, per device and per browser. Nothing is uploaded. Use **Settings → Export backup** regularly, and **Import backup** to move your data to another device. Clearing site data in the browser deletes it.

## Project structure

```
index.html              App shell and navigation
css/styles.css          All styles, light and dark themes
js/util.js              Date, number and formatting helpers
js/data/exercises.js    Muscles, equipment and the exercise library
js/data/foods.js        Food list for logging by quantity
js/data/programs.js     Splits, day templates, exercise choice and time budgeting
js/store.js             localStorage persistence and derived numbers
js/charts.js            Small SVG charts
js/views/*.js           One file per page
js/app.js               Router, shared actions and start-up
```

The nutrition values are typical averages; your own packaging labels are more accurate, and you can add your own foods in Settings. This app gives general training guidance, not medical advice.
