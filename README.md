# Borderline

This repository is a monorepo containing the source code for Borderline, organized into three main workspaces.

## Project Structure

- **`app/`**: The main game application. Built with React, TypeScript, and Vite.
- **`backend/`**: Serverless backend functions managed by Netlify Functions. Uses Drizzle ORM for database interactions.
- **`website/`**: The landing marketing site. Built with Eleventy (11ty).

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Installation

Install dependencies for all workspaces from the root:

```bash
npm install
```

### Development

To run the project locally, you typically need to run the backend (for API functions) alongside either the app or the website.

#### 1. Backend & App (Game Development)

Start the Netlify Functions server (Backend):
```bash
npm run netlify:functions -w backend
# Runs on http://localhost:9999
```

Start the Game App:
```bash
npm run dev -w app
# Runs on http://localhost:5174
```

#### 2. Website Development

Start the Eleventy server:
```bash
npm run dev -w website
# Runs on http://localhost:8080
```

## Building

To build all packages (useful for deployment):

```bash
npm run build
# Runs build:all script which builds website, app, and copies redirects
```

To build individual workspaces:

```bash
npm run build -w app
npm run build -w website
```

## Database

Database migrations are handled by Drizzle Kit in the backend workspace.

```bash
npm run db:migrate
```
