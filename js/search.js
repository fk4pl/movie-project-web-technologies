const API_KEY = window.Movilar.CONFIG.API_KEY;
const BASE_URL = window.Movilar.CONFIG.BASE_URL;
const IMG_BASE_URL = window.Movilar.CONFIG.IMG_BASE_URL;

let currentPage = 1;
let totalPages = 1;
let currentSearchQuery = '';

let searchForm, searchInput, searchButton, autocompleteDropdown, resultsContainer;
let resultsHeader, resultsCount, loadMoreContainer, loadMoreBtn, ratingFilter, ratingValue;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    searchForm = document.getElementById('searchForm');
    searchInput = document.getElementById('searchInput');
    searchButton = document.getElementById('searchButton');
    autocompleteDropdown = document.getElementById('autocompleteDropdown');
    resultsContainer = document.getElementById('resultsContainer');
    resultsHeader = document.getElementById('resultsHeader');
    resultsCount = document.getElementById('resultsCount');
    loadMoreContainer = document.getElementById('loadMoreContainer');
    loadMoreBtn = document.getElementById('loadMoreBtn');
    ratingFilter = document.getElementById('ratingFilter');
    ratingValue = document.getElementById('ratingValue');
    
    updateRatingValue();
    setupEventListeners();
});

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('blur', hideAutocomplete);
    searchForm.addEventListener('submit', handleSearchSubmit);
    searchButton.addEventListener('click', handleSearchSubmit);
    loadMoreBtn.addEventListener('click', loadMoreMovies);
    ratingFilter.addEventListener('input', updateRatingValue);
    
    // Add event listener for the sort dropdown
    document.getElementById('sortFilter').addEventListener('change', function() {
        if (currentSearchQuery) {
            performSearch(currentSearchQuery);
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            hideAutocomplete();
        }
    });
}

function handleSearchSubmit(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query.length > 0) {
        performSearch(query);
    }
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length >= 2) {
        setTimeout(() => {
            fetchAutocomplete(query);
        }, 300);
    } else {
        hideAutocomplete();
    }
}

async function fetchAutocomplete(query) {
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            showAutocomplete(data.results.slice(0, 5));
        } else {
            hideAutocomplete();
        }
    } catch (error) {
        console.error('Error fetching autocomplete:', error);
        hideAutocomplete();
    }
}

function showAutocomplete(movies) {
    autocompleteDropdown.innerHTML = '';
    
    movies.forEach(movie => {
        const item = createAutocompleteItem(movie);
        autocompleteDropdown.appendChild(item);
    });
    
    autocompleteDropdown.style.display = 'block';
}

function hideAutocomplete() {
    setTimeout(() => {
        autocompleteDropdown.style.display = 'none';
    }, 150);
}

function createAutocompleteItem(movie) {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    const posterUrl = movie.poster_path ? `${IMG_BASE_URL}${movie.poster_path}` : '';
    
    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown';
    
    item.innerHTML = `
        ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}" class="autocomplete-poster">` : ''}
        <div class="autocomplete-info">
            <div class="autocomplete-title">${movie.title}</div>
            <div class="autocomplete-year">${year}</div>
        </div>
    `;
    
    item.addEventListener('click', () => selectMovie(movie.title));
    
    return item;
}

function selectMovie(title) {
    searchInput.value = title;
    hideAutocomplete();
    performSearch(title);
}

async function performSearch(query) {
    if (!query.trim()) return;
    
    currentSearchQuery = query;
    currentPage = 1;
    
    showLoading();
    
    try {
        const movies = await searchMovies(query, 1);
        displayResults(movies);
    } catch (error) {
        console.error('Error performing search:', error);
        showNoResults();
    }
}

async function searchMovies(query, page = 1) {
    const genreFilter = document.getElementById('genreFilter').value;
    const yearFilter = document.getElementById('yearFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    const sortOption = document.getElementById('sortFilter').value;
    
    // Always use discover endpoint
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${page}`;
    
    // Add text query parameter
    if (query && query.trim()) {
        url += `&with_text_query=${encodeURIComponent(query)}`;
    }
    
    // Apply sort parameter
    if (sortOption) {
        url += `&sort_by=${sortOption}`;
    }
    
    // Apply genre filter
    if (genreFilter) {
        url += `&with_genres=${genreFilter}`;
    }
    
    // Apply year filter
    if (yearFilter) {
        if (yearFilter === '2010') {
            url += `&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31`;
        } else if (yearFilter === '2000') {
            url += `&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31`;
        } else if (yearFilter === '1990') {
            url += `&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31`;
        } else if (yearFilter === '1980') {
            url += `&primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31`;
        } else {
            url += `&primary_release_year=${yearFilter}`;
        }
    }
    
    // Apply rating filter
    if (ratingFilter > 0) {
        url += `&vote_average.gte=${ratingFilter}`;
        // Add minimum vote count to ensure quality results
        url += `&vote_count.gte=50`;
    } else {
        // Always add a small minimum vote count to filter out obscure movies
        url += `&vote_count.gte=10`;
    }
    
    console.log("API Request URL:", url); // Debug logging
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success === false) {
            console.error("API Error:", data.status_message);
            throw new Error(data.status_message);
        }
        
        totalPages = data.total_pages || 1;
        return data;
    } catch (error) {
        console.error("Error fetching movies:", error);
        throw error;
    }
}

function displayResults(data) {
    if (currentPage === 1) {
        resultsContainer.innerHTML = '';
    }
    
    if (!data.results || data.results.length === 0) {
        showNoResults();
        return;
    }
    
    data.results.forEach(movie => {
        const movieCard = createMovieCard(movie);
        resultsContainer.appendChild(movieCard);
    });
    
    resultsHeader.style.display = 'flex';
    resultsCount.textContent = `Found ${data.total_results.toLocaleString()} movies`;
    
    if (currentPage < totalPages) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'col-md-4 col-sm-6';
    const posterUrl = movie.poster_path ? `${IMG_BASE_URL}${movie.poster_path}` : '';
    
    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
        <div class="movie-card" onclick="openMovieDetail(${movie.id})">
            ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}">` : ''}
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${year}</div>
            </div>
        </div>
    `;
    
    return card;
}

function openMovieDetail(movieId) {
    window.location.href = `movie.html?id=${movieId}`;
}

function showLoading() {
    resultsContainer.innerHTML = '';
    resultsHeader.style.display = 'none';
    loadMoreContainer.style.display = 'none';
}

function showNoResults() {
    resultsContainer.innerHTML = '<div>No movies found.</div>';
    resultsHeader.style.display = 'none';
    loadMoreContainer.style.display = 'none';
}

function clearResults() {
    resultsContainer.innerHTML = '';
    resultsHeader.style.display = 'none';
    loadMoreContainer.style.display = 'none';
}

async function loadMoreMovies() {
    if (currentPage >= totalPages) return;
    
    currentPage++;
    
    try {
        const movies = await searchMovies(currentSearchQuery, currentPage);
        displayResults(movies);
    } catch (error) {
        console.error('Error loading more movies:', error);
    }
}

function updateRatingValue() {
    ratingValue.textContent = ratingFilter.value;
}

function applyFilters() {
    if (currentSearchQuery) {
        // Reset to page 1 when applying new filters
        currentPage = 1;
        performSearch(currentSearchQuery);
    } else {
        // For filter-only searches without a query term
        currentSearchQuery = " "; // Use a space as minimal query
        currentPage = 1;
        performSearch(currentSearchQuery);
    }
}
