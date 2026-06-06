# Testing Strategy

## Testing Philosophy
**Test early, test often, automate everything** - Comprehensive testing ensures reliability, maintains compliance, and prevents regressions for the local desktop overlay application.

## Testing Pyramid

```
        /\
       /E2E\          (10% - Critical user flows)
      /------\
     /Integration\     (30% - API and component integration)
    /------------\
   /   Unit Tests \    (60% - Individual functions and components)
  /----------------\
```

## Unit Testing

### Framework
- **Jest** for JavaScript/TypeScript testing
- **React Testing Library** for React components
- **ts-mockito** for mocking

### Coverage Goals
- **Overall Coverage**: 80%+
- **Critical Paths**: 95%+
- **UI Components**: 70%+
- **Business Logic**: 90%+

### Test Categories

#### API Client Tests
```typescript
describe('RiotApiClient', () => {
  it('should respect rate limits', async () => {
    const client = new RiotApiClient({ apiKey: 'test' });
    // Test rate limiting logic
  });

  it('should retry on 429 errors', async () => {
    // Test exponential backoff
  });

  it('should cache responses appropriately', async () => {
    // Test caching logic
  });

  it('should handle API key rotation', async () => {
    // Test key rotation
  });
});
```

#### Recommendation Engine Tests
```typescript
describe('RecommendationEngine', () => {
  describe('ChampionPicker', () => {
    it('should recommend champions that fill team gaps', () => {
      const teamComp = ['TOP', 'JUNGLE', 'MID'];
      const recommendations = engine.pickChampion(teamComp);
      expect(recommendations).toContain(expect.objectContaining({
        role: 'ADC'
      }));
    });

    it('should prioritize user mastery', () => {
      // Test mastery prioritization
    });

    it('should identify counters to enemy champions', () => {
      // Test counter identification
    });
  });

  describe('ItemBuilder', () => {
    it('should recommend defensive items when behind', () => {
      const gameState = createGameState({ goldAdvantage: -2000 });
      const items = engine.buildItems(gameState);
      expect(items).toContain(expect.objectContaining({
        type: 'defensive'
      }));
    });
  });
});
```

#### Data Layer Tests
```typescript
describe('DataManager', () => {
  it('should store and retrieve summoner data', async () => {
    const summoner = createTestSummoner();
    await dataManager.saveSummoner(summoner);
    const retrieved = await dataManager.getSummoner(summoner.id);
    expect(retrieved).toEqual(summoner);
  });

  it('should handle data migrations', async () => {
    // Test migration logic
  });

  it('should validate data before storage', async () => {
    // Test validation
  });
});
```

#### Utility Function Tests
```typescript
describe('RateLimiter', () => {
  it('should enforce per-second limits', async () => {
    const limiter = new RateLimiter({ perSecond: 10 });
    const promises = Array(15).fill(null).map(() => limiter.acquire());
    await expect(Promise.all(promises)).toReject();
  });

  it('should enforce per-two-minute limits', async () => {
    // Test sliding window
  });
});
```

## Integration Testing

### API Integration Tests
```typescript
describe('API Integration', () => {
  it('should fetch summoner data successfully', async () => {
    const client = new RiotApiClient({ apiKey: process.env.TEST_API_KEY });
    const summoner = await client.getSummonerByName('TestSummoner');
    expect(summoner).toHaveProperty('summonerId');
  });

  it('should handle rate limits gracefully', async () => {
    // Test with actual API
  });

  it('should cache responses correctly', async () => {
    // Test caching with real API
  });
});
```

### Component Integration Tests
```typescript
describe('ChampionSelectAssistant', () => {
  it('should display recommendations when team is detected', async () => {
    const { getByText } = render(<ChampionSelectAssistant />);
    // Simulate team detection
    expect(getByText('Recommended Champions')).toBeInTheDocument();
  });

  it('should update when team composition changes', async () => {
    // Test reactive updates
  });
});
```

### Database Integration Tests
```typescript
describe('Database Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should persist data across sessions', async () => {
    // Test database persistence
  });

  it('should handle concurrent writes', async () => {
    // Test concurrency
  });
});
```

## End-to-End Testing

### Framework
- **Playwright** for E2E testing
- **Electron builder** for desktop app testing

### Test Scenarios

#### Champion Select Overlay Flow
```typescript
test('Champion selection overlay flow', async ({ app }) => {
  // Launch application
  const mainWindow = await app.firstWindow();
  
  // Simulate champion select phase via LCU
  await app.evaluate(() => {
    window.mockLCUState({ phase: 'champion_select' });
  });
  
  // Simulate team detection
  await app.evaluate(() => {
    window.mockTeamDetection(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']);
  });
  
  // Verify overlay appears over champion select
  await expect(mainWindow.locator('[data-testid="champion-select-overlay"]')).toBeVisible();
  
  // Verify recommendations are displayed
  await expect(mainWindow.locator('[data-testid="recommendations"]')).toBeVisible();
  
  // Test click-through functionality
  await mainWindow.locator('[data-testid="overlay-background"]').click();
  // Verify click passes through to game (simulated)
});
```

#### In-Game Overlay Flow
```typescript
test('In-game overlay flow', async ({ app }) => {
  const mainWindow = await app.firstWindow();
  
  // Simulate match start via LCU
  await app.evaluate(() => {
    window.mockLCUState({ phase: 'in_game' });
  });
  
  // Verify overlay appears over game
  await expect(mainWindow.locator('[data-testid="live-coach-overlay"]')).toBeVisible();
  
  // Simulate game state update from Spectator API
  await app.evaluate(() => {
    window.mockGameStateUpdate({ goldAdvantage: 1500 });
  });
  
  // Verify item recommendations update
  await expect(mainWindow.locator('[data-testid="item-recommendations"]')).toContainText('offensive');
  
  // Test overlay positioning
  await mainWindow.locator('[data-testid="overlay-header"]').dragTo({ x: 500, y: 100 });
  await expect(mainWindow.locator('[data-testid="live-coach-overlay"]')).toHaveCSS({ top: '100px', left: '500px' });
});
```

#### Post-Game Overlay Flow
```typescript
test('Post-game overlay flow', async ({ app }) => {
  const mainWindow = await app.firstWindow();
  
  // Simulate match end via LCU
  await app.evaluate(() => {
    window.mockLCUState({ phase: 'post_game' });
  });
  
  // Verify overlay appears over end screen
  await expect(mainWindow.locator('[data-testid="post-game-overlay"]')).toBeVisible();
  
  // Verify performance metrics are displayed
  await expect(mainWindow.locator('[data-testid="performance-score"]')).toBeVisible();
  
  // Test auto-dismiss when exiting to lobby
  await app.evaluate(() => {
    window.mockLCUState({ phase: 'lobby' });
  });
  await expect(mainWindow.locator('[data-testid="post-game-overlay"]')).not.toBeVisible();
});
```

## Performance Testing

### Load Testing
```typescript
describe('Performance Tests', () => {
  it('should handle 100 concurrent API requests', async () => {
    const startTime = Date.now();
    const requests = Array(100).fill(null).map(() => 
      apiClient.getSummonerByName('Test')
    );
    await Promise.all(requests);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });

  it('should render champion grid in under 100ms', () => {
    const startTime = performance.now();
    render(<ChampionGrid champions={allChampions} />);
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(100);
  });
});
```

### Memory Testing
- Monitor memory usage during extended sessions
- Test for memory leaks in long-running processes
- Verify proper cleanup of event listeners
- Test database connection pooling

## Compliance Testing

### Rate Limit Compliance
```typescript
describe('Compliance Tests', () => {
  it('should never exceed Riot API rate limits', async () => {
    const limiter = new RateLimiter({
      perSecond: 20,
      perTwoMinutes: 100
    });
    
    // Attempt to exceed limits
    const requests = Array(150).fill(null).map((_, i) => 
      limiter.acquire().then(() => i)
    );
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeLessThanOrEqual(100);
  });

  it('should not read game memory', () => {
    // Verify no memory reading code exists
    const sourceCode = fs.readFileSync('./src', { recursive: true });
    expect(sourceCode).not.toMatch(/process\.memory/);
  });

  it('should not inject code into client', () => {
    // Verify no injection code exists
    const sourceCode = fs.readFileSync('./src', { recursive: true });
    expect(sourceCode).not.toMatch(/inject/);
  });

  it('should only use read-only LCU access', () => {
    // Verify LCU interaction is read-only
    const sourceCode = fs.readFileSync('./src', { recursive: true });
    expect(sourceCode).not.toMatch(/LCU.*write|LCU.*post/);
  });
});
```

### Data Privacy Tests
```typescript
describe('Privacy Tests', () => {
  it('should encrypt sensitive data at rest', async () => {
    const apiKey = 'sensitive-key';
    await storage.save('apiKey', apiKey);
    const stored = await storage.getRaw('apiKey');
    expect(stored).not.toBe(apiKey);
  });

  it('should not send any data externally', async () => {
    // Verify no external network calls except to Riot API
    const networkCalls = await getNetworkCalls();
    const riotApiCalls = networkCalls.filter(call => call.domain.includes('riotgames.com'));
    expect(networkCalls.length).toBe(riotApiCalls.length);
  });
});
```

## Security Testing

### Security Audit Checklist
- [ ] SQL injection prevention (SQLite)
- [ ] XSS prevention (overlay UI)
- [ ] API key security (local encryption)
- [ ] Input validation
- [ ] Output encoding
- [ ] Dependency vulnerability scan
- [ ] Secrets management (local storage)

### Security Tests
```typescript
describe('Security Tests', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });

  it('should validate API responses', async () => {
    const response = await apiClient.getSummonerByName('Test');
    expect(validateSummonerResponse(response)).toBe(true);
  });
});
```

## Accessibility Testing

### Automated Tests
```typescript
describe('Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  });

  it('should be keyboard navigable', () => {
    render(<Navigation />);
    const firstItem = screen.getAllByRole('menuitem')[0];
    firstItem.focus();
    expect(firstItem).toHaveFocus();
  });
});
```

### Manual Testing Checklist
- [ ] Screen reader compatibility
- [ ] High contrast mode
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Color blindness compatibility

## Test Data Management

### Mock Data
```typescript
// test/fixtures/matchData.ts
export const mockMatch = {
  gameId: 12345,
  gameDuration: 1800,
  participants: [
    createMockParticipant({ kills: 10, deaths: 2, assists: 5 }),
    createMockParticipant({ kills: 5, deaths: 8, assists: 3 })
  ]
};

export const mockSummoner = {
  summonerId: 'test-id',
  name: 'TestSummoner',
  level: 150,
  region: 'NA'
};
```

### Test Database
- Separate test database instance
- Clean state before each test
- Seed with consistent test data
- Automatic cleanup after tests

## Continuous Integration

### CI Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### Test Results
- Automatic coverage reporting
- Test result artifacts
- Failure notifications
- Performance trend tracking

## Manual Testing

### Beta Testing Program
- Recruit beta testers from target audience
- Provide test builds regularly
- Collect structured feedback
- Prioritize bug reports
- Track user satisfaction

### Exploratory Testing
- Ad-hoc testing by QA team
- Edge case exploration
- Usability testing
- Cross-platform testing
- Real-world scenario testing

## Test Maintenance

### Test Review Process
- Regular test audits
- Remove obsolete tests
- Update test data
- Refactor test code
- Document test intentions

### Flaky Test Management
- Identify flaky tests
- Isolate root causes
- Fix or disable flaky tests
- Monitor test stability
- Implement retry logic for legitimate flakes

## Testing Tools

### Unit Testing
- Jest
- React Testing Library
- ts-mockito

### Integration Testing
- Testing Library (React integration)
- Local database integration tests

### E2E Testing
- Playwright (Electron mode)
- Spectron (Electron-specific)

### Performance Testing
- Custom performance metrics for overlay
- Memory leak detection
- CPU usage monitoring
- Frame rate impact testing

### Security Testing
- npm audit
- Snyk
- OWASP ZAP

### Code Quality
- ESLint
- Prettier
- TypeScript compiler

## Test Metrics

### Key Metrics to Track
- Test coverage percentage
- Test execution time
- Flaky test rate
- Bug detection rate
- Time to fix bugs
- Test maintenance effort

### Success Criteria
- 80%+ code coverage
- <5% flaky test rate
- <5 minute test suite execution
- 90%+ critical path coverage
- Zero security vulnerabilities in dependencies

## Regression Testing

### Regression Test Suite
- All previously fixed bugs
- Critical user flows
- Performance benchmarks
- Compliance requirements
- Security requirements

### Release Testing
- Full regression suite before release
- Smoke tests on release candidates
- Beta testing with real users
- Performance validation
- Security audit

## Testing Best Practices

### General Guidelines
- Write tests before or with code (TDD)
- Keep tests independent and isolated
- Use descriptive test names
- Test behavior, not implementation
- Keep tests fast and focused
- Mock external dependencies
- Use realistic test data
- Regular test maintenance

### Anti-Patterns to Avoid
- Testing implementation details
- Brittle tests that break easily
- Tests that depend on each other
- Over-mocking
- Testing third-party libraries
- Ignoring flaky tests
- Tests that are too complex
- Skipping tests without justification
