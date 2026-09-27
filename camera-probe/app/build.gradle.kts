plugins { id("com.android.application"); kotlin("android") }
android { namespace="com.wvlrp.huntvisionprobe"; compileSdk=35; defaultConfig { applicationId="com.wvlrp.huntvisionprobe"; minSdk=26; targetSdk=35; versionCode=2; versionName="0.2" }; compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 } }
kotlin { jvmToolchain(17) }
