/**
 * My Bookshelf - Frontend Application Logic
 * Handles real-time auto-population, CRUD operations, filtering, and UI reactivity
 */

// Application State
const state = {
  books: [],
  currentStatus: 'all',
  searchQuery: '',
  sortBy: 'newest',
  viewMode: 'grid',
  isEditing: false,
  editingBookId: null,
  activeRating: 0,
  debounceTimer: null
};

// DOM Elements
const elements = {
  // Stats
  statTotal: document.getElementById('statTotal'),
  statWant: document.getElementById('statWant'),
  statReading: document.getElementById('statReading'),
  statRead: document.getElementById('statRead'),
  countAll: document.getElementById('countAll'),
  countWant: document.getElementById('countWant'),
  countReading: document.getElementById('countReading'),
  countRead: document.getElementById('countRead'),

  // Filters & Controls
  tabButtons: document.querySelectorAll('.tab-btn'),
  searchInput: document.getElementById('librarySearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  viewGridBtn: document.getElementById('viewGridBtn'),
  viewListBtn: document.getElementById('viewListBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),

  // Book Display
  booksContainer: document.getElementById('booksContainer'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptySubtitle: document.getElementById('emptySubtitle'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),

  // Modal - Add / Edit
  bookModal: document.getElementById('bookModal'),
  openAddModalBtn: document.getElementById('openAddModalBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  modalTitle: document.getElementById('modalTitle'),
  bookForm: document.getElementById('bookForm'),
  editBookId: document.getElementById('editBookId'),
  bookTitleInput: document.getElementById('bookTitleInput'),
  bookAuthorInput: document.getElementById('bookAuthorInput'),
  bookGenreInput: document.getElementById('bookGenreInput'),
  bookCoverInput: document.getElementById('bookCoverInput'),
  bookDescInput: document.getElementById('bookDescInput'),
  bookReviewInput: document.getElementById('bookReviewInput'),
  bookRatingInput: document.getElementById('bookRatingInput'),
  searchSpinner: document.getElementById('searchSpinner'),
  suggestionsDropdown: document.getElementById('suggestionsDropdown'),
  autoPopulateBanner: document.getElementById('autoPopulateBanner'),
  dismissBannerBtn: document.getElementById('dismissBannerBtn'),
  coverPreviewImg: document.getElementById('coverPreviewImg'),
  coverPlaceholder: document.getElementById('coverPlaceholder'),
  starRatingPicker: document.getElementById('starRatingPicker'),
  ratingText: document.getElementById('ratingText'),
  stars: document.querySelectorAll('#starRatingPicker .star'),
  statusRadios: document.querySelectorAll('input[name="bookStatus"]'),

  // Modal - Details
  detailsModal: document.getElementById('detailsModal'),
  closeDetailsBtn: document.getElementById('closeDetailsBtn'),
  detailsContent: document.getElementById('detailsContent'),

  // Toasts
  toastContainer: document.getElementById('toastContainer')
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  loadStats();
  loadBooks();
});

// ================= THEME TOGGLE =================
function initTheme() {
  const savedTheme = localStorage.getItem('bookshelf_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  if (elements.themeIcon) {
    elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('bookshelf_theme', newTheme);
  updateThemeIcon(newTheme);
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Tab Filtering
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.currentStatus = btn.dataset.status;
      loadBooks();
    });
  });

  // Library Search Filter
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      loadBooks();
    }, 250);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    loadBooks();
  });

  // Sorting
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    loadBooks();
  });

  // View Switch
  elements.viewGridBtn.addEventListener('click', () => {
    state.viewMode = 'grid';
    elements.viewGridBtn.classList.add('active');
    elements.viewListBtn.classList.remove('active');
    elements.booksContainer.className = 'books-grid';
  });

  elements.viewListBtn.addEventListener('click', () => {
    state.viewMode = 'list';
    elements.viewListBtn.classList.add('active');
    elements.viewGridBtn.classList.remove('active');
    elements.booksContainer.className = 'books-list';
  });

  // Modal Open/Close
  elements.openAddModalBtn.addEventListener('click', () => openBookModal());
  elements.emptyAddBtn.addEventListener('click', () => openBookModal());
  elements.closeModalBtn.addEventListener('click', closeBookModal);
  elements.cancelModalBtn.addEventListener('click', closeBookModal);
  elements.closeDetailsBtn.addEventListener('click', closeDetailsModal);

  // Backdrop click to close modals
  elements.bookModal.addEventListener('click', (e) => {
    if (e.target === elements.bookModal) closeBookModal();
  });
  elements.detailsModal.addEventListener('click', (e) => {
    if (e.target === elements.detailsModal) closeDetailsModal();
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBookModal();
      closeDetailsModal();
      hideSuggestions();
    }
  });

  // AUTO-POPULATE: Real-time search as user types book name
  elements.bookTitleInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (state.isEditing) return; // Do not auto-search while editing existing book unless user wants
    handleTitleTyping(query);
  });

  // Cover URL manual input change listener
  elements.bookCoverInput.addEventListener('input', (e) => {
    updateCoverPreview(e.target.value.trim());
  });

  // Auto-populate dismiss button
  elements.dismissBannerBtn.addEventListener('click', () => {
    elements.autoPopulateBanner.style.display = 'none';
  });

  // Star Rating Interaction
  setupStarRating();

  // Status radio buttons change
  elements.statusRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      handleStatusChangeInModal(e.target.value);
    });
  });

  // Form Submit
  elements.bookForm.addEventListener('submit', handleFormSubmit);

  // Dismiss suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!elements.bookTitleInput.contains(e.target) && !elements.suggestionsDropdown.contains(e.target)) {
      hideSuggestions();
    }
  });
}

// ================= DATA FETCHING =================
async function loadStats() {
  try {
    const res = await fetch('/api/books/stats');
    const data = await res.json();
    if (data.success) {
      const { total, read, want_to_read, reading } = data.stats;
      elements.statTotal.textContent = total;
      elements.statWant.textContent = want_to_read;
      elements.statReading.textContent = reading;
      elements.statRead.textContent = read;

      elements.countAll.textContent = total;
      elements.countWant.textContent = want_to_read;
      elements.countReading.textContent = reading;
      elements.countRead.textContent = read;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadBooks() {
  elements.loadingState.style.display = 'block';
  elements.emptyState.style.display = 'none';
  elements.booksContainer.innerHTML = '';

  try {
    let url = `/api/books?sort=${state.sortBy}`;
    if (state.currentStatus !== 'all') {
      url += `&status=${state.currentStatus}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    elements.loadingState.style.display = 'none';

    if (data.success) {
      state.books = data.books;
      renderBooks(state.books);
    }
  } catch (err) {
    elements.loadingState.style.display = 'none';
    showToast('Failed to load books. Please check server.', 'error');
    console.error(err);
  }
}

// ================= RENDER BOOKS =================
function renderBooks(books) {
  if (!books || books.length === 0) {
    elements.booksContainer.innerHTML = '';
    elements.emptyState.style.display = 'block';

    if (state.searchQuery) {
      elements.emptyTitle.textContent = 'No matching books found';
      elements.emptySubtitle.textContent = `No books match "${state.searchQuery}". Try a different search term.`;
      elements.emptyAddBtn.style.display = 'none';
    } else {
      const titles = {
        'all': 'Your shelf is empty',
        'want_to_read': 'No books in your Want to Read list',
        'reading': 'No books currently being read',
        'read': 'No books marked as read yet'
      };
      elements.emptyTitle.textContent = titles[state.currentStatus] || 'No books found';
      elements.emptySubtitle.textContent = 'Click below to search and add your favorite books with auto-populated details!';
      elements.emptyAddBtn.style.display = 'inline-flex';
    }
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.booksContainer.innerHTML = books.map(book => createBookCardHTML(book)).join('');
}

function createBookCardHTML(book) {
  const statusLabels = {
    'want_to_read': '🔖 Want to Read',
    'reading': '📖 Reading',
    'read': '✅ Read'
  };

  const statusBadges = {
    'want_to_read': '<span class="card-status-badge badge-want_to_read">🔖 Want to Read</span>',
    'reading': '<span class="card-status-badge badge-reading">📖 Reading</span>',
    'read': '<span class="card-status-badge badge-read">✅ Read</span>'
  };

  // Genre pills
  let genreChips = '';
  if (book.genre) {
    const list = book.genre.split(',').map(g => g.trim()).filter(Boolean).slice(0, 3);
    genreChips = list.map(g => `<span class="genre-chip">${escapeHtml(g)}</span>`).join('');
  }

  // Cover image with fallback
  const coverHTML = book.cover_url
    ? `<img class="card-cover-img" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-cover-fallback\\'><span class=\\'fallback-book-icon\\'>📖</span><span class=\\'fallback-title\\'>${escapeHtml(book.title)}</span></div>'">`
    : `<div class="card-cover-fallback"><span class="fallback-book-icon">📖</span><span class="fallback-title">${escapeHtml(book.title)}</span></div>`;

  // Star rating
  let ratingHTML = '';
  if (book.status === 'read' || book.rating > 0) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= book.rating ? '★' : '<span class="empty-star">★</span>';
    }
    ratingHTML = `
      <div class="card-rating">
        ${stars}
        <span class="card-rating-text">${book.rating ? `${book.rating}/5` : 'Not rated'}</span>
      </div>
    `;
  }

  return `
    <article class="book-card" data-id="${book.id}">
      <div class="card-cover-wrapper" onclick="openDetailsModal(${book.id})">
        ${coverHTML}
        ${statusBadges[book.status] || ''}
      </div>

      <div class="card-body">
        <h3 class="card-title" onclick="openDetailsModal(${book.id})">${escapeHtml(book.title)}</h3>
        <p class="card-author">by ${escapeHtml(book.author || 'Unknown Author')}</p>
        
        ${genreChips ? `<div class="card-genre-chips">${genreChips}</div>` : ''}
        ${ratingHTML}
        
        <p class="card-desc">${escapeHtml(book.description || 'No description available.')}</p>

        <div class="card-footer">
          <select class="status-dropdown-select" onchange="quickChangeStatus(${book.id}, this.value)" title="Change reading status">
            <option value="want_to_read" ${book.status === 'want_to_read' ? 'selected' : ''}>🔖 Want to Read</option>
            <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>📖 Reading</option>
            <option value="read" ${book.status === 'read' ? 'selected' : ''}>✅ Have Read</option>
          </select>

          <div class="card-action-btns">
            <button class="btn-card-action" onclick="openDetailsModal(${book.id})" title="View Details">👁️</button>
            <button class="btn-card-action" onclick="openEditModal(${book.id})" title="Edit Book">✏️</button>
            <button class="btn-card-action btn-delete" onclick="confirmDeleteBook(${book.id})" title="Delete Book">🗑️</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ================= AUTO-POPULATE LOGIC =================
function handleTitleTyping(query) {
  clearTimeout(state.debounceTimer);

  if (query.length < 2) {
    hideSuggestions();
    elements.searchSpinner.style.display = 'none';
    return;
  }

  elements.searchSpinner.style.display = 'block';
  state.debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      elements.searchSpinner.style.display = 'none';

      if (data.success && data.results.length > 0) {
        showSuggestions(data.results);
      } else {
        hideSuggestions();
      }
    } catch (err) {
      elements.searchSpinner.style.display = 'none';
      console.error('Auto-populate search error:', err);
    }
  }, 350);
}

function showSuggestions(results) {
  elements.suggestionsDropdown.innerHTML = '';
  
  results.forEach(book => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';

    const thumbHTML = book.thumbnail_url || book.cover_url
      ? `<img class="suggestion-thumb" src="${escapeHtml(book.thumbnail_url || book.cover_url)}" alt="" onerror="this.outerHTML='<div class=\\'suggestion-thumb-fallback\\'>📚</div>'">`
      : `<div class="suggestion-thumb-fallback">📚</div>`;

    const primaryGenre = book.genre ? book.genre.split(',')[0].trim() : '';

    item.innerHTML = `
      ${thumbHTML}
      <div class="suggestion-info">
        <div class="suggestion-title">${escapeHtml(book.title)}</div>
        <div class="suggestion-meta">
          <span>${escapeHtml(book.author || 'Unknown')}</span>
          ${book.year ? `<span>• ${escapeHtml(book.year)}</span>` : ''}
        </div>
        ${primaryGenre ? `<span class="suggestion-genre-tag">${escapeHtml(primaryGenre)}</span>` : ''}
      </div>
    `;

    item.addEventListener('click', () => {
      selectBookSuggestion(book);
    });

    elements.suggestionsDropdown.appendChild(item);
  });

  elements.suggestionsDropdown.style.display = 'block';
}

function hideSuggestions() {
  elements.suggestionsDropdown.style.display = 'none';
}

async function selectBookSuggestion(book) {
  hideSuggestions();

  // 1. Immediately populate basic fields
  elements.bookTitleInput.value = book.title || '';
  elements.bookAuthorInput.value = book.author || '';
  elements.bookGenreInput.value = book.genre || '';
  elements.bookCoverInput.value = book.cover_url || '';
  updateCoverPreview(book.cover_url);

  if (book.description) {
    elements.bookDescInput.value = book.description;
  }

  // 2. Show the auto-populate success banner
  elements.autoPopulateBanner.style.display = 'flex';

  // 3. Fetch comprehensive details (full description and high-res cover) asynchronously
  try {
    elements.searchSpinner.style.display = 'block';
    const params = new URLSearchParams({
      work_key: book.work_key || '',
      title: book.title || '',
      author: book.author || ''
    });

    const res = await fetch(`/api/book-details?${params.toString()}`);
    const data = await res.json();
    elements.searchSpinner.style.display = 'none';

    if (data.success && data.details) {
      const details = data.details;
      if (details.description && !elements.bookDescInput.value) {
        elements.bookDescInput.value = details.description;
      }
      if (details.genre && !elements.bookGenreInput.value) {
        elements.bookGenreInput.value = details.genre;
      }
      if (details.cover_url && (!elements.bookCoverInput.value || elements.bookCoverInput.value.includes('-S.jpg'))) {
        elements.bookCoverInput.value = details.cover_url;
        updateCoverPreview(details.cover_url);
      }
    }
  } catch (err) {
    elements.searchSpinner.style.display = 'none';
    console.warn('Could not fetch additional details:', err);
  }

  showToast(`Auto-populated details for "${book.title}"!`, 'success');
}

function updateCoverPreview(url) {
  if (url && url.trim().length > 5) {
    elements.coverPreviewImg.src = url.trim();
    elements.coverPreviewImg.style.display = 'block';
    elements.coverPlaceholder.style.display = 'none';

    elements.coverPreviewImg.onerror = () => {
      elements.coverPreviewImg.style.display = 'none';
      elements.coverPlaceholder.style.display = 'block';
    };
  } else {
    elements.coverPreviewImg.style.display = 'none';
    elements.coverPlaceholder.style.display = 'block';
  }
}

// ================= STAR RATING =================
function setupStarRating() {
  elements.stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.rating, 10);
      highlightStars(val);
    });

    star.addEventListener('mouseleave', () => {
      highlightStars(state.activeRating);
    });

    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.rating, 10);
      state.activeRating = (state.activeRating === val) ? 0 : val;
      elements.bookRatingInput.value = state.activeRating;
      highlightStars(state.activeRating);
      updateRatingText(state.activeRating);
    });
  });
}

function highlightStars(count) {
  elements.stars.forEach(star => {
    const val = parseInt(star.dataset.rating, 10);
    if (val <= count) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function updateRatingText(rating) {
  const descriptions = ['Not rated', '1 - Poor', '2 - Fair', '3 - Good', '4 - Great', '5 - Masterpiece!'];
  elements.ratingText.textContent = descriptions[rating] || 'Not rated';
}

function handleStatusChangeInModal(newStatus) {
  // If user picks "Have Read", automatically encourage rating
  const ratingGroup = document.getElementById('ratingGroup');
  if (newStatus === 'read') {
    ratingGroup.style.opacity = '1';
  }
}

// ================= MODAL OPEN & CLOSE =================
function openBookModal(isEdit = false, bookData = null) {
  state.isEditing = isEdit;
  state.editingBookId = isEdit && bookData ? bookData.id : null;

  elements.bookForm.reset();
  elements.autoPopulateBanner.style.display = 'none';
  hideSuggestions();

  if (isEdit && bookData) {
    elements.modalTitle.textContent = 'Edit Book Details';
    elements.editBookId.value = bookData.id;
    elements.bookTitleInput.value = bookData.title || '';
    elements.bookAuthorInput.value = bookData.author || '';
    elements.bookGenreInput.value = bookData.genre || '';
    elements.bookCoverInput.value = bookData.cover_url || '';
    elements.bookDescInput.value = bookData.description || '';
    elements.bookReviewInput.value = bookData.review || '';

    // Status
    const statusRadio = document.querySelector(`input[name="bookStatus"][value="${bookData.status}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Rating
    state.activeRating = bookData.rating || 0;
    elements.bookRatingInput.value = state.activeRating;
    highlightStars(state.activeRating);
    updateRatingText(state.activeRating);

    updateCoverPreview(bookData.cover_url);
  } else {
    elements.modalTitle.textContent = 'Add Book to Bookshelf';
    elements.editBookId.value = '';
    state.activeRating = 0;
    elements.bookRatingInput.value = 0;
    highlightStars(0);
    updateRatingText(0);
    updateCoverPreview('');

    // Default status to match current active tab or "want_to_read"
    const defaultStatus = (state.currentStatus !== 'all') ? state.currentStatus : 'want_to_read';
    const statusRadio = document.querySelector(`input[name="bookStatus"][value="${defaultStatus}"]`);
    if (statusRadio) statusRadio.checked = true;
  }

  elements.bookModal.style.display = 'flex';
  elements.bookTitleInput.focus();
}

function closeBookModal() {
  elements.bookModal.style.display = 'none';
  hideSuggestions();
  elements.searchSpinner.style.display = 'none';
}

// ================= FORM SUBMISSION =================
async function handleFormSubmit(e) {
  e.preventDefault();

  const title = elements.bookTitleInput.value.trim();
  if (!title) {
    showToast('Please enter a book title.', 'error');
    elements.bookTitleInput.focus();
    return;
  }

  const statusInput = document.querySelector('input[name="bookStatus"]:checked');
  const status = statusInput ? statusInput.value : 'want_to_read';

  const payload = {
    title: title,
    author: elements.bookAuthorInput.value.trim(),
    genre: elements.bookGenreInput.value.trim(),
    cover_url: elements.bookCoverInput.value.trim(),
    description: elements.bookDescInput.value.trim(),
    status: status,
    rating: parseInt(elements.bookRatingInput.value, 10) || 0,
    review: elements.bookReviewInput.value.trim()
  };

  const isEdit = state.isEditing && state.editingBookId;
  const url = isEdit ? `/api/books/${state.editingBookId}` : '/api/books';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeBookModal();
      showToast(isEdit ? 'Book updated!' : `Added "${payload.title}" to bookshelf!`, 'success');
      loadStats();
      loadBooks();
    } else {
      showToast(data.error || 'Failed to save book.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error while saving book.', 'error');
  }
}

// ================= QUICK ACTIONS =================
async function quickChangeStatus(bookId, newStatus) {
  try {
    const res = await fetch(`/api/books/${bookId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Status updated!', 'success');
      loadStats();
      // If we are currently filtered by a specific status, re-fetch list
      if (state.currentStatus !== 'all') {
        loadBooks();
      }
    } else {
      showToast(data.error || 'Could not update status.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error while updating status.', 'error');
  }
}

async function openEditModal(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();
    if (data.success) {
      openBookModal(true, data.book);
    }
  } catch (err) {
    showToast('Error loading book details.', 'error');
  }
}

async function confirmDeleteBook(bookId) {
  const book = state.books.find(b => b.id === bookId);
  const title = book ? `"${book.title}"` : 'this book';

  if (!confirm(`Are you sure you want to remove ${title} from your bookshelf?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Book removed from bookshelf.', 'success');
      loadStats();
      loadBooks();
    } else {
      showToast(data.error || 'Could not delete book.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error removing book.', 'error');
  }
}

// ================= DETAILS MODAL =================
async function openDetailsModal(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();
    if (!data.success || !data.book) return;

    const book = data.book;
    const statusLabels = {
      'want_to_read': '🔖 Want to Read',
      'reading': '📖 Currently Reading',
      'read': '✅ Have Read'
    };

    let genreBadges = '';
    if (book.genre) {
      genreBadges = book.genre.split(',').map(g => `<span class="genre-chip">${escapeHtml(g.trim())}</span>`).join(' ');
    }

    let ratingStars = '';
    if (book.rating > 0) {
      for (let i = 1; i <= 5; i++) {
        ratingStars += i <= book.rating ? '★' : '<span class="empty-star">★</span>';
      }
    }

    const coverHTML = book.cover_url
      ? `<img class="details-cover" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" onerror="this.outerHTML='<div class=\\'cover-placeholder\\' style=\\'height:260px;\\'><span>📚</span></div>'">`
      : `<div class="cover-placeholder" style="height:260px;"><span>📚</span></div>`;

    elements.detailsContent.innerHTML = `
      <div class="details-layout">
        <div>${coverHTML}</div>
        <div class="details-info">
          <h2>${escapeHtml(book.title)}</h2>
          <p class="details-author">by ${escapeHtml(book.author || 'Unknown Author')}</p>
          
          <div class="details-badges">
            <span class="card-status-badge badge-${book.status}">${statusLabels[book.status]}</span>
            ${ratingStars ? `<div class="card-rating">${ratingStars} <span class="card-rating-text">${book.rating}/5</span></div>` : ''}
          </div>

          ${genreBadges ? `<div style="margin-bottom:1rem;">${genreBadges}</div>` : ''}

          <div class="details-desc-title">Synopsis</div>
          <div class="details-desc">${escapeHtml(book.description || 'No description added yet.')}</div>

          ${book.review ? `
            <div class="details-review-box">
              <h4>My Notes & Review</h4>
              <p>${escapeHtml(book.review)}</p>
            </div>
          ` : ''}

          <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" onclick="closeDetailsModal(); openEditModal(${book.id});">✏️ Edit Details</button>
            <button class="btn btn-secondary" onclick="confirmDeleteBook(${book.id}); closeDetailsModal();" style="color: #ef4444;">🗑️ Remove</button>
          </div>
        </div>
      </div>
    `;

    elements.detailsModal.style.display = 'flex';
  } catch (err) {
    console.error(err);
    showToast('Failed to load book details.', 'error');
  }
}

function closeDetailsModal() {
  elements.detailsModal.style.display = 'none';
}

// ================= TOAST NOTIFICATIONS =================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ================= UTILITIES =================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
