plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "com.wvlrp.skeletonkey"
 compileSdk = 35
 defaultConfig { applicationId = "com.wvlrp.skeletonkey"; minSdk = 26; targetSdk = 35; versionCode = 4; versionName = "1.0-c31w" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}