import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [output, setOutput] = useState("Press Space to Start");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const greetingSpoken = useRef(false);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = useCallback(async () => {
    try {
      const utterance = new SpeechSynthesisUtterance("Recording Started.");

      utterance.onend = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          uploadAudio(audioBlob);
        };

        mediaRecorderRef.current.start();
        setOutput('Recording Started.');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setOutput('Error accessing microphone');
    }
  }, []);

  const uploadAudio = (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    

    // fetch url
    fetch('https://braille-backend-code.onrender.com', {  // ← Change this to your actual URL
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        setOutput(`Braille Translation: ${data.braille}`);
      })
      .catch((error) => {
        console.error('Error uploading audio:', error);
        setOutput('Error uploading audio');
      });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space" && !mediaRecorderRef.current) {
        if (!greetingSpoken.current) {
          speak("Hello! I am your AI translator. When you are ready, press the space key and speak. When you are done, press the space key again. To repeat, press the space key again.");
          greetingSpoken.current = true;
        } else {
          startRecording();
        }
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space' && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        setOutput('Recording Stopped');
        speak('Recording stopped.');
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startRecording]);

  return (
    <div>
      <div className="mic">
        <i className="mic-icon"></i>
        <div className="mic-shadow"></div>
      </div>
      <div className="mic-text">{output}</div>
    </div>
  );
}

export default App;
