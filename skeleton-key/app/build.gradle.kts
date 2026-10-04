plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.wvlrp.mobilelive"
    compileSdk = 35
    defaultConfig { applicationId = "com.wvlrp.mobilelive"; minSdk = 26; targetSdk = 35; versionCode = 3; versionName = "1.2" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("com.github.pedroSG94.RootEncoder:library:2.8.1")
}
