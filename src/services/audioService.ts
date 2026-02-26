// Audio assets (Royalty free placeholders)
const ASSETS = {
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  FLIGHT: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
  BGM: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Using a very stable test source for BGM
};

class AudioService {
  private bgm: HTMLAudioElement | null = null;
  private flightSfx: HTMLAudioElement | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  stopAll() {
    this.stopBGM();
    this.stopFlight();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  playClick() {
    const audio = new Audio(ASSETS.CLICK);
    audio.volume = 0.2;
    audio.play().catch((e) => console.warn("Click SFX blocked", e));
  }

  startFlight() {
    if (this.flightSfx) this.stopFlight();
    this.flightSfx = new Audio(ASSETS.FLIGHT);
    this.flightSfx.loop = true;
    this.flightSfx.volume = 0.15;
    this.flightSfx.play().catch((e) => console.warn("Flight SFX blocked", e));
  }

  stopFlight() {
    if (this.flightSfx) {
      this.flightSfx.pause();
      this.flightSfx = null;
    }
  }

  startBGM() {
    if (this.bgm) {
      this.bgm.play().catch(() => {});
      return;
    }
    this.bgm = new Audio(ASSETS.BGM);
    this.bgm.loop = true;
    this.bgm.volume = 0.3; // Increased volume as requested
    this.bgm.play().catch((e) => {
      console.log("BGM blocked by browser, waiting for user interaction", e);
    });
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  // Play pre-generated Gemini TTS audio
  async playAudioUrl(url: string) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = ""; // Clear source to help GC
      this.currentAudio = null;
    }
    
    return new Promise<void>((resolve) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      
      const cleanup = () => {
        if (this.currentAudio === audio) {
          this.currentAudio.src = "";
          this.currentAudio = null;
        }
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        cleanup();
      };
      
      audio.play().catch((e) => {
        console.warn("AI Audio playback blocked or failed:", e);
        resolve();
      });
    });
  }

  speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a high-quality American English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang === 'en-US' || v.lang === 'en_US') && 
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en-US'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.lang = 'en-US';
    utterance.rate = 0.6;
    window.speechSynthesis.speak(utterance);
  }
}

export const audioService = new AudioService();
