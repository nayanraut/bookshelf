import json
from app import app
import database

client = app.test_client()

# 1. Test homepage
res = client.get('/')
assert res.status_code == 200, f'Homepage failed: {res.status_code}'
print('[PASS] GET /')

# 2. Test search API
res = client.get('/api/search?q=Dune')
assert res.status_code == 200, f'Search failed: {res.status_code}'
data = res.get_json()
assert data['success'] is True
results = data['results']
print(f'[PASS] GET /api/search?q=Dune -> Found {len(results)} results')
if results:
    print('  Sample title:', results[0]['title'])
    print('  Sample author:', results[0]['author'])
    print('  Sample cover:', results[0]['cover_url'])

# 3. Test book details API
if results:
    first = results[0]
    work_key = first.get('work_key', '')
    title = first.get('title', '')
    author = first.get('author', '')
    res_details = client.get(f'/api/book-details?work_key={work_key}&title={title}&author={author}')
    assert res_details.status_code == 200
    details = res_details.get_json()
    print('[PASS] GET /api/book-details -> Description length:', len(details['details']['description']))

# 4. Test Add Book (Want to read)
new_book = {
    'title': 'Dune',
    'author': 'Frank Herbert',
    'genre': 'Science Fiction, Space Opera',
    'cover_url': 'https://covers.openlibrary.org/b/id/11153217-L.jpg',
    'description': 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides...',
    'status': 'want_to_read',
    'rating': 0
}
res_add = client.post('/api/books', json=new_book)
assert res_add.status_code == 201
book_added = res_add.get_json()['book']
book_id = book_added['id']
print(f'[PASS] POST /api/books -> Added book id {book_id}')

# 5. Test Add Book (Have read)
read_book = {
    'title': 'Atomic Habits',
    'author': 'James Clear',
    'genre': 'Self-Help, Psychology',
    'cover_url': 'https://covers.openlibrary.org/b/id/12539702-L.jpg',
    'description': 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
    'status': 'read',
    'rating': 5,
    'review': 'Life-changing book on habit stacking and 1% improvements!'
}
res_add2 = client.post('/api/books', json=read_book)
assert res_add2.status_code == 201
print('[PASS] POST /api/books -> Added second book')

# 6. Test Stats
res_stats = client.get('/api/books/stats')
stats = res_stats.get_json()['stats']
print('[PASS] GET /api/books/stats ->', stats)
assert stats['total'] >= 2
assert stats['want_to_read'] >= 1
assert stats['read'] >= 1

# 7. Test Filter by status
res_want = client.get('/api/books?status=want_to_read')
books_want = res_want.get_json()['books']
assert any(b['title'] == 'Dune' for b in books_want)
print('[PASS] GET /api/books?status=want_to_read verified')

# 8. Test Status change
res_patch = client.patch(f'/api/books/{book_id}/status', json={'status': 'reading'})
assert res_patch.status_code == 200
print('[PASS] PATCH /api/books/:id/status -> Status changed to reading')

# 9. Verify updated stats
stats_after = client.get('/api/books/stats').get_json()['stats']
print('[PASS] Updated stats after status change:', stats_after)

print('\nALL INTEGRATION TESTS PASSED SUCCESSFULLY!')
