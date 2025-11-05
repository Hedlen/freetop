import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionStore {
  currentSessionId: string | null;
  sessions: Session[];
  setCurrentSessionId: (id: string | null) => void;
  createSession: (title?: string) => Session;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  getCurrentSession: () => Session | undefined;
}

export const useSessionStore = create<SessionStore>()(persist(
  (set, get) => ({
    currentSessionId: null,
    sessions: [],
    
    setCurrentSessionId: (id: string | null) => {
      set({ currentSessionId: id });
    },
    
    createSession: (title = 'New Chat') => {
      const newSession: Session = {
        id: crypto.randomUUID(),
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      set((state) => ({
        sessions: [...state.sessions, newSession],
        currentSessionId: newSession.id
      }));
      
      return newSession;
    },
    
    updateSession: (id: string, updates: Partial<Session>) => {
      set((state) => ({
        sessions: state.sessions.map((session) => 
          session.id === id 
            ? { ...session, ...updates, updatedAt: new Date() }
            : session
        )
      }));
    },
    
    deleteSession: (id: string) => {
      set((state) => {
        const newSessions = state.sessions.filter((session) => session.id !== id);
        const newCurrentSessionId = state.currentSessionId === id 
          ? (newSessions.length > 0 ? newSessions[0]?.id ?? null : null)
          : state.currentSessionId;
        
        return {
          sessions: newSessions,
          currentSessionId: newCurrentSessionId
        };
      });
    },
    
    getCurrentSession: () => {
      const { currentSessionId, sessions } = get();
      return sessions.find((session) => session.id === currentSessionId);
    }
  }),
  {
    name: 'session-store'
  }
));