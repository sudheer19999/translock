const whisper = require('nodejs-whisper');

async function testWhisper() {
  try {
    const transcription = await whisper.transcribe({
      filePath: './path_to_audio_file.wav', // Replace with your audio file path
      model: 'base',
    });
    console.log(transcription.text);
  } catch (error) {
    console.error('Whisper Error:', error);
  }
}

testWhisper();
