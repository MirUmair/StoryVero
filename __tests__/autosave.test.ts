import { Autosave } from '../src/storage/autosave';

test('an older failed write cannot be retried over a newer queued save', async () => {
  let rejectOld: (error: Error) => void = () => {};
  const write = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    )
    .mockResolvedValue(undefined);
  const save = new Autosave<string>(write, jest.fn());
  save.schedule('old');
  const first = save.flush().catch(() => {});
  await jest.advanceTimersByTimeAsync(0);
  save.schedule('new');
  const second = save.flush();
  rejectOld(new Error('temporary disk error'));
  await first;
  await second;
  await save.flush();
  expect(write.mock.calls.map(args => args[0])).toEqual(['old', 'new']);
});
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('debounces frequent updates into the latest snapshot', async () => {
  const write = jest.fn().mockResolvedValue(undefined);
  const save = new Autosave(write, jest.fn());
  save.schedule('a');
  save.schedule('b');
  save.schedule('c');
  expect(write).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(600);
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledWith('c');
});
test('flush serializes in-flight writes and saves pending edits on background', async () => {
  let complete: () => void = () => {};
  const write = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          complete = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const save = new Autosave(write, jest.fn());
  save.schedule('old');
  const first = save.flush();
  await jest.advanceTimersByTimeAsync(0);
  save.schedule('new');
  const second = save.flush();
  expect(write).toHaveBeenCalledTimes(1);
  complete();
  await first;
  await second;
  expect(write.mock.calls.map(args => args[0])).toEqual(['old', 'new']);
});
test('failed save is retained and can be retried', async () => {
  const write = jest
    .fn()
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValue(undefined);
  const onError = jest.fn();
  const save = new Autosave(write, onError);
  save.schedule('keep me');
  await jest.advanceTimersByTimeAsync(600);
  expect(onError).toHaveBeenCalled();
  await save.flush();
  expect(write.mock.calls.map(args => args[0])).toEqual(['keep me', 'keep me']);
});
