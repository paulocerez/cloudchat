import { Link } from 'react-router';
import { ArrowRight, Link2Icon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <h1 className="text-5xl font-semibold text-gray-900 mb-2 leading-tight tracking-tight">
            Speak to your <span className="text-gray-500 underline">files</span>
            <Link2Icon className="w-8 h-8 inline-block ml-2 text-gray-500" />
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed font-normal">
            Share files with anyone, anywhere. 
            Fast, secure, and reliable.
          </p>
          
          <div className="flex justify-center">
            <Link 
              to={isAuthenticated ? "/send" : "/login"}
              className="bg-white text-gray-900 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm inline-flex items-center space-x-2 group border border-gray-300 shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-200 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-8 py-4">
          <div className="text-center">
            <p className="text-gray-500 text-xs">
              © 2025 CloudChat. Files tell a story - listen to them.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 