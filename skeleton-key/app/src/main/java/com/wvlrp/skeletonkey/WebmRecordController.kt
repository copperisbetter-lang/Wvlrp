package com.wvlrp.mobilelive

import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.Build
import com.pedro.common.AudioCodec
import com.pedro.common.VideoCodec
import com.pedro.common.frame.MediaFrame
import com.pedro.common.toMediaCodecBufferInfo
import com.pedro.library.base.recording.AsyncBaseRecordController
import com.pedro.library.base.recording.RecordController
import java.io.FileDescriptor
import java.io.IOException

class WebmRecordController : AsyncBaseRecordController() {
    private var mediaMuxer: MediaMuxer? = null
    private var videoFormat: MediaFormat? = null
    private var audioFormat: MediaFormat? = null
    private var videoTrack = -1
    private var audioTrack = -1

    @Throws(IOException::class)
    override fun startRecordImp(
        path: String,
        listener: RecordController.Listener?,
        tracks: RecordController.RecordTracks
    ) {
        validateCodecs(tracks)
        mediaMuxer = MediaMuxer(path, MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM)
        if (tracks == RecordController.RecordTracks.AUDIO && audioFormat != null) initMuxer()
    }

    @Throws(IOException::class)
    override fun startRecordImp(
        fd: FileDescriptor,
        listener: RecordController.Listener?,
        tracks: RecordController.RecordTracks
    ) {
        validateCodecs(tracks)
        mediaMuxer = MediaMuxer(fd, MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM)
        if (tracks == RecordController.RecordTracks.AUDIO && audioFormat != null) initMuxer()
    }

    private fun validateCodecs(tracks: RecordController.RecordTracks) {
        if (Build.VERSION.SDK_INT < 29 && tracks != RecordController.RecordTracks.VIDEO) {
            throw IOException("Opus-in-WebM rolling audio requires Android 10+")
        }
        if (tracks != RecordController.RecordTracks.VIDEO && getAudioCodec() != AudioCodec.OPUS) {
            throw IOException("Unsupported rolling audio codec: " + getAudioCodec().name)
        }
        if (
            tracks != RecordController.RecordTracks.AUDIO &&
            getVideoCodec() != VideoCodec.VP8 &&
            getVideoCodec() != VideoCodec.VP9
        ) {
            throw IOException("Unsupported rolling video codec: " + getVideoCodec().name)
        }
    }

    override fun stopRecordImp() {
        videoTrack = -1
        audioTrack = -1
        try { mediaMuxer?.stop() } catch (_: Exception) {}
        try { mediaMuxer?.release() } catch (_: Exception) {}
        mediaMuxer = null
    }

    override fun setVideoFormat(videoFormat: MediaFormat) {
        this.videoFormat = videoFormat
    }

    override fun setAudioFormat(audioFormat: MediaFormat) {
        this.audioFormat = audioFormat
        if (
            tracks == RecordController.RecordTracks.AUDIO &&
            recordStatus == RecordController.Status.STARTED
        ) {
            initMuxer()
        }
    }

    override fun resetFormats() {
        videoFormat = null
        audioFormat = null
    }

    private fun initMuxer() {
        val muxer = mediaMuxer ?: return
        if (tracks != RecordController.RecordTracks.VIDEO) {
            audioTrack = muxer.addTrack(audioFormat ?: return)
        }
        muxer.start()
        recordStatus = RecordController.Status.RECORDING
        listener?.onStatusChange(recordStatus)
    }

    private fun write(track: Int, frame: MediaFrame) {
        if (track == -1) return
        try {
            mediaMuxer?.writeSampleData(track, frame.data, frame.info.toMediaCodecBufferInfo())
            bitrateManager?.calculateBitrate(frame.info.size * 8L)
        } catch (e: Exception) {
            listener?.onError(e)
        }
    }

    override suspend fun onWriteFrame(frame: MediaFrame) {
        when (frame.type) {
            MediaFrame.Type.VIDEO -> {
                if (
                    recordStatus == RecordController.Status.STARTED &&
                    videoFormat != null &&
                    (audioFormat != null || tracks == RecordController.RecordTracks.VIDEO)
                ) {
                    if (frame.info.isKeyFrame || isKeyFrame(frame.data)) {
                        myRequestKeyFrame = null
                        videoTrack = mediaMuxer?.addTrack(videoFormat!!) ?: -1
                        initMuxer()
                    } else if (myRequestKeyFrame != null) {
                        myRequestKeyFrame?.onRequestKeyFrame()
                        myRequestKeyFrame = null
                    }
                } else if (
                    recordStatus == RecordController.Status.RESUMED &&
                    (frame.info.isKeyFrame || isKeyFrame(frame.data))
                ) {
                    recordStatus = RecordController.Status.RECORDING
                    listener?.onStatusChange(recordStatus)
                }

                if (
                    recordStatus == RecordController.Status.RECORDING &&
                    tracks != RecordController.RecordTracks.AUDIO
                ) {
                    write(videoTrack, frame)
                }
            }

            MediaFrame.Type.AUDIO -> {
                if (
                    recordStatus == RecordController.Status.RECORDING &&
                    tracks != RecordController.RecordTracks.VIDEO
                ) {
                    write(audioTrack, frame)
                }
            }
        }
    }
}
