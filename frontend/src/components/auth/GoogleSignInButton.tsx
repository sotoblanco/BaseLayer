import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

export const hasGoogleSignIn = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { googleLogin } = useAuth();

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        theme="filled_black"
        text="continue_with"
        onSuccess={async (credentialResponse) => {
          if (!credentialResponse.credential) return;
          try {
            await googleLogin(credentialResponse.credential);
            onSuccess?.();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Google Login failed';
            onError?.(message);
          }
        }}
        onError={() => onError?.('Google Login Failed')}
      />
    </div>
  );
}
