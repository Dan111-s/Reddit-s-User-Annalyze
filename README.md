# Reddit Research Automation

AI-powered Reddit research tool for Korean content marketing teams.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

3. Run locally:
```
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. In **Environment Variables**, add:
   - Key: `VITE_ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (from console.anthropic.com)
4. Click Deploy — done!

## Notes
- The Anthropic API key is required. Get one at console.anthropic.com
- Each research run uses ~$0.02–0.05 of API credits
