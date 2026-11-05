import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true })
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
