# electron-quit-handler

Graceful shutdown handling for Electron apps with deferred cleanup support.

## The Problem

In Electron apps, you often need to:
1. Set up quit handlers early (in `main.ts`)
2. Register cleanup logic later (after async initialization)

These can happen in either order, creating a race condition where the app might quit before your cleanup handler is even registered. `electron-quit-handler` ensures that once a quit is initiated, it will wait for the cleanup handler to be set (if not already) and then execute it before allowing the app to exit.

## Installation

```bash
npm install electron-quit-handler
```

## Usage

### Basic Usage

```typescript
import { Electron_Quitter } from 'electron-quit-handler';

// Early in main process
const quitter = new Electron_Quitter();
quitter.initialize();

// Later, after async initialization
async function initializeApp() {
    const db = await connectToDatabase();
    const server = await startServer();

    quitter.set_handler(async () => {
        await server.close();
        await db.disconnect();
    });
}
```

### With Custom Logging & Hooks

```typescript
import { Electron_Quitter } from 'electron-quit-handler';
import { logger } from './logger';

const quitter = new Electron_Quitter({
    on_quit_start: () => logger.info('Shutting down...'),
    on_quit_complete: () => logger.info('Shutdown complete'),
    on_quit_error: (error) => logger.error('Shutdown failed', error),
    on_uncaught_exception: (error) => logger.error('Uncaught exception', error),
    on_unhandled_rejection: (reason) => logger.error('Unhandled rejection', reason),
});
```

### Using Base Quitter (Non-Electron)

The base `Quitter` class can be used in any JavaScript environment (e.g., a CLI tool):

```typescript
import { Quitter } from 'electron-quit-handler';

const quitter = new Quitter<void>();

// Handle SIGTERM
process.on('SIGTERM', () => {
    quitter.quit().then(() => process.exit(0));
});

// Later, register cleanup
quitter.set_handler(async () => {
    await cleanup();
});
```

## API

### `Quitter<T>`

Base class for deferred quit handling.

- `set_handler(handler: () => Promise<T>)` - Set the cleanup handler
- `quit(): Promise<T>` - Initiate shutdown, returns when cleanup completes
- `is_quitting(): boolean` - Check if quit has been requested
- `reset()` - Reset to initial state (useful for testing)

### `Electron_Quitter`

Extends `Quitter<void>` with Electron integration.

- `initialize()` - Register Electron app event handlers
- `dispose()` - Remove all event handlers

Automatically handles:
- `before-quit` event
- `will-quit` event
- Uncaught exceptions
- Unhandled promise rejections

### `bootstrap` (side-effect-only)

Early error handlers for `uncaughtException` and `unhandledRejection`. This module exports nothing — importing it registers the handlers as a side effect. Configure as a bundler entry point to catch parse errors, import errors, and runtime errors in your main file:

```js
// webpack.config.js
module.exports = {
  entry: {
    main: ['electron-quit-handler/bootstrap', './src/main.ts'],
  },
  // ...
};
```

Bootstrap's error handlers are registered before your main file is parsed, so even syntax errors will be caught and logged rather than silently crashing.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build
```

## License

LGPL-3.0

