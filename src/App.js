import React, { useState, useRef } from "react";
import './App.css';  // Import the CSS file

const TransComp = () => {
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('');
  const [isReplaying, setIsReplaying] = useState(false);
  const [activeButton, setActiveButton] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = () => {
    setTranscription('');
    setActiveButton('start');
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedBlobs((prev) => [...prev, event.data]);
        }
      };

      mediaRecorder.start();
      setStatus('Recording started...');
    }).catch((err) => {
      console.error('Error accessing microphone:', err);
      setStatus('Error accessing microphone');
    });
  };

  const stopRecording = () => {
    setActiveButton('stop');
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setStatus('Recording stopped');
    }
  };

  const replayRecording = () => {
    setActiveButton('replay');
    if (recordedBlobs.length) {
      const audioBlob = new Blob(recordedBlobs, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setIsReplaying(true);

      audio.onended = () => {
        setIsReplaying(false);
      };
    }
  };

  const stopReplay = () => {
    setActiveButton('stopReplay');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsReplaying(false);
    }
  };

  const sendAudioToServer = async () => {
    setActiveButton('send');
    const audioBlob = new Blob(recordedBlobs, { type: "audio/webm" });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      setStatus('Sending audio for transcription...');

      const response = await fetch('http://localhost:3001/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      setStatus('Transcription received successfully.');
      setTranscription(result.transcription);
      setRecordedBlobs([]);
    } catch (error) {
      console.error('Error during transcription:', error);
      setStatus('Transcription failed.');
    }
  };

  return (
    <div className="container">
      <button
        className={`button ${activeButton === 'start' ? 'active' : ''}`}
        onClick={startRecording}
      >
        Start Recording
      </button>
      <button
        className={`button ${activeButton === 'stop' ? 'active' : ''}`}
        onClick={stopRecording}
      >
        Stop Recording
      </button>
      <button
        className={`button ${activeButton === 'replay' ? 'active' : ''}`}
        onClick={replayRecording}
        disabled={!recordedBlobs.length || isReplaying}
      >
        Replay
      </button>
      <button
        className={`button ${activeButton === 'stopReplay' ? 'active' : ''}`}
        onClick={stopReplay}
        disabled={!isReplaying}
      >
        Stop Replay
      </button>
      <button
        className={`button ${activeButton === 'send' ? 'active' : ''}`}
        onClick={sendAudioToServer}
        disabled={!recordedBlobs.length}
      >
        Send Audio
      </button>

      {status && <p>{status}</p>}

      {transcription && (
        <div className="transcription">
          <p>{transcription}</p>
        </div>
      )}
    </div>
  );
};

export default TransComp;
