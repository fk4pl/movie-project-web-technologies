/**
 * Main JavaScript file for Movilar
 */

const CONFIG = {
    API_KEY: '8c45f976cf5bf09078e4ad738b6a2127',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMG_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BG_BASE_URL: 'https://image.tmdb.org/t/p/original',
    PROFILE_BASE_URL: 'https://image.tmdb.org/t/p/w185'
};

const Utils = {
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear();
    },

    formatRating(rating) {
        if (!rating) return 'N/A';
        return parseFloat(rating).toFixed(1);
    },

    getSafeImageUrl(imagePath, size = 'w500') {
        if (!imagePath) {
            return `https://via.placeholder.com/500x750?text=No+Image`;
        }
        return `https://image.tmdb.org/t/p/${size}${imagePath}`;
    },

    handleError(error, message = 'An error occurred.') {
        alert(message + (error && error.message ? `\n${error.message}` : ''));
        // Optionally log to console or send to analytics
        console.error(error);
    }
};

const ApiService = {
    async request(endpoint, params = {}) {
        const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', CONFIG.API_KEY);

        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            Utils.handleError(error, 'Failed to load data. Please check your internet connection.');
            throw error;
        }
    },

    async getMovie(id) {
        return this.request(`/movie/${id}`, { language: 'en-US' });
    },

    async getMovieCredits(id) {
        return this.request(`/movie/${id}/credits`);
    },

    async getSimilarMovies(id, page = 1) {
        return this.request(`/movie/${id}/similar`, { language: 'en-US', page });
    },

    async searchMovies(query, page = 1) {
        return this.request('/search/movie', { query, page });
    },

    async discoverMovies(params = {}) {
        return this.request('/discover/movie', { 
            sort_by: 'popularity.desc',
            ...params 
        });
    },

    async getTrending(timeWindow = 'week', page = 1) {
        return this.request(`/trending/movie/${timeWindow}`, { page });
    }
};

function createMovieCard(movie, options = {}) {
    const {
        showYear = true,
        showRating = true,
        showOverview = false,
        cardClass = 'col-lg-3 col-md-4 col-sm-6'
    } = options;

    const card = document.createElement('div');
    card.className = cardClass;

    const posterUrl = Utils.getSafeImageUrl(movie.poster_path);
    const year = Utils.formatDate(movie.release_date);
    const rating = Utils.formatRating(movie.vote_average);

    card.innerHTML = `
        <div class="movie-card" onclick="window.location.href='movie.html?id=${movie.id}'" 
             style="cursor: pointer;">
            <img src="${posterUrl}" alt="${movie.title}" loading="lazy" class="movie-poster">
            <div class="movie-info">
                <h6 class="movie-title">${movie.title}</h6>
                ${showYear ? `<small class="movie-year">Year: ${year}</small><br>` : ''}
                ${showRating ? `<small class="movie-rating">Rating: ${rating}/10</small>` : ''}
                ${showOverview && movie.overview ? `<p class="movie-overview">${movie.overview.substring(0, 100)}...</p>` : ''}
            </div>
        </div>
    `;

    return card;
}

// Setup smooth scrolling and button loading effect
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled && !this.classList.contains('loading')) {
                const originalText = this.innerHTML;
                this.classList.add('loading');
                this.innerHTML = 'Loading...';
                this.disabled = true;

                setTimeout(() => {
                    this.classList.remove('loading');
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });
});

window.Movilar = {
    CONFIG,
    Utils,
    ApiService,
    createMovieCard
};