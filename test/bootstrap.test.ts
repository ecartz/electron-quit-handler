import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('bootstrap', () => {

    let originalProcessOn: typeof process.on;
    let registeredHandlers: Map<string, Function>;

    beforeEach(() => {
        registeredHandlers = new Map();
        originalProcessOn = process.on;

        process.on = vi.fn((event: string, listener: Function) => {
            registeredHandlers.set(event, listener);
            return process;
        }) as any;
    });

    afterEach(() => {
        process.on = originalProcessOn;
        vi.resetModules();
    });

    it('should register uncaughtException handler', async () => {
        await import('../src/bootstrap');

        expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });

    it('should register unhandledRejection handler', async () => {
        await import('../src/bootstrap');

        expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });

    it('should log uncaught exceptions', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await import('../src/bootstrap');

        const handler = registeredHandlers.get('uncaughtException');
        const error = new Error('Test error');
        handler?.(error);

        expect(consoleError).toHaveBeenCalledWith(
            '[electron-quit-handler] Uncaught exception during bootstrap:',
            'Test error'
        );

        consoleError.mockRestore();
    });

    it('should log unhandled rejections', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await import('../src/bootstrap');

        const handler = registeredHandlers.get('unhandledRejection');
        const reason = new Error('Rejection reason');
        const promise = Promise.reject(reason).catch(() => {});
        handler?.(reason, promise);

        expect(consoleError).toHaveBeenCalledWith(
            '[electron-quit-handler] Unhandled rejection during bootstrap:',
            reason,
            promise
        );

        consoleError.mockRestore();
    });

});
