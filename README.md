# 🌸 Kanji Adventure

A bilingual kanji learning web app for English-native elementary school children. **Fully offline-capable** — works without internet after initial page load.

Covers Grade 1 (80 kanji) and Grade 2 (160 kanji) of the Japanese curriculum, totaling 240 kanji.

## Features

- **240 kanji** with meaning, readings, stroke counts, and 2 example sentences each (Japanese + English)
- **Stroke order animation** using KanjiVG (same data as jisho.org)
- **Offline handwriting recognition** for kanji + hiragana + katakana (392 patterns total)
- **3 drill types**: Reading (読み), Writing (書き), Application (応用 / 4-choice)
- **10 themed categories**: Numbers, Nature, Animals, Body, School, People, Town, Time, Colors, Action
- **Progress tracking** with completion stamps
- **Read aloud** with Web Speech API (Japanese pronunciation)
- **iPad-optimized** with touch-friendly controls
- **Zero ongoing cost** — no API keys, no subscription, no server needed

## Setup (Deployment Guide)

No API key required! Just upload the files to GitHub Pages or any static host.

### Step 1: Deploy to GitHub Pages

1. Create a new GitHub repository (e.g., `kanji-adventure`)
2. Upload all files (preserving folder structure):
   ```
   kanji-adventure/
   ├── index.html
   ├── style.css
   ├── app.js
   ├── config.js
   ├── lib/
   │   ├── kanji-canvas.min.js
   │   └── combined-patterns.js
   └── data/
       ├── kanji-master.json
       ├── kanjivg-svgs.json
       └── drills.json
   ```
3. Go to **Settings → Pages**
4. Set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`
5. Wait ~1 minute for deployment
6. Access at `https://YOUR-USERNAME.github.io/kanji-adventure/`

### Step 2: Use on iPad

1. Open Safari on iPad
2. Navigate to your GitHub Pages URL
3. Add to Home Screen (Share → Add to Home Screen) for full-screen experience
4. Best viewed in landscape orientation
5. **Once loaded, the app works fully offline** — no internet required for drills or recognition

## Offline Capability

After the initial page load, **everything works offline**:

| Feature | Online Required? |
|---|---|
| Browsing kanji & themes | ❌ No |
| Stroke order animation | ❌ No |
| Handwriting recognition (reading drill) | ❌ No |
| Handwriting recognition (writing drill) | ❌ No |
| Application drill (4-choice) | ❌ No |
| Read aloud (TTS) | ❌ No (uses iOS built-in voices) |
| Progress tracking | ❌ No (session-only) |

The handwriting recognition uses [Kanji Canvas](https://github.com/asdfjkl/kanjicanvas) (GPL) with custom-generated kana patterns from KanjiVG. All 392 reference patterns (240 kanji + 152 hiragana/katakana) are bundled in the app.

## Recognition Accuracy

Internal testing showed:
- **Kanji recognition**: ~95% top-3 accuracy
- **Hiragana/katakana recognition**: ~80% top-5 accuracy
- The app marks answers correct if the target appears in the top 5 candidates (lenient mode for children)

## File Structure

| File | Size | Purpose |
|---|---|---|
| `index.html` | 8 KB | App skeleton, all screens |
| `style.css` | 25 KB | Sakura Soft theme styling |
| `app.js` | 35 KB | App logic, drills, recognition, animations |
| `config.js` | <1 KB | Configuration (no API key needed) |
| `lib/kanji-canvas.min.js` | 16 KB | Recognition engine |
| `lib/combined-patterns.js` | 742 KB | 392 reference patterns (kanji + kana) |
| `data/kanji-master.json` | 96 KB | 240 kanji metadata |
| `data/kanjivg-svgs.json` | 803 KB | Stroke order SVG data |
| `data/drills.json` | 121 KB | 60 drill courses |
| **Total** | **~1.85 MB** | Well within GitHub Pages 1 GB limit |

## Keyboard Shortcuts

- **← / →** : Navigate between kanji on detail page
- **Space / Enter** : Trigger stroke animation
- **ESC** : Back to previous screen

## Credits

- **KanjiVG**: Stroke order data by Ulrich Apel, CC BY-SA 3.0
- **Kanji Canvas**: Recognition algorithm by asdfjkl, GPL

## License

For personal/educational use.

