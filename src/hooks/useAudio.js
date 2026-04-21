import { useState, useRef, useEffect } from 'react';

export function useAudio() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef(null);

  const toggleRecording = (onFinalResult, onInterimResult = null) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return alert("Speech recognition not supported in this browser. Please use Chrome.");
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'en-US';
    
    // ⚡ CRITICAL FIXES FOR REAL-TIME FEEL:
    recognitionRef.current.continuous = true;      // Keep listening naturally
    recognitionRef.current.interimResults = true;  // Get words instantly as spoken
    
    recognitionRef.current.onstart = () => setIsRecording(true);
    
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Loop through results to separate what you're currently saying vs what's finalized
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // If user provided an interim callback, send the live typing words
      if (interimTranscript && onInterimResult) {
        onInterimResult(interimTranscript);
      }
      
      // The moment the sentence is complete, send it and stop listening to allow AI to speak
      if (finalTranscript.trim()) {
        onFinalResult(finalTranscript.trim());
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    };
    
    recognitionRef.current.onerror = (e) => {
      console.error("Mic error:", e.error);
      setIsRecording(false);
    };
    
    recognitionRef.current.onend = () => setIsRecording(false);
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn("Mic already started", err);
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Interrupt current speech if new one comes

    // Strip markdown to make it sound conversational, not robotic
    const cleanText = text
      .replace(/!\[.*?\]\((.*?)\)/g, 'I have generated the image for you.')
      .replace(/[#*_~`]/g, '');

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      
      // Pick a natural sounding voice (varies by OS/Browser)
      const preferredVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') || 
        v.name.includes('Natural')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      
      // Slightly speed up the voice to feel more conversational
      utterance.rate = 1.1; 
      
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