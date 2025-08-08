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

  // NEU Änderung hier:
  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Returns a reference to the 'tasks' Firestore collection.
   */
  // getTasksRef() {
  //   return collection(this.firestore, 'tasks');
  // }

  // NEU:
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
  // getSingleTaskRef(docId: string) {
  //   return doc(collection(this.firestore, 'tasks'), docId);
  // }

  getSingleTaskRef(docId: string) {
    const collectionName = this.authService.getCollectionName('tasks');
    return doc(collection(this.firestore, collectionName), docId);
  }

  /**
   * Observes all tasks in Firestore and emits updates in real-time.
   */
  getTasks(): Observable<Task[]> {
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
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  /**
   * Observes the subtasks of a given task in real-time.
   *
   * @param taskId - The ID of the parent task.
   */
  getSubtasks(taskId: string): Observable<Subtask[]> {
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

  /**
   * Adds a new task to Firestore.
   *
   * @param newTask - The task to be added.
   * @returns The created task including its generated ID, or null on failure.
   */
  async addTask(newTask: Task): Promise<Task | null> {
    try {
      const tasksRef = this.getTasksRef();
      const docRef = await addDoc(tasksRef, newTask);
      return { id: docRef.id, ...newTask };
    } catch (err) {
      console.error('Error adding task:', err);
      return null;
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
    try {
      const subtasksRef = this.getSubtasksRef(ColId);
      const docRef = await addDoc(subtasksRef, subtask);
      return { id: docRef.id, ...subtask };
    } catch (error) {
      console.error('Error adding subtask:', error);
      return null;
    }
  }

  /**
   * Updates a task document in Firestore.
   *
   * @param docId - The ID of the task.
   * @param updatedTask - The updated task data.
   */
  async updateTask(docId: string, updatedTask: Task) {
    const docRef = this.getSingleTaskRef(docId);
    await updateDoc(docRef, this.getCleanJson(updatedTask)).catch(
      console.error
    );
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
    const docRef = doc(this.firestore, `tasks/${taskId}/subtasks/${subtaskId}`);
    await updateDoc(docRef, this.getCleanJson(updatedSubtask)).catch(
      console.error
    );
  }

  /**
   * Deletes a subtask from a task's subcollection.
   *
   * @param taskId - The parent task ID.
   * @param subtaskId - The subtask ID to delete.
   */
  async deleteSubtask(taskId: string, subtaskId: string) {
    const docRef = doc(this.firestore, `tasks/${taskId}/subtasks/${subtaskId}`);
    await deleteDoc(docRef).catch((err) =>
      console.error('Error deleting subtask:', err)
    );
  }

  /**
   * Deletes a task from Firestore.
   *
   * @param docId - The ID of the task to delete.
   */
  async deleteTask(docId: string) {
    await deleteDoc(this.getSingleTaskRef(docId)).catch(console.error);
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
   * Capitalizes the first letter of a string.
   *
   * @param text - The string to capitalize.
   * @returns Capitalized string or empty string if undefined.
   */
  capitalize(text: string | undefined): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
