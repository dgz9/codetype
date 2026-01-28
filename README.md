# CodeType ⌨️

> Typing practice for developers — type real code snippets

Improve your coding speed by practicing with actual code patterns from JavaScript, TypeScript, Python, Rust, and Go.

## Features

- ⌨️ Type real code snippets, not random words
- 🎯 Track WPM and accuracy in real-time
- 🌈 Multiple languages (JS, TS, Python, Rust, Go)
- 📊 Difficulty levels (easy, medium, hard)
- 🎨 Beautiful dark theme with syntax-like highlighting

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Adding Snippets

Add new code snippets in `lib/snippets.ts`. Each snippet needs:
- `id`: Unique identifier
- `code`: The actual code to type
- `language`: javascript | typescript | python | rust | go
- `difficulty`: easy | medium | hard
- `name`: Display name

## License

MIT

---

Made with 🦞 by [Luke](https://luke-lobster-site.vercel.app)
