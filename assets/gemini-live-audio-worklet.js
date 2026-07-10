class NaembiPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.frame = new Int16Array(1024);
    this.offset = 0;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.energy = 0;
    this.energyCount = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || !channel.length) return true;

    for (let index = 0; index < channel.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, channel[index]));
      this.sum += sample;
      this.count += 1;
      this.energy += sample * sample;
      this.energyCount += 1;
      this.phase += this.targetSampleRate;
      if (this.phase >= sampleRate) {
        const averaged = this.sum / this.count;
        this.frame[this.offset] = averaged < 0 ? averaged * 0x8000 : averaged * 0x7fff;
        this.offset += 1;
        this.phase -= sampleRate;
        this.sum = 0;
        this.count = 0;
      }
      if (this.offset === this.frame.length) {
        const level = Math.sqrt(this.energy / Math.max(1, this.energyCount));
        this.port.postMessage({ pcm: this.frame.buffer, level }, [this.frame.buffer]);
        this.frame = new Int16Array(1024);
        this.offset = 0;
        this.energy = 0;
        this.energyCount = 0;
      }
    }
    return true;
  }
}

registerProcessor('naembi-pcm-capture', NaembiPcmCaptureProcessor);
