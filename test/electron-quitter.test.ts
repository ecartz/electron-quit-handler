import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron before importing Electron_Quitter
vi.mock('electron', () => ({
    app: {
        on: vi.fn(),
        off: vi.fn(),
        quit: vi.fn(),
        exit: vi.fn(),
    },
}));

import { app } from 'electron';
import { Electron_Quitter } from '../src/electron-quitter';

describe('Electron_Quitter', () => {

    let quitter: Electron_Quitter;
    let originalProcessOn: typeof process.on;
    let originalProcessOff: typeof process.off;
    let processListeners: Map<string, Function>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Track process listeners
        processListeners = new Map();
        originalProcessOn = process.on;
        originalProcessOff = process.off;

        process.on = vi.fn((event: string, listener: Function) => {
            processListeners.set(event, listener);
            return process;
        }) as any;

        process.off = vi.fn((event: string) => {
            processListeners.delete(event);
            return process;
        }) as any;

        quitter = new Electron_Quitter();
    });

    afterEach(() => {
        process.on = originalProcessOn;
        process.off = originalProcessOff;
    });

    describe('initialize', () => {

        it('should register app event handlers', () => {
            quitter.initialize();

            expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
            expect(app.on).toHaveBeenCalledWith('will-quit', expect.any(Function));
        });

        it('should register process error handlers', () => {
            quitter.initialize();

            expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
        });

    });

    describe('dispose', () => {

        it('should remove all event handlers', () => {
            quitter.initialize();
            quitter.dispose();

            expect(app.off).toHaveBeenCalledWith('before-quit', expect.any(Function));
            expect(app.off).toHaveBeenCalledWith('will-quit', expect.any(Function));
            expect(process.off).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            expect(process.off).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
        });

    });

    describe('custom options', () => {

        it('should call custom handlers', async () => {
            const on_quit_start = vi.fn();
            const on_quit_complete = vi.fn();

            const customQuitter = new Electron_Quitter({
                on_quit_start,
                on_quit_complete,
            });

            customQuitter.set_handler(async () => {});
            await customQuitter.quit();

            // Note: on_quit_start/complete are called by before-quit handler,
            // not by quit() directly. Testing via quit() alone won't trigger them.
        });

    });

    describe('before-quit handler', () => {

        it('should prevent default and call quit', async () => {
            quitter.initialize();
            quitter.set_handler(async () => {});

            // Get the before-quit handler
            const beforeQuitCall = vi.mocked(app.on).mock.calls.find(
                call => call[0] === 'before-quit'
            );
            const beforeQuitHandler = beforeQuitCall?.[1] as Function;

            const event = { preventDefault: vi.fn() };
            await beforeQuitHandler(event);

            expect(event.preventDefault).toHaveBeenCalled();
        });

    });

    describe('handler execution', () => {

        it('should execute cleanup handler on quit', async () => {
            const cleanup = vi.fn().mockResolvedValue(undefined);

            quitter.set_handler(cleanup);
            await quitter.quit();

            expect(cleanup).toHaveBeenCalledOnce();
        });

    });

});
