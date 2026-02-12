/**
 * Handles graceful shutdown with deferred handler support.
 *
 * This class manages the race condition where quit may be triggered before
 * cleanup handlers are registered. The handler will execute when either:
 * - `quit()` is called (if handler is already set), or
 * - `set_handler()` is called (if quit was already requested)
 *
 * @example
 * ```typescript
 * import { app } from 'electron';
 * import { Quitter } from 'electron-quit-handler';
 *
 * const quitter = new Quitter<void>();
 *
 * // Set up quit listener early
 * app.on('before-quit', (event) => {
 *     event.preventDefault();
 *     quitter.quit().then(() => app.exit());
 * });
 *
 * // Later, register cleanup (may happen before or after quit is called)
 * async function initializeDatabase() {
 *     const db = await connectToDatabase();
 *     quitter.set_handler(async () => {
 *         await db.close();
 *     });
 * }
 * ```
 *
 * @template T - The return type of the cleanup handler
 */
export class Quitter<T = void> {

    /**
     * The handler to be executed when quit is called.
     */
    protected handler: (() => Promise<T>) | null = null;

    /**
     * The promise that resolves when cleanup completes.
     */
    protected quit_promise: Promise<T> | null = null;

    /**
     * Resolver for the quit promise.
     */
    protected resolve_quit: ((value: T | PromiseLike<T>) => void) | null = null;

    /**
     * Rejector for the quit promise.
     */
    protected reject_quit: ((reason?: unknown) => void) | null = null;

    /**
     * Sets the cleanup handler to execute on quit.
     *
     * If quit was already requested, the handler executes immediately.
     *
     * @param handler - Async function that performs cleanup
     */
    public set_handler(handler: () => Promise<T>): void {
        const first_time = this.handler === null;
        this.handler = handler;

        if (this.is_quitting()) {
            if (first_time) {
                this.execute_quit();
            } else {
                console.log('[electron-quit-handler] Handler replaced after quit was requested; new handler will not execute.');
            }
        }
    }

    /**
     * Returns true if quit has been requested.
     */
    public is_quitting(): boolean {
        return this.quit_promise !== null;
    }

    /**
     * Initiates the quit process.
     *
     * @returns Promise that resolves when cleanup completes
     */
    public quit(): Promise<T> {
        if (this.quit_promise) {
            return this.quit_promise;
        }

        this.quit_promise = new Promise<T>((resolve, reject) => {
            this.resolve_quit = resolve;
            this.reject_quit = reject;
        });

        if (this.handler) {
            this.execute_quit();
        }

        return this.quit_promise;
    }

    /**
     * Executes the cleanup handler.
     */
    protected async execute_quit(): Promise<void> {
        if (!this.handler || !this.quit_promise) {
            return;
        }

        try {
            this.resolve_quit!(await this.handler());
        } catch (error: unknown) {
            this.reject_quit!(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Resets the quitter to its initial state.
     * Useful for testing or restarting the quit cycle.
     */
    public reset(): void {
        this.handler = null;
        this.quit_promise = null;
        this.resolve_quit = null;
        this.reject_quit = null;
    }
}
