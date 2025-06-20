/**
 * Movie Detail Page JavaScript
 */

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
let movieVideos = null;

// Get movie ID from URL parameters
function getMovieId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch movie videos (trailers)
async function fetchMovieVideos(id) {
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/movie/${id}/videos?api_key=${CONFIG.API_KEY}`);
        if (!response.ok) throw new Error('Videos not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie videos:', error);
        return null;
    }
}

// Setup trailer functionality
function setupTrailer(videos) {
    const watchTrailerBtn = document.getElementById('watchTrailerBtn');
    const trailerModal = new bootstrap.Modal(document.getElementById('trailerModal'));
    const trailerFrame = document.getElementById('trailerFrame');
    
    if (videos && videos.results) {
        // Find the first trailer
        const trailer = videos.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        if (trailer) {
            watchTrailerBtn.style.display = 'inline-flex';
            watchTrailerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                trailerFrame.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
                trailerModal.show();
            });
            
            // Clear iframe when modal is closed
            document.getElementById('trailerModal').addEventListener('hidden.bs.modal', () => {
                trailerFrame.src = '';
            });
        }
    }
}

// Display movie details
function displayMovieDetails(movie) {
    try {
        // Set background image
        if (movie.backdrop_path) {
            const bgImg = new Image();
            bgImg.onload = () => {
                document.getElementById('movieHero').style.backgroundImage = 
                    `url('${CONFIG.BG_BASE_URL}${movie.backdrop_path}')`;
            };
            bgImg.onerror = () => {
                document.getElementById('movieHero').style.background = 
                    'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
            };
            bgImg.src = `${CONFIG.BG_BASE_URL}${movie.backdrop_path}`;
        }

        // Set poster
        const posterImg = document.getElementById('moviePoster');
        const posterUrl = movie.poster_path 
            ? `${CONFIG.IMG_BASE_URL}${movie.poster_path}` 
            : 'https://via.placeholder.com/500x750/1a1a1a/1DB954?text=🎬%0ANo%20Poster';
        
        posterImg.src = posterUrl;
        posterImg.onerror = () => {
            posterImg.src = 'https://via.placeholder.com/500x750/1a1a1a/1DB954?text=🎬%0ANo%20Poster';
        };

        // Set basic info
        document.getElementById('movieTitle').textContent = movie.title || 'Unknown Title';
        document.getElementById('movieTagline').textContent = movie.tagline || '';
        document.getElementById('movieOverview').textContent = movie.overview || 'No overview available.';

        // Set rating
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        document.querySelector('#movieRating span').textContent = `${rating}/10`;

        // Set meta information (removed budget and revenue)
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

// Create cast member card
function createCastCard(person, isDirector = false) {
    const profileUrl = person.profile_path 
        ? `${CONFIG.PROFILE_BASE_URL}${person.profile_path}` 
        : 'https://via.placeholder.com/185x278/1a1a1a/1DB954?text=👤%0ANo%20Photo';
    
    const role = isDirector ? 'Director' : (person.character || person.job || 'Unknown');

    return `
        <div class="col-lg-2 col-md-3 col-sm-4 col-6">
            <div class="person-card">
                <img src="${profileUrl}" 
                     alt="${person.name}" 
                     class="person-image" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/185x278/1a1a1a/1DB954?text=👤%0ANo%20Photo'">
                <div class="person-info">
                    <div class="person-name">${person.name}</div>
                    <div class="person-role">${role}</div>
                </div>
            </div>
        </div>
    `;
}

// Display related movies
function displayRelatedMovies(movies, containerId, limit = 8) {
    try {
        const container = document.getElementById(containerId);
        
        if (!movies || movies.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p style="color: #666; font-size: 1.2rem;">No related movies found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        const moviesToShow = movies.slice(0, limit);
        
        moviesToShow.forEach(movie => {
            container.innerHTML += createMovieCard(movie);
        });
    } catch (error) {
        console.error('Error displaying related movies:', error);
    }
}

// Create movie card
function createMovieCard(movie) {
    const posterUrl = movie.poster_path 
        ? `${CONFIG.IMG_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750/1a1a1a/1DB954?text=🎬%0ANo%20Poster';
    
    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    return `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="related-movie-card" onclick="window.location.href='movie.html?id=${movie.id}'" style="cursor: pointer;">
                <img src="${posterUrl}" 
                     alt="${movie.title}" 
                     class="related-movie-poster" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/500x750/1a1a1a/1DB954?text=🎬%0ANo%20Poster'">
                <div class="related-movie-info">
                    <h6 class="related-movie-title">${movie.title}</h6>
                    <div class="related-movie-meta">
                        <span class="related-movie-year">${year}</span>
                        <span class="related-movie-rating">
                            <i class="bi bi-star-fill"></i> ${rating}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show loading spinner
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
    }
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
        currentMovie = await Movilar.ApiService.getMovie(movieId);
        if (currentMovie) {
            displayMovieDetails(currentMovie);
            document.title = `${currentMovie.title} - Movilar`;
        } else {
            throw new Error('Movie not found');
        }

        // Load movie videos
        movieVideos = await fetchMovieVideos(movieId);
        if (movieVideos) {
            setupTrailer(movieVideos);
        }

        // Load credits
        movieCredits = await Movilar.ApiService.getMovieCredits(movieId);
        if (movieCredits) {
            displayCastAndCrew(movieCredits);
        }

        // Load similar movies
        showLoading('similarMoviesContainer');
        const similarMoviesData = await Movilar.ApiService.getSimilarMovies(movieId);
        displayRelatedMovies(similarMoviesData.results, 'similarMoviesContainer');

        // Load movies by same director
        if (movieCredits) {
            const director = movieCredits.crew.find(person => person.job === 'Director');
            if (director) {
                showLoading('sameDirectorMoviesContainer');
                // Fetch director's other movies
                const directorResponse = await fetch(`${CONFIG.BASE_URL}/person/${director.id}/movie_credits?api_key=${CONFIG.API_KEY}`);
                const directorData = await directorResponse.json();
                const directorMovies = directorData.crew ? 
                    directorData.crew.filter(movie => movie.job === 'Director' && movie.id != movieId) : [];
                displayRelatedMovies(directorMovies, 'sameDirectorMoviesContainer');
            } else {
                displayRelatedMovies([], 'sameDirectorMoviesContainer');
            }
        } else {
            displayRelatedMovies([], 'sameDirectorMoviesContainer');
        }

    } catch (error) {
        console.error('Error loading movie data:', error);
        document.getElementById('movieTitle').textContent = 'Error loading movie';
        document.getElementById('movieOverview').textContent = 'There was an error loading the movie details. Please try again later.';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', loadMovieData);
