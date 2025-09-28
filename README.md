# Coding Screensaver for VS Code

An immersive, animated screensaver for Visual Studio Code that simulates live coding by fetching and typing out real code snippets from GitHub.

## How it Works

The screensaver will activate automatically when there has been no activity (typing, clicking, etc.) in VS Code for a set amount of time.

> *Default: 5 minutes (300 seconds)*

*(Note: The original repeated keystroke trigger was removed as it could interfere with the user experience. For a dedicated key-repeat alert, check out the [Wake Up Alarm](https://marketplace.visualstudio.com/items?itemName=Nahceskrap.wakeup-alarm) extension!)*

## Features

- **Live Code from GitHub**: Fetches and displays real, public code Gists from the GitHub community.
- **Language-Aware**: Intelligently tries to find Gists that match the programming language of the file you're currently working on.
- **Syntax Highlighting**: Code is revealed line-by-line with full syntax highlighting for a professional, "loading" effect.
- **Infinite Loop**: Never stops! Once one snippet is finished, it automatically fetches and displays another.
- **Robust Fallback & Spam Filtering**: If GitHub is unavailable or Gist results are spammy, it seamlessly switches to displaying a loop of classic algorithms.
- **Configurable**: Easily change the idle time via VS Code settings.

## Configuration

You can customize the extension's behavior by modifying the following settings in your `settings.json`:

- `screenSaver.idleTimeSeconds`: The number of seconds of inactivity before the screen saver starts. (Default: `300`)
- `screenSaver.typingSpeed`: Typing speed in milliseconds per character while rendering the code. (Default: `40`)

## Development Journey

The entire development process for this extension, from initial idea to final polish, was done in collaboration with the Gemini AI assistant. You can view the complete conversation and development history in [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).
