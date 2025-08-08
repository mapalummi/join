import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Represents a task in the system.
 */
export interface Task {
  /** Firestore-generated ID (optional when creating a task) */
  id?: string;

  /** Title of the task */
  title: string;

  /** Optional description */
  description?: string;

  /**
   * Date of the task; may be a native Date object or Firestore Timestamp.
   * Firestore stores it as a Timestamp and it needs conversion after reading.
   */
  date: Date | Timestamp;

  /** Priority level of the task */
  priority: 'low' | 'medium' | 'urgent';

  /** Current status of the task */
  status: string;

  /** Optional list of user IDs assigned to the task */
  assignedTo?: string[];

  /** Task category */
  category: 'technical' | 'user story';

  /** Optional array of subtasks (retrieved separately as subcollection) */
  subtask?: Subtask[];
}

/**
 * Represents a subtask belonging to a task.
 */
export interface Subtask {
  /** Firestore-generated ID (optional when creating) */
  id?: string;

  /** Title or label of the subtask */
  title: string;

  /** Completion status */
  isCompleted: boolean;
}

/**
 * Service responsible for managing tasks and subtasks
 * stored in Firestore.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private editingTask: Task | null = null;
  private readonly GUEST_TASKS_KEY = 'guest-tasks';
  private readonly GUEST_LOADED_KEY = 'guest-tasks-loaded';

  public guestTasksSubject = new BehaviorSubject<Task[]>([]);
  private guestTasksInitialized = false;

  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Returns a reference to the user-specific tasks collection.
   */
  getTasksRef() {
    const collectionName = this.authService.getCollectionName('tasks');
    return collection(this.firestore, collectionName);
  }

  /**
   * Returns a reference to the 'subtasks' subcollection for a given task.
   *
   * @param subColId - The document ID of the parent task.
   */
  getSubtasksRef(subColId: string) {
    return collection(this.getTasksRef(), subColId, 'subtasks');
  }

  /**
   * Returns a document reference for a specific task by ID.
   *
   * @param docId - The document ID of the task.
   */
  getSingleTaskRef(docId: string) {
    const collectionName = this.authService.getCollectionName('tasks');
    return doc(collection(this.firestore, collectionName), docId);
  }

  /**
   * Observes all tasks in Firestore and emits updates in real-time.
   */
  getTasks(): Observable<Task[]> {
    if (this.authService.isGuestUser()) {
      // Für Gäste: Einmalig initialisieren, dann BehaviorSubject zurückgeben
      this.initializeGuestTasks();
      return this.guestTasksSubject.asObservable();
    } else {
      // Für registrierte User: Normal Firestore
      return new Observable((observer) => {
        const unsubscribe = onSnapshot(
          this.getTasksRef(),
          (snapshot) => {
            const tasks: Task[] = [];
            snapshot.forEach((doc) => {
              tasks.push({ id: doc.id, ...doc.data() } as Task);
            });
            observer.next(tasks);
          },
          (error) => observer.error(error)
        );
        return () => unsubscribe();
      });
    }
  }

  /**
   * Initialisiert Guest-Tasks einmalig
   */
  private initializeGuestTasks(): void {
    if (this.guestTasksInitialized) return;

    this.guestTasksInitialized = true;

    if (!localStorage.getItem(this.GUEST_LOADED_KEY)) {
      const unsubscribe = onSnapshot(
        this.getTasksRef(),
        (snapshot) => {
          const tasks: Task[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Task;
            const task: Task = {
              ...data,
              id: doc.id,
              date: this.ensureValidDate(data.date),
            };
            tasks.push(task);
          });

          localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));
          localStorage.setItem(this.GUEST_LOADED_KEY, 'true');

          this.guestTasksSubject.next(tasks);

          unsubscribe();
        },
        (error) => console.error('Error loading guest tasks:', error)
      );
    } else {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      let tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      tasks = tasks.map((task) => ({
        ...task,
        date: this.ensureValidDate(task.date),
      }));

      this.guestTasksSubject.next(tasks);
    }
  }

  /**
   * Observes the subtasks of a given task in real-time.
   *
   * @param taskId - The ID of the parent task.
   */
  getSubtasks(taskId: string): Observable<Subtask[]> {
    if (this.authService.isGuestUser()) {
      return new Observable((observer) => {
        const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
        let tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

        tasks = tasks.map((task) => ({
          ...task,
          date: this.ensureValidDate(task.date),
        }));

        const task = tasks.find((t) => t.id === taskId);
        const subtasks = task?.subtask || [];
        observer.next(subtasks);

        return () => {};
      });
    } else {
      return new Observable((observer) => {
        const unsubscribe = onSnapshot(
          this.getSubtasksRef(taskId),
          (snapshot) => {
            const subtasks: Subtask[] = [];
            snapshot.forEach((doc) => {
              subtasks.push({ id: doc.id, ...doc.data() } as Subtask);
            });
            observer.next(subtasks);
          },
          (error) => observer.error(error)
        );

        return () => unsubscribe();
      });
    }
  }

  /**
   * Adds a new task to Firestore.
   *
   * @param newTask - The task to be added.
   * @returns The created task including its generated ID, or null on failure.
   */
  async addTask(newTask: Task): Promise<Task | null> {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const taskWithId: Task = {
        ...newTask,
        id:
          'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        date: this.ensureValidDate(newTask.date),
      };

      tasks.push(taskWithId);
      localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));
      this.guestTasksSubject.next(tasks);

      return taskWithId;
    } else {
      try {
        const tasksRef = this.getTasksRef();
        const docRef = await addDoc(tasksRef, newTask);
        return { id: docRef.id, ...newTask };
      } catch (err) {
        console.error('Error adding task:', err);
        return null;
      }
    }
  }

  /**
   * Adds a subtask to a specific task's subcollection.
   *
   * @param ColId - The ID of the parent task.
   * @param subtask - The subtask to add.
   * @returns The created subtask with ID, or null on failure.
   */
  async addSubtask(ColId: string, subtask: Subtask): Promise<Subtask | null> {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const taskIndex = tasks.findIndex((task) => task.id === ColId);
      if (taskIndex !== -1) {
        const subtaskWithId: Subtask = {
          ...subtask,
          id:
            'local-sub-' +
            Date.now() +
            '-' +
            Math.random().toString(36).substr(2, 9),
        };

        if (!tasks[taskIndex].subtask) {
          tasks[taskIndex].subtask = [];
        }
        tasks[taskIndex].subtask!.push(subtaskWithId);
        localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));

        this.guestTasksSubject.next(tasks);

        return subtaskWithId;
      }
      return null;
    } else {
      try {
        const subtasksRef = this.getSubtasksRef(ColId);
        const docRef = await addDoc(subtasksRef, subtask);
        return { id: docRef.id, ...subtask };
      } catch (error) {
        console.error('Error adding subtask:', error);
        return null;
      }
    }
  }

  /**
   * Updates a task document in Firestore.
   *
   * @param docId - The ID of the task.
   * @param updatedTask - The updated task data.
   */
  async updateTask(docId: string, updatedTask: Task) {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const index = tasks.findIndex((task) => task.id === docId);
      if (index !== -1) {
        tasks[index] = {
          ...updatedTask,
          id: docId,
          date: this.ensureValidDate(updatedTask.date),
        };

        localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));
        this.guestTasksSubject.next(tasks);
      }
    } else {
      const docRef = this.getSingleTaskRef(docId);
      await updateDoc(docRef, this.getCleanJson(updatedTask)).catch(
        console.error
      );
    }
  }

  /**
   * Updates task status - Firestore for users, Local Storage for guests.
   */
  async updateTaskStatus(docId: string, newStatus: string) {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const index = tasks.findIndex((task) => task.id === docId);
      if (index !== -1) {
        tasks[index].status = newStatus;
        localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));

        this.guestTasksSubject.next(tasks);
      }
    } else {
      const docRef = this.getSingleTaskRef(docId);
      await updateDoc(docRef, { status: newStatus }).catch(console.error);
    }
  }

  /**
   * Updates a subtask document in Firestore.
   *
   * @param taskId - The parent task ID.
   * @param subtaskId - The subtask document ID.
   * @param updatedSubtask - The updated subtask data.
   */
  async updateSubtask(
    taskId: string,
    subtaskId: string,
    updatedSubtask: Subtask
  ) {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      if (taskIndex !== -1 && tasks[taskIndex].subtask) {
        const subtaskIndex = tasks[taskIndex].subtask!.findIndex(
          (sub) => sub.id === subtaskId
        );
        if (subtaskIndex !== -1) {
          tasks[taskIndex].subtask![subtaskIndex] = {
            ...updatedSubtask,
            id: subtaskId,
          };
          localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));

          this.guestTasksSubject.next(tasks);
        }
      }
    } else {
      const docRef = doc(this.getSubtasksRef(taskId), subtaskId);
      await updateDoc(docRef, this.getCleanJson(updatedSubtask)).catch(
        console.error
      );
    }
  }

  /**
   * Deletes a subtask from a task's subcollection.
   *
   * @param taskId - The parent task ID.
   * @param subtaskId - The subtask ID to delete.
   */
  async deleteSubtask(taskId: string, subtaskId: string) {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      if (taskIndex !== -1 && tasks[taskIndex].subtask) {
        tasks[taskIndex].subtask = tasks[taskIndex].subtask!.filter(
          (sub) => sub.id !== subtaskId
        );
        localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(tasks));

        this.guestTasksSubject.next(tasks);
      }
    } else {
      await deleteDoc(doc(this.getSubtasksRef(taskId), subtaskId)).catch(
        console.error
      );
    }
  }

  /**
   * Deletes a task from Firestore.
   *
   * @param docId - The ID of the task to delete.
   */
  async deleteTask(docId: string) {
    if (this.authService.isGuestUser()) {
      const savedTasks = localStorage.getItem(this.GUEST_TASKS_KEY);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const filteredTasks = tasks.filter((task) => task.id !== docId);
      localStorage.setItem(this.GUEST_TASKS_KEY, JSON.stringify(filteredTasks));
      this.guestTasksSubject.next(filteredTasks);
    } else {
      await deleteDoc(this.getSingleTaskRef(docId)).catch(console.error);
    }
  }

  /**
   * Returns a plain object representation of a Task or Subtask for Firestore updates.
   *
   * @param updated - The object to clean.
   */
  getCleanJson(updated: Task | Subtask) {
    if ('category' in updated) {
      return {
        title: updated.title,
        description: updated.description,
        date: updated.date,
        priority: updated.priority,
        status: updated.status,
        assignedTo: updated.assignedTo,
        category: updated.category,
      };
    } else if ('isCompleted' in updated) {
      return {
        title: updated.title,
        isCompleted: updated.isCompleted,
      };
    }
    return {};
  }

  /**
   * Converts a Firestore Timestamp or Date object to a formatted string.
   *
   * @param date - The Timestamp or Date to convert.
   * @returns A formatted date string (`dd/mm/yyyy`).
   */
  convertDate(date: Timestamp | Date): string {
    if (date instanceof Timestamp) {
      return this.formatDate(date.toDate());
    } else if (date instanceof Date) {
      return this.formatDate(date);
    }
    return '';
  }

  /**
   * Formats a Date object into a `dd/mm/yyyy` string.
   *
   * @param date - The Date to format.
   */
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Sets the currently edited task.
   *
   * @param task - The task being edited.
   */
  setEditingTask(task: Task) {
    this.editingTask = task;
  }

  /**
   * Returns the task currently being edited.
   */
  getEditingTask(): Task | null {
    return this.editingTask;
  }

  /**
   * Clears the currently edited task.
   */
  clearEditingTask() {
    this.editingTask = null;
  }

  /**
   * Resets the guest state to initial values.
   * Called when guest user logs out.
   */
  resetGuestState(): void {
    this.guestTasksInitialized = false;
    this.guestTasksSubject.next([]);
  }

  /**
   * Capitalizes the first letter of a string.
   *
   * @param text - The string to capitalize.
   * @returns Capitalized string or empty string if undefined.
   */
  capitalize(text: string | undefined): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Hilfsmethode: Stellt sicher, dass ein Datum gültig ist
   */
  private ensureValidDate(date: Date | Timestamp | string): Date {
    // Wenn es bereits ein gültiges Date ist
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }

    if (date && typeof date === 'object' && 'toDate' in date) {
      return (date as Timestamp).toDate();
    }

    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    console.warn(
      'Invalid date detected, using current date as fallback:',
      date
    );
    return new Date();
  }
}
