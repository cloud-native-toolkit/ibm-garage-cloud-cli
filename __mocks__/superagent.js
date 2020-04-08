'use strict';

let mockDelay;
let mockError;
let mockResponse = {
  status: () => {
    return 200;
  },
  ok: true,
  get: jest.fn(),
  toError: jest.fn()
};

let Request = {
  text: JSON.stringify(mockResponse),
  body: mockResponse,

  post: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
  get: jest.fn().mockReturnThis(),
  auth: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  field: jest.fn().mockReturnThis(),
  type: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  accept: jest.fn().mockReturnThis(),
  agent: jest.fn().mockReturnThis(),
  timeout: jest.fn().mockReturnThis(),
  end: jest.fn().mockImplementation((callback) => {
    if (mockDelay) {
      this.delayTimer = setTimeout(callback, 0, mockError, mockResponse);
      return;
    }
    callback(mockError, mockResponse);
  }),
  then: jest.fn().mockImplementation(callback => {

    return new Promise((resolve, reject) => {
      if (mockError) {
        return reject(mockError)
      }
      return resolve(callback(mockResponse))
    })
  }),
  __setMockDelay: (boolValue) => {
    mockDelay = boolValue;
  },
  __setMockResponse: (mockRes) => {
    mockResponse = mockRes;
  },
  __setMockError: (mockErr) => {
    mockError = mockErr;
  },
  __setMockResponseBody: (body) => {
    mockResponse.body = body;
  }
};

module.exports = Request;
