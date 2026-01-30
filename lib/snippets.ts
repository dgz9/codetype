export type Language = 'javascript' | 'typescript' | 'python' | 'rust' | 'go';

export interface Snippet {
  id: string;
  code: string;
  language: Language;
  difficulty: 'easy' | 'medium' | 'hard';
  name: string;
}

export const snippets: Snippet[] = [
  // JavaScript - Easy
  {
    id: 'js-1',
    name: 'Array Map',
    language: 'javascript',
    difficulty: 'easy',
    code: `const doubled = numbers.map(n => n * 2);`,
  },
  {
    id: 'js-2',
    name: 'Arrow Function',
    language: 'javascript',
    difficulty: 'easy',
    code: `const greet = (name) => \`Hello, \${name}!\`;`,
  },
  {
    id: 'js-3',
    name: 'Destructuring',
    language: 'javascript',
    difficulty: 'easy',
    code: `const { name, age } = user;`,
  },
  {
    id: 'js-4',
    name: 'Spread Operator',
    language: 'javascript',
    difficulty: 'easy',
    code: `const merged = { ...defaults, ...options };`,
  },
  {
    id: 'js-5',
    name: 'Filter Array',
    language: 'javascript',
    difficulty: 'easy',
    code: `const adults = users.filter(u => u.age >= 18);`,
  },
  // JavaScript - Medium
  {
    id: 'js-6',
    name: 'Promise Chain',
    language: 'javascript',
    difficulty: 'medium',
    code: `fetch(url)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`,
  },
  {
    id: 'js-7',
    name: 'Async/Await',
    language: 'javascript',
    difficulty: 'medium',
    code: `async function fetchUser(id) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`,
  },
  {
    id: 'js-8',
    name: 'Reduce',
    language: 'javascript',
    difficulty: 'medium',
    code: `const sum = numbers.reduce((acc, n) => acc + n, 0);`,
  },
  // TypeScript
  {
    id: 'ts-1',
    name: 'Interface',
    language: 'typescript',
    difficulty: 'easy',
    code: `interface User {
  id: number;
  name: string;
  email: string;
}`,
  },
  {
    id: 'ts-2',
    name: 'Generic Function',
    language: 'typescript',
    difficulty: 'medium',
    code: `function first<T>(arr: T[]): T | undefined {
  return arr[0];
}`,
  },
  {
    id: 'ts-3',
    name: 'Type Guard',
    language: 'typescript',
    difficulty: 'hard',
    code: `function isString(value: unknown): value is string {
  return typeof value === 'string';
}`,
  },
  {
    id: 'ts-4',
    name: 'Mapped Type',
    language: 'typescript',
    difficulty: 'hard',
    code: `type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};`,
  },
  // Python
  {
    id: 'py-1',
    name: 'List Comprehension',
    language: 'python',
    difficulty: 'easy',
    code: `squares = [x**2 for x in range(10)]`,
  },
  {
    id: 'py-2',
    name: 'Dict Comprehension',
    language: 'python',
    difficulty: 'medium',
    code: `word_lengths = {word: len(word) for word in words}`,
  },
  {
    id: 'py-3',
    name: 'Decorator',
    language: 'python',
    difficulty: 'hard',
    code: `def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Took {time.time() - start:.2f}s")
        return result
    return wrapper`,
  },
  {
    id: 'py-4',
    name: 'Context Manager',
    language: 'python',
    difficulty: 'medium',
    code: `with open('file.txt', 'r') as f:
    content = f.read()`,
  },
  // Rust
  {
    id: 'rs-1',
    name: 'Match Expression',
    language: 'rust',
    difficulty: 'medium',
    code: `match result {
    Ok(value) => println!("{}", value),
    Err(e) => eprintln!("Error: {}", e),
}`,
  },
  {
    id: 'rs-2',
    name: 'Option Handling',
    language: 'rust',
    difficulty: 'medium',
    code: `let name = user.name.unwrap_or("Anonymous".to_string());`,
  },
  {
    id: 'rs-3',
    name: 'Iterator Chain',
    language: 'rust',
    difficulty: 'hard',
    code: `let sum: i32 = numbers.iter().filter(|&n| *n > 0).sum();`,
  },
  // Go
  {
    id: 'go-1',
    name: 'Error Handling',
    language: 'go',
    difficulty: 'easy',
    code: `if err != nil {
    return fmt.Errorf("failed: %w", err)
}`,
  },
  {
    id: 'go-2',
    name: 'Goroutine',
    language: 'go',
    difficulty: 'medium',
    code: `go func() {
    result <- doWork()
}()`,
  },
  {
    id: 'go-3',
    name: 'Defer',
    language: 'go',
    difficulty: 'easy',
    code: `defer file.Close()`,
  },
];

export type Difficulty = 'easy' | 'medium' | 'hard';

export function getRandomSnippet(language?: Language, difficulty?: Difficulty): Snippet {
  let filtered = snippets;
  if (language) filtered = filtered.filter(s => s.language === language);
  if (difficulty) filtered = filtered.filter(s => s.difficulty === difficulty);
  if (filtered.length === 0) filtered = snippets; // Fallback if no match
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export const difficulties: { id: Difficulty; label: string; color: string }[] = [
  { id: 'easy', label: 'Easy', color: '#22c55e' },
  { id: 'medium', label: 'Medium', color: '#eab308' },
  { id: 'hard', label: 'Hard', color: '#ef4444' },
];

export const languages: { id: Language; name: string; color: string }[] = [
  { id: 'javascript', name: 'JavaScript', color: '#f7df1e' },
  { id: 'typescript', name: 'TypeScript', color: '#3178c6' },
  { id: 'python', name: 'Python', color: '#3776ab' },
  { id: 'rust', name: 'Rust', color: '#dea584' },
  { id: 'go', name: 'Go', color: '#00add8' },
];
