# RobotOrchestra Current Status

**Last Updated: 2025-07-25**

## 🚀 Recently Completed

### AI Response Improvements (Jan 25, 2025)
- ✅ Added direct response instruction to all AI API calls
- ✅ AI responses now more concise without conversational fluff
- ✅ Updated AI personalities from family archetypes to gaming personalities
- ✅ Enhanced UI with interactive button effects and visual improvements

### Scoring & Feedback System (Jan 24, 2025)
- ✅ Immediate vote feedback with animations (correct/incorrect)
- ✅ 100-point scoring system for correct human identification
- ✅ Live scoreboard showing all players and rankings
- ✅ Cumulative score tracking across all rounds
- ✅ Score animations when points are earned

### UI Refactoring (Jan 24, 2025)
- ✅ Accordion-based round interface (expand/collapse)
- ✅ Compact fixed scoreboard stays at top
- ✅ Fixed scrolling issues with proper height constraints
- ✅ Current round auto-expands with blue highlight
- ✅ Removed "Player A/B/C" references for anonymity
- ✅ Smaller prompt display without emoji

### Countdown Timer (Jan 24, 2025)
- ✅ 30-second countdown timer for responses
- ✅ Configurable timer per match template (30s default, 60s for admin)
- ✅ Auto-submit when timer expires
- ✅ Visual countdown with color-coded warnings
- ✅ Progress bar and pulsing animations when time is low

## Architecture

- Frontend: React/TypeScript with Vite
- Backend: AWS Lambda functions
- Database: DynamoDB (matches table with composite key: matchId + timestamp)
- AI: AWS Bedrock (Claude models)
- Auth: AWS Cognito

### Data Models

**User Entity** (persistent participants):

- `userId`: UUID
- `userType`: "human" | "ai"
- `displayName`: string
- `isActive`: boolean
- `isAdmin`: boolean (humans only)
- `cognitoId`: string (humans only)
- `email`: string (humans only)
- `personality`: string (AI only - sundown, bandit, maverick)
- `modelConfig`: { provider: "bedrock", model: "claude-3-haiku" | "claude-3-sonnet" }

**Match Templates**:

- `testing_1v3`: 1 human + 3 AI robots (original mode) // only visible to admin users
- `duos_2v2`: 2 humans + 2 AI robots (multi-human mode)
- `duel_2v1`: 2 humans + 1 AI robot (3 players)
- `trios_3v3`: 3 humans + 3 AI robots (6 players)
- `mega_4v4`: 4 humans + 4 AI robots (8 players)

**Match Flow**:

1. Creator selects template and starts match
2. For multi-human: generates 6-character invite code, waits for players
3. When all humans join: assigns random AI users, starts round 1
4. Players respond anonymously to prompts
5. Responses shuffled and presented for voting
6. After 5 rounds: reveal identities and final scores

## Completed Features

### User System

- Persistent users table (human and AI)
- 3 AI personalities with unique traits (sundown, bandit, maverick)
- User service for CRUD operations

### Multi-Human Matches

- Template-based match creation (1v3, 2v2)
- 6-character invite codes
- Waiting room with player status
- Join flow for all users
- Dynamic identity assignment
- Auto-start when ready

### Core Gameplay

- 5-round matches with AI-generated prompts
- Real-time response collection
- Voting on human identity
- Results and scoring
- Match history tracking

## Deployment

```bash
# Backend
cd infrastructure
./scripts/deploy-lambdas.sh

# Frontend
cd infrastructure
./scripts/deploy-frontend.sh
```

## Recent Updates (2025-07-24)

### N vs M Match Support

- **Extended Identity System**: Now supports up to 8 players (A through H)
- **New Match Templates**: Added 3, 6, and 8 player configurations
- **Dynamic Layouts**: Frontend adapts grid layouts based on participant count
- **Flexible AI Assignment**: Robot personalities cycle for >3 AI players
- **Backward Compatible**: Existing 4-player matches continue to work
- **Comprehensive Testing**: Added integration tests for all new templates
- **Documentation**: Created detailed architecture guide in docs/N_VS_M_ARCHITECTURE.md

## Recent Updates (2025-07-23)

- **Added Admin Debug Mode**: Shows AI metadata during matches
  - Toggle button in bottom-right corner (admin users only)
  - Displays participant AI/Human status, personalities
  - Shows fallback response indicators
  - Real-time voting tracking
  - Full match state inspection
- **CloudWatch Monitoring**: Added scripts for metrics and dashboard
  - setup-cloudwatch-metrics.sh creates metric filters
  - create-cloudwatch-dashboard.sh builds monitoring dashboard
  - Tracks AI prompt failures, match activity, errors
- **Improved Testing**: Added comprehensive integration tests for 2v2 flow
- **Code Documentation**: Added TODO comments for future >4 player support
- **Identity Refactor Plan**: Documented approach to align with NOMENCLATURE.md

## Recent Fixes (2025-07-22)

- Fixed join match bug: UpdateCommand conditionally includes :waitingFor field
- Implemented AI-generated prompts using AI service
- Fixed schema validation to support variable participant counts (1-N during waiting)
- Added totalParticipants field from match template
- Fixed WaitingRoom to not reveal AI/Human player types
- Fixed TypeScript errors with Zod schema refinements
- **Fixed 2v2 Match Bug**: Both players can now see prompts and play normally
  - Fixed identity lookup to use userId instead of !p.isAI
  - Store currentUserId in sessionStorage for identity resolution
  - AI responses now trigger after ALL humans have responded
  - AI voting triggers after ALL humans have voted
  - Replaced RobotResponseStatus with anonymous ParticipantWaitingStatus

## Known Issues

- **AI prompt generation failing**: Model name format mismatch causes fallback to hardcoded prompts (see AI_PROMPT_FIX.md)
- **No invite code input on dashboard**: Must use full URL to join matches (no way to enter just the code)
- Invite code lookup uses table scan instead of GSI (performance concern at scale)
- No real-time updates when other players join or make moves

## Technical Implementation Details

### Response Anonymization

- Backend stores responses by userId
- Generates unique responseId for each response
- Creates responseMapping: responseId → userId
- Shuffles and presents responses by responseId
- Votes use responseId, backend resolves to userId for scoring

### Database Schema

- **users table**: Persistent user entities (human and AI)
- **matches table**: Match state with composite key (matchId + timestamp=0)
  - Uses table scan for invite code lookup (needs GSI for production)
- **Future**: match_templates table for configurable templates

## Next Steps

- **Fix AI prompt generation** (change model name format - see AI_PROMPT_FIX.md)
- **Add invite code input field** on dashboard
- **Implement identity refactor** (see IDENTITY_REFACTOR_PLAN.md)
- Add GSI for invite code lookups (performance improvement)
- WebSocket real-time updates
  -- Email/SMS notifications for invites as well as "it's your turn to play, (name)":
- Error handling for player disconnections
- Code splitting to reduce frontend bundle size (currently 522KB)
