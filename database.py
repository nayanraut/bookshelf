import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'books.db')

def get_db_connection():
    """Connect to SQLite database with row factory for dictionary-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize SQLite database tables if they do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            genre TEXT,
            cover_url TEXT,
            description TEXT,
            status TEXT NOT NULL CHECK(status IN ('read', 'want_to_read', 'reading')),
            rating INTEGER DEFAULT 0,
            review TEXT,
            page_count INTEGER,
            published_year TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at)')
    conn.commit()
    conn.close()

def get_all_books(status=None, search_query=None, sort_by='newest'):
    """Fetch books from database with optional status filter, search, and sorting."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM books WHERE 1=1'
    params = []
    
    if status and status != 'all':
        query += ' AND status = ?'
        params.append(status)
        
    if search_query:
        query += ' AND (title LIKE ? OR author LIKE ? OR genre LIKE ?)'
        like_param = f"%{search_query.strip()}%"
        params.extend([like_param, like_param, like_param])
        
    # Sorting
    if sort_by == 'newest':
        query += ' ORDER BY id DESC'
    elif sort_by == 'oldest':
        query += ' ORDER BY id ASC'
    elif sort_by == 'title_asc':
        query += ' ORDER BY title COLLATE NOCASE ASC'
    elif sort_by == 'rating_desc':
        query += ' ORDER BY rating DESC, id DESC'
    else:
        query += ' ORDER BY id DESC'
        
    cursor.execute(query, params)
    books = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return books

def get_book_by_id(book_id):
    """Retrieve a single book by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM books WHERE id = ?', (book_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_book(title, author='', genre='', cover_url='', description='', 
             status='want_to_read', rating=0, review='', page_count=None, published_year=''):
    """Add a new book to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO books (
            title, author, genre, cover_url, description, 
            status, rating, review, page_count, published_year,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        title.strip(),
        (author or '').strip(),
        (genre or '').strip(),
        (cover_url or '').strip(),
        (description or '').strip(),
        status,
        int(rating) if rating else 0,
        (review or '').strip(),
        int(page_count) if page_count else None,
        str(published_year or '').strip(),
        now,
        now
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_book_by_id(new_id)

def update_book(book_id, title, author='', genre='', cover_url='', description='', 
                status='want_to_read', rating=0, review='', page_count=None, published_year=''):
    """Update all fields of an existing book."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        UPDATE books SET
            title = ?,
            author = ?,
            genre = ?,
            cover_url = ?,
            description = ?,
            status = ?,
            rating = ?,
            review = ?,
            page_count = ?,
            published_year = ?,
            updated_at = ?
        WHERE id = ?
    ''', (
        title.strip(),
        (author or '').strip(),
        (genre or '').strip(),
        (cover_url or '').strip(),
        (description or '').strip(),
        status,
        int(rating) if rating else 0,
        (review or '').strip(),
        int(page_count) if page_count else None,
        str(published_year or '').strip(),
        now,
        book_id
    ))
    conn.commit()
    conn.close()
    return get_book_by_id(book_id)

def update_book_status(book_id, new_status):
    """Quick update for changing reading status (e.g. want_to_read -> read)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        UPDATE books SET status = ?, updated_at = ? WHERE id = ?
    ''', (new_status, now, book_id))
    conn.commit()
    conn.close()
    return get_book_by_id(book_id)

def delete_book(book_id):
    """Delete a book by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM books WHERE id = ?', (book_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_stats():
    """Get count of books by status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
            SUM(CASE WHEN status = 'want_to_read' THEN 1 ELSE 0 END) as want_to_read_count,
            SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_count
        FROM books
    ''')
    row = cursor.fetchone()
    conn.close()
    return {
        'total': row['total'] or 0,
        'read': row['read_count'] or 0,
        'want_to_read': row['want_to_read_count'] or 0,
        'reading': row['reading_count'] or 0
    }
