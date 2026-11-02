# Thinkbit

Virtual math manipulatives with a practice library and a live parent view. Strong foundations first, then contest-style thinking for Math Kangaroo, MOEMS (Math Olympiads for Elementary and Middle Schools) and the Noetic Learning Math Contest.

- **13 manipulatives:** base ten blocks, ten frames, hundred chart, number line, fraction tiles, area model, balance scale, algebra tiles, pattern blocks, tangram, geoboard, cubes (3D, with top/front/side views) and clock.
- **115 built-in tasks in three levels.** *Foundations* builds the basics, *Builder* stretches them, *Challenge* is contest style. Every task checks the work on the board or the answer.
- **Contest-style problems (51, all original).** Kangaroo style uses five choices (A–E). MOEMS style and Noetic style use number answers, like those contests. The manipulatives are there as scratch space.
- **Timed contest practice.** Kangaroo style: 9 problems in 28 minutes, scored 3, 4 or 5 points. MOEMS style: 5 problems in 30 minutes, hardest last. Noetic style: 10 problems in 23 minutes (half a contest). Answers are checked only at the end; any miss can be tried again with a hint.
- **Your own tasks.** Write a question, choose how it is answered (choices A–E, a typed answer, or "just build it"), pick a level and a starting board. Each task has a link: open it on any device to add the task there.
- **Parent's phone (live mode):** see the board live, send any task or a timed practice, build a starting board on your phone, send a message, draw a hint in orange, and see results by level, topic and practice score.

Without live mode, everything still works on one device and nothing leaves it.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app in one file (built from `src/`). GitHub Pages serves this. |
| `database.rules.json` | Rules for your Firebase Realtime Database (only needed for live mode) |
| `src/` | Source: styles and markup (`head.html`), core, the manipulatives (`tools1`–`tools5`), tasks, live mode, boot |
| `test/` | Browser tests (Playwright), including a stand-in for the Firebase SDK |

## 1. Host it free on GitHub Pages

1. `index.html` is already at the root of this repository.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main`, `/ (root)` → Save.** On a free GitHub account the repository must be public for Pages.
3. After about a minute the app is at `https://<your-user>.github.io/<repo>/`.

## 2. Create the free backend for live mode (about 5 minutes, easiest on a computer)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**. Turn Analytics off. It stays on the free Spark plan.
2. **Build → Realtime Database → Create database.** Pick a location, start in **locked mode**.
3. On the **Rules** tab, replace everything with the contents of `database.rules.json` → **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
5. **Project settings → Your apps → Web (`</>`)** → register the app → copy the `firebaseConfig` block.

## 3. Pair the two devices

1. On your phone, open your GitHub Pages address and tap **Live**.
2. Paste the `firebaseConfig`, enter your kid's first name and what they call you, then tap **Connect**.
3. The **Devices** tab shows a QR code and a link. Open it on your kid's tablet or laptop. That device stays paired.
4. From then on:
   - **Assign** sends a task or a timed contest practice. **Make a task** writes your own; its starting board can be your kid's board right now, an empty board, or one you build on your phone (your kid doesn't see it until you send it).
   - **Results** shows practice scores, solved tasks by level and topic, and the latest checks with the answers given.
   - **Message** pops a note on their screen, and the pen draws on their board in orange.

On a paired kid device, tasks are only made from the parent's phone, because the task editor shows the answers.

## Privacy

- Only a first name, the boards, the check results and your own tasks are stored, in a Firebase project that you own.
- The pairing links contain the room key. Anyone with a link can see that board, so keep the links private. Task links contain only the task.
- To unpair a device, tap the Live button (kid) or **Devices → Turn off live mode** (parent).

## Free tier

The Spark plan allows 100 simultaneous connections, 1 GB stored and 10 GB downloaded per month. One kid and one parent use a small fraction of that.

## Develop

```sh
npm install            # Playwright and the QR code library, for the tests
npx playwright install chromium
npm run build          # src/ -> dist/ and the root index.html
npm test               # tool interactions, every task's checker, solo and live flows
```

`sh build.sh` concatenates `src/head.html` and the scripts into one HTML file. There is no bundler and nothing to install to run the app itself.
