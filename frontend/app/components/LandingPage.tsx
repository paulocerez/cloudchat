import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">CloudChat</span>
            </div>
            <div className="flex items-center">
              {isAuthenticated ? (
                <Link 
                  to="/send" 
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Dashboard
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-8 leading-tight">
            Send Large Files
            <br />
            <span className="text-gray-600">Instantly</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Share files up to 2GB with anyone, anywhere. 
            No registration required. Fast, secure, and reliable.
          </p>
          
          <div className="flex justify-center">
            <Link 
              to={isAuthenticated ? "/send" : "/login"}
              className="bg-gray-900 text-white px-12 py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors text-lg inline-flex items-center space-x-3 group"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              © 2024 CloudChat. Simple, secure file sharing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 