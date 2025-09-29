# Coding Screensaver for VS Code

An immersive, animated screensaver for Visual Studio Code that simulates live coding by fetching and typing out real code snippets from GitHub.

## How it Works

The screensaver will activate automatically when there has been no activity (typing, clicking, etc.) in VS Code for a set amount of time.

> *Default: 5 minutes (300 seconds)*

*(Note: The original repeated keystroke trigger was removed as it could interfere with the user experience. For a dedicated key-repeat alert, check out the [Wake Up Alarm](https://marketplace.visualstudio.com/items?itemName=Nahceskrap.wakeup-alarm) extension!)*

## Features

- **Real Snippets from Curated Repos**: Pulls code from TheAlgorithms, 30 Seconds of Code, wtfjs/wtfpython, hello-world, and more—matched to the language of the active editor whenever possible.
- **Highlight.js 비주얼**: 코드가 타이핑될 때 highlight.js가 입혀져 편집기처럼 알록달록한 색상으로 표시됩니다.
- **라이선스 헤더 즉시 노출**: `// Source`와 `// License` 줄은 한 번에 표시하고, 본문만 타이핑 애니메이션으로 재생해 읽기 흐름을 방해하지 않습니다.
- **GitHub Rate Limit 대비**: GitHub 403(요청 제한)을 만나면 해당 저장소를 잠시 쿨다운하고, 그 사이에는 로컬 오프라인 스니펫으로 자연스럽게 대체합니다.
- **Offline Snippet Pool**: 네트워크가 끊겨도 여러 언어의 짧은 트릭·밈·퀴즈 코드가 준비되어 있어 끊김 없이 즐길 수 있습니다.
- **Infinite Loop**: 한 스니펫이 끝나면 자동으로 다음 스니펫을 불러 옵니다.
- **Configurable**: VS Code 설정에서 대기 시간과 타이핑 속도를 원하는 대로 조절할 수 있습니다.

## Configuration

You can customize the extension's behavior by modifying the following settings in your `settings.json`:

- `screenSaver.idleTimeSeconds`: The number of seconds of inactivity before the screen saver starts. (Default: `300`)
- `screenSaver.typingSpeed`: Typing speed in milliseconds per character while rendering the code. (Default: `40`)

## Development Journey

The entire development process for this extension, from initial idea to final polish, was done in collaboration with the Gemini AI assistant. You can view the complete conversation and development history in [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).

## Share Your Snippets

아이디어나 재미있는 코드 조각이 있으면 언제든지 Issue나 PR로 추천해 주세요! 새로운 밈·퀴즈·미니 알고리즘을 추가해서 스크린세이버가 더 다채로워질 수 있도록 기다리고 있습니다.
