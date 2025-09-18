// Jest DOM setup
import '@testing-library/jest-dom'

// Mock fetch and other Web APIs before any imports
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
) as jest.Mock

// Mock Request and Response for fetch API
global.Request = jest.fn() as any
global.Response = jest.fn() as any

// Mock file operations
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
  }
})

// Mock FileReader
Object.defineProperty(window, 'FileReader', {
  value: jest.fn(() => ({
    readAsArrayBuffer: jest.fn(),
    readAsText: jest.fn(),
    result: null,
    onload: null,
    onerror: null
  }))
})