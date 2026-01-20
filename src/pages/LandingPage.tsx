import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { canonicalizeRole } from '../lib/roleUtils';
import { supabase } from '../lib/supabase';
import { 
  Brain, 
  BarChart3, 
  Shield, 
  Smartphone, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Star,
  Send
} from 'lucide-react';

interface Review {
  id: string;
  user_id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  created_at: string;
}

function LandingPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // Load reviews from Supabase
  useEffect(() => {
    loadReviews();
  }, []);

  // Check if current user has already reviewed
  useEffect(() => {
    if (user?.id) {
      checkUserReview();
    }
  }, [user?.id, reviews]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reviews:', error);
        if (error.code === '42P01') {
          console.error('⚠️ Reviews table does not exist!');
          console.error('📝 Please run SETUP_REVIEWS_TABLE.sql in your Supabase SQL Editor');
          console.error('🔗 Go to: https://app.supabase.com > Your Project > SQL Editor');
        }
        throw error;
      }
      console.log('✅ Reviews loaded successfully:', data?.length, 'reviews');
      console.log('Reviews data:', data);
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserReview = () => {
    if (user?.id) {
      const hasReviewed = reviews.some(review => review.user_id === user.id);
      setUserHasReviewed(hasReviewed);
    }
  };

  // Handle scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const button = e.currentTarget.querySelector('button');
    if (button) {
      button.textContent = 'Subscribed!';
      setTimeout(() => { button.textContent = 'Subscribe'; }, 3000);
    }
  };

  const handleWriteReviewClick = () => {
    if (!isLoaded) return;
    
    if (!user) {
      // User not logged in, redirect to login
      navigate('/auth/signin');
      return;
    }

    if (userHasReviewed) {
      alert('You have already submitted a review. Thank you!');
      return;
    }

    setShowReviewForm(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth/signin');
      return;
    }

    setSubmitting(true);

    try {
      const userName = user.fullName || user.firstName || user.username || 'Anonymous User';
      const userRole = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'Student';

      const reviewData = {
        user_id: user.id,
        name: userName,
        role: userRole.charAt(0).toUpperCase() + userRole.slice(1),
        rating: newReview.rating,
        comment: newReview.comment
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '23505') {
          alert('You have already submitted a review.');
        } else if (error.code === '42P01') {
          alert('Reviews table does not exist. Please run the database migration first.');
        } else {
          alert(`Error: ${error.message || 'Failed to submit review. Please try again.'}`);
        }
        return;
      }

      // Add new review to the list
      setReviews([data, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
      setShowReviewForm(false);
      setSubmitSuccess(true);
      setUserHasReviewed(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-16">{/* add top padding for fixed global header */}

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-fade-in-up">
            Master Your Knowledge
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in-up delay-200">
            Challenge yourself with expertly crafted multiple-choice questions across diverse subjects. 
            Elevate your learning experience and track your progress in real-time.
          </p>
          {user ? (
            <div className="relative group inline-block animate-fade-in-up delay-400">
              <div className="relative w-72 h-14 opacity-90 overflow-hidden rounded-xl bg-black z-10">
                <div className="absolute z-10 -translate-x-44 group-hover:translate-x-[30rem] ease-in transition-all duration-700 h-full w-44 bg-gradient-to-r from-gray-500 to-white/10 opacity-30 -skew-x-12"></div>
                
                <div className="absolute flex items-center justify-center text-white z-[1] opacity-90 rounded-2xl inset-0.5 bg-black">
                  <Link 
                    to={canonicalizeRole(user.unsafeMetadata?.role as string | undefined) === 'teacher' ? '/teacher' : '/student'}
                    className="font-semibold text-lg h-full opacity-90 w-full px-6 py-3 rounded-xl bg-black flex items-center justify-center whitespace-nowrap"
                  >
                    Continue Learning
                  </Link>
                </div>
                <div className="absolute duration-1000 group-hover:animate-spin w-full h-[100px] bg-gradient-to-r from-green-500 to-yellow-500 blur-[30px]"></div>
              </div>
            </div>
          ) : (
            <div className="relative group inline-block animate-fade-in-up delay-400">
              <div className="relative w-64 h-14 opacity-90 overflow-hidden rounded-xl bg-black z-10">
                <div className="absolute z-10 -translate-x-44 group-hover:translate-x-[30rem] ease-in transition-all duration-700 h-full w-44 bg-gradient-to-r from-gray-500 to-white/10 opacity-30 -skew-x-12"></div>
                
                <div className="absolute flex items-center justify-center text-white z-[1] opacity-90 rounded-2xl inset-0.5 bg-black">
                  <Link 
                    to="/auth/signin"
                    className="font-semibold text-lg h-full opacity-90 w-full px-6 py-3 rounded-xl bg-black flex items-center justify-center whitespace-nowrap"
                  >
                    Get Started
                  </Link>
                </div>
                <div className="absolute duration-1000 group-hover:animate-spin w-full h-[100px] bg-gradient-to-r from-green-500 to-yellow-500 blur-[30px]"></div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 fade-in animated-gradient-text pb-2 leading-tight">
            Why Choose QuizMaster ?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="feature-card group fade-in h-full">
              <div className="h-full text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Brain size={64} className="mx-auto mb-6 text-pink-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Exam-Oriented Training</h3>
                <p className="text-gray-300 flex-grow">
                  Practice designed to mirror real exam patterns and difficulty for better preparedness.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in h-full">
              <div className="h-full text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <BarChart3 size={64} className="mx-auto mb-6 text-purple-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Progress Tracking</h3>
                <p className="text-gray-300 flex-grow">
                  Comprehensive analytics and detailed reports to monitor your improvement across all subjects and topics.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in h-full">
              <div className="h-full text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Shield size={64} className="mx-auto mb-6 text-green-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Anti-Cheating Security</h3>
                <p className="text-gray-300 flex-grow">
                  Advanced monitoring system with tab-switch detection, fullscreen enforcement, and real-time alerts to ensure exam integrity.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in h-full">
              <div className="h-full text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Smartphone size={64} className="mx-auto mb-6 text-blue-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Device Friendly</h3>
                <p className="text-gray-300 flex-grow">
                  Study anywhere, anytime with our responsive design that works seamlessly across all devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-purple-900/50 via-gray-900/50 to-purple-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 fade-in animated-gradient-text pb-2 leading-tight">
            What Our Users Say
          </h2>
          
          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-8 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-center animate-fade-in-up">
              Thank you for your review! It has been added successfully.
            </div>
          )}

          {/* Add Review Button */}
          <div className="text-center mb-12"> 
            <button
              onClick={handleWriteReviewClick}
              disabled={userHasReviewed}
              className={`group/button relative inline-flex items-center justify-center overflow-hidden rounded-md px-6 py-2.5 text-base font-semibold text-white transition-all duration-300 ease-in-out border ${
                userHasReviewed 
                  ? 'bg-gray-500/30 cursor-not-allowed opacity-50 border-gray-500/20' 
                  : 'bg-gray-800/30 backdrop-blur-lg hover:scale-110 hover:shadow-xl hover:shadow-pink-600/50 border-white/20'
              }`}
            >
              <span className="flex items-center gap-2 text-base">
                <Star size={20} />
                {userHasReviewed ? 'Already Reviewed' : 'Write a Review'}
              </span>
              {!userHasReviewed && (
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/20"></div>
                </div>
              )}
            </button>
            {showReviewForm && (
              <button
                onClick={() => setShowReviewForm(false)}
                className="ml-4 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && user && (
            <div className="max-w-2xl mx-auto mb-12 animate-fade-in-up">
              <form onSubmit={handleReviewSubmit} className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-pink-500/30">
                <h3 className="text-2xl font-bold text-pink-500 mb-6">Share Your Experience</h3>
                
                <div className="space-y-4">
                  {/* Display user info (read-only) */}
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">Your Name</label>
                    <div className="w-full px-4 py-2 bg-white/5 border border-pink-500/20 rounded-lg text-gray-400">
                      {user.fullName || user.firstName || user.username || 'Anonymous User'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">Your Role</label>
                    <div className="w-full px-4 py-2 bg-white/5 border border-pink-500/20 rounded-lg text-gray-400">
                      {(() => {
                        const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined);
                        return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Student';
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="focus:outline-none transition-transform hover:scale-110"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            size={32}
                            className={star <= newReview.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">Your Review</label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-pink-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 h-32 resize-none"
                      placeholder="Share your experience with MCQ Portal..."
                      required
                      minLength={10}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
        
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
              <p className="text-gray-400 mt-4">Loading reviews...</p>
            </div>
          ) : reviews.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="animate-fade-in-up">
                    <div className="bg-white/5 backdrop-blur-lg p-5 rounded-xl border border-pink-500/30 h-full flex flex-col hover:border-pink-500/50 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}
                            />
                          ))}
                        </div>
                        <span className="text-gray-500 text-xs">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-4 flex-grow line-clamp-3">
                        "{review.comment}"
                      </p>
                      <div className="flex items-center pt-3 border-t border-pink-500/20">
                        <div className="w-9 h-9 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3">
                          {getInitials(review.name)}
                        </div>
                        <div>
                          <h4 className="text-pink-500 font-semibold text-sm">{review.name}</h4>
                          <p className="text-gray-400 text-xs">{review.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 mb-8">
              <p className="text-gray-400 text-lg">No reviews yet. Be the first to share your experience!</p>
            </div>
          )}

          {/* View All Button - Always visible */}
          <div className="text-center mt-12">
            <Link
              to="/reviews"
              className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg px-8 py-3 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-purple-600/50 border border-white/20"
            >
              <span className="text-base">View All Reviews ({reviews.length})</span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-10 bg-white/20"></div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 border-t border-pink-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-pink-500 font-bold text-lg mb-4">Quick Links</h3>
              <div className="space-y-2">
                <p><a href="#privacy" className="text-gray-400 hover:text-pink-500 transition-colors">Privacy Policy</a></p>
                <p><a href="#terms" className="text-gray-400 hover:text-pink-500 transition-colors">Terms of Service</a></p>
                <p><a href="#help" className="text-gray-400 hover:text-pink-500 transition-colors">Help Center</a></p>
                <p><a href="#careers" className="text-gray-400 hover:text-pink-500 transition-colors">Careers</a></p>
              </div>
            </div>

            <div>
              <h3 className="text-pink-500 font-bold text-lg mb-4">Categories</h3>
              <div className="space-y-2">
                <p><a href="#science" className="text-gray-400 hover:text-pink-500 transition-colors">Science</a></p>
                <p><a href="#math" className="text-gray-400 hover:text-pink-500 transition-colors">Mathematics</a></p>
                <p><a href="#history" className="text-gray-400 hover:text-pink-500 transition-colors">History</a></p>
                <p><a href="#literature" className="text-gray-400 hover:text-pink-500 transition-colors">Literature</a></p>
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-pink-500 font-bold text-lg mb-4">Stay Updated</h3>
              <p className="text-gray-400 mb-4">Subscribe to our newsletter for the latest quizzes and updates.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 px-4 py-2 bg-white/10 border border-pink-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500"
                  required
                />
                <button 
                  type="submit"
                  className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg px-6 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-pink-600/50 border border-white/20"
                >
                  <span className="text-base">Subscribe</span>
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                    <div className="relative h-full w-10 bg-white/20"></div>
                  </div>
                </button>
              </form>
              
              <div className="flex space-x-4">
                <a href="#" aria-label="Facebook" className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Facebook size={20} />
                </a>
                <a href="#" aria-label="Twitter" className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Twitter size={20} />
                </a>
                <a href="#" aria-label="Instagram" className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Instagram size={20} />
                </a>
                <a href="#" aria-label="LinkedIn" className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Linkedin size={20} />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-pink-500/20 mt-12 pt-8 text-center">
            <p className="text-gray-400">&copy; 2025 MCQ Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
