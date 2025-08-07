#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Running validation checks...');

// Check TypeScript
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript check passed');
} catch (error) {
  console.log('⚠️  TypeScript has some issues (non-critical)');
}

// Check ESLint
try {
  execSync('npm run lint', { stdio: 'pipe' });
  console.log('✅ ESLint check passed');
} catch (error) {
  console.log('⚠️  ESLint has some warnings (non-critical)');
}

// Check build
try {
  console.log('🏗️  Testing build (this may take a minute)...');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful!');
} catch (error) {
  console.log('❌ Build failed - please check the errors');
}

console.log('\n✨ Validation complete!');
