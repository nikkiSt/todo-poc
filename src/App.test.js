import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// ── Fixtures ────────────────────────────────────────────────────────────────

const mockGroup = {
  id: '1',
  title: 'Test Group',
  todos: [],
};

const mockGroupWithTodos = {
  id: '1',
  title: 'Test Group',
  todos: [
    { id: 101, text: 'Active Todo',    completed: false },
    { id: 102, text: 'Completed Todo', completed: true  },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a fetch mock that replies with each response in order.
 * The last response is reused for any extra calls.
 */
function mockFetchSequence(responses) {
  let i = 0;
  global.fetch = jest.fn(() => {
    const res = responses[Math.min(i++, responses.length - 1)];
    return Promise.resolve({ json: () => Promise.resolve(res) });
  });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Default: empty groups list on initial load
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve([]) })
  );
  // Suppress alert() calls from the fetch error handler
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.resetAllMocks();
});

// ── 1. Rendering ─────────────────────────────────────────────────────────────

describe('Rendering', () => {
  test('shows loading indicator initially', () => {
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders page title after loading', async () => {
    render(<App />);
    expect(await screen.findByText('Todo List')).toBeInTheDocument();
  });

  test('shows empty state when no groups exist', async () => {
    render(<App />);
    expect(await screen.findByText(/No groups yet/i)).toBeInTheDocument();
  });

  test('renders groups fetched from the server on mount', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([mockGroup]) })
    );
    render(<App />);
    expect(await screen.findByText('Test Group')).toBeInTheDocument();
  });

  test('renders all filter buttons', async () => {
    render(<App />);
    await screen.findByText('Todo List');
    expect(screen.getByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-active')).toBeInTheDocument();
    expect(screen.getByTestId('filter-completed')).toBeInTheDocument();
  });

  test('shows alert when server is unreachable', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    render(<App />);
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});

// ── 2. Group operations ───────────────────────────────────────────────────────

describe('Group operations', () => {
  test('adds a new group on button click', async () => {
    mockFetchSequence([[], { id: '2', title: 'New Group', todos: [] }]);
    render(<App />);
    await screen.findByText('Todo List');

    userEvent.type(screen.getByTestId('group-input'), 'New Group');
    userEvent.click(screen.getByTestId('add-group-btn'));

    expect(await screen.findByText('New Group')).toBeInTheDocument();
  });

  test('adds a new group on Enter key', async () => {
    mockFetchSequence([[], { id: '2', title: 'Enter Group', todos: [] }]);
    render(<App />);
    await screen.findByText('Todo List');

    userEvent.type(screen.getByTestId('group-input'), 'Enter Group{enter}');

    expect(await screen.findByText('Enter Group')).toBeInTheDocument();
  });

  test('does not add a group with blank title', async () => {
    render(<App />);
    await screen.findByText('Todo List');

    userEvent.click(screen.getByTestId('add-group-btn'));

    // Only the initial GET should have been called — no POST
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('clears the group input after adding', async () => {
    mockFetchSequence([[], { id: '2', title: 'New Group', todos: [] }]);
    render(<App />);
    await screen.findByText('Todo List');

    const input = screen.getByTestId('group-input');
    userEvent.type(input, 'New Group');
    userEvent.click(screen.getByTestId('add-group-btn'));

    await screen.findByText('New Group');
    expect(input.value).toBe('');
  });

  test('deletes a group and removes it from the list', async () => {
    mockFetchSequence([[mockGroup], {}]);
    render(<App />);
    await screen.findByText('Test Group');

    userEvent.click(screen.getByTestId('delete-group-btn'));

    await waitFor(() =>
      expect(screen.queryByText('Test Group')).not.toBeInTheDocument()
    );
  });

  test('calls DELETE endpoint when removing a group', async () => {
    mockFetchSequence([[mockGroup], {}]);
    render(<App />);
    await screen.findByText('Test Group');

    userEvent.click(screen.getByTestId('delete-group-btn'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/groups/1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    );
  });
});

// ── 3. Todo operations ───────────────────────────────────────────────────────

describe('Todo operations', () => {
  const groupWithOneTodo = {
    ...mockGroup,
    todos: [{ id: 201, text: 'Buy groceries', completed: false }],
  };

  test('adds a todo to a group', async () => {
    mockFetchSequence([[mockGroup], groupWithOneTodo]);
    render(<App />);
    await screen.findByText('Test Group');

    userEvent.type(screen.getByTestId('todo-input'), 'Buy groceries');
    userEvent.click(screen.getByTestId('add-btn'));

    expect(await screen.findByText('Buy groceries')).toBeInTheDocument();
  });

  test('adds a todo on Enter key', async () => {
    mockFetchSequence([[mockGroup], groupWithOneTodo]);
    render(<App />);
    await screen.findByText('Test Group');

    userEvent.type(screen.getByTestId('todo-input'), 'Buy groceries{enter}');

    expect(await screen.findByText('Buy groceries')).toBeInTheDocument();
  });

  test('does not add a todo with blank text', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([mockGroup]) })
    );
    render(<App />);
    await screen.findByText('Test Group');

    userEvent.click(screen.getByTestId('add-btn'));

    // Only the initial GET — no PATCH
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('clears todo input after adding', async () => {
    mockFetchSequence([[mockGroup], groupWithOneTodo]);
    render(<App />);
    await screen.findByText('Test Group');

    const input = screen.getByTestId('todo-input');
    userEvent.type(input, 'Buy groceries');
    userEvent.click(screen.getByTestId('add-btn'));

    await screen.findByText('Buy groceries');
    expect(input.value).toBe('');
  });

  test('deletes a todo from a group', async () => {
    mockFetchSequence([[groupWithOneTodo], { ...mockGroup, todos: [] }]);
    render(<App />);
    await screen.findByText('Buy groceries');

    userEvent.click(screen.getByTestId('delete-btn'));

    await waitFor(() =>
      expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument()
    );
  });

  test('marks a todo as completed when checkbox is clicked', async () => {
    const completedGroup = {
      ...mockGroup,
      todos: [{ id: 201, text: 'Buy groceries', completed: true }],
    };
    mockFetchSequence([[groupWithOneTodo], completedGroup]);
    render(<App />);
    await screen.findByText('Buy groceries');

    userEvent.click(screen.getByRole('checkbox'));

    await waitFor(() =>
      expect(screen.getByText('Buy groceries')).toHaveClass('completed')
    );
  });

  test('shows correct item count for incomplete todos', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([mockGroupWithTodos]) })
    );
    render(<App />);
    // 1 active + 1 completed → "1 item(s) left"
    expect(await screen.findByText('1 item(s) left')).toBeInTheDocument();
  });

  test('shows "No todos to show" when group has no todos', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([mockGroup]) })
    );
    render(<App />);
    await screen.findByText('Test Group');
    expect(screen.getByText('No todos to show.')).toBeInTheDocument();
  });
});

// ── 4. Filter functionality ──────────────────────────────────────────────────

describe('Filter functionality', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([mockGroupWithTodos]) })
    );
  });

  test('"All" filter shows every todo', async () => {
    render(<App />);
    await screen.findByText('Active Todo');
    expect(screen.getByText('Active Todo')).toBeInTheDocument();
    expect(screen.getByText('Completed Todo')).toBeInTheDocument();
  });

  test('"Active" filter shows only incomplete todos', async () => {
    render(<App />);
    await screen.findByText('Active Todo');

    userEvent.click(screen.getByTestId('filter-active'));

    expect(screen.getByText('Active Todo')).toBeInTheDocument();
    expect(screen.queryByText('Completed Todo')).not.toBeInTheDocument();
  });

  test('"Completed" filter shows only completed todos', async () => {
    render(<App />);
    await screen.findByText('Active Todo');

    userEvent.click(screen.getByTestId('filter-completed'));

    expect(screen.queryByText('Active Todo')).not.toBeInTheDocument();
    expect(screen.getByText('Completed Todo')).toBeInTheDocument();
  });

  test('active filter button gets "active" class', async () => {
    render(<App />);
    await screen.findByText('Todo List');

    const activeBtn = screen.getByTestId('filter-active');
    userEvent.click(activeBtn);

    expect(activeBtn).toHaveClass('active');
    expect(screen.getByTestId('filter-all')).not.toHaveClass('active');
  });

  test('switching back to "All" shows all todos again', async () => {
    render(<App />);
    await screen.findByText('Active Todo');

    userEvent.click(screen.getByTestId('filter-completed'));
    userEvent.click(screen.getByTestId('filter-all'));

    expect(screen.getByText('Active Todo')).toBeInTheDocument();
    expect(screen.getByText('Completed Todo')).toBeInTheDocument();
  });
});
