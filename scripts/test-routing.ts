import * as fs from 'fs';

// Dynamically detect if running inside a Docker container
const isDocker = fs.existsSync('/.dockerenv') || (process.env.HOSTNAME && /^[a-f0-9]{12}$/.test(process.env.HOSTNAME));

// Inside Docker, Next.js runs on port 3000. On the host, it uses the configured HOST_PORT (default 3031).
const HOST_PORT = process.env.HOST_PORT || '3031';
const DEFAULT_API_URL = isDocker 
  ? 'http://localhost:3000/api/chat' 
  : `http://localhost:${HOST_PORT}/api/chat`;

// Allow manual override of the entire URL for remote testing
const API_URL = process.env.API_URL || DEFAULT_API_URL;

interface TestCase {
  name: string;
  prompt: string;
  expectedRoute: string;
}

// Randomization pools
const imageSubjects = [
  'a futuristic cyberpunk city',
  'a serene Japanese zen garden in autumn',
  'an astronaut riding a horse on Mars',
  'a steampunk airship flying over Victorian London',
  'a glowing bioluminescent forest at night',
  'a majestic dragon perched on a crystal mountain peak',
  'a cozy cabin in a snowy forest with warm glowing windows',
  'a retro 1980s synthwave sports car driving on a neon grid',
  'an underwater city with glass domes and glowing coral reefs',
  'a detailed macro photograph of a dewdrop on a vibrant green leaf',
  'a bustling futuristic marketplace on an alien planet with two moons',
  'a vintage hot air balloon floating over the Swiss Alps at sunrise',
  'a hyper-realistic portrait of a cybernetic samurai',
  'a whimsical treehouse village connected by rope bridges in a giant redwood forest',
  'a surreal landscape where waterfalls flow upwards into a starry sky'
];

const weatherCities = [
  'Paris',
  'Tokyo',
  'New York',
  'London',
  'Sydney',
  'Dubai',
  'Singapore',
  'Reykjavik',
  'Cairo',
  'Toronto',
  'Mumbai',
  'Berlin',
  'Cape Town',
  'Buenos Aires',
  'Seattle'
];

const stockTickers = [
  { name: 'Apple', ticker: 'AAPL' },
  { name: 'Microsoft', ticker: 'MSFT' },
  { name: 'Tesla', ticker: 'TSLA' },
  { name: 'Amazon', ticker: 'AMZN' },
  { name: 'Nvidia', ticker: 'NVDA' },
  { name: 'Meta', ticker: 'META' },
  { name: 'Alphabet', ticker: 'GOOGL' },
  { name: 'AMD', ticker: 'AMD' },
  { name: 'Intel', ticker: 'INTC' },
  { name: 'Coca-Cola', ticker: 'KO' },
  { name: 'McDonalds', ticker: 'MCD' },
  { name: 'Disney', ticker: 'DIS' },
  { name: 'Netflix', ticker: 'NFLX' },
  { name: 'Spotify', ticker: 'SPOT' },
  { name: 'Shopify', ticker: 'SHOP' }
];

const directQuestions = [
  'Explain the concept of recursion in programming in two sentences.',
  'Write a short haiku about artificial intelligence.',
  'What is the difference between a compiled and an interpreted language?',
  'Give me three tips for writing clean code.',
  'Summarize the plot of the movie The Matrix in one paragraph.'
];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getTimestampedThreadName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `Test Run: ${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function runTests() {
  const threadName = getTimestampedThreadName();
  
  // Generate selections first so we can log them
  const randomImage = getRandomItem(imageSubjects);
  const randomCity = getRandomItem(weatherCities);
  const randomStock = getRandomItem(stockTickers);
  const randomDirectQuestion = getRandomItem(directQuestions);
  
  const testCases: TestCase[] = [
    {
      name: 'Initial Test Run Declaration',
      prompt: 'this is a test run go direct',
      expectedRoute: 'direct',
    },
    {
      name: 'Random Direct Reply Test',
      prompt: randomDirectQuestion,
      expectedRoute: 'direct',
    },
    {
      name: 'Time/Timezone Test',
      prompt: 'What is the time?',
      expectedRoute: 'direct',
    },
    {
      name: 'Default Weather Test',
      prompt: 'What is the weather?',
      expectedRoute: 'web_search',
    },
    {
      name: 'Specific Location Weather Test',
      prompt: `What is the time and weather in ${randomCity}?`,
      expectedRoute: 'web_search',
    },
    {
      name: 'Web Search Test',
      prompt: `What is the current stock price of ${randomStock.name} (${randomStock.ticker})?`,
      expectedRoute: 'web_search',
    },
    {
      name: 'Image Generation Test',
      prompt: `Generate an image of ${randomImage}.`,
      expectedRoute: 'image',
    },
  ];

  let currentThreadId: string | null = null;

  console.log('🚀 Starting Automated Routing Tests...\n');
  console.log(`Target API: ${API_URL}`);
  console.log(`Thread Name: ${threadName}`);
  console.log('\n🎲 Random Selections for this run:');
  console.log(`   🖼️  Image: "${randomImage}"`);
  console.log(`   🌤️  Weather City: "${randomCity}"`);
  console.log(`   📈  Stock: ${randomStock.name} (${randomStock.ticker})\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`🧪 Running: ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);

    try {
      const response: Response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: currentThreadId, // Reuse the thread ID after the first request to keep them in one thread
          threadName: threadName,
          messageContent: testCase.prompt,
          selectedModel: 'openai/gpt-4o-mini',
          systemInstruction: 'You are a helpful assistant.',
          bypassRouter: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();

      // Capture the thread ID from the first response to reuse for subsequent messages
      if (!currentThreadId && data.threadId) {
        currentThreadId = data.threadId;
        console.log(`   🧵 Created/Joined Thread ID: ${currentThreadId}`);
      }

      if (!data.response || data.response.trim() === '') {
        throw new Error('Empty response from API');
      }

      const routingTool = data.routingTool || 'unknown';
      console.log(`   Response Routing Tool: ${routingTool}`);

      let routeMatch = false;
      if (testCase.expectedRoute === 'image') {
        routeMatch = routingTool.includes('image') || routingTool.includes('generation') || (routingTool !== 'direct' && routingTool !== 'web_search');
      } else {
        routeMatch = routingTool === testCase.expectedRoute;
      }

      if (routeMatch) {
        console.log(`   ✅ PASS: Correctly routed to ${testCase.expectedRoute}\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Expected route "${testCase.expectedRoute}", but got "${routingTool}"\n`);
        failed++;
      }
    } catch (error: any) {
      console.log(`   ❌ FAIL: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(50));
  console.log('\n💡 Tip: Hit F5 to refresh your browser screen and see the new test thread in your chat history!\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});