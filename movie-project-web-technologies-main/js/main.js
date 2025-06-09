/**
 * Main JavaScript file for Movilar
 * Contains shared utilities and global functionality
 */

// Global configuration
const CONFIG = {
    API_KEY: '8c45f976cf5bf09078e4ad738b6a2127',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMG_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BG_BASE_URL: 'https://image.tmdb.org/t/p/original',
    PROFILE_BASE_URL: 'https://image.tmdb.org/t/p/w185',
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 300
};

// Global utilities
const Utils = {
    // Debounce function for search optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format date utility
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear();
    },

    // Format rating utility
    formatRating(rating) {
        if (!rating) return 'N/A';
        return parseFloat(rating).toFixed(1);
    },

    // Safe image URL generator
    getSafeImageUrl(imagePath, size = 'w500') {
        if (!imagePath) {
            return `https://via.placeholder.com/500x750/1a1a1a/1DB954?text=No+Image`;
        }
        return `https://image.tmdb.org/t/p/${size}${imagePath}`;
    },

    // Local storage cache manager
    cache: {
        set(key, data, expiration = CONFIG.CACHE_DURATION) {
            const item = {
                data: data,
                expiry: Date.now() + expiration
            };
            try {
                localStorage.setItem(`movilar_${key}`, JSON.stringify(item));
            } catch (e) {
                console.warn('Cache storage failed:', e);
            }
        },

        get(key) {
            try {
                const item = localStorage.getItem(`movilar_${key}`);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                if (Date.now() > parsed.expiry) {
                    localStorage.removeItem(`movilar_${key}`);
                    return null;
                }
                return parsed.data;
            } catch (e) {
                console.warn('Cache retrieval failed:', e);
                return null;
            }
        },

        clear() {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('movilar_')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                console.warn('Cache clear failed:', e);
            }
        }
    },

    // Error handler with user feedback
    handleError(error, userMessage = 'Something went wrong. Please try again.') {
        console.error('Error:', error);
        this.showNotification(userMessage, 'error');
    },

    // Show notifications to user
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Set background color based on type
        switch (type) {
            case 'error':
                notification.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
                break;
            case 'success':
                notification.style.background = 'linear-gradient(45deg, #1DB954, #1aa049)';
                break;
            default:
                notification.style.background = 'linear-gradient(45deg, #17a2b8, #138496)';
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
};

// API service with caching and error handling
const ApiService = {
    async request(endpoint, params = {}) {
        const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', CONFIG.API_KEY);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        const cacheKey = url.toString();
        const cached = Utils.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            Utils.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            Utils.handleError(error, 'Failed to load data. Please check your internet connection.');
            throw error;
        }
    },

    // Movie-specific endpoints
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

// Lazy loading for images
class LazyImageLoader {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                { threshold: 0.1, rootMargin: '50px' }
            );
            this.observeImages();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
            }
        });
    }

    loadImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            img.addEventListener('load', () => {
                img.classList.add('fade-in');
            });
        }
    }

    observeImages() {
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.observer.observe(img);
        });
    }

    loadAllImages() {
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.loadImage(img);
        });
    }
}

// Navbar scroll effect
class NavbarController {
    constructor() {
        this.navbar = document.querySelector('.navbar-movilar');
        this.init();
    }

    init() {
        if (this.navbar) {
            window.addEventListener('scroll', Utils.throttle(this.handleScroll.bind(this), 100));
        }
    }

    handleScroll() {
        if (window.scrollY > 100) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
    }
}

// Movie card factory
class MovieCardFactory {
    static createCard(movie, options = {}) {
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
            <div class="movie-card" onclick="MovieCardFactory.navigateToMovie(${movie.id})" 
                 role="button" tabindex="0" aria-label="View details for ${movie.title}">
                <img data-src="${posterUrl}" alt="${movie.title}" loading="lazy" class="movie-poster">
                <div class="movie-info">
                    <h6 class="movie-title">${movie.title}</h6>
                    ${showYear ? `<small class="movie-year">Year: ${year}</small><br>` : ''}
                    ${showRating ? `<small class="movie-rating">Rating: ${rating}/10</small>` : ''}
                    ${showOverview && movie.overview ? `<p class="movie-overview">${movie.overview.substring(0, 100)}...</p>` : ''}
                </div>
            </div>
        `;

        // Add keyboard navigation
        const movieCard = card.querySelector('.movie-card');
        movieCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.navigateToMovie(movie.id);
            }
        });

        return card;
    }

    static navigateToMovie(id) {
        window.location.href = `movie.html?id=${id}`;
    }
}

// Initialize global components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize lazy loading
    new LazyImageLoader();
    
    // Initialize navbar controller
    new NavbarController();

    // Add smooth scrolling to anchor links
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

    // Add loading states to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled && !this.classList.contains('loading')) {
                this.classList.add('loading');
                this.style.pointerEvents = 'none';
                
                // Remove loading state after 2 seconds (fallback)
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.style.pointerEvents = 'auto';
                }, 2000);
            }
        });
    });

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        img.loaded {
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        img.fade-in {
            animation: fadeInImage 0.5s ease;
        }
        
        @keyframes fadeInImage {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .btn.loading {
            position: relative;
            color: transparent !important;
        }
        
        .btn.loading::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            top: 50%;
            left: 50%;
            margin-left: -8px;
            margin-top: -8px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
});

// Export for use in other files
window.Movilar = {
    Utils,
    ApiService,
    MovieCardFactory,
    CONFIG
};
