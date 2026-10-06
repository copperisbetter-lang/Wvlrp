package com.wvlrp.huntvisionbridge;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

final class HuntvisionSdkLoader {
    private static final String HUNTVISION_PACKAGE = "com.huntivison.huntivison";
    private static volatile boolean loaded = false;

    private static final String[] LIBS = {
            "libc++_shared.so",
            "libavutil.so",
            "libavcodec.so",
            "libavformat.so",
            "libswscale.so",
            "libswresample.so",
            "libfaac.so",
            "libopenal.so",
            "libopenal_aec.so",
            "libmp4v2.so",
            "libcrypto.so",
            "libssl.so",
            "libIOTCAPIs.so",
            "libRDTAPIs.so",
            "libp2pJni.so",
            "libIvyIoSdkJni.so"
    };

    private HuntvisionSdkLoader() {}

    static synchronized String ensureLoaded(Context context) throws Exception {
        if (loaded) return "already loaded";

        PackageManager pm = context.getPackageManager();
        ApplicationInfo ai;
        if (Build.VERSION.SDK_INT >= 33) {
            ai = pm.getApplicationInfo(
                    HUNTVISION_PACKAGE,
                    PackageManager.ApplicationInfoFlags.of(0));
        } else {
            ai = pm.getApplicationInfo(HUNTVISION_PACKAGE, 0);
        }

        String abi = chooseAbi();
        File outDir = new File(context.getCodeCacheDir(), "huntvision-ivy-" + abi);
        if (!outDir.exists() && !outDir.mkdirs()) {
            throw new IllegalStateException("Could not create native SDK cache");
        }

        List<String> apks = new ArrayList<>();
        if (ai.sourceDir != null) apks.add(ai.sourceDir);
        if (ai.splitSourceDirs != null) apks.addAll(Arrays.asList(ai.splitSourceDirs));

        for (String lib : LIBS) {
            File target = new File(outDir, lib);
            if (!target.exists() || target.length() == 0) {
                extractLibrary(apks, abi, lib, target);
            }
            target.setReadable(true, true);
            target.setExecutable(true, true);
        }

        for (String lib : LIBS) {
            File target = new File(outDir, lib);
            try {
                System.load(target.getAbsolutePath());
            } catch (UnsatisfiedLinkError e) {
                String msg = e.getMessage();
                if (msg == null || !msg.contains("already loaded")) throw e;
            }
        }

        loaded = true;
        return "Huntvision native SDK loaded from installed app (" + abi + ")";
    }

    private static String chooseAbi() {
        for (String abi : Build.SUPPORTED_ABIS) {
            if ("arm64-v8a".equals(abi)) return abi;
        }
        for (String abi : Build.SUPPORTED_ABIS) {
            if ("armeabi-v7a".equals(abi)) return abi;
        }
        throw new IllegalStateException(
                "Unsupported phone ABI: " + Arrays.toString(Build.SUPPORTED_ABIS));
    }

    private static void extractLibrary(
            List<String> apks,
            String abi,
            String lib,
            File target) throws Exception {
        String entryName = "lib/" + abi + "/" + lib;
        for (String apk : apks) {
            try (ZipFile zip = new ZipFile(apk)) {
                ZipEntry entry = zip.getEntry(entryName);
                if (entry == null) continue;
                File tmp = new File(target.getParentFile(), lib + ".tmp");
                try (InputStream in = zip.getInputStream(entry);
                     FileOutputStream out = new FileOutputStream(tmp, false)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    out.getFD().sync();
                }
                if (target.exists() && !target.delete()) {
                    throw new IllegalStateException("Could not replace " + lib);
                }
                if (!tmp.renameTo(target)) {
                    throw new IllegalStateException("Could not install " + lib);
                }
                return;
            }
        }
        throw new IllegalStateException(
                "Huntvision is installed, but " + entryName + " was not found");
    }
}
