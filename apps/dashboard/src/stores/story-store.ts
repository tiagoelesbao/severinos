import { create } from 'zustand';
import type { Story, StoryStatus, StoryType } from '@/types';

// ============ Listeners (outside Zustand to avoid re-renders) ============

type StatusChangeListener = (
  storyId: string,
  oldStatus: StoryStatus,
  newStatus: StoryStatus
) => void;

const storyStatusChangeListeners = new Set<StatusChangeListener>();

export function registerStoryStatusListener(listener: StatusChangeListener) {
  storyStatusChangeListeners.add(listener);
  return () => storyStatusChangeListeners.delete(listener);
}

function notifyStatusChange(storyId: string, oldStatus: StoryStatus, newStatus: StoryStatus) {
  storyStatusChangeListeners.forEach((listener) => listener(storyId, oldStatus, newStatus));
}

// ============ API Persistence Helpers ============

async function saveKanbanOrder(order: Record<StoryStatus, string[]>) {
  try {
    await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  } catch (error) {
    console.error('Failed to save kanban order:', error);
  }
}

// ============ Race Condition Protection ============

const operationsInProgress = new Set<string>();

// ============ Store Interface ============

interface StoryState {
  // State
  stories: Record<string, Story>;
  storyOrder: Record<StoryStatus, string[]>;
  isLoading: boolean;
  error: string | null;

  // CRUD Actions
  setStories: (stories: Story[]) => Promise<void>;
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;

  // Status Actions
  moveStory: (storyId: string, newStatus: StoryStatus, newIndex?: number) => Promise<void>;
  reorderInColumn: (status: StoryStatus, fromIndex: number, toIndex: number) => Promise<void>;

  // Loading State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors (computed)
  getStoriesByStatus: (status: StoryStatus, typeFilter?: StoryType) => Story[];
  getStoryById: (id: string) => Story | undefined;
  getEpics: () => Story[];
  getStoriesOnly: () => Story[];
}

// Default order for each column
const createInitialOrder = (): Record<StoryStatus, string[]> => ({
  backlog: [],
  in_progress: [],
  ai_review: [],
  human_review: [],
  pr_created: [],
  done: [],
  error: [],
});

export const useStoryStore = create<StoryState>()((set, get) => ({
  stories: {},
  storyOrder: createInitialOrder(),
  isLoading: false,
  error: null,

  setStories: async (stories) => {
    const storiesMap: Record<string, Story> = {};
    const newOrder = createInitialOrder();

    // 1. Map stories
    stories.forEach((story) => {
      storiesMap[story.id] = story;
    });

    // 2. Fetch order from server
    try {
      const response = await fetch('/api/kanban');
      const serverOrder = await response.json();
      
      // Merge: keep server order but only for existing stories
      Object.keys(newOrder).forEach((status) => {
        const s = status as StoryStatus;
        const orderedIds = (serverOrder[s] || []).filter((id: string) => storiesMap[id]);
        
        // Add stories that are in this status but not in the ordered list
        const unorderedIds = stories
          .filter((story) => story.status === s && !orderedIds.includes(story.id))
          .map((story) => story.id);
          
        newOrder[s] = [...orderedIds, ...unorderedIds];
      });
    } catch (e) {
      console.warn('Could not load kanban order from server, using default sorting.');
      stories.forEach((story) => {
        if (newOrder[story.status] && !newOrder[story.status].includes(story.id)) {
          newOrder[story.status].push(story.id);
        }
      });
    }

    set({ stories: storiesMap, storyOrder: newOrder });
  },

  addStory: (story) =>
    set((state) => {
      const newStories = { ...state.stories, [story.id]: story };
      const newOrder = { ...state.storyOrder };

      if (!newOrder[story.status].includes(story.id)) {
        newOrder[story.status] = [story.id, ...newOrder[story.status]];
        saveKanbanOrder(newOrder); // Sync to server
      }

      return { stories: newStories, storyOrder: newOrder };
    }),

  updateStory: (id, updates) =>
    set((state) => {
      const existing = state.stories[id];
      if (!existing) return state;

      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

      if (updates.status && updates.status !== existing.status) {
        const newOrder = { ...state.storyOrder };
        newOrder[existing.status] = newOrder[existing.status].filter((sid) => sid !== id);
        if (!newOrder[updates.status].includes(id)) {
          newOrder[updates.status] = [id, ...newOrder[updates.status]];
        }
        notifyStatusChange(id, existing.status, updates.status);
        saveKanbanOrder(newOrder); // Sync to server
        return { stories: { ...state.stories, [id]: updated }, storyOrder: newOrder };
      }

      return { stories: { ...state.stories, [id]: updated } };
    }),

  deleteStory: (id) =>
    set((state) => {
      const story = state.stories[id];
      if (!story) return state;

      const { [id]: _removed, ...remainingStories } = state.stories;
      const newOrder = { ...state.storyOrder };
      newOrder[story.status] = newOrder[story.status].filter((sid) => sid !== id);
      
      saveKanbanOrder(newOrder); // Sync to server
      return { stories: remainingStories, storyOrder: newOrder };
    }),

  moveStory: async (storyId, newStatus, newIndex) => {
    if (operationsInProgress.has(storyId)) return;
    operationsInProgress.add(storyId);

    try {
      const state = get();
      const story = state.stories[storyId];
      if (!story) return;

      const oldStatus = story.status;
      if (oldStatus === newStatus && newIndex === undefined) return;

      const newOrder = { ...state.storyOrder };
      newOrder[oldStatus] = newOrder[oldStatus].filter((id) => id !== storyId);

      if (newIndex !== undefined) {
        newOrder[newStatus].splice(newIndex, 0, storyId);
      } else {
        newOrder[newStatus] = [storyId, ...newOrder[newStatus]];
      }

      const updatedStory = { ...story, status: newStatus, updatedAt: new Date().toISOString() };

      set({
        stories: { ...state.stories, [storyId]: updatedStory },
        storyOrder: newOrder,
      });

      if (oldStatus !== newStatus) notifyStatusChange(storyId, oldStatus, newStatus);
      
      await saveKanbanOrder(newOrder); // Sync to server
    } finally {
      operationsInProgress.delete(storyId);
    }
  },

  reorderInColumn: async (status, fromIndex, toIndex) => {
    const state = get();
    const newOrder = { ...state.storyOrder };
    const columnOrder = [...newOrder[status]];

    const [removed] = columnOrder.splice(fromIndex, 1);
    columnOrder.splice(toIndex, 0, removed);

    newOrder[status] = columnOrder;
    set({ storyOrder: newOrder });
    
    await saveKanbanOrder(newOrder); // Sync to server
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Selectors
  getStoriesByStatus: (status, typeFilter) => {
    const state = get();
    return state.storyOrder[status]
      .map((id) => state.stories[id])
      .filter((s): s is Story => s !== undefined)
      .filter((s) => !typeFilter || s.type === typeFilter || (!s.type && typeFilter === 'story'));
  },

  getStoryById: (id) => get().stories[id],
  getEpics: () => Object.values(get().stories).filter((s) => s.type === 'epic'),
  getStoriesOnly: () => Object.values(get().stories).filter((s) => s.type === 'story' || !s.type),
}));
