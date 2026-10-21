
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load transactions from the backend
  async function loadTransactions() {
    try {
      const response = await fetch(`${API}/transactions`);

      if (!response.ok) {
        throw new Error("Could not load transactions.");
      }

      const data = await response.json();
      setTransactions(data);
      setError("");
    } catch {
      setError(
        "Cannot connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  // Calculate total income
  const income = transactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // Calculate total expenses
  const expenses = transactions
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // Search by title or category
  const filteredTransactions = transactions.filter((item) => {
    const query = search.trim().toLowerCase();

    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Add a new transaction
  async function addTransaction(e) {
    e.preventDefault();
    setError("");

    if (!title.trim() || Number(amount) <= 0) {
      setError("Enter a title and an amount greater than zero.");
      return;
    }

    try {
      const response = await fetch(`${API}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          type,
          category,
          date,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.detail || "Could not save transaction."
        );
      }

      const savedTransaction = await response.json();

      setTransactions((previous) => [
        savedTransaction,
        ...previous,
      ]);

      setTitle("");
      setAmount("");
    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    }
  }

  // Delete a transaction from the database
  async function deleteTransaction(id) {
    setError("");

    try {
      const response = await fetch(
        `${API}/transactions/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Could not delete transaction.");
      }

      setTransactions((previous) =>
        previous.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Expense Tracker</h1>
          <p>Manage your money, track your progress.</p>
        </div>

        <span className="logo">₹</span>
      </header>

      <main>
        {/* Financial summary */}
        <section className="summary">
          <div className="summary-card balance">
            <p>Total Balance</p>
            <h2>
              ₹{(income - expenses).toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="summary-card">
            <p>Total Income</p>
            <h2 className="green">
              ₹{income.toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="summary-card">
            <p>Total Expenses</p>
            <h2 className="red">
              ₹{expenses.toLocaleString("en-IN")}
            </h2>
          </div>
        </section>

        <section className="content">
          {/* Add transaction form */}
          <div className="panel">
            <h2>Add Transaction</h2>

            <form onSubmit={addTransaction}>
              <label>Transaction Type</label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>Expense</option>
                <option>Income</option>
              </select>

              <label>Title</label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly salary"
                required
              />

              <label>Amount (₹)</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />

              <label>Category</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Food</option>
                <option>Transport</option>
                <option>Shopping</option>
                <option>Bills</option>
                <option>Salary</option>
                <option>Education</option>
                <option>Health</option>
                <option>Other</option>
              </select>

              <label>Date</label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <button type="submit">
                + Add Transaction
              </button>
            </form>

            {error && (
              <p role="alert" className="red">
                {error}
              </p>
            )}
          </div>

          {/* Transactions and search */}
          <div className="panel transactions-panel">
            <h2>Recent Transactions</h2>

            <input
              type="text"
              className="search-input"
              placeholder="Search by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions by title or category"
            />

            {loading ? (
              <p>Loading transactions...</p>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty">
                <span>₹</span>

                <p>
                  {search.trim()
                    ? "No matching transactions found"
                    : "No transactions yet"}
                </p>

                <small>
                  {search.trim()
                    ? "Try another title or category."
                    : "Add your first transaction to get started."}
                </small>
              </div>
            ) : (
              <div className="transaction-list">
                {filteredTransactions.map((item) => (
                  <div className="transaction" key={item.id}>
                    <div className="transaction-info">
                      <strong>{item.title}</strong>

                      <small>
                        {item.category} · {item.date}
                      </small>
                    </div>

                    <div className="transaction-right">
                      <strong
                        className={
                          item.type === "Income"
                            ? "green"
                            : "red"
                        }
                      >
                        {item.type === "Income" ? "+" : "-"}₹
                        {Number(item.amount).toLocaleString("en-IN")}
                      </strong>








                      
                       <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteTransaction(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer>
        Expense Tracker · Take control of your finances
      </footer>
    </div>
  );
}

export default App;
