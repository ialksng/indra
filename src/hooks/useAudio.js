import { useState, useRef, useEffect } from 'react';

export function useAudio() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
    }
  }, []);

  const toggleRecording = (onResultCallback) => {
    if (!recognitionRef.current) return alert("Speech recognition not supported in this browser.");

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      // Re-initialize to prevent "Failed to execute 'start'" errors
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => setIsRecording(true);
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResultCallback(transcript);
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = (e) => {
        console.error("Mic error:", e.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => setIsRecording(false);
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Already started", err);
      }
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 

    const cleanText = text
      .replace(/!\[.*?\]\((.*?)\)/g, 'Here is the image you requested.')
      .replace(/[#*_~`]/g, '');

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const unlockAudio = () => {
    if (voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
  };

  return { isRecording, voiceEnabled, setVoiceEnabled, toggleRecording, speakText, unlockAudio };
}