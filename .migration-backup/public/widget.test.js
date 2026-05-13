import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TipStackWidget', () => {
  let messageCallback;

  beforeEach(() => {
    // Reset document
    document.body.innerHTML = '<div data-tipstack-id="test-wallet"></div>';
    
    // Mock addEventListener to capture the message callback
    vi.spyOn(window, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'message') {
        messageCallback = callback;
      }
    });

    // Load and execute the widget script
    const scriptPath = path.resolve(__dirname, './widget.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Execute script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.body.appendChild(script);
  });

  it('dispatches tipstack:success CustomEvent when receiving tipstack-success message', () => {
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent');
    const successResult = { signature: 'test-sig' };

    // Simulate message event from valid origin
    messageCallback({
      origin: 'https://tipstack.fun',
      data: {
        type: 'tipstack-success',
        result: successResult
      }
    });

    // Should have dispatched CustomEvent
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tipstack:success',
        detail: successResult
      })
    );
  });

  it('logs success with result when receiving tipstack-success message', () => {
    const logSpy = vi.spyOn(console, 'log');
    const successResult = { signature: 'test-sig' };

    messageCallback({
      origin: 'https://tipstack.fun',
      data: {
        type: 'tipstack-success',
        result: successResult
      }
    });

    // Check log - wait, the current implementation doesn't have the result in log
    // This should FAIL if dispatches CustomEvent is checked, but let's check log specifically
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('TipStack: Payment successful!'), successResult);
  });
});
