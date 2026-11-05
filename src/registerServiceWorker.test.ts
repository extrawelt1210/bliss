import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function installServiceWorkerMock(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  })
}

afterEach(() => {
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker')
  }
  vi.restoreAllMocks()
})

describe('PWA-Registrierung', () => {
  it('registriert den Service Worker nur im Produktionsmodus', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    installServiceWorkerMock(register)

    registerServiceWorker(false)
    window.dispatchEvent(new Event('load'))
    expect(register).not.toHaveBeenCalled()

    registerServiceWorker(true)
    window.dispatchEvent(new Event('load'))
    await Promise.resolve()

    expect(register).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledWith(expect.stringMatching(/sw\.js$/), {
      scope: expect.any(String),
    })
  })

  it('lässt die App bei einem Registrierungsfehler weiterlaufen', async () => {
    const register = vi.fn().mockRejectedValue(new Error('Service Worker blockiert'))
    installServiceWorkerMock(register)

    registerServiceWorker(true)
    window.dispatchEvent(new Event('load'))
    await Promise.resolve()
    await Promise.resolve()

    expect(register).toHaveBeenCalledOnce()
  })
})
