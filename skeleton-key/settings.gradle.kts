// Copyright © 2026 WVLRP / The Wild. All rights reserved in original project-created material only. Third-party assets and prior rights remain subject to their respective licenses. See /COPYRIGHT.md.
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral(); maven { url = uri("https://jitpack.io") } }
}
rootProject.name = "WVLRPMobileLive"
include(":app")
