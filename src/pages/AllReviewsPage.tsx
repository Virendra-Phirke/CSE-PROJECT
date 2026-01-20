import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowLeft, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  user_id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  created_at: string;
}

function AllReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterRating, setFilterRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredAndSortedReviews = () => {
    let filtered = filterRating > 0 
      ? reviews.filter(r => r.rating === filterRating)
      : reviews;

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  };

  const getRatingCount = (rating: number) => {
    return reviews.filter(r => r.rating === rating).length;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 pt-24">{/* add extra top padding for fixed header */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-pink-500 hover:text-pink-400 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
            All User Reviews
          </h1>
          <p className="text-gray-400 text-lg">
            See what our community has to say about MCQ Portal
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30">
            <p className="text-gray-400 text-sm mb-2">Total Reviews</p>
            <p className="text-3xl font-bold text-white">{reviews.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30">
            <p className="text-gray-400 text-sm mb-2">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-white">{getAverageRating()}</p>
              <Star size={24} className="fill-yellow-500 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30">
            <p className="text-gray-400 text-sm mb-2">5 Star Reviews</p>
            <p className="text-3xl font-bold text-white">{getRatingCount(5)}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30">
            <p className="text-gray-400 text-sm mb-2">4+ Star Reviews</p>
            <p className="text-3xl font-bold text-white">
              {getRatingCount(5) + getRatingCount(4)}
            </p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter size={20} className="text-pink-500" />
              <span className="text-gray-300 font-semibold">Filter by Rating:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterRating(0)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterRating === 0 
                      ? 'bg-pink-500 text-white' 
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(rating)}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      filterRating === rating 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {rating} <Star size={14} className="fill-current" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-300 font-semibold">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
                className="px-4 py-2 bg-gray-800/80 backdrop-blur-lg border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-pink-500 hover:border-pink-500/50 transition-all cursor-pointer appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ec4899' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`
                }}
                aria-label="Sort reviews by"
              >
                <option value="newest" className="bg-gray-800 text-white">Newest First</option>
                <option value="highest" className="bg-gray-800 text-white">Highest Rating</option>
                <option value="lowest" className="bg-gray-800 text-white">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            <p className="text-gray-400 mt-4">Loading reviews...</p>
          </div>
        ) : filteredAndSortedReviews().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedReviews().map((review) => (
              <div key={review.id} className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-pink-500/30 hover:border-pink-500/50 transition-all hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-gray-300 mb-4 line-clamp-4">
                  "{review.comment}"
                </p>
                
                <div className="flex items-center pt-4 border-t border-pink-500/20">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    {getInitials(review.name)}
                  </div>
                  <div>
                    <h4 className="text-pink-500 font-semibold text-sm">{review.name}</h4>
                    <p className="text-gray-400 text-xs">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No reviews found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllReviewsPage;
