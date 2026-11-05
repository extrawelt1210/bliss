export type RandomSource = () => number

const clampSample = (sample: number) => Math.max(-1, Math.min(1, sample))

export class WhiteNoiseGenerator {
  constructor(private readonly random: RandomSource = Math.random) {}

  next(): number {
    return this.random() * 2 - 1
  }

  reset(): void {}
}

/**
 * Stateful brown-noise generator. Keeping the previous sample creates the
 * continuous, low-frequency character without allocating memory per sample.
 */
export class BrownNoiseGenerator {
  private previous = 0

  constructor(private readonly random: RandomSource = Math.random) {}

  next(): number {
    const white = this.random() * 2 - 1
    this.previous = (this.previous + 0.02 * white) / 1.02
    return clampSample(this.previous * 3.5)
  }

  reset(): void {
    this.previous = 0
  }
}

/**
 * Paul Kellet's widely used economical pink-noise filter. The final scaling
 * keeps the signal inside the Web Audio sample range before the safety gain.
 */
export class PinkNoiseGenerator {
  private b0 = 0
  private b1 = 0
  private b2 = 0
  private b3 = 0
  private b4 = 0
  private b5 = 0
  private b6 = 0

  constructor(private readonly random: RandomSource = Math.random) {}

  next(): number {
    const white = this.random() * 2 - 1
    this.b0 = 0.99886 * this.b0 + white * 0.0555179
    this.b1 = 0.99332 * this.b1 + white * 0.0750759
    this.b2 = 0.969 * this.b2 + white * 0.153852
    this.b3 = 0.8665 * this.b3 + white * 0.3104856
    this.b4 = 0.55 * this.b4 + white * 0.5329522
    this.b5 = -0.7616 * this.b5 - white * 0.016898
    const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362
    this.b6 = white * 0.115926
    return clampSample(pink * 0.11)
  }

  reset(): void {
    this.b0 = 0
    this.b1 = 0
    this.b2 = 0
    this.b3 = 0
    this.b4 = 0
    this.b5 = 0
    this.b6 = 0
  }
}
