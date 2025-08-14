# MCQ Portal - Multiple Choice Quiz Platform

A modern, full-featured multiple choice quiz platform built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Modern Authentication**: Powered by Clerk with role-based access (Teacher/Student)
- **Beautiful Dark Theme**: Premium design with gradient effects and smooth animations
- **Real-time Testing**: Server-side scoring with auto-submit safeguards
- **Question Analytics**: Per-question statistics and performance tracking
- **Responsive Design**: Works seamlessly across all devices
- **Test Sharing**: Generate shareable links for students
- **Progress Tracking**: Comprehensive analytics for teachers and students

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Animations**: Canvas Confetti
- **Build Tool**: Vite

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd mcq-portal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Supabase Configuration  
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up Supabase
1. Create a new Supabase project
2. Run the migrations in the `supabase/migrations` folder
3. Update your `.env.local` with the project URL and anon key

### 5. Set up Clerk
1. Create a new Clerk application
2. Configure the sign-in/sign-up settings
3. Update your `.env.local` with the publishable key

### 6. Start the development server
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   └── ...
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── pages/              # Page components
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point

supabase/
└── migrations/         # Database migrations
```

## 🎯 Key Features

### For Teachers
- Create and manage multiple choice tests
- Set test duration and availability windows
- View detailed analytics and student performance
- Generate shareable test links
- Export results and statistics

### For Students  
- Take tests with modern, intuitive interface
- Real-time progress tracking
- Automatic submission with time limits
- View detailed results and explanations
- Track performance over time

## 🔧 Configuration

### Database Schema
The application uses several key tables:
- `profiles` - User profiles with roles
- `tests` - Test definitions
- `questions` - Test questions with options
- `test_results` - Student submissions and scores
- `test_attempts` - Attempt tracking for timing
- `test_question_answers` - Per-question analytics

### Authentication Flow
1. Users sign up/sign in via Clerk
2. Role selection (Teacher/Student) on first login
3. Role-based dashboard access
4. Persistent sessions across devices

## 🚀 Deployment

### Netlify (Recommended)
1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Set environment variables in Netlify dashboard
4. Configure redirects for SPA routing

### Other Platforms
The application can be deployed to any static hosting service that supports SPAs.

## 🧪 Testing

### Manual Testing
1. Create teacher and student accounts
2. Create a test as teacher
3. Share test link with student
4. Take test as student
5. View results and analytics

### Database Testing
Use the included `test-debug.html` file to debug database connections and test flows.

## 🔒 Security

- Row Level Security (RLS) policies for data protection
- Server-side test scoring to prevent tampering
- Secure authentication via Clerk
- Input validation and sanitization
- CSRF protection

## 📊 Analytics

The platform provides comprehensive analytics:
- Overall test performance
- Per-question accuracy rates
- Student progress tracking
- Time-based analytics
- Comparative statistics

## 🎨 Customization

### Themes
The application supports light/dark themes with customizable accent colors. Modify `tailwind.config.js` to adjust the color palette.

### UI Components
All UI components are built with Tailwind CSS and can be easily customized by modifying the component files in `src/components/ui/`.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and API key
   - Check if migrations have been run
   - Ensure RLS policies are correctly configured

2. **Authentication Issues**
   - Verify Clerk configuration
   - Check environment variables
   - Ensure proper redirect URLs

3. **Test Submission Failures**
   - Check database permissions
   - Verify user profiles exist
   - Check server-side RPC functions

### Debug Tools
- Browser console for client-side errors
- Supabase dashboard for database issues
- Clerk dashboard for authentication problems
- Network tab for API request failures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Clerk](https://clerk.com) for authentication
- [Supabase](https://supabase.com) for database and backend
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Lucide](https://lucide.dev) for icons
- [React Query](https://tanstack.com/query) for state management

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using modern web technologies.