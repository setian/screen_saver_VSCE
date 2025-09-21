# Coding Screensaver for VS Code

An immersive, animated screensaver for Visual Studio Code that simulates live coding by fetching and typing out real code snippets from GitHub.

## Features

- **Dual Activation Modes**: Activates automatically after a configurable period of inactivity or after repeated key presses.
- **Live Code from GitHub**: Fetches and displays real, public code Gists from the GitHub community.
- **Language-Aware**: Intelligently tries to find Gists that match the programming language of the file you're currently working on.
- **Live Syntax Highlighting**: Code is "typed" out with full syntax highlighting, character by character, for a realistic effect.
- **Infinite Loop**: Never stops! Once one snippet is finished, it automatically fetches and displays another.
- **Robust Fallback System**: If GitHub is unavailable (e.g., due to rate limits or network issues), it seamlessly switches to displaying a loop of classic algorithms like Quicksort.
- **Highly Configurable**: Easily change the idle time and key press trigger count via VS Code settings.

## Configuration

You can customize the extension's behavior by modifying the following settings in your `settings.json`:

- `screenSaver.idleTimeSeconds`: The number of seconds of inactivity before the screensaver starts. (Default: `60`)
- `screenSaver.triggerCount`: The number of repeated key presses to trigger the screensaver. (Default: `20`)
- `screenSaver.excludedKeys`: A list of keys to ignore for the repeat-press trigger. (Default: `["<delete>"]`)

## Development Journey

The entire development process for this extension, from initial idea to final polish, was done in collaboration with the Gemini AI assistant. You can view the complete conversation and development history in [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).
