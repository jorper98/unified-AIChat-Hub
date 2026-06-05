const WEATHER_KEYWORDS = ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'snow', 'wind', 'humidity', 'degrees', 'celsius', 'fahrenheit'];

function isWeatherRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return WEATHER_KEYWORDS.some(keyword => lower.includes(keyword));
}

function extractWeatherLocation(message: string, defaultLocation: string): string {
  const patterns = [
    /weather\s+(?:in|for|at)\s+([a-zA-Z0-9\s,.-]+)/i,
    /(?:what'|what's|how's)\s+(?:the\s+)?weather\s+(?:in|for|at)\s+([a-zA-Z0-9\s,.-]+)/i,
    /temperature\s+(?:in|for|at)\s+([a-zA-Z0-9\s,.-]+)/i,
    /forecast\s+(?:for|in|at)\s+([a-zA-Z0-9\s,.-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let location = match[1].trim();
      // Clean up trailing punctuation and common stop words
      location = location.replace(/[?!.]+$/, '').trim();
      // Remove common trailing words that aren't part of location
      const stopWords = ['right now', 'today', 'tomorrow', 'this week', 'please', 'thanks', 'thank you'];
      for (const stop of stopWords) {
        if (location.toLowerCase().endsWith(stop)) {
          location = location.slice(0, -stop.length).trim();
        }
      }
      if (location.length > 1 && location.length < 100) {
        return location;
      }
    }
  }

  return defaultLocation;
}

export async function buildSystemContext(messageContent: string): Promise<string> {
  const timezone = process.env.TIMEZONE || 'UTC';
  const defaultWeatherLocation = process.env.WEATHER_LOCATION || '';

  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const dateStr = dateFormatter.format(now);
  const timeStr = timeFormatter.format(now);

  let context = `Current date and time: ${dateStr}.
When the user asks about the time, date, or day of week, use the current date and time provided above as the authoritative answer. Do NOT say you lack access to real-time information — you have it right here.`;

  if (defaultWeatherLocation && isWeatherRelated(messageContent)) {
    const targetLocation = extractWeatherLocation(messageContent, defaultWeatherLocation);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const weatherResponse = await fetch(
        `https://wttr.in/${encodeURIComponent(targetLocation)}?format=%C,+%t+(%f),+wind+%w`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (weatherResponse.ok) {
        const weatherText = await weatherResponse.text();
        context += `\nCurrent weather in ${targetLocation}: ${weatherText.trim()}.`;
      }
    } catch {
      // Weather fetch failed or timed out - continue without weather
    }
  }

  return context;
}
