# 📚 My Bookshelf — Personal Reading Tracker

A modern, fast web application built with **Python**, **Flask**, and an **SQLite** database to track books you have read and books you want to read.

When you type a book's title, it **automatically searches and populates the author, genres, book cover image, and short description** directly from the web!

---

## ✨ Features

- **Automatic Metadata Fetching**: As you type the book title, real-time suggestions appear with covers and authors. Selecting a suggestion auto-populates:
  - ✍️ **Author(s)**
  - 🏷️ **Genres / Subjects**
  - 🖼️ **Cover Image** (with live preview)
  - 📝 **Synopsis / Description**
- **Reading Lists & Status Tracking**:
  - 🔖 **Want to Read** (wishlist)
  - 📖 **Currently Reading**
  - ✅ **Have Read** (finished books)
- **Ratings & Reviews**:
  - 5-star rating system
  - Personal notes and review section for your key takeaways
- **Local SQLite Database (`books.db`)**:
  - Zero external database setup needed
  - Fast, self-contained, and preserves all your data locally
- **Real-Time Search & Sorting**:
  - Filter your collection instantly by title, author, or genre
  - Sort by recently added, title (A-Z), or highest rating
- **Modern Responsive Design**:
  - Card grid view & compact list view toggle
  - Dark mode / Light mode toggle
  - Responsive layout for desktop, tablets, and phones

---

## 🚀 How to Run

### Option 1: Quick Launch (Windows)
Simply double-click:
```
run.bat
```
It will automatically launch the server and open your browser at `http://127.0.0.1:5000`.

---

### Option 2: Command Line (PowerShell / Command Prompt)

1. Open your terminal in this directory:
   ```powershell
   cd c:\Users\nayan\Downloads\Antigravity\Bookshelf
   ```

2. Run the application:
   ```powershell
   .\.venv\Scripts\python.exe app.py
   ```

3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 🗂️ Project Structure

```
Bookshelf/
├── app.py                # Flask application & REST endpoints
├── database.py           # SQLite database schema & queries
├── book_service.py       # Internet book search & auto-populate service
├── requirements.txt      # Python dependencies
├── run.bat               # Windows 1-click launcher
├── static/
│   ├── css/
│   │   └── style.css     # Clean modern CSS with dark/light themes
│   └── js/
│       └── app.js        # Autocomplete search, AJAX CRUD, UI logic
└── templates/
    └── index.html        # Main web UI template
```
