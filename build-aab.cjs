const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Building FL²M Android App Bundle for Play Store...\n');

// Function to read version from build.gradle
function getVersionFromGradle() {
  const gradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
  const gradleContent = fs.readFileSync(gradlePath, 'utf8');

  const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
  const versionNameMatch = gradleContent.match(/versionName\s+"([^"]+)"/);

  if (!versionCodeMatch || !versionNameMatch) {
    console.error('❌ Could not find version in build.gradle');
    process.exit(1);
  }

  return {
    versionCode: parseInt(versionCodeMatch[1]),
    versionName: versionNameMatch[1]
  };
}

try {
  // Get version info
  const version = getVersionFromGradle();
  console.log(`📱 Building version: ${version.versionName} (code: ${version.versionCode})\n`);

  // Step 1: Build the web app
  console.log('📦 Step 1/4: Building web app...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Web app built successfully\n');

  // Step 2: Sync with Capacitor
  console.log('🔄 Step 2/4: Syncing with Capacitor...');
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('✅ Capacitor sync completed\n');

  // Step 3: Build the signed release AAB
  console.log('🔨 Step 3/4: Building signed release AAB...');
  const gradlewPath = path.join(__dirname, 'android', 'gradlew.bat');
  execSync(`"${gradlewPath}" bundleRelease`, {
    cwd: path.join(__dirname, 'android'),
    stdio: 'inherit'
  });
  console.log('✅ AAB built successfully\n');

  // Step 4: Copy AAB to public/downloads
  console.log('📁 Step 4/4: Copying AAB to public/downloads...');
  const sourceAAB = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  const destDir = path.join(__dirname, 'public', 'downloads');
  const destAAB = path.join(destDir, `fl2m-app-v${version.versionName}.aab`);

  // Create downloads directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(sourceAAB, destAAB);
  console.log(`✅ AAB copied to: ${destAAB}\n`);

  // Get file size
  const stats = fs.statSync(destAAB);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('🎉 SUCCESS! Android App Bundle built and ready for Play Store!');
  console.log(`📦 File: ${destAAB}`);
  console.log(`📊 Size: ${fileSizeInMB} MB`);
  console.log(`📱 Version: ${version.versionName} (versionCode: ${version.versionCode})`);
  console.log('\n📌 Next steps:');
  console.log('   1. Go to https://play.google.com/console');
  console.log('   2. Create a new app or select existing app');
  console.log('   3. Upload the AAB file in Production > Create new release');
  console.log('   4. Fill in release details and submit for review\n');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
