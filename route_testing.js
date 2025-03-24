// Run this in your browser console to test all routes
// It will log any issues it finds

(async function testAllRoutes() {
  console.log('🧪 Testing all application routes...');
  
  const routes = [
    // Public routes
    { path: '/', name: 'Home' },
    { path: '/search', name: 'Search' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/forgot-password', name: 'Forgot Password' },
    { path: '/reset-password', name: 'Reset Password' },
    { path: '/jobs/1', name: 'Job Details' },
    { path: '/reviews/1', name: 'Worker Reviews' },
    
    // Protected routes (any user)
    { path: '/profile-settings', name: 'Profile Settings', protected: true },
    { path: '/messages', name: 'Messages', protected: true },
    
    // Customer routes
    { path: '/post-job', name: 'Post Job', userType: 'customer' },
    { path: '/worker-profile', name: 'Worker Profile', userType: 'customer' },
    { path: '/dashboard', name: 'Customer Dashboard', userType: 'customer' },
    { path: '/booking', name: 'Booking', userType: 'customer' },
    { path: '/booking-success', name: 'Booking Success', userType: 'customer' },
    { path: '/payment', name: 'Payment', userType: 'customer' },
    { path: '/review/1', name: 'Review Job', userType: 'customer' },
    
    // Worker routes
    { path: '/worker/dashboard', name: 'Worker Dashboard', userType: 'worker' },
    { path: '/worker/find-jobs', name: 'Find Jobs', userType: 'worker' },
    { path: '/worker/jobs', name: 'Worker Jobs', userType: 'worker' },
    { path: '/worker/services', name: 'Worker Services', userType: 'worker' },
    { path: '/worker/availability', name: 'Worker Availability', userType: 'worker' },
    { path: '/worker/earnings', name: 'Worker Earnings', userType: 'worker' }
  ];
  
  const results = {
    total: routes.length,
    passed: 0,
    failed: 0,
    issues: []
  };
  
  // Check if current user is logged in
  const checkAuth = async () => {
    try {
      // This assumes you have supabase in window scope
      // If not, you'll need to modify this
      const { data } = await window.supabase.auth.getUser();
      return data.user ? true : false;
    } catch (e) {
      console.error('Auth check failed:', e);
      return false;
    }
  };
  
  // Get user type
  const getUserType = async () => {
    try {
      const { data } = await window.supabase.auth.getUser();
      if (!data.user) return null;
      
      const { data: profile } = await window.supabase
        .from('profiles')
        .select('user_type')
        .eq('id', data.user.id)
        .single();
        
      return profile?.user_type || null;
    } catch (e) {
      console.error('User type check failed:', e);
      return null;
    }
  };
  
  const isAuthenticated = await checkAuth();
  const userType = await getUserType();
  
  console.log(`🔑 Authentication status: ${isAuthenticated ? 'Logged in' : 'Not logged in'}`);
  if (isAuthenticated) {
    console.log(`👤 User type: ${userType || 'Unknown'}`);
  }
  
  // Test each route
  for (const route of routes) {
    // Skip protected routes if not authenticated
    if ((route.protected || route.userType) && !isAuthenticated) {
      console.log(`⏭️ Skipping ${route.name} (${route.path}) - requires authentication`);
      continue;
    }
    
    // Skip user-specific routes if wrong user type
    if (route.userType && userType !== route.userType) {
      console.log(`⏭️ Skipping ${route.name} (${route.path}) - requires ${route.userType} user type`);
      continue;
    }
    
    try {
      console.log(`🔍 Testing ${route.name} (${route.path})...`);
      
      // Store current location to return to it
      const currentPath = window.location.pathname;
      
      // Navigate to the route
      window.history.pushState({}, '', route.path);
      
      // Wait a bit for any redirects
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if we were redirected (indicating a route issue)
      const finalPath = window.location.pathname;
      const redirected = finalPath !== route.path;
      
      if (redirected) {
        results.failed++;
        results.issues.push({
          route: route.path,
          name: route.name,
          issue: `Redirected to ${finalPath}`
        });
        console.error(`❌ ${route.name} (${route.path}) - Redirected to ${finalPath}`);
      } else {
        results.passed++;
        console.log(`✅ ${route.name} (${route.path}) - OK`);
      }
      
      // Return to original location
      window.history.pushState({}, '', currentPath);
    } catch (error) {
      results.failed++;
      results.issues.push({
        route: route.path,
        name: route.name,
        issue: error.message
      });
      console.error(`❌ ${route.name} (${route.path}) - Error: ${error.message}`);
    }
  }
  
  // Print summary
  console.log('\n📊 Route Testing Summary:');
  console.log(`Total routes: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.issues.length > 0) {
    console.log('\n🐛 Issues found:');
    results.issues.forEach((issue, i) => {
      console.log(`${i+1}. ${issue.name} (${issue.route}): ${issue.issue}`);
    });
  }
  
  return results;
})();