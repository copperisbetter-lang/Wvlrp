plugins {
    id("com.android.application")
}

android {
    namespace = "com.wvlrp.huntvisionbridge"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.wvlrp.huntvisionbridge"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "0.5.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
