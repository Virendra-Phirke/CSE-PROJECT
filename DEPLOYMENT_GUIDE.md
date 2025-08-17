# 🚀 MCQ Portal - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- ✅ Supabase project set up with all migrations applied
- ✅ Clerk application configured
- ✅ Environment variables properly set
- ✅ Application tested locally

## Environment Variables

Create a `.env.local` file with:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

### 2. Apply Database Migrations
Run the SQL migration from `supabase/migrations/20250810175418_stark_coral.sql` in the Supabase SQL Editor.

### 3. Configure Row Level Security (RLS)
The migration includes RLS policies. Verify they're applied correctly.

## Authentication Setup (Clerk)

### 1. Create Clerk Application
1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Choose "Email" and "Password" as sign-in methods

### 2. Configure Redirects
In your Clerk dashboard:
- **Sign-in redirect**: `/dashboard`
- **Sign-up redirect**: `/dashboard`
- **After sign-out**: `/`

### 3. Enable User Metadata
Ensure "Unsafe metadata" is enabled for role storage.

## Build and Deploy

### Option 1: Netlify (Recommended)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Drag and drop the `dist` folder to Netlify
   - Or connect your Git repository

3. **Configure Environment Variables:**
   Add your environment variables in Netlify's dashboard under Site Settings > Environment Variables.

4. **Configure Redirects:**
   Create a `_redirects` file in the `public` folder:
   ```
   /*    /index.html   200
   ```

### Option 2: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables:**
   Add environment variables in Vercel dashboard.

### Option 3: Other Static Hosts

The application can be deployed to any static hosting service:
- GitHub Pages
- Firebase Hosting
- AWS S3 + CloudFront
- DigitalOcean App Platform

## Post-Deployment Checklist

### ✅ Test Authentication Flow
1. Sign up as a teacher
2. Sign up as a student (different email)
3. Verify role selection works
4. Test sign-in/sign-out

### ✅ Test Teacher Features
1. Create a test
2. Add questions
3. Toggle test status
4. Copy test link
5. View analytics

### ✅ Test Student Features
1. Access shared test link
2. Take the test
3. Submit answers
4. View results

### ✅ Test Database Operations
1. Verify data persistence
2. Check real-time updates
3. Test error handling

## Troubleshooting

### Common Issues

**1. "Database not configured" error**
- Check environment variables are set correctly
- Verify Supabase URL and key are valid
- Ensure migrations have been applied

**2. Authentication not working**
- Verify Clerk publishable key
- Check redirect URLs in Clerk dashboard
- Ensure domain is added to Clerk allowed origins

**3. Tests not loading**
- Check browser console for errors
- Verify database connection
- Check RLS policies are correctly applied

**4. Role setup issues**
- Ensure user metadata is enabled in Clerk
- Check role selection component
- Verify navigation logic

### Performance Optimization

**1. Enable Gzip Compression**
Most hosting providers enable this by default.

**2. Configure Caching Headers**
Set appropriate cache headers for static assets.

**3. Monitor Bundle Size**
Use `npm run build` to check bundle size and optimize if needed.

## Security Considerations

### Production Checklist

- ✅ Use HTTPS only
- ✅ Configure proper CORS settings
- ✅ Enable RLS policies in Supabase
- ✅ Use production Clerk keys
- ✅ Set up proper error monitoring
- ✅ Configure rate limiting if needed

### Environment Variables Security

- Never commit `.env` files to version control
- Use different keys for development and production
- Regularly rotate API keys
- Monitor usage in Clerk and Supabase dashboards

## Monitoring and Maintenance

### Analytics
- Monitor user sign-ups in Clerk dashboard
- Track database usage in Supabase
- Set up error tracking (Sentry, LogRocket, etc.)

### Updates
- Regularly update dependencies
- Monitor for security vulnerabilities
- Keep Clerk and Supabase SDKs updated

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase and Clerk logs
3. Verify environment variables
4. Test locally first

The application is now ready for production deployment! 🎉