# Resume Review Tool

An automated resume analysis and feedback system built for Technothon 2025. This tool helps job seekers improve their resumes through AI-powered analysis and actionable recommendations.

## Features

- 📄 Multi-format resume upload (PDF, DOC, DOCX, TXT)
- 🎯 Job description matching and analysis
- 🔍 Content quality assessment
- 📊 ATS compatibility checking
- 📈 Comprehensive scoring and feedback
- 📱 Responsive web interface
- 🔒 Secure data handling with automatic cleanup

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI for components
- React Query for state management
- Vite for build tooling
- Vitest for testing

### Backend
- Node.js with Express.js
- TypeScript
- SQLite for data storage
- Redis for caching
- Natural language processing libraries

## Prerequisites

- Node.js 18+ and npm 8+
- Redis server (for caching)
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-review-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   ```

4. **Start Redis server**
   ```bash
   # On macOS with Homebrew
   brew services start redis
   
   # On Ubuntu/Debian
   sudo systemctl start redis-server
   
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API server on http://localhost:5000
   - Frontend development server on http://localhost:3000

## Development

### Project Structure

```
resume-review-tool/
├── frontend/          # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js backend API
│   ├── src/
│   ├── data/          # SQLite database files
│   └── package.json
└── package.json       # Root package.json for workspace
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Building
npm run build            # Build both applications
npm run build:frontend   # Build only frontend
npm run build:backend    # Build only backend

# Testing
npm test                 # Run all tests
npm run test:frontend    # Run frontend tests
npm run test:backend     # Run backend tests

# Code Quality
npm run lint             # Lint all code
npm run format           # Format all code
```

### Environment Variables

#### Backend (.env)
```
PORT=5000
NODE_ENV=development
DB_PATH=./data/resume_review.db
REDIS_URL=redis://localhost:6379
MAX_FILE_SIZE=10485760
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Resume Review Tool
VITE_MAX_FILE_SIZE=10485760
VITE_ACCEPTED_FILE_TYPES=.pdf,.doc,.docx,.txt
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Resume Analysis (Coming Soon)
- `POST /api/upload` - Upload resume file
- `POST /api/analyze` - Analyze resume with optional job description
- `GET /api/results/:id` - Get analysis results
- `GET /api/export/:id` - Export results as PDF

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Quality

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks
- **lint-staged** for pre-commit checks

Code is automatically formatted and linted on commit.

## Testing

- **Backend**: Jest with Supertest for API testing
- **Frontend**: Vitest with React Testing Library

Run tests with:
```bash
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.