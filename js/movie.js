// API Configuration
const API_KEY = window.Movilar.CONFIG.API_KEY;
const BASE_URL = window.Movilar.CONFIG.BASE_URL;
const IMG_BASE_URL = window.Movilar.CONFIG.IMG_BASE_URL;
const BG_BASE_URL = window.Movilar.CONFIG.BG_BASE_URL;
const PROFILE_BASE_URL = window.Movilar.CONFIG.PROFILE_BASE_URL;

// Global variables
let currentMovie = null;
let movieCredits = null;
let movieId = null;

// Get movie ID from URL parameters
function getMovieId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch movie details
async function fetchMovieDetails(id) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) throw new Error('Movie not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

// Fetch movie credits
async function fetchMovieCredits(id) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Credits not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie credits:', error);
        return null;
    }
}

// Fetch similar movies
async function fetchSimilarMovies(id) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}&language=en-US&page=1`);
        if (!response.ok) throw new Error('Similar movies not found');
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching similar movies:', error);
        return [];
    }
}

// Fetch movies by actor
async function fetchMoviesByActor(actorId) {
    try {
        const response = await fetch(`${BASE_URL}/person/${actorId}/movie_credits?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) throw new Error('Actor movies not found');
        const data = await response.json();
        return data.cast || [];
    } catch (error) {
        console.error('Error fetching actor movies:', error);
        return [];
    }
}

// Fetch movies by director
async function fetchMoviesByDirector(directorId) {
    try {
        const response = await fetch(`${BASE_URL}/person/${directorId}/movie_credits?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) throw new Error('Director movies not found');
        const data = await response.json();
        return data.crew ? data.crew.filter(movie => movie.job === 'Director') : [];
    } catch (error) {
        console.error('Error fetching director movies:', error);
        return [];
    }
}

// Create a simple movie card
function createMovieCard(movie) {
    const posterUrl = movie.poster_path ? `${IMG_BASE_URL}${movie.poster_path}` : '';
    const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
    return `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="related-movie-card" onclick="navigateToMovie(${movie.id})">
                ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}">` : ''}
                <div class="related-movie-info">
                    <div class="related-movie-title">${movie.title}</div>
                    <div class="related-movie-year">${year}</div>
                </div>
            </div>
        </div>
    `;
}

// Create a simple cast card
function createCastCard(person, isDirector = false) {
    const profileUrl = person.profile_path ? `${PROFILE_BASE_URL}${person.profile_path}` : '';
    const role = isDirector ? 'Director' : (person.character || person.job || '');
    return `
        <div class="col-lg-2 col-md-3 col-sm-4 col-6">
            <div class="person-card">
                ${profileUrl ? `<img src="${profileUrl}" class="person-image" alt="${person.name}">` : ''}
                <div class="person-info">
                    <div class="person-name">${person.name}</div>
                    <div class="person-role">${role}</div>
                </div>
            </div>
        </div>
    `;
}

// Navigate to another movie
function navigateToMovie(id) {
    window.location.href = `movie.html?id=${id}`;
}

// Display movie details
function displayMovieDetails(movie) {
    try {
        // Set background image
        if (movie.backdrop_path) {
            document.getElementById('movieHero').style.backgroundImage = 
                `url('${BG_BASE_URL}${movie.backdrop_path}')`;
        }

        // Set poster
        const posterUrl = movie.poster_path 
            ? `${IMG_BASE_URL}${movie.poster_path}` 
            : 'https://via.placeholder.com/500x750?text=No+Image';
        document.getElementById('moviePoster').src = posterUrl;

        // Set basic info
        document.getElementById('movieTitle').textContent = movie.title || 'Unknown Title';
        document.getElementById('movieTagline').textContent = movie.tagline || '';
        document.getElementById('movieOverview').textContent = movie.overview || 'No overview available.';

        // Set rating
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        document.querySelector('#movieRating span').textContent = `${rating}/10`;

        // Set meta information
        const metaContainer = document.getElementById('movieMeta');
        metaContainer.innerHTML = '';

        if (movie.release_date) {
            metaContainer.innerHTML += `<span class="meta-item"><i class="bi bi-calendar me-2"></i>${movie.release_date}</span>`;
        }

        if (movie.runtime) {
            metaContainer.innerHTML += `<span class="meta-item"><i class="bi bi-clock me-2"></i>${movie.runtime} minutes</span>`;
        }

        if (movie.vote_count) {
            metaContainer.innerHTML += `<span class="meta-item"><i class="bi bi-people me-2"></i>${movie.vote_count.toLocaleString()} votes</span>`;
        }

        if (movie.budget && movie.budget > 0) {
            metaContainer.innerHTML += `<span class="meta-item"><i class="bi bi-currency-dollar me-2"></i>$${movie.budget.toLocaleString()}</span>`;
        }

        // Set genres
        const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'Unknown';
        document.getElementById('movieGenres').textContent = genres;
    } catch (error) {
        console.error('Error displaying movie details:', error);
    }
}

// Display cast and crew
function displayCastAndCrew(credits) {
    try {
        const castContainer = document.getElementById('castContainer');
        castContainer.innerHTML = '';

        // Add director first
        const director = credits.crew.find(person => person.job === 'Director');
        if (director) {
            document.getElementById('movieDirector').textContent = director.name;
            castContainer.innerHTML += createCastCard(director, true);
        } else {
            document.getElementById('movieDirector').textContent = 'Unknown';
        }

        // Add main cast members (limit to 11 to make 12 total with director)
        const mainCast = credits.cast.slice(0, 11);
        mainCast.forEach(person => {
            castContainer.innerHTML += createCastCard(person);
        });
    } catch (error) {
        console.error('Error displaying cast and crew:', error);
    }
}

// Display related movies
function displayRelatedMovies(movies, containerId, limit = 8) {
    const container = document.getElementById(containerId);
    if (!movies || movies.length === 0) {
        container.innerHTML = '<div>No related movies found.</div>';
        return;
    }
    container.innerHTML = '';
    const moviesToShow = movies.slice(0, limit);
    moviesToShow.forEach(movie => {
        container.innerHTML += createMovieCard(movie);
    });
}

// No loading spinner needed
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

// Load all movie data
async function loadMovieData() {
    movieId = getMovieId();
    
    if (!movieId) {
        document.getElementById('movieTitle').textContent = 'Movie not found';
        document.getElementById('movieOverview').textContent = 'Please check the URL and try again.';
        return;
    }

    try {
        // Load basic movie details
        currentMovie = await fetchMovieDetails(movieId);
        if (currentMovie) {
            displayMovieDetails(currentMovie);
            document.title = `${currentMovie.title} - Movilar`;
        } else {
            alert('Movie not found');
            return;
        }

        // Load credits
        movieCredits = await fetchMovieCredits(movieId);
        if (movieCredits) {
            displayCastAndCrew(movieCredits);
        }

        // Load similar movies
        showLoading('similarMoviesContainer');
        const similarMovies = await fetchSimilarMovies(movieId);
        displayRelatedMovies(similarMovies, 'similarMoviesContainer');

        // Load movies by same main actor
        if (movieCredits && movieCredits.cast.length > 0) {
            showLoading('sameActorMoviesContainer');
            const mainActor = movieCredits.cast[0];
            const actorMovies = await fetchMoviesByActor(mainActor.id);
            const filteredActorMovies = actorMovies.filter(movie => movie.id != movieId);
            displayRelatedMovies(filteredActorMovies, 'sameActorMoviesContainer');
        } else {
            displayRelatedMovies([], 'sameActorMoviesContainer');
        }

        // Load movies by same director
        if (movieCredits) {
            const director = movieCredits.crew.find(person => person.job === 'Director');
            if (director) {
                showLoading('sameDirectorMoviesContainer');
                const directorMovies = await fetchMoviesByDirector(director.id);
                const filteredDirectorMovies = directorMovies.filter(movie => movie.id != movieId);
                displayRelatedMovies(filteredDirectorMovies, 'sameDirectorMoviesContainer');
            } else {
                displayRelatedMovies([], 'sameDirectorMoviesContainer');
            }
        } else {
            displayRelatedMovies([], 'sameDirectorMoviesContainer');
        }

    } catch (error) {
        alert('There was an error loading the movie details.');
        document.getElementById('movieTitle').textContent = 'Error loading movie';
        document.getElementById('movieOverview').textContent = 'There was an error loading the movie details.';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', loadMovieData);
document.addEventListener('DOMContentLoaded', loadMovieData);
