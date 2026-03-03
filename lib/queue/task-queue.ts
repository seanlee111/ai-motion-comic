
import { create } from 'zustand'

export interface Task {
    id: string;
    type: 'generate-image' | 'generate-video';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    error?: string;
    payload: any;
    result?: any;
    createdAt: number;
}

interface TaskQueueStore {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => string;
    updateTask: (id: string, updates: Partial<Task>) => void;
    removeTask: (id: string) => void;
    clearCompleted: () => void;
}

export const useTaskQueue = create<TaskQueueStore>((set) => ({
    tasks: [],
    addTask: (taskData) => {
        const id = crypto.randomUUID();
        set((state) => ({
            tasks: [...state.tasks, { 
                ...taskData, 
                id, 
                status: 'pending', 
                createdAt: Date.now() 
            }]
        }));
        return id;
    },
    updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    })),
    removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
    })),
    clearCompleted: () => set((state) => ({
        tasks: state.tasks.filter(t => t.status !== 'completed' && t.status !== 'failed')
    }))
}));
