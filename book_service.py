import requests
import re
import urllib.parse

HEADERS = {
    'User-Agent': 'BookshelfApp/1.0 (Personal Book Tracking Website; contact@bookshelf.local)'
}

def clean_description(raw_desc):
    """Normalize description from string, dict, or markdown."""
    if not raw_desc:
        return ''
    if isinstance(raw_desc, dict):
        raw_desc = raw_desc.get('value', '')
    if not isinstance(raw_desc, str):
        return ''
    
    # Remove markdown link formatting e.g. [Title](url) -> Title
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', raw_desc)
    # Remove markdown heading hashes
    cleaned = re.sub(r'^#+\s*', '', cleaned, flags=re.MULTILINE)
    # Remove excessive whitespace
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
    return cleaned

def clean_genres(subjects, max_count=4):
    """Filter and clean subject tags to pick meaningful human-readable genres."""
    if not subjects or not isinstance(subjects, list):
        return ''
    
    cleaned = []
    # Avoid overly specific or metadata tags
    skip_prefixes = ('series:', 'protected:', 'accessible', 'lending', 'nyt:', 'in_library', 'ia:', 'id:')
    
    for s in subjects:
        if not isinstance(s, str):
            continue
        s_clean = s.strip()
        lower = s_clean.lower()
        if any(lower.startswith(p) for p in skip_prefixes):
            continue
        if len(s_clean) > 35 or len(s_clean) < 3:
            continue
        if s_clean not in cleaned:
            cleaned.append(s_clean)
        if len(cleaned) >= max_count:
            break
            
    return ', '.join(cleaned)

def search_books_online(query, limit=7):
    """
    Search books across online APIs (Open Library with Google Books fallback).
    Returns list of book candidate suggestions.
    """
    query = (query or '').strip()
    if not query or len(query) < 2:
        return []

    results = []
    
    # 1. Search Open Library
    try:
        url = "https://openlibrary.org/search.json"
        params = {
            'q': query,
            'limit': limit,
            'fields': 'title,author_name,cover_i,key,first_publish_year,subject,edition_count'
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json()
            docs = data.get('docs', [])
            for doc in docs:
                title = doc.get('title')
                if not title:
                    continue
                
                authors = doc.get('author_name', [])
                author_str = ', '.join(authors[:2]) if authors else 'Unknown Author'
                year = doc.get('first_publish_year', '')
                cover_id = doc.get('cover_i')
                
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ''
                thumbnail_url = f"https://covers.openlibrary.org/b/id/{cover_id}-S.jpg" if cover_id else ''
                
                genres = clean_genres(doc.get('subject', []))
                work_key = doc.get('key', '')
                
                results.append({
                    'source': 'openlibrary',
                    'title': title,
                    'author': author_str,
                    'year': str(year) if year else '',
                    'cover_url': cover_url,
                    'thumbnail_url': thumbnail_url,
                    'genre': genres,
                    'work_key': work_key,
                    'description': ''  # populated on selection or via details endpoint
                })
    except Exception as e:
        print(f"[OpenLibrary Search Error] {e}")

    # 2. If Open Library returned no results, try Google Books API as fallback
    if not results:
        try:
            gb_url = "https://www.googleapis.com/books/v1/volumes"
            gb_res = requests.get(gb_url, params={'q': query, 'maxResults': limit}, headers=HEADERS, timeout=5)
            if gb_res.status_code == 200:
                gb_data = gb_res.json()
                for item in gb_data.get('items', []):
                    vol = item.get('volumeInfo', {})
                    title = vol.get('title')
                    if not title:
                        continue
                    authors = vol.get('authors', [])
                    author_str = ', '.join(authors) if authors else 'Unknown Author'
                    categories = vol.get('categories', [])
                    genre_str = ', '.join(categories[:3]) if categories else ''
                    
                    image_links = vol.get('imageLinks', {})
                    img_url = image_links.get('thumbnail') or image_links.get('smallThumbnail') or ''
                    if img_url.startswith('http://'):
                        img_url = img_url.replace('http://', 'https://')
                        
                    desc = vol.get('description', '')
                    pub_date = vol.get('publishedDate', '')
                    year = pub_date[:4] if pub_date else ''
                    
                    results.append({
                        'source': 'googlebooks',
                        'title': title,
                        'author': author_str,
                        'year': year,
                        'cover_url': img_url,
                        'thumbnail_url': img_url,
                        'genre': genre_str,
                        'work_key': '',
                        'description': clean_description(desc)
                    })
        except Exception as e:
            print(f"[GoogleBooks Search Error] {e}")

    return results

def get_book_details(work_key=None, title=None, author=None):
    """
    Fetch comprehensive book details including description and high-res cover.
    """
    details = {
        'description': '',
        'cover_url': '',
        'genre': '',
        'author': author or '',
        'title': title or ''
    }

    # If we have an Open Library work_key (e.g., "/works/OL17930368W")
    if work_key:
        clean_key = work_key.strip()
        if not clean_key.startswith('/'):
            clean_key = f"/works/{clean_key}"
        try:
            work_url = f"https://openlibrary.org{clean_key}.json"
            res = requests.get(work_url, headers=HEADERS, timeout=6)
            if res.status_code == 200:
                data = res.json()
                raw_desc = data.get('description', '')
                details['description'] = clean_description(raw_desc)
                
                # Covers
                covers = data.get('covers', [])
                if covers and not details['cover_url']:
                    cover_id = covers[0]
                    if cover_id and cover_id > 0:
                        details['cover_url'] = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                
                # Subjects / genres
                subjects = data.get('subjects', [])
                if subjects and not details['genre']:
                    details['genre'] = clean_genres(subjects)
        except Exception as e:
            print(f"[OpenLibrary Work Details Error] {e}")

    # Fallback or enhancement from Google Books if description is missing
    if not details['description'] and title:
        try:
            q = f"intitle:{title}"
            if author:
                q += f"+inauthor:{author}"
            gb_url = "https://www.googleapis.com/books/v1/volumes"
            gb_res = requests.get(gb_url, params={'q': q, 'maxResults': 1}, headers=HEADERS, timeout=5)
            if gb_res.status_code == 200:
                items = gb_res.json().get('items', [])
                if items:
                    vol = items[0].get('volumeInfo', {})
                    if not details['description']:
                        details['description'] = clean_description(vol.get('description', ''))
                    if not details['genre']:
                        details['genre'] = ', '.join(vol.get('categories', [])[:3])
                    if not details['cover_url']:
                        img = vol.get('imageLinks', {}).get('thumbnail', '')
                        if img.startswith('http://'):
                            img = img.replace('http://', 'https://')
                        details['cover_url'] = img
        except Exception as e:
            print(f"[GoogleBooks Details Fallback Error] {e}")

    return details
