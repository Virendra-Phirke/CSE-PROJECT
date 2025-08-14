import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Brain, 
  BarChart3, 
  Trophy, 
  Smartphone, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin
} from 'lucide-react';

function LandingPage() {
  const { user } = useUser();

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

  return (
    <div className="min-h-screen bg-mesh-premium bg-[length:140%_140%] animate-gradient-shift pt-16">{/* add top padding for fixed global header */}

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-gray-900/50 to-purple-900/50"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-fade-in-up">
            Master Your Knowledge
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in-up delay-200">
            Challenge yourself with expertly crafted multiple-choice questions across diverse subjects. 
            Elevate your learning experience and track your progress in real-time.
          </p>
          {user ? (
            <Link 
              to={user.unsafeMetadata?.role === 'teacher' ? '/teacher' : '/student'}
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl px-8 py-4 rounded-full font-bold hover:shadow-2xl transform hover:-translate-y-2 transition-all animate-fade-in-up delay-400"
            >
              Continue Learning
            </Link>
          ) : (
            <Link 
              to="/login"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl px-8 py-4 rounded-full font-bold hover:shadow-2xl transform hover:-translate-y-2 transition-all animate-fade-in-up delay-400"
            >
              Start Your Journey
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent fade-in">
            Why Choose MCQ Portal?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="feature-card group fade-in">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Brain size={64} className="mx-auto mb-6 text-pink-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Smart Learning</h3>
                <p className="text-gray-300">
                  Adaptive algorithms that personalize your learning experience based on your performance and knowledge gaps.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <BarChart3 size={64} className="mx-auto mb-6 text-purple-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Progress Tracking</h3>
                <p className="text-gray-300">
                  Comprehensive analytics and detailed reports to monitor your improvement across all subjects and topics.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Trophy size={64} className="mx-auto mb-6 text-yellow-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Achievement System</h3>
                <p className="text-gray-300">
                  Earn badges, unlock levels, and compete with friends to make learning engaging and rewarding.
                </p>
              </div>
            </div>

            <div className="feature-card group fade-in">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-white/5 to-pink-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Smartphone size={64} className="mx-auto mb-6 text-blue-500" />
                <h3 className="text-xl font-bold text-pink-500 mb-4">Mobile Friendly</h3>
                <p className="text-gray-300">
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
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent fade-in">
            What Our Users Say
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="testimonial-card fade-in">
              <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-pink-500/30">
                <p className="text-gray-300 italic mb-6">
                  "MCQ Portal transformed how I study. The adaptive learning system helped me identify my weak areas and improve dramatically."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    JS
                  </div>
                  <div>
                    <h4 className="text-pink-500 font-semibold">Jessica Smith</h4>
                    <p className="text-gray-400 text-sm">Medical Student</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="testimonial-card fade-in">
              <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-pink-500/30">
                <p className="text-gray-300 italic mb-6">
                  "The progress tracking feature is incredible. I can see exactly where I stand and what I need to work on next."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    MJ
                  </div>
                  <div>
                    <h4 className="text-pink-500 font-semibold">Michael Johnson</h4>
                    <p className="text-gray-400 text-sm">Engineering Student</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="testimonial-card fade-in">
              <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-pink-500/30">
                <p className="text-gray-300 italic mb-6">
                  "Love the competitive aspect! Competing with friends makes studying so much more engaging and fun."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    EB
                  </div>
                  <div>
                    <h4 className="text-pink-500 font-semibold">Emily Brown</h4>
                    <p className="text-gray-400 text-sm">High School Teacher</p>
                  </div>
                </div>
              </div>
            </div>
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
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:-translate-y-1 transition-all"
                >
                  Subscribe
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
