import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3031';

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
  'Paris', 'Tokyo', 'New York', 'London', 'Sydney',
  'Dubai', 'Singapore', 'Reykjavik', 'Cairo', 'Toronto',
  'Mumbai', 'Berlin', 'Cape Town', 'Buenos Aires', 'Seattle'
];

const stockTickers = [
  { name: 'Apple', ticker: 'AAPL' }, { name: 'Microsoft', ticker: 'MSFT' },
  { name: 'Tesla', ticker: 'TSLA' }, { name: 'Amazon', ticker: 'AMZN' },
  { name: 'Nvidia', ticker: 'NVDA' }, { name: 'Meta', ticker: 'META' },
  { name: 'Alphabet', ticker: 'GOOGL' }, { name: 'AMD', ticker: 'AMD' },
  { name: 'Intel', ticker: 'INTC' }, { name: 'Coca-Cola', ticker: 'KO' },
  { name: 'McDonalds', ticker: 'MCD' }, { name: 'Disney', ticker: 'DIS' },
  { name: 'Netflix', ticker: 'NFLX' }, { name: 'Spotify', ticker: 'SPOT' },
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

export async function POST() {
  const randomImage = getRandomItem(imageSubjects);
  const randomCity = getRandomItem(weatherCities);
  const randomStock = getRandomItem(stockTickers);
  const randomDirectQuestion = getRandomItem(directQuestions);

  const testCases = [
    { name: 'Initial Test Run Declaration', prompt: 'this is a test run go direct', expectedRoute: 'direct' },
    { name: 'Random Direct Reply Test', prompt: randomDirectQuestion, expectedRoute: 'direct' },
    { name: 'Time/Timezone Test', prompt: 'What is the time?', expectedRoute: 'direct' },
    { name: 'Default Weather Test', prompt: 'What is the weather?', expectedRoute: 'web_search' },
    { name: 'Specific Location Weather Test', prompt: `What is the time and weather in ${randomCity}?`, expectedRoute: 'web_search' },
    { name: 'Web Search Test', prompt: `What is the current stock price of ${randomStock.name} (${randomStock.ticker})?`, expectedRoute: 'web_search' },
    { name: 'Image Generation Test', prompt: `Generate an image of ${randomImage}.`, expectedRoute: 'image' },
  ];

  const results: any[] = [];
  let currentThreadId: string | null = null;
  const threadName = `UI Test Run: ${new Date().toISOString().replace(/[:.]/g, '-')}`;

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          threadName: threadName,
          messageContent: testCase.prompt,
          selectedModel: 'openai/gpt-4o-mini',
          systemInstruction: 'You are a helpful assistant.',
          bypassRouter: false,
        }),
      });

      const data = await response.json();

      if (!currentThreadId && data.threadId) {
        currentThreadId = data.threadId;
      }

      const routingTool = data.routingTool || 'unknown';
      let routeMatch = false;
      if (testCase.expectedRoute === 'image') {
        routeMatch = routingTool.includes('image') || routingTool.includes('generation') || (routingTool !== 'direct' && routingTool !== 'web_search');
      } else {
        routeMatch = routingTool === testCase.expectedRoute;
      }

      results.push({
        name: testCase.name,
        prompt: testCase.prompt,
        expected: testCase.expectedRoute,
        actual: routingTool,
        passed: routeMatch,
        error: null,
      });
    } catch (error: any) {
      results.push({
        name: testCase.name,
        prompt: testCase.prompt,
        expected: testCase.expectedRoute,
        actual: 'error',
        passed: false,
        error: error.message,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return NextResponse.json({
    threadName,
    threadId: currentThreadId,
    summary: { passed, failed, total: testCases.length },
    results,
  });
}