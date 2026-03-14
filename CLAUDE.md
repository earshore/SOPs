# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AihangSOP is an Amazon operations management platform built with a modern, event-driven architecture. The codebase emphasizes type safety, dependency injection, and systematic architectural debt elimination.

## Core Architecture

### 1. Dependency Injection System

The application uses a custom DI container (`src/common/di/Container.ts`) with a service registry pattern:

- **Container**: Manages service lifecycle (singleton/transient) and dependency resolution
- **ServiceRegistry**: Centralized service configuration with dependency declarations
- **ServiceBootstrap**: Initializes services in parallel based on dependency levels

Services are registered in `src/common/di/services/` and initialized during app startup. Always use the container to resolve services rather than direct imports for core infrastructure.

```typescript
// Resolve services from container
const router = container.resolve('router');
const eventBus = container.resolve('eventBus');
```

### 2. Event System Architecture

**Critical**: The project is migrating from `window.dispatchEvent` to a centralized EventBus.

- **EventBus** (`src/common/EventBus.ts`): Type-safe pub/sub system with memory leak detection
- **Event Constants** (`src/common/constants/eventConstants.ts`): All event names defined in `APP_EVENTS`
- **Pattern**: Always use `eventBus.emit()` and `eventBus.on()`, never `window.dispatchEvent()`

**Memory Leak Prevention**: Always store unsubscribe functions and call them in cleanup:
```typescript
// Alpine.js components
const unsubscribe = eventBus.on(APP_EVENTS.SOME_EVENT, handler);
this.$cleanup(() => unsubscribe());

// Module-level subscriptions
export function cleanup() {
  unsubscribeFunction?.();
}
```

### 3. Router System

Modern Navigo-based router with legacy compatibility layer:

- **Core**: `src/common/router/navigo/` - New router implementation
- **Legacy Adapter**: `src/common/router/navigo/LegacyAdapter.ts` - Backward compatibility
- **Initialization**: `src/common/router/initRouter.ts` - Setup and configuration

**Route Registration**: Routes are converted from `MENU_CONFIG` and registered with path prefixes:
- App Center routes: `/app-center/*`
- Keyword Hunter: `/app-center/keyword-hunter/*`
- Other modules: `/{module-id}`

**Navigation**: Use `router.navigate(path)` or emit `APP_EVENTS.ROUTE_CHANGE` event.

### 4. Error Handling System

Structured error types replace generic `Error`:

- **ValidationError**: User input/data validation failures
- **ApiError**: HTTP/API call failures (include statusCode)
- **BusinessError**: Business logic violations
- **SystemError**: Infrastructure/system-level errors

**Pattern**:
```typescript
throw new ValidationError(
  'Invalid input',
  'MODULE_ERROR_001',
  'fieldName',
  value,
  { module: 'ModuleName', action: 'actionName' }
);
```

Error codes use module prefixes (e.g., `SCRAPER_SVC_001`, `LLM_001`).

### 5. Design Token System

**Single Source of Truth**: `src/common/config/design-tokens.ts`

All visual properties (colors, spacing, typography, shadows) are defined here and auto-generated to:
- CSS variables: `src/css/foundation/variables.generated.css`
- Tailwind config: `tailwind.config.generated.js`
- TypeScript types: `src/common/types/design-tokens.generated.ts`

**Workflow**: Modify `design-tokens.ts` → Run `npm run generate:tokens` → Use generated variables

Never hardcode colors, spacing, or other design values. Always use design tokens.

## Module Structure

### Application Modules

Modules are organized by business domain under `src/modules/`:

- **app_center**: AI analysis, scraper, promptlab, keyword hunter, QALab
- **sops**: Standard operating procedures (backend, growth, safety, service)
- **amz_hub**: Amazon knowledge hub
- **more**: Additional tools and workflows

Each module follows this structure:
```
module_name/
├── index.ts           # Module entry point, registers routes/actions
├── views/             # Sub-views and components
│   └── view_name/
│       ├── index.ts   # View initialization
│       ├── components/ # Alpine.js components
│       ├── services/  # Business logic
│       └── handlers/  # Event handlers
└── types/             # Module-specific types
```

### Service Layer

Core services in `src/services/`:

- **llmService.ts**: LLM API integration (OpenAI-compatible)
- **storageService.ts**: Type-safe localStorage wrapper
- **loggerService.ts**: Centralized logging with levels
- **performanceService.ts**: Performance monitoring
- **animation-manager.ts**: Animation settings and reduced motion

Services are initialized via ServiceBootstrap and accessed through DI container.

## Development Workflows

### Running Tests

```bash
# Unit tests
npm run test                    # Run all unit tests
npm run test:ui                 # Interactive test UI
npm run test:coverage           # Generate coverage report

# E2E tests
npm run test:e2e                # Run Playwright tests
npm run test:e2e:ui             # Playwright UI mode
npm run test:e2e:debug          # Debug mode

# Performance tests
npm run test:performance        # Performance benchmarks
npm run lighthouse              # Lighthouse audit
```

### CSS Architecture

```bash
npm run generate:tokens         # Generate all design tokens
npm run css:audit               # Audit CSS variable usage
npm run css:migrate             # Migrate deprecated variables
npm run css:migrate:dry         # Preview migration changes
```

### Code Quality

```bash
npm run lint                    # ESLint check
npm run lint:fix                # Auto-fix issues
npm run type-check              # TypeScript validation
npm run format                  # Prettier formatting
```

## Critical Patterns

### 1. Alpine.js Component Registration

Components must be registered before `Alpine.start()`:

```typescript
// In component file
export function initAlpineComponent() {
  Alpine.data('componentName', () => ({
    // Component logic
    init() {
      // Setup
    },
    $cleanup() {
      // CRITICAL: Clean up subscriptions
      this._unsubscribers?.forEach(unsub => unsub());
    }
  }));
}

// In main.ts (before Alpine.start())
initAlpineComponent();
Alpine.start();
```

### 2. Module Initialization

Modules self-register on import:

```typescript
// module/index.ts
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';

// Listen for route changes
eventBus.on(APP_EVENTS.ROUTE_CHANGED, ({ routeId }) => {
  if (routeId === 'my_module') {
    initializeModule();
  }
});

// Register actions
import { registerActionsWithLegacy } from '@common/utils/actionRegistry';
registerActionsWithLegacy({
  myAction: async (params) => { /* ... */ }
});
```

### 3. Safe Rendering

Never use `innerHTML` with user data. Use `textContent` or sanitization:

```typescript
// ❌ UNSAFE
element.innerHTML = userInput;

// ✅ SAFE
element.textContent = userInput;

// ✅ SAFE (for trusted HTML)
import { sanitizeHtml } from '@common/utils/sanitize';
element.innerHTML = sanitizeHtml(trustedHtml);
```

### 4. Storage Access

Always use StorageService, never direct localStorage:

```typescript
import { storageService } from '@services/storageService';

// Type-safe storage
storageService.set('key', { data: 'value' });
const data = storageService.get<MyType>('key');

// Raw string access
storageService.setRaw('key', 'string');
const str = storageService.getRaw('key');
```

## Architectural Debt Tracking

The project maintains architectural debt documentation in `.kiro/arch-debt/`:

- **debt-list.md**: Complete inventory of technical debt
- **progress.md**: Refactoring progress (currently 79% complete)
- **batch-N-plan.md**: Detailed plans for each refactoring batch

**Current Focus**: Eliminating window events in favor of EventBus, completing error handling standardization.

When modifying code, check if the file is listed in the debt tracker and follow the established patterns.

## Important Conventions

### File Naming
- TypeScript files: camelCase (e.g., `eventBus.ts`)
- Components: PascalCase (e.g., `AlpinePanel.ts`)
- Handlers: camelCase with suffix (e.g., `importHandler.ts`)

### Import Aliases
Use path aliases defined in `tsconfig.json`:
- `@/` - src root
- `@common/` - common utilities
- `@services/` - services
- `@modules/` - modules
- `@components/` - components
- `@router/` - router system

### Event Naming
- Application events: `app:` prefix + kebab-case (e.g., `app:route-changed`)
- Module events: `module:` prefix + kebab-case (e.g., `scraper:scrape-success`)
- Always use constants from `APP_EVENTS` or `MODULE_EVENTS`

### Error Codes
- Format: `MODULE_CATEGORY_NNN` (e.g., `SCRAPER_SVC_001`)
- Use module-specific prefixes for traceability
- Document error codes in error handling

## Performance Considerations

### Lazy Loading
- Chart.js and GridStack are lazy-loaded via `src/common/utils/lazyLibs.js`
- Module CSS is loaded on-demand via `moduleCssLoader`
- Images use lazy loading with `ImageLazyLoader`

### Code Splitting
Vite automatically splits code by:
- Vendor chunks: `vendor-core`, `vendor-charts`, `vendor-markdown`, `vendor-utils`
- Route-based splitting for modules
- CSS code splitting enabled

### Critical CSS
- Critical CSS inlined in `src/css/critical.css`
- Non-critical CSS loaded asynchronously after DOMContentLoaded

## Security Notes

### XSS Prevention
- All user input must be sanitized before rendering
- Use `textContent` for plain text, never `innerHTML` with user data
- HTML templates are static and loaded via Vite's `?raw` import

### API Security
- API keys stored in localStorage (encrypted in production)
- Proxy configuration for development CORS
- Production endpoints validated before use

### Content Security Policy
- Inline scripts avoided where possible
- External resources loaded from trusted CDNs only

## Common Tasks

### Adding a New Module
1. Create module directory under `src/modules/`
2. Add route configuration to `src/common/config/menuConfig.ts`
3. Create `index.ts` with route listener and action registration
4. Register Alpine components before `Alpine.start()`
5. Add module CSS to `src/css/modules/`

### Adding a New Service
1. Create service file in `src/services/`
2. Add service configuration to `src/common/di/services/`
3. Register in `ServiceRegistry` with dependencies
4. Service will be initialized by `ServiceBootstrap`

### Adding a New Event
1. Add constant to `APP_EVENTS` in `src/common/constants/eventConstants.ts`
2. Define TypeScript interface for event payload
3. Use `eventBus.emit()` to trigger, `eventBus.on()` to listen
4. Always clean up subscriptions in component/module cleanup

### Fixing Architectural Debt
1. Check `.kiro/arch-debt/debt-list.md` for the file
2. Follow the established pattern from completed batches
3. Update `progress.md` when complete
4. Run `npm run type-check` to verify changes

## Debugging

### Development Tools
- **Debug Interface**: Available in dev mode via `window.debugInterface`
- **Logger**: `Logger.debug()`, `Logger.info()`, `Logger.warn()`, `Logger.error()`
- **Performance**: `performanceService.getReport()` for metrics
- **EventBus Stats**: `eventBus.getStats()` for listener counts

### Common Issues
- **Alpine component not found**: Ensure component registered before `Alpine.start()`
- **Route not working**: Check path mapping in `initRouter.ts`
- **Event not firing**: Verify event constant exists in `APP_EVENTS`
- **Memory leak**: Check for unsubscribed EventBus listeners
- **Type errors**: Run `npm run type-check` for detailed diagnostics

## Additional Resources

- **CSS Architecture**: See `docs/CSS-ARCHITECTURE-README.md`
- **Routing System**: See `docs/routing-system-analysis-2026-02-28.md` (if exists)
- **Best Practices**: See `docs/best-practices.md`
- **Architectural Debt**: See `.kiro/arch-debt/` directory
