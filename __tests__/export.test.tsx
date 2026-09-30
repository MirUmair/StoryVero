import React from 'react';
import renderer from 'react-test-renderer';
import { ExportScreen } from '../src/screens/ExportScreen';

const actions = { onCancel: jest.fn(), onBack: jest.fn(), onRetry: jest.fn() };
test('export displays only reported progress and exposes cancellation', async () => {
  let tree!: renderer.ReactTestRenderer;
  await renderer.act(() => {
    tree = renderer.create(
      <ExportScreen
        {...actions}
        state={{ status: 'processing', progress: null }}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('%');
  await renderer.act(() => {
    tree.update(
      <ExportScreen
        {...actions}
        state={{ status: 'processing', progress: 62 }}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('62');
  expect(JSON.stringify(tree.toJSON())).toContain('Cancel export');
  await renderer.act(() => {
    tree.update(<ExportScreen {...actions} state={{ status: 'cancelled' }} />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Back to editor');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Cancel export');
  await renderer.act(() => tree.unmount());
});
test('failure keeps retry and saved-project recovery available', async () => {
  let tree!: renderer.ReactTestRenderer;
  await renderer.act(() => {
    tree = renderer.create(
      <ExportScreen
        {...actions}
        state={{ status: 'failed', message: 'Storage full' }}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Storage full');
  expect(JSON.stringify(tree.toJSON())).toContain('Try again');
  expect(JSON.stringify(tree.toJSON())).toContain('Back to editor');
  await renderer.act(() => tree.unmount());
});
