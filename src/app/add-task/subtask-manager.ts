import { Injectable } from '@angular/core';
import { TaskService, Task } from '../services/task.service';
import { AuthService } from '../services/auth.service';

export interface Subtask {
  id: string | number;
  text: string;
  completed: boolean;
}

/**
 * SubtaskManager handles all subtask-related operations for the AddTaskComponent.
 * This includes adding, editing, deleting, and managing subtask state.
 */
@Injectable({
  providedIn: 'root'
})

export class SubtaskManager {
  private subtasks: Subtask[] = [];
  private nextSubtaskId: number = 1;
  private editingSubtaskId: string | number | null = null;
  private editingSubtaskText: string = '';
  private subtaskInput: string = '';
  private showSubtaskConfirmation: boolean = false;
  originalSubtasks: Subtask[] = [];

  constructor( private taskService: TaskService, private authService: AuthService ){}

  /**
   * Gets all subtasks
   */
  getSubtasks(): Subtask[] {
    return this.subtasks;
  }

  /**
   * Sets the subtasks array
   */
  setSubtasks(subtasks: Subtask[]): void {
    this.subtasks = subtasks;
    this.nextSubtaskId = subtasks.length + 1;
  }

  /**
   * Gets the current subtask input value
   */
  getSubtaskInput(): string {
    return this.subtaskInput;
  }

  /**
   * Sets the subtask input value
   */
  setSubtaskInput(value: string): void {
    this.subtaskInput = value;
  }

  /**
   * Gets the subtask confirmation state
   */
  getShowSubtaskConfirmation(): boolean {
    return this.showSubtaskConfirmation;
  }

  /**
   * Sets the subtask confirmation state
   */
  setShowSubtaskConfirmation(value: boolean): void {
    this.showSubtaskConfirmation = value;
  }

  /**
   * Gets the editing subtask ID
   */
  getEditingSubtaskId(): string | number | null {
    return this.editingSubtaskId;
  }

  /**
   * Gets the editing subtask text
   */
  getEditingSubtaskText(): string {
    return this.editingSubtaskText;
  }

  /**
   * Sets the editing subtask text
   */
  setEditingSubtaskText(value: string): void {
    this.editingSubtaskText = value;
  }

  /**
   * Handles subtask input click to clear the input if confirmation is not shown.
   */
  onSubtaskInputClick(): void {
    if (!this.showSubtaskConfirmation) {
      this.subtaskInput = '';
    }
  }

  /**
   * Handles Enter key press on subtask input to add the subtask.
   * @param event - The keyboard event.
   */
  onSubtaskEnter(event: Event): void {
    event.preventDefault();
    if (this.subtaskInput && this.subtaskInput.trim()) {
      this.addSubtask();
    }
  }

  /**
   * Confirms and adds the subtask.
   * @param event - The event that triggered the confirmation.
   */
  confirmSubtask(event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.addSubtask();
    this.showSubtaskConfirmation = false;
  }

  /**
   * Cancels subtask creation and clears the input.
   */
  cancelSubtask(): void {
    this.subtaskInput = '';
    this.showSubtaskConfirmation = false;
  }

  /**
   * Adds a new subtask to the task.
   */
  addSubtask(): void {
    if (this.subtaskInput && this.subtaskInput.trim()) {
      const newSubtask: Subtask = {
        id: this.nextSubtaskId++,
        text: this.subtaskInput.trim(),
        completed: false
      };
      this.subtasks.push(newSubtask);
      this.subtaskInput = '';
      this.showSubtaskConfirmation = false;
    }
  }

  /**
   * Deletes a subtask by its ID.
   * @param id - The ID of the subtask to delete.
   */
  deleteSubtask(id: string | number): void {
    this.subtasks = this.subtasks.filter(subtask => subtask.id !== id);
  }

  /**
   * Edits the text of a subtask.
   * @param id - The ID of the subtask to edit.
   * @param newText - The new text for the subtask.
   */
  editSubtask(id: string | number, newText: string): void {
    const subtask = this.subtasks.find(s => s.id === id);
    if (subtask) {
      subtask.text = newText.trim();
    }
  }

  /**
   * Initiates editing mode for a subtask.
   * @param id - The ID of the subtask to edit.
   * @param currentText - The current text of the subtask.
   */
  editSubtaskPrompt(id: string | number, currentText: string): void {
    this.editingSubtaskId = id;
    this.editingSubtaskText = currentText;
    setTimeout(() => {
      const inputElement = document.querySelector('.subtask-edit-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = this.editingSubtaskText;
        inputElement.focus();
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
      }
    }, 100);
  }

  /**
   * Saves the edited subtask text.
   */
  saveSubtaskEdit(): void {
    if (this.editingSubtaskId !== null) {
      if (this.editingSubtaskText && this.editingSubtaskText.trim()) {
        this.editSubtask(this.editingSubtaskId, this.editingSubtaskText.trim());
      }
      this.cancelSubtaskEdit();
    }
  }

  /**
   * Cancels subtask editing mode.
   */
  cancelSubtaskEdit(): void {
    this.editingSubtaskId = null;
    this.editingSubtaskText = '';
  }

  /**
   * Handles keyboard shortcuts for subtask editing.
   * @param event - The keyboard event.
   */
  onSubtaskEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveSubtaskEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSubtaskEdit();
    }
  }

  /**
   * Toggles the completion state of a subtask.
   * @param id - The ID of the subtask to toggle.
   */
  toggleSubtaskCompletion(id: string | number): void {
    const subtask = this.subtasks.find(s => s.id === id);
    if (subtask) {
      subtask.completed = !subtask.completed;
    }
  }

  /**
   * Clears all subtask data and resets to default state.
   */
  clearAll(): void {
    this.subtasks = [];
    this.subtaskInput = '';
    this.nextSubtaskId = 1;
    this.editingSubtaskId = null;
    this.editingSubtaskText = '';
    this.showSubtaskConfirmation = false;
  }

  /**
   * Saves all given subtasks to the task with the specified ID.
   * 
   * @param taskId - The ID of the task to add subtasks to.
   * @param subtasks - The list of subtasks to be saved.
   */
  // public async saveAllSubtasks(taskId: string, subtasks: any[]): Promise<void> {
  //   for (const subtask of subtasks) {
  //     await this.taskService.addSubtask(taskId, {
  //       title: subtask.text,
  //       isCompleted: subtask.completed
  //     });
  //   }
  // }

  // NEU:
  /**
   * Saves all given subtasks to the task with the specified ID.
   * 
   * @param taskId - The ID of the task to add subtasks to.
   * @param subtasks - The list of subtasks to be saved.
   */
  public async saveAllSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      // Für Guest-User: Alle Subtasks auf einmal zum Task hinzufügen
      await this.saveGuestSubtasks(taskId, subtasks);
    } else {
      // Für registrierte User: Einzeln über Firestore speichern
      for (const subtask of subtasks) {
        await this.taskService.addSubtask(taskId, {
          title: subtask.text,
          isCompleted: subtask.completed
        });
      }
    }
  }

  /**
   * Speichert alle Subtasks für Guest-User direkt im Task-Objekt
   */
  private async saveGuestSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    // Local Storage Tasks laden
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];
    
    // Task finden und Subtasks hinzufügen
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      // Alle Subtasks mit IDs versehen und zum Task hinzufügen
      const subtasksWithIds = subtasks.map(subtask => ({
        id: 'local-sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: subtask.text,
        isCompleted: subtask.completed
      }));
      
      tasks[taskIndex].subtask = subtasksWithIds;
      
      // Zurück in Local Storage speichern
      localStorage.setItem('guest-tasks', JSON.stringify(tasks));
      
      // TaskService BehaviorSubject aktualisieren
      await this.notifyTaskServiceUpdate(tasks);
    }
  }

/**
   * Benachrichtigt den TaskService über die Aktualisierung
   */
  private async notifyTaskServiceUpdate(tasks: Task[]): Promise<void> {
    // TaskService dynamisch laden um Circular Dependencies zu vermeiden
    try {
      const taskService = this.taskService as any;
      if (taskService.guestTasksSubject) {
        taskService.guestTasksSubject.next(tasks);
      }
    } catch (error) {
      console.warn('Error updating TaskService:', error);
    }
  }




  /**
   * Returns a list of original subtasks that have been deleted.
   * 
   * @param currentSubtasks - The current list of subtasks in the form.
   */
  public getDeletedSubtasks(currentSubtasks: any[]): any[] {
    return this.originalSubtasks.filter(original =>
      typeof original.id === 'string' &&
      original.id.length > 0 &&
      !currentSubtasks.some(current => current.id === original.id)
    );
  }

  /**
   * Deletes the given subtasks from the specified task.
   * 
   * @param taskId - The ID of the task.
   * @param subtasks - The subtasks to delete.
   */
  // public async deleteSubtasks(taskId: string, subtasks: any[]): Promise<void> {
  //   for (const subtask of subtasks) {
  //     if (typeof subtask.id === 'string') {
  //       await this.taskService.deleteSubtask(taskId, subtask.id);
  //     }
  //   }
  // }

  // NEU:
  /**
   * Deletes the given subtasks from the specified task.
   * 
   * @param taskId - The ID of the task.
   * @param subtasks - The subtasks to delete.
   */
  public async deleteSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      // Für Guest-User: Local Storage Löschung
      await this.deleteGuestSubtasks(taskId, subtasks);
    } else {
      // Für registrierte User: Firestore Löschung
      for (const subtask of subtasks) {
        if (typeof subtask.id === 'string') {
          await this.taskService.deleteSubtask(taskId, subtask.id);
        }
      }
    }
  }

// NEU:
/**
   * Löscht Subtasks für Guest-User aus dem Local Storage
   */
  private async deleteGuestSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];
    
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1 && tasks[taskIndex].subtask) {
      // Subtasks entfernen die gelöscht werden sollen
      const subtaskIdsToDelete = subtasks.map(s => s.id);
      tasks[taskIndex].subtask = tasks[taskIndex].subtask!.filter(
        sub => !subtaskIdsToDelete.includes(sub.id)
      );
      
      localStorage.setItem('guest-tasks', JSON.stringify(tasks));
      await this.notifyTaskServiceUpdate(tasks);
    }
  }




  /**
   * Syncs all current subtasks (add or update) with the backend.
   * 
   * @param taskId - The ID of the task to sync with.
   * @param subtasks - The current list of subtasks in the form.
   */
  // public async syncSubtasks(taskId: string, subtasks: any[]): Promise<void> {
  //   for (const subtask of subtasks) {
  //     const subtaskData = {
  //       title: subtask.text,
  //       isCompleted: subtask.completed
  //     };
  //     if (typeof subtask.id === 'string' && subtask.id.length > 0) {
  //       await this.taskService.updateSubtask(taskId, subtask.id, subtaskData);
  //     } else {
  //       await this.taskService.addSubtask(taskId, subtaskData);
  //     }
  //   }
  // }

  // NEU:
  /**
   * Syncs all current subtasks (add or update) with the backend.
   * 
   * @param taskId - The ID of the task to sync with.
   * @param subtasks - The current list of subtasks in the form.
   */
  public async syncSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      // Für Guest-User: Direkte Local Storage Synchronisation
      await this.syncGuestSubtasks(taskId, subtasks);
    } else {
      // Für registrierte User: Normale Firestore Synchronisation
      for (const subtask of subtasks) {
        const subtaskData = {
          title: subtask.text,
          isCompleted: subtask.completed
        };
        if (typeof subtask.id === 'string' && subtask.id.length > 0) {
          await this.taskService.updateSubtask(taskId, subtask.id, subtaskData);
        } else {
          await this.taskService.addSubtask(taskId, subtaskData);
        }
      }
    }
  }



  // NEU:
   /**
   * Synchronisiert Subtasks für Guest-User im Local Storage
   */
  private async syncGuestSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];
    
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      // Bestehende und neue Subtasks verarbeiten
      const syncedSubtasks = subtasks.map(subtask => {
        if (typeof subtask.id === 'string' && subtask.id.length > 0) {
          // Bestehende Subtask aktualisieren
          return {
            id: subtask.id,
            title: subtask.text,
            isCompleted: subtask.completed
          };
        } else {
          // Neue Subtask hinzufügen
          return {
            id: 'local-sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title: subtask.text,
            isCompleted: subtask.completed
          };
        }
      });
      
      tasks[taskIndex].subtask = syncedSubtasks;
      localStorage.setItem('guest-tasks', JSON.stringify(tasks));
      await this.notifyTaskServiceUpdate(tasks);
    }
  }



   /**
   * Loads subtasks for the given task ID and sets them in the subtask manager.
   *
   * @param taskId - The ID of the task whose subtasks should be loaded.
   */
  public loadAndSetSubtasks(taskId: string): void {
    this.taskService.getSubtasks(taskId).subscribe(subtasks => {
      const mappedSubtasks = subtasks.map(subtask => ({
        id: subtask.id || '',
        text: subtask.title,
        completed: subtask.isCompleted,
      }));
      this.setSubtasks(mappedSubtasks);
      this.originalSubtasks = [...mappedSubtasks];
    });
  }

}
