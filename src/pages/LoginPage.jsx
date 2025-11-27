import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { login, signup, signupWithInvitation } from '../services/authService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invite');
  const [isSignUp, setIsSignUp] = useState(!!invitationToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  // Pre-fill email from invitation if available
  useEffect(() => {
    if (invitationToken) {
      setIsSignUp(true);
      // You could fetch invitation details here to pre-fill email
      // For now, user enters email manually
    }
  }, [invitationToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If invitation token exists, always use invitation flow (handles both new and existing users)
      if (invitationToken) {
        if (!name && isSignUp) {
          toast.error('Name is required');
          setLoading(false);
          return;
        }
        
        const userData = await signupWithInvitation(
          email, 
          password, 
          name || email.split('@')[0], 
          invitationToken
        );
        setUser(userData);
        toast.success('Invitation accepted successfully');
        navigate('/');
        return;
      }
      
      if (isSignUp) {
        if (!name) {
          toast.error('Name is required');
          setLoading(false);
          return;
        }

        // Regular admin signup
        const userData = await signup(email, password, name);
        toast.success('Account created successfully. You can now create businesses from Settings.');
        setUser(userData);
        navigate('/');
      } else {
        const userData = await login(email, password);
        setUser(userData);
        toast.success('Logged in successfully');
        navigate('/');
      }
    } catch (error) {
      // Handle invitation pending error
      if (error.code === 'INVITATION_PENDING') {
        toast.error('You have a pending invitation. Please use the invitation link to sign up.');
        return;
      }

      const errorMessage = error.message || `Failed to ${isSignUp ? 'create account' : 'login'}`;
      toast.error(errorMessage);
      
      // If email already in use during regular signup (no invitation), suggest signing in
      if (error.code === 'auth/email-already-in-use' && isSignUp && !invitationToken) {
        setTimeout(() => {
          setIsSignUp(false);
          resetForm();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 py-12 transition-colors duration-200">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-md backdrop-blur-sm transition-colors"
        aria-label="Toggle color theme"
      >
        {isDark ? (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-10 transition-colors duration-200">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent tracking-tight mb-3">
              Tracki
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isSignUp 
                ? (invitationToken ? 'Join as Sales Representative' : 'Create your admin account') 
                : 'Sign in to your account'}
            </p>
          </div>

          {invitationToken && isSignUp && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You've been invited to join a business as a sales representative. Complete your signup below.
              </p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                {isSignUp && (
                  <Input
                    label="Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                )}
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </Button>
            </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Create one'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

