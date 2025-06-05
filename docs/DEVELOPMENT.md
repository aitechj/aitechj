# AITechJ Development Guide

## Database Configuration

### Local Development

For local development, you have two options for database connectivity:

#### Option 1: Real Database Connection
```bash
# Set up your local PostgreSQL database
DATABASE_URL=postgresql://username:password@localhost:5432/aitechj_dev
USE_STUB_DB=false
```

#### Option 2: Stub Database (No Database Required)
```bash
# Use stub database for development without setting up PostgreSQL
USE_STUB_DB=true
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `USE_STUB_DB`: Set to `true` to use stub database instead of real connection
- `JWT_SECRET`: Secret key for JWT token generation
- `NEXTAUTH_URL`: Base URL for authentication (http://localhost:3000 for local)

## API Documentation

### Public Endpoints

#### GET /api/public/topics

Returns paginated list of learning topics.

**Query Parameters:**
- `limit` (number): Number of topics per page (default: 12)
- `offset` (number): Number of topics to skip (default: 0)
- `category` (string): Filter by topic category
- `difficulty` (number): Filter by difficulty level (1-4)

**Response:**
```json
{
  "topics": [
    {
      "id": "uuid",
      "title": "React Hooks Tutorial",
      "description": "Learn React Hooks...",
      "difficultyLevel": 2,
      "category": "web-development",
      "estimatedTime": 45,
      "slug": "react-hooks-tutorial",
      "tags": ["react"],
      "createdAt": "2025-06-05T10:56:15.000Z"
    }
  ],
  "pagination": {
    "limit": 12,
    "offset": 0,
    "total": 1
  }
}
```

## Content Management

### Difficulty Levels
1. **Novice** (1): Complete beginners
2. **Beginner** (2): Basic understanding
3. **Intermediate** (3): Some experience
4. **Pro** (4): Advanced practitioners

### QA Workflow
Content goes through three states:
1. **Draft**: Initial creation, not visible to users
2. **Review**: Submitted for approval
3. **Published**: Live and visible to users

### Content Versioning
- Last 5 revisions are kept for each content item
- Admins can rollback to any previous version
- All changes are tracked with timestamps and user attribution

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run with stub database
USE_STUB_DB=true npm run dev
```

## Testing

### Local Testing
```bash
# Test API endpoints
curl "http://localhost:3000/api/public/topics"

# Test with parameters
curl "http://localhost:3000/api/public/topics?limit=5&category=web-development"
```

### Production Testing
```bash
# Build and test production server
npm run build
PORT=3001 npm run start &
curl "http://localhost:3001/api/public/topics"
```
