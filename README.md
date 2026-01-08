# Eleven Views Platform

All-in-One AI-powered business platform for modern enterprises.

## Features

- Dashboard with key metrics and insights
- Leads management with Kanban board
- Clients and campaigns tracking
- Email Builder for campaigns
- AI Tools suite for strategy and creation
- Media generation studio
- Assets management
- Team collaboration
- Reports and analytics
- Integrations hub

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repo:
   ```bash
   git clone git@github.com:YOUR_ORG/eleven-views-platform.git
   cd eleven-views-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- Google AI for AI features
- Supabase for backend (optional)
- Baserow for data management (optional)
