# Technical Architecture

## System Overview
LeagueDT is a local desktop overlay application that sits on top of the League of Legends game window. It communicates directly with Riot Games APIs from each user's machine to provide real-time coaching insights. The architecture follows a modular, event-driven design optimized for overlay performance and local-only operation.

## Technology Stack

### Overlay UI (Electron)
- **Framework**: React (with TypeScript)
- **UI Library**: shadcn/ui components
- **Styling**: TailwindCSS
- **State Management**: Zustand or Redux Toolkit
- **Build Tool**: Vite
- **Overlay Technology**: Electron transparent window with click-through capability

### Local Backend (Node.js)
- **Runtime**: Node.js (TypeScript)
- **API Client**: Custom wrapper around Riot Games API
- **Rate Limiting**: Built-in rate limiter with in-memory caching
- **Database**: SQLite (local only)
- **Auto-Update**: Electron updater for patches/new content

### Communication
- **IPC**: Electron main/renderer process communication
- **LCU (League Client Utility)**: Local League client protocol for game state detection
- **HTTP/REST**: Direct API communication with Riot services from user's machine

## Architecture Layers

### 1. Overlay Presentation Layer
- **Champion Select Overlay**: Draft phase recommendations displayed over champion select screen
- **In-Game Overlay**: Real-time tips and item suggestions displayed over game window
- **Post-Game Overlay**: Match statistics and improvement insights displayed over end screen
- **Settings Window**: Separate window for configuration and preferences (when not in game)

### 2. Application Layer
- **Recommendation Engine**: Core logic for champion/item suggestions
- **Match Analyzer**: Real-time game state processing
- **Data Aggregator**: Collects and processes match data
- **User Profile Manager**: Tracks player statistics and preferences

### 3. Data Layer
- **API Client**: Handles Riot Games API communication directly from user's machine
- **Cache Manager**: In-memory caching for API responses (no external cache)
- **Local Storage (SQLite)**: User preferences, match history, and statistics
- **Data Processor**: Transforms raw API data into usable formats
- **Auto-Update Manager**: Syncs with Data Dragon for patches, new champions, buffs, nerfs

### 4. Integration Layer
- **League Client Protocol**: Detects game state changes
- **LCU (League Client Utility)**: Safe client interaction
- **File Watcher**: Monitors log files for game events

## Component Architecture

### Core Components

#### APIManager
- Manages API key rotation and rate limiting
- Implements exponential backoff for failed requests
- Caches responses to reduce API calls
- Handles multi-region support

#### RecommendationEngine
- **ChampionPicker**: Analyzes team compositions for optimal picks
- **ItemBuilder**: Suggests items based on game state and enemy composition
- **StrategicAdvisor**: Provides macro-level strategic tips
- **CounterPicker**: Identifies champion counters and synergies

#### MatchTracker
- Polls live match data at optimal intervals
- Tracks gold differentials and objective control
- Monitors player performance metrics
- Detects critical game moments (dragons, barons, etc.)

#### DataManager
- Stores and retrieves match history
- Maintains champion statistics database
- Caches item build data
- Manages user-specific data

## Data Flow

### Champion Selection Phase
1. User enters champion select
2. System detects draft state via LCU
3. API fetches current summoner's champion pool
4. API fetches enemy team composition (if available)
5. RecommendationEngine processes team comps
6. UI displays champion suggestions with reasoning

### In-Game Phase
1. MatchTracker detects active match
2. Periodic polling of live match data (respecting rate limits)
3. Real-time analysis of gold, kills, objectives
4. RecommendationEngine updates item suggestions
5. UI displays contextual tips and warnings

### Post-Game Phase
1. Match completion detected
2. Full match data retrieved
3. Performance analysis generated
4. Improvement suggestions provided
5. Data stored for future learning

## Security Considerations

### API Security
- API keys stored securely (encrypted at rest)
- Key rotation mechanism
- Request signing where applicable
- Rate limit enforcement

### Data Privacy
- Local-only data storage (no cloud)
- All data stays on user's machine
- No data sharing or cloud backup
- No user accounts or authentication required
- Complete user privacy by design

### Anti-Detection Measures
- No memory reading or injection
- No automation of gameplay
- Respectful API polling intervals
- User-agent and request header normalization

## Performance Optimization

### Caching Strategy
- Static data caching (champions, items, runes) from Data Dragon
- Match data caching with TTL in memory
- User-specific data persistence in SQLite
- Auto-sync with Data Dragon on game patches

### Rate Limit Management
- Per-user rate limiting (each user has their own API quota)
- Priority-based request queuing for optimal experience
- Automatic backoff during high load
- Request batching where possible

## Performance Considerations

### Overlay Performance
- Minimal CPU and memory usage to avoid affecting game performance
- Efficient rendering with React optimization
- Click-through capability for non-interactive areas
- Frame rate optimization to match game FPS

### Local Resource Management
- Efficient memory usage
- CPU-bound task optimization
- I/O operation batching
- Connection pooling for API requests

## Deployment Architecture

### Local Development
- Hot-reload development server
- Mock API responses for offline development
- Local SQLite database
- Docker containerization support

### Production Deployment
- Electron desktop application distributed as standalone installer
- Auto-update mechanism for app updates
- Auto-sync with Riot APIs for game patches, new champions, buffs, nerfs
- Optional crash reporting (opt-in)
- No telemetry or data collection (local-only)
