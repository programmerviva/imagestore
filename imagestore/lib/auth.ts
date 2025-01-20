import bcrypt from 'bcryptjs'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { connectToDatabase } from './db'
import UserModel from '../models/User'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'Enter your email',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password',
        }
      },

      async authorize(credentials) {
        if(!credentials?.email || !credentials?.password){
          throw new Error('Invalid credentials')
        }

        try {
          await connectToDatabase()     
          const user = await UserModel.findOne({email: credentials.email})

          if(!user) {
            throw new Error('No user found with this email')
          }
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          )
          if(!isValid) {
            throw new Error('Invalid password')
          }

          return {
            id: user._id.toString(),
            // name: user.name,
            email: user.email,
            role: user.role,
            // image: user.image
          }

        } catch (error) {
          console.error("Auth Error", error)
          throw error
        }
      }
    })
  ],
  callbacks: {

    async jwt ({ token, user}){

      if(user){
        token.id = user.id;
        token.role = user.role;
      }
      return token
    },

    async session({ session, token}) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;

      return session;
    },

  },
  pages : {
    signIn: '/login',
    error: '/login'
  }, 
  session:{
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  }, 
  debug: true,
  secret: process.env.NEXTAUTH_SECRET
};