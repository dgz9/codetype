export type Language = 'javascript' | 'typescript' | 'python' | 'rust' | 'go' | 'c';

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
  // C
  {
    id: 'c-1',
    name: 'Struct Definition',
    language: 'c',
    difficulty: 'easy',
    code: `struct Point {
    int x;
    int y;
};`,
  },
  {
    id: 'c-2',
    name: 'Malloc & Free',
    language: 'c',
    difficulty: 'medium',
    code: `int *arr = (int *)malloc(n * sizeof(int));
if (arr == NULL) return -1;
free(arr);`,
  },
  {
    id: 'c-3',
    name: 'Linked List Node',
    language: 'c',
    difficulty: 'medium',
    code: `struct Node {
    int data;
    struct Node *next;
};

struct Node *new_node(int val) {
    struct Node *node = malloc(sizeof(struct Node));
    node->data = val;
    node->next = NULL;
    return node;
}`,
  },
  {
    id: 'c-4',
    name: 'String Copy',
    language: 'c',
    difficulty: 'easy',
    code: `char dest[256];
strncpy(dest, src, sizeof(dest) - 1);
dest[sizeof(dest) - 1] = '\\0';`,
  },
  {
    id: 'c-5',
    name: 'File Read',
    language: 'c',
    difficulty: 'medium',
    code: `FILE *fp = fopen("data.txt", "r");
if (fp == NULL) {
    perror("fopen");
    return 1;
}
char buf[1024];
while (fgets(buf, sizeof(buf), fp)) {
    printf("%s", buf);
}
fclose(fp);`,
  },
  {
    id: 'c-6',
    name: 'Pointer Swap',
    language: 'c',
    difficulty: 'easy',
    code: `void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}`,
  },
  // New snippets - Feb 2025
  {
    id: 'ts-fetch',
    name: 'Fetch with Types',
    language: 'typescript',
    difficulty: 'medium',
    code: `async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}`,
  },
  {
    id: 'py-listcomp',
    name: 'List Comprehension',
    language: 'python',
    difficulty: 'easy',
    code: `squares = [x ** 2 for x in range(10) if x % 2 == 0]`,
  },
  {
    id: 'rust-option',
    name: 'Option Handling',
    language: 'rust',
    difficulty: 'medium',
    code: `fn find_user(id: u64) -> Option<User> {
    users.iter().find(|u| u.id == id).cloned()
}`,
  },
  {
    id: 'js-destructure',
    name: 'Nested Destructuring',
    language: 'javascript',
    difficulty: 'medium',
    code: `const { data: { users = [] }, error } = await response.json();`,
  },
  {
    id: 'go-map',
    name: 'Map Iteration',
    language: 'go',
    difficulty: 'medium',
    code: `for key, value := range config {
    fmt.Printf("%s = %s\\n", key, value)
}`,
  },
  {
    id: 'ts-generic',
    name: 'Generic Function',
    language: 'typescript',
    difficulty: 'hard',
    code: `function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}`,
  },
  {
    id: 'py-decorator',
    name: 'Retry Decorator',
    language: 'python',
    difficulty: 'hard',
    code: `def retry(max_attempts=3):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for i in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == max_attempts - 1:
                        raise
        return wrapper
    return decorator`,
  },
  {
    id: 'rust-iter',
    name: 'Iterator Chain',
    language: 'rust',
    difficulty: 'hard',
    code: `let total: f64 = orders
    .iter()
    .filter(|o| o.status == Status::Complete)
    .map(|o| o.items.iter().map(|i| i.price).sum::<f64>())
    .sum();`,
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
  { id: 'c', name: 'C', color: '#555555' },
];

// Daily Challenge - same snippet for everyone each day
export function getDailyChallenge(): Snippet {
  const today = new Date();
  // Create a deterministic seed from the date
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // Use seed to pick a snippet consistently
  const index = seed % snippets.length;
  return snippets[index];
}

export function getDailyChallengeDate(): string {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Daily challenge best score tracking
export interface DailyBest {
  date: string;
  wpm: number;
  accuracy: number;
  snippetId: string;
}

export function getDailyBest(): DailyBest | null {
  if (typeof window === 'undefined') return null;
  const today = new Date().toISOString().split('T')[0];
  try {
    const saved = JSON.parse(localStorage.getItem('codetype-daily-best') || 'null');
    if (saved && saved.date === today) return saved;
    return null;
  } catch { return null; }
}

export function saveDailyBest(wpm: number, accuracy: number, snippetId: string): DailyBest {
  const today = new Date().toISOString().split('T')[0];
  const entry: DailyBest = { date: today, wpm, accuracy, snippetId };
  localStorage.setItem('codetype-daily-best', JSON.stringify(entry));
  return entry;
}

// Custom snippet support
export function createCustomSnippet(code: string, name?: string): Snippet {
  return {
    id: 'custom-' + Date.now(),
    code: code.trimEnd(),
    language: 'javascript', // default, doesn't matter for custom
    difficulty: 'medium',
    name: name || 'Custom Snippet',
  };
}

// Save/load custom snippets from localStorage
export function getSavedCustomSnippets(): { code: string; name: string }[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('codetype-custom-snippets') || '[]');
  } catch { return []; }
}

export function saveCustomSnippet(code: string, name: string) {
  const existing = getSavedCustomSnippets();
  const updated = [...existing, { code, name }].slice(-10); // Keep last 10
  localStorage.setItem('codetype-custom-snippets', JSON.stringify(updated));
  return updated;
}

export function deleteCustomSnippet(index: number) {
  const existing = getSavedCustomSnippets();
  existing.splice(index, 1);
  localStorage.setItem('codetype-custom-snippets', JSON.stringify(existing));
  return existing;
}
