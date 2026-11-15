// Copyright © 2026 WVLRP / The Wild. All rights reserved in original project-created material only. Third-party assets and prior rights remain subject to their respective licenses. See /COPYRIGHT.md.
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.wvlrp.mobilelive"
    compileSdk = 35
    defaultConfig { applicationId = "com.wvlrp.mobilelive"; minSdk = 26; targetSdk = 35; versionCode = 6; versionName = "1.5" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("com.github.pedroSG94.RootEncoder:library:2.8.1")
}
