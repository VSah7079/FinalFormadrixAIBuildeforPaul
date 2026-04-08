# pathscribe AI - Frontend Application

AI-Powered CAP Synoptic Reporting System for Pathologists

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Demo Credentials

**Pathologist Account:**
- Email: `demo@pathscribe.ai`
- Password: `demo`

**Admin Account:**
- Email: `admin@pathscribe.ai`
- Password: `admin`

## 📁 Project Structure

```
pathscribe-ai/
├── src/
│   ├── App.tsx              # Main app with routing
│   ├── AuthContext.tsx      # Authentication state management
│   ├── Login.tsx            # Login page with theming
│   ├── Home.tsx             # Dashboard/home page
│   ├── Worklist.tsx         # Case worklist page
│   ├── Maintenance.tsx      # Admin/maintenance dashboard
│   └── main.tsx             # App entry point
├── public/                  # Static assets (SVGs, images)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎨 Design System

### Color Palette
- **Primary Cyan**: `#0891B2` - Main brand color
- **Dark Cyan**: `#0E7490` - Gradients and accents
- **Success Green**: `#10b981` - Positive states
- **Warning Yellow**: `#f59e0b` - Alerts and medium confidence
- **Error Red**: `#ef4444` - Errors and critical alerts

### Typography
- System fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Professional, medical software aesthetic

## 📄 Pages Overview

### 1. Login Page (`/login`)
- Email/password authentication
- SSO placeholders (Google, Microsoft)
- Theme switching (Light, Dark, Auto, Scheduled)
- Geolocation-based scheduled dark mode

### 2. Home Dashboard (`/`)
- Key metrics overview
- Recent cases list
- Quick action buttons
- Role-based navigation (admin badge for admins)

### 3. Worklist (`/worklist`)
- Sortable/filterable case table
- AI generation status indicators
- Confidence scores for AI-generated synoptics
- Priority badges (STAT, Urgent, Routine)

### 4. Maintenance/Admin Dashboard (`/maintenance`)
- **Admin only** - redirects non-admins
- Model performance metrics
- Field-level accuracy tracking
- System alerts and warnings
- Recent activity log
- Tabbed interface (Performance, Models, Training Data, Config, Audit)

## 🔐 Authentication

The app uses a context-based auth system:
- `AuthProvider` wraps the entire app
- `useAuth()` hook provides auth state and methods
- Protected routes redirect to login if not authenticated
- Demo credentials stored in `AuthContext.tsx`

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router v6** - Client-side routing
- **Vite** - Build tool and dev server
- **SunCalc** - Geolocation-based theming

## 🎯 Key Features

### Theming System
- 4 modes: Light, Dark, Auto (system), Scheduled (geolocation-based)
- Smooth transitions between themes
- Persistent theme preference in localStorage

### Authentication
- Mock authentication for demo
- Role-based access (pathologist vs admin)
- Protected routes with redirect

### Responsive Design
- Professional medical software UI
- Color-coded confidence indicators
- Priority badges and status chips
- Consistent branding across all pages

## 🔧 Configuration

### Vite Config (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
```

### TypeScript Config (`tsconfig.json`)
Standard React + TypeScript configuration with strict mode enabled.

## 📦 Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` directory.

## 🚧 Future Enhancements

1. **Backend Integration**
   - Replace mock auth with real API
   - Connect to pathscribe AI backend
   - Real-time case updates via WebSocket

2. **Additional Pages**
   - Case detail view with synoptic editor
   - Search functionality
   - Reports and analytics

3. **Enhanced Features**
   - Notification system
   - Bulk case operations
   - Export functionality
   - User preferences management

4. **Assets Needed**
   - Logo SVG files (light/dark variants)
   - Theme icon SVGs
   - Background images for login page

## 📝 Notes

- All UI components use inline styles for portability
- No external UI library dependencies (pure React)
- Cyan theme matches the original synoptic UI design
- Admin dashboard based on the maintenance PDF mockup
- Designed for medical professionals (clear, professional, trustworthy)

## 🐛 Troubleshooting

**Issue: Theme icons not showing**
- Create SVG files in `/public` directory for theme icons
- Or use emoji fallbacks (currently implemented)

**Issue: Login not working**
- Check you're using the demo credentials
- Clear localStorage and refresh

**Issue: Navigation not working**
- Ensure React Router is properly installed
- Check browser console for errors

## 📞 Support

For questions or issues, contact the pathscribe AI development team.

---

**Version:** 1.0.0  
**Last Updated:** February 12, 2026  
**License:** Proprietary - pathscribe AI
