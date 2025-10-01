# Coding Screensaver for VS Code

An immersive, animated screensaver for Visual Studio Code that simulates live coding by fetching and typing out real code snippets from GitHub.

## How it Works

The screensaver will activate automatically when there has been no activity (typing, clicking, etc.) in VS Code for a set amount of time.

> *Default: 5 minutes (300 seconds)*

*(Note: The original repeated keystroke trigger was removed as it could interfere with the user experience. For a dedicated key-repeat alert, check out the [Wake Up Alarm](https://marketplace.visualstudio.com/items?itemName=Nahceskrap.wakeup-alarm) extension!)*

## Features

- **Real Snippets from Curated Repos**: Pulls code from TheAlgorithms, 30 Seconds of Code, wtfjs/wtfpython, hello-world, and more—matched to the language of the active editor whenever possible.
- **Immediate License Header**: The `// Source` and `// License` lines appear instantly, while the body plays back via the typing animation to preserve the reading flow.
- **GitHub Rate-Limit Handling**: When a 403 rate-limit response arrives, the extension cools that repository down and seamlessly falls back to local offline snippets.
- **Offline Code Pack**: A curated `docs/code-pack.json` keeps multilingual tricks, memes, and interview questions ready when GitHub is unavailable.
- **All-Activity Idle Detection**: Watches keyboard, mouse, terminal, notebook, and even screensaver webview activity so it only launches when you are truly idle.
- **Infinite Loop**: Each snippet hands off to the next one automatically.
- **Per-Repo Selection**: Pick exactly which GitHub sources to draw from with the `Screen Saver: Select Repositories` command.
- **Configurable**: Adjust the idle timeout and typing speed from the VS Code settings UI or `settings.json`.

## Configuration

You can customize the extension's behavior by modifying the following settings in your `settings.json`:

- `screenSaver.idleTimeSeconds`: The number of seconds of inactivity before the screen saver starts. (Default: `300`, minimum: `5`)
- `screenSaver.typingSpeed`: Typing speed in milliseconds per character while rendering the code. (Default: `40`)
- `screenSaver.repositories.enabled`: Array of repository identifiers to use. Run `Screen Saver: Select Repositories` for a checkbox picker.

## Development Journey

The entire development process for this extension, from initial idea to final polish, was done in collaboration with the Gemini AI assistant. You can view the complete conversation and development history in [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).

## Share Your Snippets

If you have fun snippet ideas, clever memes, or mini algorithms to share, open an issue or PR any time—we'd love to keep the screensaver fresh and surprising.


## License
MIT
