package com.wvlrp.huntvisionbridge;

import android.content.Context;

import com.ivyio.sdk.FrameData;
import com.ivyio.sdk.IvyIoInteger;
import com.ivyio.sdk.IvyIoSdkJni;
import com.ivyio.sdk.OpenVideoArgsType0;
import com.ivyio.sdk.Url;

final class HuntvisionNativeBridge {
    interface Progress {
        void onProgress(String message);
    }

    static final class Result {
        final boolean ok;
        final String summary;
        final String sdkVersion;
        final String codec;
        final int width;
        final int height;
        final int fps;
        final int bytes;
        final int keyFrame;
        final long pts;
        final boolean annexB;

        Result(
                boolean ok,
                String summary,
                String sdkVersion,
                String codec,
                int width,
                int height,
                int fps,
                int bytes,
                int keyFrame,
                long pts,
                boolean annexB) {
            this.ok = ok;
            this.summary = summary;
            this.sdkVersion = sdkVersion;
            this.codec = codec;
            this.width = width;
            this.height = height;
            this.fps = fps;
            this.bytes = bytes;
            this.keyFrame = keyFrame;
            this.pts = pts;
            this.annexB = annexB;
        }

        static Result fail(String message) {
            return new Result(false, message, "", "", 0, 0, 0, 0, 0, 0, false);
        }
    }

    private HuntvisionNativeBridge() {}

    static Result test(
            Context context,
            String host,
            int port,
            String username,
            String password,
            String mac,
            Progress progress) {
        int handle = -1;
        boolean opened = false;
        try {
            progress.onProgress("Loading Huntvision Ivy SDK from the installed Huntvision app…");
            String loaded = HuntvisionSdkLoader.ensureLoaded(context);
            progress.onProgress(loaded);

            IvyIoSdkJni.init();
            String sdkVersion;
            try {
                sdkVersion = IvyIoSdkJni.version();
            } catch (Throwable ignored) {
                sdkVersion = "";
            }

            Url url = new Url();
            url.url = host;
            url.port = port;

            progress.onProgress("Opening direct Ivy TCP session to " + host + ":" + port + "…");
            handle = IvyIoSdkJni.createEx(
                    url,
                    "",
                    mac == null ? "" : mac,
                    username == null ? "" : username,
                    password == null ? "" : password,
                    1,
                    1000,
                    "",
                    0L);
            if (handle < 0) {
                return Result.fail("Ivy createEx failed: " + handle);
            }

            progress.onProgress("Authenticating with the camera…");
            int login = IvyIoSdkJni.login(handle, 10000);
            if (login < 0) {
                return Result.fail("Ivy login failed: " + login);
            }

            IvyIoInteger permission = new IvyIoInteger(0);
            try {
                IvyIoSdkJni.getPermissionLevel(handle, permission);
            } catch (Throwable ignored) {}

            OpenVideoArgsType0 args = new OpenVideoArgsType0();
            args.streamType = 0;

            progress.onProgress("Requesting the main video stream…");
            int open = IvyIoSdkJni.openVideo(handle, args, 10000, 1);
            if (open < 0) {
                return Result.fail("Ivy openVideo failed: " + open);
            }
            opened = true;

            progress.onProgress("Waiting for the first decrypted video frame…");
            long deadline = System.currentTimeMillis() + 12000L;
            int attempts = 0;
            while (System.currentTimeMillis() < deadline && attempts++ < 700) {
                FrameData frame = new FrameData();
                IvyIoInteger out = new IvyIoInteger(0);
                int rc = IvyIoSdkJni.getRawStreamData(handle, 0, frame, out, 0);
                int len = frame.dataLen > 0
                        ? frame.dataLen
                        : (frame.data == null ? 0 : frame.data.length);

                if (rc >= 0 && frame.type == 0 && frame.data != null && len > 0) {
                    int usable = Math.min(len, frame.data.length);
                    boolean annexB = containsAnnexB(frame.data, Math.min(usable, 256));
                    String codec = codec(frame.fmt);
                    String summary =
                            "LIVE IVY STREAM VERIFIED\n" +
                            "Codec: " + codec + " (fmt " + frame.fmt + ")\n" +
                            "Video: " + frame.video_w + "×" + frame.video_h +
                            (frame.video_frameRate > 0 ? " @ " + frame.video_frameRate + " fps" : "") + "\n" +
                            "First frame: " + usable + " bytes" +
                            (frame.key != 0 ? " • key frame" : "") + "\n" +
                            "Annex-B NAL: " + (annexB ? "yes" : "not in first 256 bytes") + "\n" +
                            "Permission level: " + permission.intValue() +
                            (sdkVersion == null || sdkVersion.isEmpty()
                                    ? ""
                                    : "\nIvy SDK: " + sdkVersion);
                    return new Result(
                            true,
                            summary,
                            sdkVersion == null ? "" : sdkVersion,
                            codec,
                            frame.video_w,
                            frame.video_h,
                            frame.video_frameRate,
                            usable,
                            frame.key,
                            frame.pts,
                            annexB);
                }

                try {
                    Thread.sleep(20);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return Result.fail("Live test interrupted");
                }
            }

            return Result.fail(
                    "Ivy login/openVideo succeeded, but no decrypted video frame arrived within 12 seconds.");
        } catch (PackageManagerNameNotFoundCompat e) {
            return Result.fail(e.getMessage());
        } catch (Throwable t) {
            String name = t.getClass().getSimpleName();
            String message = t.getMessage();
            if (message == null || message.trim().isEmpty()) message = t.toString();
            return Result.fail(name + ": " + message);
        } finally {
            if (handle >= 0) {
                if (opened) {
                    try { IvyIoSdkJni.closeVideo(handle, 0, 1); } catch (Throwable ignored) {}
                }
                try { IvyIoSdkJni.logout(handle); } catch (Throwable ignored) {}
                try { IvyIoSdkJni.destroy(handle); } catch (Throwable ignored) {}
            }
        }
    }

    private static String codec(int fmt) {
        switch (fmt) {
            case 0: return "H.264";
            case 1: return "H.265";
            case 3: return "MJPEG";
            case 1000: return "PCM";
            case 1001: return "G.726";
            case 1002: return "AAC";
            default: return "Unknown";
        }
    }

    private static boolean containsAnnexB(byte[] data, int n) {
        for (int i = 0; i + 3 < n; i++) {
            if (data[i] == 0 && data[i + 1] == 0) {
                if (data[i + 2] == 1) return true;
                if (i + 3 < n && data[i + 2] == 0 && data[i + 3] == 1) return true;
            }
        }
        return false;
    }

    /*
     * Kept as a named exception hook so the UI can report a missing Huntvision install
     * cleanly if loader behavior changes later. The current loader surfaces the platform
     * NameNotFoundException through the generic Throwable path.
     */
    private static final class PackageManagerNameNotFoundCompat extends Exception {
        PackageManagerNameNotFoundCompat(String message) { super(message); }
    }
}
