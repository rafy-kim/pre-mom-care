# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pre-Mom Care (예비맘 안심톡)** - An AI-powered pregnancy support chatbot application built with Remix, TypeScript, and PostgreSQL. The application provides personalized pregnancy advice through an AI assistant named "안심이" (Ansim-i), leveraging RAG (Retrieval-Augmented Generation) with Google's Gemini AI and embedded pregnancy-related content from books, YouTube videos, and research papers.

## Key Development Commands

```bash
# Development
npm run dev                    # Start development server (port 5173)
npm run build                  # Build for production
npm start                      # Run production server

# Code Quality
npm run lint                   # Run ESLint
npm run typecheck             # Run TypeScript type checking

# Database Management
npm run db:generate           # Generate Drizzle schema migrations
npm run db:migrate            # Apply database migrations

# Data Processing Scripts
npm run collect-youtube       # Scrape YouTube videos
npm run extract-transcripts   # Extract YouTube transcripts (v1)
npm run extract-transcripts-v2 # Extract YouTube transcripts (v2)
npm run embed-books          # Embed book content
npm run embed:youtube        # Embed YouTube content
```

## Architecture & Core Systems

### 1. Authentication System (Clerk)
- **Dual Mode**: Supports both authenticated users and guest sessions
- **Guest Access**: Allows `/chat` usage without login (1 question per session)
- **Social Login**: Integrated via Clerk's SignInButton component
- **User Context**: Different UI/logic based on authentication state

### 2. Freemium Model & Payment System
- **Membership Tiers**: `basic`, `premium`, `expert`
- **Question Limits**: 
  - Daily: 3 free questions
  - Weekly: 10 free questions  
  - Monthly: 30 free questions
  - Premium: Unlimited (₩4,900/month)
- **Mock Mode**: Set `FREEMIUM_MOCK_MODE=true` for testing without AI API costs
- **Payment Integration**: PortOne V2 for subscription management

### 3. AI & RAG System
- **AI Model**: Google Gemini 2.5 Flash
- **Embedding Model**: gemini-embedding-exp-03-07
- **Vector Database**: PostgreSQL with pgvector (3072 dimensions)
- **Content Sources**: Books, YouTube videos, research papers
- **Permission Filtering**: Content access based on membership tier
- **Cost Tracking**: Built-in token usage and cost calculation

### 4. Streaming Chat System
- **Real-time Responses**: Server-Sent Events (SSE) for streaming AI responses
- **Hook**: `useStreamingChat` for managing streaming state
- **Endpoints**: `/api/chat/stream` for SSE streaming

### 5. Database Schema (Drizzle ORM)
- **User System**: `user_profiles` with membership tiers and question tracking
- **Chat System**: `chats`, `messages` with JSONB content storage
- **RAG System**: `documents` with vector embeddings
- **Payment System**: `subscriptions`, `payments`, `card_billing_keys`
- **Bookmark System**: User bookmarks for messages

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# AI Services
GOOGLE_AI_API_KEY=...

# Payment (PortOne V2)
PORTONE_STORE_ID=store-...
PORTONE_CHANNEL_KEY=channel-key-...
PORTONE_API_SECRET=...

# Feature Flags
FREEMIUM_MOCK_MODE=true|false  # Enable mock responses for testing
```

## Critical Implementation Details

### API Rate Limiting & Freemium Logic
- Server-side validation in `/api/gemini.ts`
- Automatic counter resets (daily/weekly/monthly)
- Database-backed usage tracking
- Guest session limit handled client-side

### Vector Search & RAG
- Similarity threshold: 0.6
- Document limit: 5 per query
- Permission-based filtering by `ref_type`
- Grouped context formatting for better AI responses

### Streaming Implementation
- Uses native EventSource API
- Handles connection lifecycle and errors
- Progressive token streaming with source attribution
- Abort controller for request cancellation

### Payment Flow
1. Card billing key registration
2. Subscription creation with auto-renewal
3. Payment confirmation webhooks
4. Membership tier updates on successful payment

## Project-Specific Patterns

### Error Handling
- Freemium blocks return HTTP 429 with `freemiumBlock: true`
- AI parsing errors are caught and logged with raw responses
- Database errors default to basic tier permissions

### Content Grouping
- YouTube videos group by videoId with timestamp aggregation
- Books group consecutive pages into ranges
- Papers maintain individual references

### Mock Response System
- Keyword-based response selection
- Simulated 1-2 second delay
- Identical JSON structure to real API
- Zero-cost testing environment

## Testing Approach

### Mock Mode Testing
```bash
# Enable mock mode
FREEMIUM_MOCK_MODE=true npm run dev

# Test with curl
curl -X POST localhost:5173/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"message": "test question"}'
```

### Database Testing
- Use migrations for schema changes
- Test with different membership tiers
- Verify counter resets at boundaries

## Performance Considerations

- Parallel processing for embeddings and history formatting
- Limited chat history to 6 messages (3 turns)
- Efficient vector search with pre-filtering
- Token usage monitoring and cost calculation
- Database connection pooling for concurrent requests

<vooster-docs>
- @vooster-docs/prd.md
- @vooster-docs/step-by-step.md
- @vooster-docs/tdd.md
- @vooster-docs/clean-code.md
- @vooster-docs/git-commit-message.md
</vooster-docs>