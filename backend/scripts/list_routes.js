const express = require('express');

// This script will help us understand how routes are registered
function listRoutes() {
  // Create a temp Express app to examine route registration
  const app = express();
  
  console.log('=== Route Registration Simulation ===');
  
  // Register an example route with /api prefix
  const apiRoutes = express.Router();
  apiRoutes.get('/test', (req, res) => {}); // Sample route
  app.use('/api', apiRoutes);
  console.log('Registered /api/test route');
  
  // Register an example route without /api prefix
  const nonApiRoutes = express.Router();
  nonApiRoutes.get('/test', (req, res) => {}); // Sample route
  app.use('/feedback', nonApiRoutes);
  console.log('Registered /feedback/test route');
  
  // Check how request paths map to routes
  const testCases = [
    '/api/feedback/event/12',
    '/feedback/event/12',
    '/api/test',
    '/test',
  ];
  
  console.log('\n=== Route Matching Examples ===');
  testCases.forEach(path => {
    console.log(`\nFor request path: ${path}`);
    console.log('- originalUrl would be:', path);
    console.log('- path would be:', path); 
    
    // What would match this request?
    const matchesApiRoute = path.startsWith('/api/');
    const matchesFeedbackRoute = path.startsWith('/feedback/');
    
    console.log('- Would match /api/* route?', matchesApiRoute);
    console.log('- Would match /feedback/* route?', matchesFeedbackRoute);
  });
  
  console.log('\n=== Suggested Solution ===');
  console.log('If frontend is using /api/feedback/* paths, register the routes as:');
  console.log('app.use(\'/api/feedback\', feedbackRoutes);');
  console.log('\nIf frontend is using /feedback/* paths, register the routes as:');
  console.log('app.use(\'/feedback\', feedbackRoutes);');
  console.log('\nMake sure the API client is configured to use the same base URL pattern as the server route registration.');
}

listRoutes();
