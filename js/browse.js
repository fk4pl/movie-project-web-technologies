const API_KEY = '8c45f976cf5bf09078e4ad738b6a2127';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentMoodPage = 1;
let currentTrendingPage = 1;
let currentClassicsPage = 1;
let currentGenrePage = 1;
let currentMood = '';
let currentGenre = '28';

// Mood mappings to genres
const moodToGenres = {
    happy: [35, 16, 10751], // Comedy, Animation, Family
    exciting: [28, 53, 878], // Action, Thriller, Sci-Fi
    romantic: [10749, 18, 35], // Romance, Drama, Comedy
    thoughtful: [18, 9648, 99] // Drama, Mystery, Documentary
};

// Create a simple movie card
function createMovieCard(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMG_BASE_URL}${movie.poster_path}` 
        : '';
    const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
    return `
        <div class="col-md-3 col-sm-6">
            <div class="movie-card" onclick="openMovieDetail(${movie.id})">
                ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}">` : ''}
                <div class="movie-info">
                    <div class="movie-title">${movie.title}</div>
                    <div class="movie-year">${year}</div>
                </div>
            </div>
        </div>
    `;
}

// Open movie detail page
function openMovieDetail(movieId) {
    window.location.href = `movie.html?id=${movieId}`;
}

// Fetch movies by mood
async function fetchMoodMovies(mood, page = 1) {
    const genres = moodToGenres[mood].join(',');
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genres}&sort_by=popularity.desc&page=${page}&vote_count.gte=100`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        alert('Could not load movies.');
        return [];
    }
}

// Fetch trending movies
async function fetchTrendingMovies(page = 1) {
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${page}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        alert('Could not load trending movies.');
        return [];
    }
}

// Fetch classic movies (high rated, older movies)
async function fetchClassicMovies(page = 1) {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=vote_average.desc&vote_count.gte=1000&primary_release_date.lte=2010-12-31&page=${page}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        alert('Could not load classic movies.');
        return [];
    }
}

// Fetch movies by genre
async function fetchGenreMovies(genreId, page = 1) {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}&vote_count.gte=50`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        alert('Could not load genre movies.');
        return [];
    }
}

// Display movies in container
function displayMovies(movies, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (!append) container.innerHTML = '';
    if (!movies.length) {
        container.innerHTML = '<div>No movies found.</div>';
        return;
    }
    movies.forEach(movie => {
        container.innerHTML += createMovieCard(movie);
    });
}

// Initialize page
async function initializePage() {
    // Load trending movies
    const trendingMovies = await fetchTrendingMovies();
    displayMovies(trendingMovies.slice(0, 8), 'trendingMovies');
    
    // Load classic movies
    const classicMovies = await fetchClassicMovies();
    displayMovies(classicMovies.slice(0, 8), 'classicMovies');
    
    // Load default genre (Action)
    const genreMovies = await fetchGenreMovies(currentGenre);
    displayMovies(genreMovies.slice(0, 8), 'genreMovies');

    // Setup event listeners
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    document.querySelectorAll('.mood-card').forEach(card => {
        card.addEventListener('click', async () => {
            const mood = card.dataset.mood;
            currentMood = mood;
            currentMoodPage = 1;
            document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            document.getElementById('moodMoviesSection').style.display = 'block';
            document.getElementById('moodTitle').textContent = `${card.querySelector('h4').textContent} Movies`;
            const movies = await fetchMoodMovies(mood);
            displayMovies(movies, 'moodMovies');
        });
    });
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const genreId = btn.dataset.genre;
            currentGenre = genreId;
            currentGenrePage = 1;
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const movies = await fetchGenreMovies(genreId);
            displayMovies(movies, 'genreMovies');
        });
    });
    document.getElementById('loadMoreMood').addEventListener('click', async () => {
        if (currentMood) {
            currentMoodPage++;
            const movies = await fetchMoodMovies(currentMood, currentMoodPage);
            displayMovies(movies, 'moodMovies', true);
        }
    });
    document.getElementById('loadMoreTrending').addEventListener('click', async () => {
        currentTrendingPage++;
        const movies = await fetchTrendingMovies(currentTrendingPage);
        displayMovies(movies, 'trendingMovies', true);
    });
    document.getElementById('loadMoreClassics').addEventListener('click', async () => {
        currentClassicsPage++;
        const movies = await fetchClassicMovies(currentClassicsPage);
        displayMovies(movies, 'classicMovies', true);
    });
    document.getElementById('loadMoreGenre').addEventListener('click', async () => {
        currentGenrePage++;
        const movies = await fetchGenreMovies(currentGenre, currentGenrePage);
        displayMovies(movies, 'genreMovies', true);
    });
}

// Start the page
document.addEventListener('DOMContentLoaded', initializePage);
