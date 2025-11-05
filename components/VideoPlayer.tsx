import React, { forwardRef } from 'react';

interface VideoPlayerProps {
    src: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ src }, ref) => {
    return (
        <div>
            <h3 className="text-xl font-semibold text-white mb-4">Video-Vorschau</h3>
            <video ref={ref} src={src} controls className="w-full rounded-lg bg-black"></video>
        </div>
    );
});