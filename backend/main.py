
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sqlite3
from datetime import date

app = FastAPI(title="Expense Tracker API")

# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "expenses.db"


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                type TEXT NOT NULL CHECK(type IN ('Income', 'Expense')),
                category TEXT NOT NULL,
                date TEXT NOT NULL
            )
        """)


initialize_database()


class Transaction(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    type: str
    category: str = Field(min_length=1, max_length=50)
    date: date


def transaction_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "amount": row["amount"],
        "type": row["type"],
        "category": row["category"],
        "date": row["date"],
    }


@app.get("/")
def home():
    return {"message": "Expense Tracker API is running"}


@app.get("/transactions")
def get_transactions():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM transactions ORDER BY id DESC"
        ).fetchall()

    return [transaction_dict(row) for row in rows]


@app.post("/transactions", status_code=201)
def add_transaction(transaction: Transaction):
    if transaction.type not in ("Income", "Expense"):
        raise HTTPException(
            status_code=400,
            detail="Type must be Income or Expense"
        )

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO transactions
            (title, amount, type, category, date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                transaction.title.strip(),
                transaction.amount,
                transaction.type,
                transaction.category,
                transaction.date.isoformat(),
            ),
        )

        row = connection.execute(
            "SELECT * FROM transactions WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return transaction_dict(row)


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM transactions WHERE id = ?",
            (transaction_id,),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

    return {"message": "Transaction deleted successfully"}








@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, transaction: Transaction):
    if transaction.type not in ("Income", "Expense"):
        raise HTTPException(
            status_code=400,
            detail="Type must be Income or Expense"
        )

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE transactions
            SET title = ?, amount = ?, type = ?, category = ?, date = ?
            WHERE id = ?
            """,
            (
                transaction.title.strip(),
                transaction.amount,
                transaction.type,
                transaction.category,
                transaction.date.isoformat(),
                transaction_id,
            ),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        row = connection.execute(
            "SELECT * FROM transactions WHERE id = ?",
            (transaction_id,),
        ).fetchone()

    return transaction_dict(row)

