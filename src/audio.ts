// Web Audio API Sound Synthesizer for Red Racer 3D
// Fully synthesizes engine roaring and skid sounds without any external file requirements!

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Engine Synthesizer Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;

  // Engine control state
  private targetFreq: number = 55;
  private currentFreq: number = 55;
  private targetGain: number = 0.08;
  private currentGain: number = 0.08;

  constructor() {
    // Lazy initialized on first user gesture
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.setupEngine();
    } catch (e) {
      console.warn("AudioContext initialization failed:", e);
    }
  }

  private setupEngine() {
    if (!this.ctx) return;

    // Base gain node for engine volumes
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineGain.connect(this.ctx.destination);

    // Filter to give engine heavy low-frequency warm rumble tones
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.engineFilter.connect(this.engineGain);

    // Oscillator 1: Raw engine cylinder noise
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);
    this.engineOsc1.connect(this.engineFilter);

    // Oscillator 2: Sub-octave harmonic boost
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(this.currentFreq * 0.5, this.ctx.currentTime);
    this.engineOsc2.connect(this.engineFilter);

    // Rumble Modulator (slow engine cycle vibration)
    this.rumbleOsc = this.ctx.createOscillator();
    this.rumbleOsc.type = 'sine';
    this.rumbleOsc.frequency.setValueAtTime(8, this.ctx.currentTime); // 8 Hz low Rumble

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.rumbleOsc.connect(this.rumbleGain);
    // Modulate pitch slightly for that "purring/cylinder firing" speed vibration
    this.rumbleGain.connect(this.engineOsc1.frequency);

    // Start all engine loops
    this.engineOsc1.start();
    this.engineOsc2.start();
    this.rumbleOsc.start();

    // Start active state adjustment tick
    this.updateEngineTick();
  }

  private updateEngineTick = () => {
    if (!this.ctx || this.isMuted) {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.1);
      }
      setTimeout(this.updateEngineTick, 60);
      return;
    }

    // Dynamic interpolation of frequency and gain
    this.currentFreq += (this.targetFreq - this.currentFreq) * 0.12;
    this.currentGain += (this.targetGain - this.currentGain) * 0.15;

    const safetyFreq = Math.max(30, Math.min(300, this.currentFreq));

    if (this.engineOsc1 && this.engineOsc2 && this.engineGain && this.engineFilter && this.ctx) {
      const now = this.ctx.currentTime;
      this.engineOsc1.frequency.setTargetAtTime(safetyFreq, now, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(safetyFreq * 0.5, now, 0.08);
      
      // Open filter up dynamically under boost to give screaming mechanical sound!
      const finalFilterCutoff = 100 + (safetyFreq * 4.2);
      this.engineFilter.frequency.setTargetAtTime(finalFilterCutoff, now, 0.1);

      // Volume scaling
      this.engineGain.gain.setTargetAtTime(this.currentGain, now, 0.1);
    }

    setTimeout(this.updateEngineTick, 45);
  };

  public setAccelerating(isAccelerating: boolean, currentSpeedRatio: number = 1.0) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (isAccelerating) {
      // Dynamic engine pitch/volume pitch sweep based on current simulation velocity
      this.targetFreq = 55 + (130 * currentSpeedRatio);
      this.targetGain = 0.15 + (0.05 * currentSpeedRatio);
    } else {
      // Gentle idle deceleration pitch descent
      this.targetFreq = 38 + (42 * currentSpeedRatio);
      this.targetGain = 0.07;
    }
  }

  public playSkidSound() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // Create a high-pitch screech oscillator
    const skidOsc = this.ctx.createOscillator();
    skidOsc.type = 'triangle';
    
    // Quick rising then falling frequency sweep for dynamic screeching
    skidOsc.frequency.setValueAtTime(680, now);
    skidOsc.frequency.exponentialRampToValueAtTime(1050, now + 0.08);
    skidOsc.frequency.exponentialRampToValueAtTime(320, now + 0.38);

    // Bandpass filter to concentrate screech frequencies around metallic rubber tearing noise
    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.Q.setValueAtTime(6.0, now);
    skidFilter.frequency.setValueAtTime(800, now);
    skidFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
    skidFilter.frequency.exponentialRampToValueAtTime(550, now + 0.38);

    // Rapid volume decay envelope
    const skidGain = this.ctx.createGain();
    skidGain.gain.setValueAtTime(0, now);
    skidGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    skidGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    skidOsc.connect(skidFilter);
    skidFilter.connect(skidGain);
    skidGain.connect(this.ctx.destination);

    skidOsc.start(now);
    skidOsc.stop(now + 0.5);
  }

  public playBoosterSound() {
    // Fast high energy boost trigger sound
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const bOsc = this.ctx.createOscillator();
    bOsc.type = 'sawtooth';
    bOsc.frequency.setValueAtTime(120, now);
    bOsc.frequency.exponentialRampToValueAtTime(650, now + 0.25);

    const bFilter = this.ctx.createBiquadFilter();
    bFilter.type = 'highpass';
    bFilter.frequency.setValueAtTime(180, now);

    const bGain = this.ctx.createGain();
    bGain.gain.setValueAtTime(0.18, now);
    bGain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

    bOsc.connect(bFilter);
    bFilter.connect(bGain);
    bGain.connect(this.ctx.destination);

    bOsc.start(now);
    bOsc.stop(now + 0.35);
  }

  public playCollisionSound() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Crash boom noise
    const crashOsc = this.ctx.createOscillator();
    crashOsc.type = 'sawtooth';
    crashOsc.frequency.setValueAtTime(140, now);
    crashOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    const crashFilter = this.ctx.createBiquadFilter();
    crashFilter.type = 'lowpass';
    crashFilter.frequency.setValueAtTime(250, now);

    const crashGain = this.ctx.createGain();
    crashGain.gain.setValueAtTime(0.5, now);
    crashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    crashOsc.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(this.ctx.destination);

    crashOsc.start(now);
    crashOsc.stop(now + 0.5);
  }

  public playCoinSound() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Retro arcade double tone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.08); // A5

    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.setValueAtTime(1760, now + 0.08); // A6

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }
}

export const sound = new SoundManager();
