package com.ivyio.sdk;

public final class IvyIoSdkJni {
    private IvyIoSdkJni() {}

    public static native void init();
    public static native String version();
    public static native int createEx(
            Url url,
            String uid,
            String mac,
            String username,
            String password,
            int p2pConnType,
            int deviceType,
            String p2pToken,
            long p2pTokenExpireAt);
    public static native int login(int handle, int timeoutMs);
    public static native int getPermissionLevel(int handle, IvyIoInteger out);
    public static native int openVideo(int handle, OpenVideoArgs args, int timeoutMs, int mode);
    public static native int getRawStreamData(
            int handle,
            int channel,
            FrameData frame,
            IvyIoInteger out,
            int flags);
    public static native int getStreamData(
            int handle,
            int channel,
            FrameData frame,
            IvyIoInteger out,
            int decodeMode,
            int flags);
    public static native int closeVideo(int handle, int channel, int mode);
    public static native void logout(int handle);
    public static native void destroy(int handle);
    public static native int checkHandle(int handle);
}
