import { useState, useEffect } from "react";
import "./App.css";

const FILTERS = ["All", "Active", "Completed"];
const API = "http://localhost:3001/groups";

export default function TodoApp() {
  const [groups, setGroups] = useState([]);
  const [groupInput, setGroupInput] = useState("");
  const [filter, setFilter] = useState("All");
  const [todoInputs, setTodoInputs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(() => alert("Could not connect to json-server. Run: npm run server"))
      .finally(() => setLoading(false));
  }, []);

  // --- Group operations ---
  const addGroup = async () => {
    const title = groupInput.trim();
    if (!title) return;
    const createdAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, todos: [], createdAt }),
    });
    const saved = await res.json();
    setGroups([...groups, saved]);
    setGroupInput("");
  };

  const deleteGroup = async (groupId) => {
    await fetch(`${API}/${groupId}`, { method: "DELETE" });
    setGroups(groups.filter(g => g.id !== groupId));
  };

  // --- Todo operations ---
  const addTodo = async (groupId) => {
    const text = (todoInputs[groupId] || "").trim();
    if (!text) return;
    const group = groups.find(g => g.id === groupId);
    const updatedTodos = [...group.todos, { id: Date.now(), text, completed: false }];
    const res = await fetch(`${API}/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: updatedTodos }),
    });
    const updated = await res.json();
    setGroups(groups.map(g => g.id === groupId ? updated : g));
    setTodoInputs({ ...todoInputs, [groupId]: "" });
  };

  const toggleTodo = async (groupId, todoId) => {
    const group = groups.find(g => g.id === groupId);
    const updatedTodos = group.todos.map(t =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    const res = await fetch(`${API}/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: updatedTodos }),
    });
    const updated = await res.json();
    setGroups(groups.map(g => g.id === groupId ? updated : g));
  };

  const deleteTodo = async (groupId, todoId) => {
    const group = groups.find(g => g.id === groupId);
    const updatedTodos = group.todos.filter(t => t.id !== todoId);
    const res = await fetch(`${API}/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: updatedTodos }),
    });
    const updated = await res.json();
    setGroups(groups.map(g => g.id === groupId ? updated : g));
  };

  const getFilteredTodos = (todos) => {
    if (filter === "Active") return todos.filter(t => !t.completed);
    if (filter === "Completed") return todos.filter(t => t.completed);
    return todos;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title">Todo List</h1>

        {/* Add Group / Title Input */}
        <div className="input-row">
          <input
            data-testid="group-input"
            value={groupInput}
            onChange={e => setGroupInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addGroup()}
            placeholder="Enter a title to create a new group"
          />
          <button data-testid="add-group-btn" className="btn-add" onClick={addGroup}>
            Add Title
          </button>
        </div>

        {/* Global Filter Buttons */}
        <div className="filter-bar">
          {FILTERS.map(f => (
            <button
              key={f}
              data-testid={`filter-${f.toLowerCase()}`}
              className={`filter-btn${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Groups */}
        {groups.length === 0 && (
          <p className="empty-msg">No groups yet. Add a title above to get started.</p>
        )}

        {groups.map(group => {
          const filteredTodos = getFilteredTodos(group.todos);
          const remaining = group.todos.filter(t => !t.completed).length;

          return (
            <div key={group.id} data-testid="todo-group" className="group-card">

              {/* Group Header */}
              <div className="group-header">
                <div>
                  <h2 className="group-title">{group.title}</h2>
                  {group.createdAt && <span className="group-date">Created: {group.createdAt}</span>}
                </div>
                <button
                  data-testid="delete-group-btn"
                  className="btn-danger"
                  onClick={() => deleteGroup(group.id)}
                >
                  Delete Group
                </button>
              </div>

              {/* Add Todo Input */}
              <div className="todo-input-row">
                <input
                  data-testid="todo-input"
                  value={todoInputs[group.id] || ""}
                  onChange={e => setTodoInputs({ ...todoInputs, [group.id]: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addTodo(group.id)}
                  placeholder="Add a new todo"
                />
                <button data-testid="add-btn" className="btn-add" onClick={() => addTodo(group.id)}>
                  Add
                </button>
              </div>

              {/* Todo List */}
              <ul data-testid="todo-list" className="todo-list">
                {filteredTodos.length === 0 && (
                  <p className="todo-empty">No todos to show.</p>
                )}
                {filteredTodos.map(todo => (
                  <li key={todo.id} data-testid="todo-item" className="todo-item">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(group.id, todo.id)}
                    />
                    <span className={`todo-text${todo.completed ? " completed" : ""}`}>
                      {todo.text}
                    </span>
                    <button
                      data-testid="delete-btn"
                      className="btn-delete"
                      onClick={() => deleteTodo(group.id, todo.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              {/* Group Footer */}
              {group.todos.length > 0 && (
                <p className="group-footer">{remaining} item(s) left</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
