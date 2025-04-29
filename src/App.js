import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [output, setOutput] = useState("Press Space to Start");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const greetingSpoken = useRef(false);

  const playAudio = (audioPath) => {
    const audio = new Audio(audioPath);
    audio.play();
    return audio;
  };

  const startRecording = useCallback(async () => {
    try {
      const audio = playAudio("/audio/recording-started.mp3");

      audio.onended = async () => {
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
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setOutput('Error accessing microphone');
    }
  }, []);

  const uploadAudio = (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    fetch('https://braille-backend-code.onrender.com/translate-voice', {
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
          playAudio("/audio/greeting.mp3");
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
        playAudio("/audio/recording-stopped.mp3");
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
