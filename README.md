# 🏎️ Racer Car

A browser-based racing car game built with [Google AI Studio](https://aistudio.google.com/).

**▶️ Play it live:** [racing-car-2.ai.studio](https://racing-car-2.ai.studio)

---

## About

Racer Car is a fast, simple racing game that runs right in your browser. Steer your car, dodge obstacles, and try to beat your best score. No installation needed.

## Features

- Smooth, responsive car controls
- Increasing speed and difficulty as you go
- Score tracking
- Runs in any modern browser, on desktop and mobile

## How to Play

| Action | Keyboard |
| --- | --- |
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Accelerate | `↑` or `W` |
| Brake | `↓` or `S` |

> Adjust this table if your game uses different controls.

## Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/naifislamsarker-rgb/Racer-car.git
   cd Racer-car
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (only if the app uses the Gemini API)
   Create a `.env.local` file and add:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```

5. Open the local URL shown in your terminal (usually `http://localhost:3000`).

## Tech Stack

- Google AI Studio (app generation)
- HTML5 / JavaScript / CSS
- Gemini API (if used)

## Project Structure

```
Racer-car/
├── src/            # Game source code
├── public/         # Static assets
├── index.html      # Entry point
├── package.json
└── README.md
```

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Author

**naifislamsarker-rgb**
GitHub: [@naifislamsarker-rgb](https://github.com/naifislamsarker-rgb)
