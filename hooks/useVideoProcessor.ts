import { useState, useCallback } from 'react';
import { Frame } from '../types';

const FRAME_CAPTURE_INTERVAL = 1.0; // Capture a frame every 1.0 seconds

export const useVideoProcessor = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const extractFrames = useCallback(async (videoFile: File): Promise<Omit<Frame, 'description'>[]> => {
        return new Promise((resolve, reject) => {
            setIsProcessing(true);
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const frames: Omit<Frame, 'description'>[] = [];
            
            video.src = URL.createObjectURL(videoFile);
            video.muted = true;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                let currentTime = 0;
                const duration = video.duration;

                const captureFrame = () => {
                    if (!context) {
                        reject(new Error("Canvas context is not available."));
                        return;
                    }
                    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
                    frames.push({ base64, timestamp: currentTime });

                    currentTime += FRAME_CAPTURE_INTERVAL;
                    if (currentTime <= duration) {
                        video.currentTime = currentTime;
                    } else {
                        video.remove();
                        canvas.remove();
                        setIsProcessing(false);
                        resolve(frames);
                    }
                };

                video.onseeked = captureFrame;

                // Start the process
                video.currentTime = 0;
            };

            video.onerror = (e) => {
                setIsProcessing(false);
                reject(new Error("Failed to load video. The file might be corrupt or in an unsupported format."));
            };
        });
    }, []);

    return { extractFrames, isProcessing };
};
