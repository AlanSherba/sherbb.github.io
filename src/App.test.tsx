import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Blog posts are found with webpack's require.context and rendered with
// ESM-only Markdown packages, neither of which Jest can load.
jest.mock('./BlogPosts', () => ({
  loadBlogPosts: () => Promise.resolve([]),
  blogCategories: () => [],
}));
jest.mock('./components/BlogPostView', () => () => null);

test('renders header name', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  expect(screen.getByText(/Alan Sherba/i)).toBeInTheDocument();
});
