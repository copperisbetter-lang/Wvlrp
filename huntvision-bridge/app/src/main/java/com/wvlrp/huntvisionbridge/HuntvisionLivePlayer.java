package com.wvlrp.huntvisionbridge;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.media.MediaCodec;
import android.media.MediaFormat;
import android.view.Surface;

import com.ivyio.sdk.FrameData;
import com.ivyio.sdk.IvyIoInteger;
import com.ivyio.sdk.IvyIoSdkJni;
import com.ivyio.sdk.OpenVideoArgsType0;
import com.ivyio.sdk.Url;

import java.nio.ByteBuffer;

final class HuntvisionLivePlayer {
    interface Progress {
        void onProgress(String message);
    }

    interface StopCheck {
        boolean shouldStop();
    }

    static final class Outcome {
        final boolean ok;
        final String summary;

        Outcome(boolean ok, String summary) {
            this.ok = ok;
            this.summary = summary;
        }

        static Outcome ok(String summary) {
            return new Outcome(true, summary);
        }

        static Outcome fail(String summary) {
            return new Outcome(false, summary);
        }
    }

    private HuntvisionLivePlayer() {}

    static Outcome play(
            Context context,
            String host,
            int port,
            String uid,
            String username,
            String password,
            String mac,
            Surface surface,
            StopCheck stop,
            Progress progress) {
        int handle = -1;
        int openedMode = -1;
        MediaCodec decoder = null;
        try {
            if (surface == null || !surface.isValid()) {
                return Outcome.fail("Video surface is not ready.");
            }

            progress.onProgress("Loading Huntvision Ivy SDK…");
            String loaded = HuntvisionSdkLoader.ensureLoaded(context);
            progress.onProgress(loaded);
            IvyIoSdkJni.init();

            Url url = new Url();
            url.url = host;
            url.port = port;

            progress.onProgress("Connecting to Huntvision " + host + ":" + port + "…");
            handle = IvyIoSdkJni.createEx(
                    url,
                    uid == null ? "" : uid,
                    mac == null ? "" : mac,
                    username == null ? "" : username,
                    password == null ? "" : password,
                    1,
                    1000,
                    "",
                    0L);
            if (handle < 0) {
                return Outcome.fail("Ivy createEx failed: " + handle);
            }

            int login = IvyIoSdkJni.login(handle, 10000);
            if (login < 0) {
                return Outcome.fail("Ivy login failed: " + login);
            }

            IvyIoInteger permission = new IvyIoInteger(0);
            try {
                IvyIoSdkJni.getPermissionLevel(handle, permission);
            } catch (Throwable ignored) {}

            FrameData first = null;
            int selectedStream = -1;
            int[][] attempts = {
                    {0, 0},
                    {0, 1},
                    {1, 0},
                    {1, 1}
            };

            for (int[] attempt : attempts) {
                if (stop.shouldStop()) return Outcome.ok("Live view stopped.");
                int streamType = attempt[0];
                int mode = attempt[1];
                OpenVideoArgsType0 args = new OpenVideoArgsType0();
                args.streamType = streamType;

                progress.onProgress(
                        "Opening Ivy video • stream " + streamType + " • mode " + mode + "…");
                int open = IvyIoSdkJni.openVideo(handle, args, 8000, mode);
                if (open < 0) continue;

                openedMode = mode;
                first = waitForVideoFrame(handle, stop, 4500L);
                if (first != null) {
                    selectedStream = streamType;
                    break;
                }

                try {
                    IvyIoSdkJni.closeVideo(handle, 0, mode);
                } catch (Throwable ignored) {}
                openedMode = -1;
            }

            if (first == null) {
                return Outcome.fail(
                        "Ivy login succeeded, but no video frame arrived in stream/mode 0 or 1.");
            }

            int fmt = first.fmt;
            String codecName = codecName(fmt);
            int width = sane(first.video_w, 1920);
            int height = sane(first.video_h, 1080);
            int fps = sane(first.video_frameRate, 15);

            progress.onProgress(
                    "LIVE • " + codecName + " • " + width + "×" + height +
                    " • stream " + selectedStream + " • mode " + openedMode);

            if (fmt == 0 || fmt == 1) {
                String mime = fmt == 0 ? MediaFormat.MIMETYPE_VIDEO_AVC : MediaFormat.MIMETYPE_VIDEO_HEVC;
                MediaFormat format = MediaFormat.createVideoFormat(mime, width, height);
                format.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 4 * 1024 * 1024);
                format.setInteger(MediaFormat.KEY_FRAME_RATE, fps);

                decoder = MediaCodec.createDecoderByType(mime);
                decoder.configure(format, surface, null, 0);
                decoder.start();

                MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
                long rendered = 0;
                long dropped = 0;
                long started = System.nanoTime();

                FrameData frame = first;
                while (!stop.shouldStop()) {
                    if (frame != null && isVideo(frame)) {
                        int len = frameLength(frame);
                        if (len > 0) {
                            int in = decoder.dequeueInputBuffer(10000);
                            if (in >= 0) {
                                ByteBuffer buffer = decoder.getInputBuffer(in);
                                if (buffer != null && len <= buffer.capacity()) {
                                    buffer.clear();
                                    buffer.put(frame.data, 0, len);
                                    long ptsUs = System.nanoTime() / 1000L;
                                    decoder.queueInputBuffer(in, 0, len, ptsUs, 0);
                                } else {
                                    dropped++;
                                }
                            } else {
                                dropped++;
                            }

                            int out;
                            do {
                                out = decoder.dequeueOutputBuffer(info, 0);
                                if (out >= 0) {
                                    decoder.releaseOutputBuffer(out, true);
                                    rendered++;
                                }
                            } while (out >= 0);
                        }
                    }

                    frame = readFrame(handle);
                    if (frame == null) {
                        try {
                            Thread.sleep(5);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }

                    if (rendered > 0 && rendered % 150 == 0) {
                        long seconds = Math.max(1L, (System.nanoTime() - started) / 1_000_000_000L);
                        progress.onProgress(
                                "LIVE • " + codecName + " • " + width + "×" + height +
                                " • rendered " + rendered + " frames / " + seconds + "s" +
                                (dropped > 0 ? " • dropped " + dropped : ""));
                    }
                }

                return Outcome.ok(
                        "Live view stopped. Rendered " + rendered +
                        " frame(s)" + (dropped > 0 ? ", dropped " + dropped : "") + ".");
            }

            if (fmt == 3) {
                long rendered = 0;
                FrameData frame = first;
                while (!stop.shouldStop()) {
                    if (frame != null && isVideo(frame)) {
                        int len = frameLength(frame);
                        Bitmap bmp = BitmapFactory.decodeByteArray(frame.data, 0, len);
                        if (bmp != null) {
                            drawBitmap(surface, bmp);
                            bmp.recycle();
                            rendered++;
                        }
                    }
                    frame = readFrame(handle);
                    if (frame == null) {
                        try {
                            Thread.sleep(5);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }
                return Outcome.ok("Live MJPEG view stopped. Rendered " + rendered + " frame(s).");
            }

            return Outcome.fail(
                    "Ivy video opened, but the camera reported unsupported video fmt " + fmt +
                    " (" + codecName + ").");
        } catch (Throwable t) {
            String message = t.getMessage();
            if (message == null || message.trim().isEmpty()) message = t.toString();
            return Outcome.fail(t.getClass().getSimpleName() + ": " + message);
        } finally {
            if (decoder != null) {
                try { decoder.stop(); } catch (Throwable ignored) {}
                try { decoder.release(); } catch (Throwable ignored) {}
            }
            if (handle >= 0) {
                if (openedMode >= 0) {
                    try { IvyIoSdkJni.closeVideo(handle, 0, openedMode); } catch (Throwable ignored) {}
                }
                try { IvyIoSdkJni.logout(handle); } catch (Throwable ignored) {}
                try { IvyIoSdkJni.destroy(handle); } catch (Throwable ignored) {}
            }
        }
    }

    private static FrameData waitForVideoFrame(
            int handle,
            StopCheck stop,
            long timeoutMs) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (!stop.shouldStop() && System.currentTimeMillis() < deadline) {
            FrameData frame = readFrame(handle);
            if (frame != null && isVideo(frame) && frameLength(frame) > 0) return frame;
            try {
                Thread.sleep(8);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        return null;
    }

    private static FrameData readFrame(int handle) {
        try {
            FrameData frame = new FrameData();
            IvyIoInteger out = new IvyIoInteger(0);
            int rc = IvyIoSdkJni.getRawStreamData(handle, 0, frame, out, 0);
            if (rc < 0 || frame.data == null) return null;
            return frame;
        } catch (Throwable t) {
            return null;
        }
    }

    private static boolean isVideo(FrameData frame) {
        return frame.type == 0 && frame.fmt >= 0 && frame.fmt < 1000;
    }

    private static int frameLength(FrameData frame) {
        if (frame == null || frame.data == null) return 0;
        int n = frame.dataLen > 0 ? frame.dataLen : frame.data.length;
        return Math.min(n, frame.data.length);
    }

    private static int sane(int value, int fallback) {
        return value > 0 ? value : fallback;
    }

    private static String codecName(int fmt) {
        switch (fmt) {
            case 0: return "H.264";
            case 1: return "H.265";
            case 3: return "MJPEG";
            case 1000: return "PCM";
            case 1001: return "G.726";
            case 1002: return "AAC";
            default: return "fmt " + fmt;
        }
    }

    private static void drawBitmap(Surface surface, Bitmap bitmap) {
        Canvas canvas = null;
        try {
            canvas = surface.lockCanvas(null);
            canvas.drawColor(Color.BLACK);
            int cw = canvas.getWidth();
            int ch = canvas.getHeight();
            float scale = Math.min((float) cw / bitmap.getWidth(), (float) ch / bitmap.getHeight());
            int dw = Math.max(1, Math.round(bitmap.getWidth() * scale));
            int dh = Math.max(1, Math.round(bitmap.getHeight() * scale));
            int left = (cw - dw) / 2;
            int top = (ch - dh) / 2;
            canvas.drawBitmap(bitmap, null, new Rect(left, top, left + dw, top + dh), null);
        } finally {
            if (canvas != null) surface.unlockCanvasAndPost(canvas);
        }
    }
}
