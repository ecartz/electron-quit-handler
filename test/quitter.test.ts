import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Quitter } from '../src/quitter';

describe('Quitter', () => {

    let quitter: Quitter<void>;

    beforeEach(() => {
        quitter = new Quitter();
    });

    describe('quit before handler set', () => {

        it('should wait for handler and then execute it', async () => {
            const handler = vi.fn().mockResolvedValue(undefined);

            const quit_promise = quitter.quit();

            expect(quitter.is_quitting()).toBe(true);
            expect(handler).not.toHaveBeenCalled();

            quitter.set_handler(handler);

            await quit_promise;

            expect(handler).toHaveBeenCalledOnce();
        });

    });

    describe('handler set before quit', () => {

        it('should execute handler immediately on quit', async () => {
            const handler = vi.fn().mockResolvedValue(undefined);

            quitter.set_handler(handler);
            expect(handler).not.toHaveBeenCalled();

            await quitter.quit();

            expect(handler).toHaveBeenCalledOnce();
        });

    });

    describe('multiple quit calls', () => {

        it('should return the same promise', () => {
            const promise1 = quitter.quit();
            const promise2 = quitter.quit();

            expect(promise1).toBe(promise2);
        });

        it('should only execute handler once', async () => {
            const handler = vi.fn().mockResolvedValue(undefined);
            quitter.set_handler(handler);

            await Promise.all([quitter.quit(), quitter.quit()]);

            expect(handler).toHaveBeenCalledOnce();
        });

    });

    describe('handler replaced while quitting', () => {

        it('should log a warning and not execute the new handler', async () => {
            const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
            const handler1 = vi.fn().mockResolvedValue(undefined);
            const handler2 = vi.fn().mockResolvedValue(undefined);

            quitter.set_handler(handler1);
            const quit_promise = quitter.quit();

            quitter.set_handler(handler2);

            await quit_promise;

            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).not.toHaveBeenCalled();
            expect(consoleLog).toHaveBeenCalledWith(
                '[electron-quit-handler] Handler replaced after quit was requested; new handler will not execute.'
            );

            consoleLog.mockRestore();
        });

    });

    describe('handler errors', () => {

        it('should reject quit promise when handler throws', async () => {
            const error = new Error('Cleanup failed');
            quitter.set_handler(async () => { throw error; });

            await expect(quitter.quit()).rejects.toThrow('Cleanup failed');
        });

        it('should convert non-Error throws to Error', async () => {
            quitter.set_handler(async () => { throw 'string error'; });

            await expect(quitter.quit()).rejects.toThrow('string error');
        });

    });

    describe('reset', () => {

        it('should allow quitting again after reset', async () => {
            const handler1 = vi.fn().mockResolvedValue(undefined);
            const handler2 = vi.fn().mockResolvedValue(undefined);

            quitter.set_handler(handler1);
            await quitter.quit();

            quitter.reset();

            quitter.set_handler(handler2);
            await quitter.quit();

            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).toHaveBeenCalledOnce();
        });

    });

    describe('with return value', () => {

        it('should resolve with handler return value', async () => {
            const quitter_with_value = new Quitter<string>();
            quitter_with_value.set_handler(async () => 'cleanup result');

            const result = await quitter_with_value.quit();

            expect(result).toBe('cleanup result');
        });

    });

});
