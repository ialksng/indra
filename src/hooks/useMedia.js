import { useState, useRef } from 'react';

export function useMedia() {
  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopVideo = () => { 
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActiveVideoSource(null);
  };

  const toggleCamera = async () => { 
    if (activeVideoSource === 'camera') stopVideo();
    else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('camera');
      } catch (err) { console.warn("Camera denied."); }
    }
  };

  const toggleScreenShare = async () => { 
    if (activeVideoSource === 'screen') stopVideo();
    else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('screen');
        stream.getVideoTracks()[0].onended = () => stopVideo();
      } catch (err) { console.warn("Screen share denied."); }
    }
  };

  const captureVideoFrame = () => { 
    if (!activeVideoSource || !videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  return { activeVideoSource, videoRef, canvasRef, stopVideo, toggleCamera, toggleScreenShare, captureVideoFrame };
}