import { app } from 'electron';
import { Quitter } from './quitter';

export interface Electron_Quitter_Options {
    /**
     * Called when an uncaught exception occurs.
     * Default: logs to console.error
     */
    on_uncaught_exception?: (error: Error) => void;

    /**
     * Called when an unhandled promise rejection occurs.
     * Default: logs to console.error
     */
    on_unhandled_rejection?: (reason: unknown) => void;

    /**
     * Called during normal quit flow for logging/debugging.
     * Default: logs to console.log
     */
    on_quit_start?: () => void;

    /**
     * Called when cleanup completes successfully.
     * Default: logs to console.log
     */
    on_quit_complete?: () => void;

    /**
     * Called when cleanup fails.
     * Default: logs to console.error
     */
    on_quit_error?: (error: unknown) => void;
}

/**
 * Electron-specific quit handler that integrates with app lifecycle events.
 *
 * Handles:
 * - `before-quit` and `will-quit` events
 * - Uncaught exceptions
 * - Unhandled promise rejections
 *
 * @example
 * ```typescript
 * import { Electron_Quitter } from 'electron-quit-handler';
 *
 * const quitter = new Electron_Quitter();
 * quitter.initialize();
 *
 * // Later, set up cleanup
 * quitter.set_handler(async () => {
 *     await saveApplicationState();
 *     await closeAllWindows();
 * });
 * ```
 */
export class Electron_Quitter extends Quitter<void> {

    private readonly options: Required<Electron_Quitter_Options>;

    public constructor(options: Electron_Quitter_Options = {}) {
        super();
        this.options = {
            on_uncaught_exception: options.on_uncaught_exception ?? ((error) => {
                console.error('[electron-quit-handler] Uncaught exception:', error);
            }),
            on_unhandled_rejection: options.on_unhandled_rejection ?? ((reason) => {
                console.error('[electron-quit-handler] Unhandled rejection:', reason);
            }),
            on_quit_start: options.on_quit_start ?? (() => {
                console.log('[electron-quit-handler] Quit requested, cleaning up...');
            }),
            on_quit_complete: options.on_quit_complete ?? (() => {
                console.log('[electron-quit-handler] Cleanup complete, exiting.');
            }),
            on_quit_error: options.on_quit_error ?? ((error) => {
                console.error('[electron-quit-handler] Cleanup failed:', error);
            }),
        };
    }

    /**
     * Registers handlers for Electron app events and process errors.
     * Call this early in your main process initialization.
     */
    public initialize(): void {
        process.on('uncaughtException', this.handle_uncaught_exception);
        process.on('unhandledRejection', this.handle_unhandled_rejection);
        app.on('before-quit', this.handle_before_quit);
        app.on('will-quit', this.handle_will_quit);
    }

    /**
     * Removes all registered event handlers.
     * Useful for testing or when replacing the quitter instance.
     */
    public dispose(): void {
        process.off('uncaughtException', this.handle_uncaught_exception);
        process.off('unhandledRejection', this.handle_unhandled_rejection);
        app.off('before-quit', this.handle_before_quit);
        app.off('will-quit', this.handle_will_quit);
    }

    private readonly handle_uncaught_exception = (error: Error): void => {
        this.options.on_uncaught_exception(error);
        this.quit().finally(() => process.exit(1));
    };

    private readonly handle_unhandled_rejection = (reason: unknown): void => {
        this.options.on_unhandled_rejection(reason);
        this.quit().finally(() => process.exit(1));
    };

    private readonly handle_before_quit = async (event: Electron.Event): Promise<void> => {
        if (this.is_quitting()) {
            return;
        }

        event.preventDefault();
        this.options.on_quit_start();

        try {
            await this.quit();
            this.options.on_quit_complete();
            app.exit(0);
        } catch (error) {
            this.options.on_quit_error(error);
            app.exit(1);
        }
    };

    private readonly handle_will_quit = async (event: Electron.Event): Promise<void> => {
        if (this.is_quitting()) {
            return;
        }

        event.preventDefault();
        this.options.on_quit_start();

        try {
            await this.quit();
            this.options.on_quit_complete();
            app.exit(0);
        } catch (error) {
            this.options.on_quit_error(error);
            app.exit(1);
        }
    };
}
