const API_KEY = '8c45f976cf5bf09078e4ad738b6a2127';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let selectedMovieId = null;
let currentSimilarPage = 1;
let maxSimilarPages = 1;
let preventHideSuggestions = false;

let searchInput, suggestionsDropdown, selectedMovieSection, similarMoviesSection, similarMoviesGrid, loadMoreBtn;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    searchInput = document.getElementById('movieSearchInput');
    suggestionsDropdown = document.getElementById('suggestionsDropdown');
    selectedMovieSection = document.getElementById('selectedMovieSection');
    similarMoviesSection = document.getElementById('similarMoviesSection');
    similarMoviesGrid = document.getElementById('similarMoviesGrid');
    loadMoreBtn = document.getElementById('loadMoreSimilar');
    
    if (!searchInput) console.error('Search input element not found!');
    if (!suggestionsDropdown) console.error('Suggestions dropdown element not found!');
    
    setupEventListeners();
    console.log('Similar movies script loaded');
});

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim().length >= 2) {
            fetchMovieSuggestions(searchInput.value.trim());
        }
    });
    
    searchInput.addEventListener('blur', function() {
        if (!preventHideSuggestions) {
            hideSuggestions();
        }
    });
    
    loadMoreBtn.addEventListener('click', loadMoreSimilarMovies);
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length >= 2) {
        setTimeout(() => {
            fetchMovieSuggestions(query);
        }, 300);
    } else {
        hideSuggestions();
    }
}

async function fetchMovieSuggestions(query) {
    try {
        console.log('Fetching suggestions for:', query);
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            console.log('Found suggestions:', data.results.length);
            showSuggestions(data.results.slice(0, 6));
        } else {
            console.log('No suggestions found');
            hideSuggestions();
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        hideSuggestions();
    }
}

function showSuggestions(movies) {
    suggestionsDropdown.innerHTML = '';
    
    movies.forEach(movie => {
        const item = createSuggestionItem(movie);
        suggestionsDropdown.appendChild(item);
    });
    
    suggestionsDropdown.style.display = 'block';
}

function hideSuggestions() {
    setTimeout(() => {
        if (!preventHideSuggestions) {
            suggestionsDropdown.style.display = 'none';
        }
        preventHideSuggestions = false;
    }, 150);
}

function createSuggestionItem(movie) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.dataset.movieId = movie.id;
    
    const posterUrl = movie.poster_path 
        ? `${IMG_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/50x75?text=?';
    
    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    item.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="suggestion-poster">
        <div class="suggestion-info">
            <div class="suggestion-title">${movie.title}</div>
            <div class="suggestion-year">${year}</div>
            <div class="suggestion-rating">Rating: ${rating}/10</div>
        </div>
    `;
    
    item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        preventHideSuggestions = true;
        selectMovie(movie.id);
    });
    
    return item;
}

async function selectMovie(movieId) {
    console.log('Selected movie ID:', movieId);
    selectedMovieId = movieId;
    hideSuggestions();
    
    try {
        const movie = await fetchMovieDetails(movieId);
        if (movie) {
            displaySelectedMovie(movie);
            await loadSimilarMovies(movieId);
        } else {
            console.error('Failed to fetch movie details');
        }
    } catch (error) {
        console.error('Error selecting movie:', error);
    }
}

async function fetchMovieDetails(movieId) {
    try {
        console.log('Fetching details for movie ID:', movieId);
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

function displaySelectedMovie(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMG_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/180x270?text=No+Image';
    
    document.getElementById('selectedMoviePoster').src = posterUrl;
    document.getElementById('selectedMovieTitle').textContent = movie.title;
    document.getElementById('selectedMovieOverview').textContent = movie.overview || 'No overview available.';
    
    const metaContainer = document.getElementById('selectedMovieMeta');
    metaContainer.innerHTML = '';
    
    if (movie.release_date) {
        metaContainer.innerHTML += `<span class="meta-badge">${movie.release_date.slice(0, 4)}</span>`;
    }
    
    if (movie.vote_average) {
        metaContainer.innerHTML += `<span class="meta-badge">${movie.vote_average.toFixed(1)}/10</span>`;
    }
    
    if (movie.runtime) {
        metaContainer.innerHTML += `<span class="meta-badge">${movie.runtime} min</span>`;
    }
    
    if (movie.genres && movie.genres.length > 0) {
        const genres = movie.genres.slice(0, 3).map(g => g.name).join(', ');
        metaContainer.innerHTML += `<span class="meta-badge">${genres}</span>`;
    }
    
    selectedMovieSection.style.display = 'block';
    selectedMovieSection.scrollIntoView({ behavior: 'smooth' });
}

async function loadSimilarMovies(movieId, page = 1) {
    currentSimilarPage = page;
    
    if (page === 1) {
        similarMoviesGrid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
        similarMoviesSection.style.display = 'block';
    }
    
    try {
        console.log(`Loading similar movies for ID: ${movieId}, page: ${page}`);
        const response = await fetch(`${BASE_URL}/movie/${movieId}/similar?api_key=${API_KEY}&language=en-US&page=${page}`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Similar movies data:', data);
        
        if (data.results && data.results.length > 0) {
            if (page === 1) {
                similarMoviesGrid.innerHTML = '';
            }
            
            displaySimilarMovies(data.results);
            maxSimilarPages = data.total_pages;
            
            if (currentSimilarPage < maxSimilarPages) {
                loadMoreBtn.style.display = 'inline-block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            console.log('No similar movies found');
            if (page === 1) {
                showNoSimilarMovies();
            }
        }
    } catch (error) {
        console.error('Error loading similar movies:', error);
        if (page === 1) {
            showNoSimilarMovies();
        }
    }
}

function displaySimilarMovies(movies) {
    movies.forEach(movie => {
        const card = createSimilarMovieCard(movie);
        similarMoviesGrid.appendChild(card);
    });
}

function createSimilarMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'similar-movie-card';
    card.onclick = () => navigateToMovie(movie.id);
    
    const posterUrl = movie.poster_path 
        ? `${IMG_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/250x350?text=No+Image';
    
    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const similarity = Math.floor(Math.random() * 25) + 75;
    
    card.innerHTML = `
        <div class="similarity-badge">${similarity}% Match</div>
        <img src="${posterUrl}" alt="${movie.title}" class="similar-movie-poster">
        <div class="similar-movie-info">
            <h6 class="similar-movie-title">${movie.title}</h6>
            <div class="similar-movie-details">
                <span class="similar-movie-year">${year}</span>
                <span class="similar-movie-rating">
                    <i class="bi bi-star-fill"></i> ${rating}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

function navigateToMovie(movieId) {
    window.location.href = `movie.html?id=${movieId}`;
}

function loadMoreSimilarMovies() {
    if (selectedMovieId && currentSimilarPage < maxSimilarPages) {
        loadSimilarMovies(selectedMovieId, currentSimilarPage + 1);
    }
}

function showNoSimilarMovies() {
    similarMoviesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="bi bi-film"></i>
            <h4 style="color: #e0e0e0; margin-bottom: 15px;">No Similar Movies Found</h4>
            <p>We couldn't find movies similar to your selection. Try choosing a different movie.</p>
        </div>
    `;
}

function clearSelection() {
    selectedMovieId = null;
    currentSimilarPage = 1;
    searchInput.value = '';
    selectedMovieSection.style.display = 'none';
    similarMoviesSection.style.display = 'none';
    searchInput.focus();
}
