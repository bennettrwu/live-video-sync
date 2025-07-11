import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

describe('Application', () => {
  it('counts clicks', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('count is 2');
  });
});
