import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ password: z.string().min(1) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
            const { password } = parsedCredentials.data;
            const accessPassword = process.env.ACCESS_PASSWORD;
            
            // Simple password check
            // If no password set in env, allow default 'admin' (BUT warn in production)
            // Or better: require it.
            if (!accessPassword) {
                console.warn("WARNING: ACCESS_PASSWORD not set. Using default 'admin'.");
                if (password === 'admin') return { id: '1', name: 'Admin' };
            }

            if (password === accessPassword) {
                return { id: '1', name: 'User' };
            }
        }
        
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});
