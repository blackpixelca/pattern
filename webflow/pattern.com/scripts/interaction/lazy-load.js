// ============================================
// PATTERN-US LAZY LOADING SCRIPT
// External JavaScript - Excludes animated brand logos
// ============================================

(function() {
  'use strict';
  
  console.log('🚀 Starting Lazy Loading Implementation...');
  
  // ============================================
  // 1. EXCLUDE ANIMATED BRAND LOGOS
  // ============================================
  // DO NOT lazy load logos with [brand-logo] attribute
  // These are controlled by animation script and must load immediately
  
  const animatedLogos = document.querySelectorAll('[brand-logo]');
  console.log(`⚠️  Found ${animatedLogos.length} animated logos - will NOT lazy load these`);
  
  // ============================================
  // 2. CASE STUDY IMAGES LAZY LOADING
  // ============================================
  // Target case study images (Sakura, Wahl, Gaia, Steelcase)
  // These are below the fold and safe to lazy load
  
  const caseStudyImages = document.querySelectorAll('img[src*="cs_"]');
  console.log(`📚 Found ${caseStudyImages.length} case study images`);
  
  caseStudyImages.forEach((img) => {
    // Skip if it's an animated logo
    if (img.closest('[brand-logo]')) {
      console.log('  ↳ Skipping (animated logo)');
      return;
    }
    
    img.setAttribute('loading', 'lazy');
    console.log(`  ✅ Applied lazy loading to case study image`);
  });
  
  // ============================================
  // 3. AVATAR/TESTIMONIAL IMAGES LAZY LOADING
  // ============================================
  // Target avatar images - these are below the fold
  
  const avatarImages = document.querySelectorAll('img[src*="avatar"]');
  console.log(`👤 Found ${avatarImages.length} avatar images`);
  
  avatarImages.forEach((img) => {
    img.setAttribute('loading', 'lazy');
    console.log(`  ✅ Applied lazy loading to avatar image`);
  });
  
  // ============================================
  // 4. BACKGROUND/DECORATION IMAGES
  // ============================================
  // Target background and decoration images
  
  const bgImages = document.querySelectorAll('img[src*="bkg"], img[src*="background"]');
  console.log(`🎨 Found ${bgImages.length} background images`);
  
  bgImages.forEach((img) => {
    // Skip if in hero section or animated logo
    const isInHero = img.closest('[class*="hero"]') || img.closest('[brand-logo]');
    if (isInHero) {
      console.log('  ↳ Skipping (in hero or animated)');
      return;
    }
    
    img.setAttribute('loading', 'lazy');
    console.log(`  ✅ Applied lazy loading to background image`);
  });
  
  // ============================================
  // 5. ICON IMAGES (including the PNG one)
  // ============================================
  // Target icon images like pattern_fulfillment-icon.png
  
  const iconImages = document.querySelectorAll('img[src*="icon"]');
  console.log(`🔷 Found ${iconImages.length} icon images`);
  
  iconImages.forEach((img) => {
    // Skip if in hero or navigation
    const isInHeroOrNav = img.closest('[class*="hero"]') || 
                          img.closest('[class*="nav"]') || 
                          img.closest('[brand-logo]');
    
    if (isInHeroOrNav) {
      console.log('  ↳ Skipping (in hero/nav or animated)');
      return;
    }
    
    img.setAttribute('loading', 'lazy');
    console.log(`  ✅ Applied lazy loading to icon image`);
  });
  
  // ============================================
  // 6. GENERAL BELOW-THE-FOLD IMAGES
  // ============================================
  // Catch any other images below the fold
  // CRITICAL: Exclude animated logos and hero images
  
  const allImages = document.querySelectorAll('img');
  let lazyCount = 0;
  let skippedCount = 0;
  
  console.log(`🔍 Scanning all ${allImages.length} images...`);
  
  allImages.forEach((img) => {
    // Skip if already processed
    if (img.hasAttribute('loading')) {
      skippedCount++;
      return;
    }
    
    // CRITICAL: Skip animated brand logos
    if (img.closest('[brand-logo]') || img.hasAttribute('brand-logo')) {
      console.log('  ↳ Skipping animated logo:', img.src.split('/').pop());
      skippedCount++;
      return;
    }
    
    // Skip if in hero section
    const isInHero = img.closest('[class*="hero"]') || 
                     img.closest('[class*="banner"]');
    
    if (isInHero) {
      console.log('  ↳ Skipping hero image:', img.src.split('/').pop());
      skippedCount++;
      return;
    }
    
    // Check if image is above the fold (approximate)
    const rect = img.getBoundingClientRect();
    const isAboveFold = rect.top < 800; // Approximate fold height
    
    if (isAboveFold) {
      console.log('  ↳ Skipping above-fold:', img.src.split('/').pop());
      skippedCount++;
      return;
    }
    
    // Safe to lazy load!
    img.setAttribute('loading', 'lazy');
    console.log('  ✅ Applied lazy loading:', img.src.split('/').pop());
    lazyCount++;
  });
  
  // ============================================
  // 7. PERFORMANCE LOGGING & SUMMARY
  // ============================================
  console.log('\n📊 LAZY LOADING SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(`  ⚠️  Animated logos (NOT lazy loaded): ${animatedLogos.length}`);
  console.log(`  ✅ Case study images (lazy loaded):   ${caseStudyImages.length}`);
  console.log(`  ✅ Avatar images (lazy loaded):       ${avatarImages.length}`);
  console.log(`  ✅ Background images (lazy loaded):   ${bgImages.length}`);
  console.log(`  ✅ Icon images (lazy loaded):         ${iconImages.length}`);
  console.log(`  ✅ Other images (lazy loaded):        ${lazyCount}`);
  console.log(`  ↳  Images skipped (above fold):       ${skippedCount}`);
  console.log('═══════════════════════════════════════');
  
  const totalLazy = caseStudyImages.length + avatarImages.length + bgImages.length + iconImages.length + lazyCount;
  const totalImages = allImages.length;
  const percentLazy = ((totalLazy / totalImages) * 100).toFixed(1);
  
  console.log(`\n✅ Lazy Loading Complete!`);
  console.log(`   ${totalLazy} of ${totalImages} images (${percentLazy}%) set to lazy load`);
  console.log(`   Animated logos protected: ${animatedLogos.length} logos load immediately`);
  
  // Performance estimate
  const estimatedSavings = totalLazy * 30; // Approximate 30KB per image
  const estimatedSavingsKB = (estimatedSavings / 1024).toFixed(0);
  console.log(`   Estimated bandwidth saved: ~${estimatedSavingsKB}KB on initial load`);
  
})();
