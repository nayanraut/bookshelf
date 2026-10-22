import os
from flask import Flask, render_template, request, jsonify
import database
import book_service

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Ensure database is initialized on startup
database.init_db()

@app.route('/')
def index():
    """Render the main Bookshelf application page."""
    return render_template('index.html')

@app.route('/api/books', methods=['GET'])
def get_books():
    """Retrieve books with optional filtering by status and search term."""
    status = request.args.get('status')
    search_query = request.args.get('search')
    sort_by = request.args.get('sort', 'newest')
    
    books = database.get_all_books(status=status, search_query=search_query, sort_by=sort_by)
    return jsonify({'success': True, 'books': books, 'count': len(books)})

@app.route('/api/books', methods=['POST'])
def add_new_book():
    """Add a new book to the user's bookshelf."""
    data = request.get_json() or {}
    title = data.get('title')
    if not title or not title.strip():
        return jsonify({'success': False, 'error': 'Book title is required.'}), 400

    status = data.get('status', 'want_to_read')
    if status not in ('read', 'want_to_read', 'reading'):
        status = 'want_to_read'

    try:
        book = database.add_book(
            title=title,
            author=data.get('author', ''),
            genre=data.get('genre', ''),
            cover_url=data.get('cover_url', ''),
            description=data.get('description', ''),
            status=status,
            rating=data.get('rating', 0),
            review=data.get('review', ''),
            page_count=data.get('page_count'),
            published_year=data.get('published_year', '')
        )
        return jsonify({'success': True, 'book': book, 'message': 'Book added successfully!'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_single_book(book_id):
    """Get single book record by ID."""
    book = database.get_book_by_id(book_id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found.'}), 404
    return jsonify({'success': True, 'book': book})

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update details of an existing book."""
    data = request.get_json() or {}
    title = data.get('title')
    if not title or not title.strip():
        return jsonify({'success': False, 'error': 'Book title is required.'}), 400

    status = data.get('status', 'want_to_read')
    if status not in ('read', 'want_to_read', 'reading'):
        status = 'want_to_read'

    try:
        book = database.update_book(
            book_id=book_id,
            title=title,
            author=data.get('author', ''),
            genre=data.get('genre', ''),
            cover_url=data.get('cover_url', ''),
            description=data.get('description', ''),
            status=status,
            rating=data.get('rating', 0),
            review=data.get('review', ''),
            page_count=data.get('page_count'),
            published_year=data.get('published_year', '')
        )
        if not book:
            return jsonify({'success': False, 'error': 'Book not found.'}), 404
        return jsonify({'success': True, 'book': book, 'message': 'Book updated successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/books/<int:book_id>/status', methods=['PATCH'])
def update_status(book_id):
    """Quick update for reading status."""
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('read', 'want_to_read', 'reading'):
        return jsonify({'success': False, 'error': 'Invalid status value.'}), 400

    book = database.update_book_status(book_id, new_status)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found.'}), 404

    return jsonify({'success': True, 'book': book, 'message': f'Status changed to {new_status}'})

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Remove a book from bookshelf."""
    success = database.delete_book(book_id)
    if not success:
        return jsonify({'success': False, 'error': 'Book not found.'}), 404
    return jsonify({'success': True, 'message': 'Book deleted successfully.'})

@app.route('/api/books/stats', methods=['GET'])
def get_stats():
    """Retrieve book counts for dashboard badges."""
    stats = database.get_stats()
    return jsonify({'success': True, 'stats': stats})

@app.route('/api/search', methods=['GET'])
def search_books_api():
    """
    Search internet book databases to auto-populate fields as the user types.
    """
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify({'success': True, 'results': []})

    results = book_service.search_books_online(query, limit=6)
    return jsonify({'success': True, 'results': results})

@app.route('/api/book-details', methods=['GET'])
def get_book_details_api():
    """
    Fetch full book details (description, full genre list, high-res cover)
    for a selected book suggestion.
    """
    work_key = request.args.get('work_key', '')
    title = request.args.get('title', '')
    author = request.args.get('author', '')

    details = book_service.get_book_details(work_key=work_key, title=title, author=author)
    return jsonify({'success': True, 'details': details})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Bookshelf app at http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
