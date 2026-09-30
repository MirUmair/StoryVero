/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let app!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    app = ReactTestRenderer.create(<App />);
  });
  expect(JSON.stringify(app.toJSON())).toContain('Storyvero');
  expect(JSON.stringify(app.toJSON())).toContain('Create Story');
  await ReactTestRenderer.act(() => app.unmount());
});
