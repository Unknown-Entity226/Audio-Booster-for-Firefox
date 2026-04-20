# Audio Enhancer For Firefox

A powerful and lightweight Firefox extension that enhances your browsing audio experience with real-time controls like volume boosting, stereo panning, mono conversion, and channel flipping.

## Screenshot:
<img width="473" height="381" alt="image" src="https://github.com/user-attachments/assets/5f4db9b4-cecc-4c17-8e71-d8a0a7591042" />
<img width="483" height="385" alt="image" src="https://github.com/user-attachments/assets/3382e7a5-3dc3-46db-ab5c-d7025536d3a3" />


## Features

- Volume Boost (Gain Control): Increase audio beyond 100% using Web Audio API.
- Stereo Panning: Shift audio between left and right channels.
- Mono Audio Mode: Combine stereo channels into a single output.
- Channel Flip: Swap left and right audio channels.
- Mute and Reset Controls: Quickly mute or restore default settings.
- Real-time Processing: Changes apply instantly without reloading the page.
- Multi-Media Support: Works on all audio and video elements dynamically.

## How It Works

This extension injects a content script that uses the Web Audio API to create an audio processing pipeline:

Media Element -> Gain -> Compressor -> Channel Split -> Channel Merge -> Pan -> Output

Each media element on the page gets its own processing pipeline, allowing fine-grained control over audio behavior.

## Tech Stack

- JavaScript (Vanilla)
- Web Audio API
- Firefox Extension APIs (Manifest V3)
- HTML + CSS (Popup UI)

## Project Structure

audio-booster/
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── popup.css
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md

## Usage

1. Open any website with audio/video (e.g., YouTube)
2. Click the extension icon
3. Adjust:
   - Gain (volume boost)
   - Pan (left/right)
   - Mono / Flip options
4. Changes apply instantly

## Limitations

Does not work on:
- DRM-protected content (Netflix, Prime Video)
- Cross-origin iframe audio (e.g., embedded Spotify players)
These require tab-level audio capture (future enhancement).

## Future Improvements

- Per-audio element controls
- Tab-level audio capture support
- Equalizer / bass boost
- Presets (Music / Movie / Voice)
- UI/UX refinements

## License

MIT License

## Author

Aarav Gupta
GitHub: https://github.com/Unknown-Entity226

## Contributing

Contributions, issues, and feature requests are welcome.

## Note

This project demonstrates real-time audio manipulation inside the browser using the Web Audio API and is intended for educational and practical use.
