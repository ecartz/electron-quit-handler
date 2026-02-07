/**
 * Early error handlers for Electron main process.
 *
 * Import this at the very top of your main entry point to catch
 * errors that occur before Electron_Quitter is initialized.
 *
 * @example
 * ```typescript
 * // main.ts - first line
 * import 'electron-quit-handler/bootstrap';
 *
 * import { app } from 'electron';
 * import { Electron_Quitter } from 'electron-quit-handler';
 * // ...
 * ```
 */

process.on('uncaughtException', (error: Error) => {
    console.error('[electron-quit-handler] Uncaught exception during bootstrap:', error.message);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('[electron-quit-handler] Unhandled rejection during bootstrap:', reason, promise);
});
