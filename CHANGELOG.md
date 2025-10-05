# 📋 Changelog - Chatbot Manager

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete documentation (README.md, DOCS.md, SETUP.md)
- Environment configuration example (.env.example)
- Technical architecture documentation
- Setup and deployment guides
- CAMBIOS_REALIZADOS.md - Detailed documentation of latest fixes

### Changed
- Improved project structure documentation
- Enhanced README with comprehensive feature overview

## [1.0.1] - 2025-10-05

### Fixed
- **Project duplication bug**: Projects no longer appear twice when created
  - Removed manual event triggers when Firebase is active
  - Optimized `dataSync.js` to delegate all updates to `onSnapshot` listener
  - Added state comparison in `ProjectManager.jsx` to prevent duplicate updates
- **Modal scroll position issue**: All modals now preserve user's scroll position
  - Converted 11 modals to React Portals with fixed positioning
  - Affected components: `ProjectManager.jsx` (5 modals), `ClientDatabase.jsx` (4 modals), `ExpenseManager.jsx` (2 modals)
  - Applied consistent z-index (1000) across all modals
  - Enhanced UX with absolute positioning (top: 0, left: 0, right: 0, bottom: 0)

### Changed
- Optimized Firebase synchronization system
  - CRUD operations now rely solely on real-time listeners
  - Reduced redundant database calls
  - Improved performance with debouncing (50ms delay)
- Enhanced modal architecture
  - All modals now use React Portals rendered to `document.body`
  - Consistent styling and positioning across components
  - Better separation of concerns in modal rendering

### Technical
- Modified `src/utils/dataSync.js`:
  - `createProject()`, `updateProject()`, `deleteProject()` no longer trigger manual events when Firebase is connected
  - Event triggering delegated to `onSnapshot` listeners
- Modified `src/components/ProjectManager.jsx`:
  - Added import for `createPortal` from 'react-dom'
  - Enhanced `useDataSync` hook with state comparison
  - Converted 5 modals to portals
- Modified `src/components/ClientDatabase.jsx`:
  - Added import for `createPortal` from 'react-dom'
  - Converted 4 modals to portals
- Modified `src/components/ExpenseManager.jsx`:
  - Added import for `createPortal` from 'react-dom'
  - Converted 2 modals (including ConfirmDialog) to portals

### Documentation
- Added comprehensive changelog entry for version 1.0.1
- Created CAMBIOS_REALIZADOS.md with detailed fix documentation
- Updated technical documentation with modal architecture changes

## [1.0.0] - 2025-09-27

### Added
- 🎉 **Initial Release** - Chatbot Manager v1.0.0
- **Project Management**: Complete CRUD for chatbot projects
  - Project states: Demo, Free Trial, Established, Paused, Canceled
  - Automatic cutoff date calculation
  - Installation costs and dates
  - Billing support (RFC, business name)
- **Client Database**: Automatic client creation from projects
  - Full client information management
  - Project-client relationship tracking
- **Expense Tracking**: Comprehensive expense management
  - Categorized expenses (Hosting, Software, Marketing, etc.)
  - Recurring expenses (Monthly, Biannual, Annual)
  - Expense statistics and analysis
- **Financial Reports**: Advanced analytics dashboard
  - Interactive charts (Bar, Line, Pie, Area)
  - Income vs expenses analysis
  - Profit margin calculations
  - Excel and JSON export capabilities
- **Real-time Synchronization**: Firebase-powered sync
  - Offline-first architecture
  - Hybrid caching (Memory + localStorage + Firebase)
  - Real-time subscriptions
- **WhatsApp Notifications**: Intelligent notification system
  - Cutoff date reminders
  - Trial period endings
  - Configurable notification templates
- **Modern UI/UX**: Professional dark theme interface
  - Responsive design for all devices
  - Tailwind CSS styling
  - Lucide React icons
  - Smooth animations and transitions

### Technical Features
- **React 18** with modern hooks
- **Firebase Firestore** for NoSQL database
- **Firebase Auth** with anonymous authentication
- **Recharts** for data visualization
- **React Router** for SPA navigation
- **Centralized Data Management** with custom event system
- **Hybrid Caching Strategy** for optimal performance
- **Error Boundaries** and robust error handling
- **TypeScript-ready** architecture

### Infrastructure
- **Firebase Hosting** ready deployment
- **PWA capabilities** for mobile experience
- **Service Worker** support
- **Build optimization** with Create React App
- **ESLint** configuration for code quality

---

## Version History

### Development Phases

#### Phase 1: Core Architecture (Completed)
- ✅ Firebase integration with anonymous auth
- ✅ Basic CRUD operations for projects
- ✅ Real-time data synchronization
- ✅ Offline support with local caching
- ✅ Centralized data management system

#### Phase 2: Business Logic (Completed)
- ✅ Project state management (Demo → Trial → Established)
- ✅ Automatic date calculations (cutoff dates, trial periods)
- ✅ Client auto-creation from projects
- ✅ Expense categorization and recurring payments
- ✅ Financial calculations and analytics

#### Phase 3: User Experience (Completed)
- ✅ Modern dark theme UI with Tailwind CSS
- ✅ Responsive design for mobile and desktop
- ✅ Interactive charts and data visualization
- ✅ Advanced filtering and search capabilities
- ✅ Excel/JSON export functionality

#### Phase 4: Advanced Features (Completed)
- ✅ WhatsApp notification system
- ✅ Billing support with RFC validation
- ✅ Installation cost tracking
- ✅ Comprehensive financial reports
- ✅ Real-time dashboard updates

#### Phase 5: Production Ready (Completed)
- ✅ Error handling and logging
- ✅ Performance optimizations
- ✅ Security best practices
- ✅ Documentation and setup guides
- ✅ Deployment configurations

## Future Releases

### [1.1.0] - Planned
- [ ] TypeScript migration
- [ ] Unit tests implementation
- [ ] Performance monitoring
- [ ] Mobile PWA enhancements

### [1.2.0] - Planned
- [ ] Multi-tenant support
- [ ] Advanced analytics with AI insights
- [ ] API integrations (CRM, payment processors)
- [ ] Custom notification templates

### [2.0.0] - Planned
- [ ] React Native mobile app
- [ ] Advanced reporting with machine learning
- [ ] Marketplace for chatbot templates
- [ ] Team collaboration features

---

## Contributing

When contributing to this project, please:
1. Update the changelog with your changes
2. Follow the existing commit message format
3. Test your changes thoroughly
4. Update documentation if needed

### Types of Changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

---

*Changelog format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)*