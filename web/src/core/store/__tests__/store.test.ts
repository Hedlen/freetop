import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore, addMessage, updateMessage, setResponding, clearMessages } from '../store';
import type { Message } from '../../messaging/types';

describe('Store', () => {
  beforeEach(() => {
    clearMessages();
    setResponding(false);
  });

  describe('addMessage', () => {
    it('adds a message to the store', () => {
      const msg: Message = { id: 'msg1', role: 'user', type: 'text', content: 'Hello' };
      addMessage(msg);
      const state = useStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]?.id).toBe('msg1');
      expect(state.messages[0]?.content).toBe('Hello');
    });

    it('does not add duplicate messages with same id', () => {
      const msg: Message = { id: 'msg1', role: 'user', type: 'text', content: 'Hello' };
      addMessage(msg);
      addMessage(msg);
      expect(useStore.getState().messages).toHaveLength(1);
    });

    it('updates existing message if same id is added again', () => {
      const msg: Message = { id: 'msg1', role: 'user', type: 'text', content: 'Hello' };
      addMessage(msg);
      const updated: Message = { id: 'msg1', role: 'user', type: 'text', content: 'Updated' };
      addMessage(updated);
      const state = useStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]?.content).toBe('Updated');
    });

    it('generates id if not provided', () => {
      const msg = { role: 'user', type: 'text', content: 'No ID' } as any;
      addMessage(msg);
      const state = useStore.getState();
      expect(state.messages[0]?.id).toBeTruthy();
    });
  });

  describe('updateMessage', () => {
    it('updates message content by id', () => {
      const msg: Message = { id: 'msg1', role: 'assistant', type: 'text', content: 'Initial' };
      addMessage(msg);
      updateMessage({ id: 'msg1', content: 'Updated content' });
      const state = useStore.getState();
      expect(state.messages[0]?.content).toBe('Updated content');
    });

    it('does not modify other messages (structural sharing)', () => {
      const msg1: Message = { id: 'msg1', role: 'user', type: 'text', content: 'User msg' };
      const msg2: Message = { id: 'msg2', role: 'assistant', type: 'text', content: 'Assistant msg' };
      addMessage(msg1);
      addMessage(msg2);

      const beforeUpdate = useStore.getState().messages;
      const msg1Before = beforeUpdate[0];

      updateMessage({ id: 'msg2', content: 'Updated assistant' });

      const afterUpdate = useStore.getState().messages;
      // msg1 should be the same reference (structural sharing)
      expect(afterUpdate[0]).toBe(msg1Before);
      expect(afterUpdate[1]?.content).toBe('Updated assistant');
    });

    it('does nothing if message id not found', () => {
      const msg: Message = { id: 'msg1', role: 'user', type: 'text', content: 'Hello' };
      addMessage(msg);
      updateMessage({ id: 'nonexistent', content: 'Should not update' });
      expect(useStore.getState().messages[0]?.content).toBe('Hello');
    });
  });

  describe('setResponding', () => {
    it('sets responding to true', () => {
      setResponding(true);
      expect(useStore.getState().responding).toBe(true);
    });

    it('sets responding to false', () => {
      setResponding(true);
      setResponding(false);
      expect(useStore.getState().responding).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('clears all messages', () => {
      addMessage({ id: 'msg1', role: 'user', type: 'text', content: 'Hello' });
      addMessage({ id: 'msg2', role: 'assistant', type: 'text', content: 'Hi' });
      clearMessages();
      expect(useStore.getState().messages).toHaveLength(0);
    });
  });
});
