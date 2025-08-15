import { Injectable } from '@angular/core';
import { TaskService, Task } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

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
  providedIn: 'root',
})
export class SubtaskManager {
  private subtaskSubscription?: Subscription;

  private subtasks: Subtask[] = [];
  private nextSubtaskId: number = 1;
  private editingSubtaskId: string | number | null = null;
  private editingSubtaskText: string = '';
  private subtaskInput: string = '';
  private showSubtaskConfirmation: boolean = false;
  originalSubtasks: Subtask[] = [];

  constructor(
    private taskService: TaskService,
    private authService: AuthService
  ) {}

  /**
   * Returns the current array of subtasks.
   */
  getSubtasks(): Subtask[] {
    return this.subtasks;
  }

  /**
   * Sets the internal subtasks array and updates the next subtask ID.
   * @param subtasks - The array of subtasks to set.
   */
  setSubtasks(subtasks: Subtask[]): void {
    this.subtasks = subtasks;
    this.nextSubtaskId = subtasks.length + 1;
  }

  /**
   * Returns the current value of the subtask input field.
   */
  getSubtaskInput(): string {
    return this.subtaskInput;
  }

  /**
   * Sets the value of the subtask input field.
   * @param value - The new value for the subtask input.
   */
  setSubtaskInput(value: string): void {
    this.subtaskInput = value;
  }

  /**
   * Returns whether the subtask confirmation dialog is shown.
   */
  getShowSubtaskConfirmation(): boolean {
    return this.showSubtaskConfirmation;
  }

  /**
   * Sets the state of the subtask confirmation dialog.
   * @param value - True to show the confirmation, false to hide.
   */
  setShowSubtaskConfirmation(value: boolean): void {
    this.showSubtaskConfirmation = value;
  }

  /**
   * Returns the ID of the subtask currently being edited, or null if none.
   */
  getEditingSubtaskId(): string | number | null {
    return this.editingSubtaskId;
  }

  /**
   * Returns the text of the subtask currently being edited.
   */
  getEditingSubtaskText(): string {
    return this.editingSubtaskText;
  }

  /**
   * Sets the text for the subtask currently being edited.
   * @param value - The new text for the subtask.
   */
  setEditingSubtaskText(value: string): void {
    this.editingSubtaskText = value;
  }

  /**
   * Handles a click on the subtask input field, clearing it if confirmation is not shown.
   */
  onSubtaskInputClick(): void {
    if (!this.showSubtaskConfirmation) {
      this.subtaskInput = '';
    }
  }

  /**
   * Handles the Enter key press on the subtask input to add a new subtask.
   * @param event - The keyboard event.
   */
  onSubtaskEnter(event: Event): void {
    event.preventDefault();
    if (this.subtaskInput && this.subtaskInput.trim()) {
      this.addSubtask();
    }
  }

  /**
   * Confirms and adds the current subtask input as a new subtask.
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
   * Cancels subtask creation and clears the input field.
   */
  cancelSubtask(): void {
    this.subtaskInput = '';
    this.showSubtaskConfirmation = false;
  }

  /**
   * Adds a new subtask to the internal subtasks array using the current input value.
   */
  addSubtask(): void {
    if (this.subtaskInput && this.subtaskInput.trim()) {
      const newSubtask: Subtask = {
        id: this.nextSubtaskId++,
        text: this.subtaskInput.trim(),
        completed: false,
      };
      this.subtasks.push(newSubtask);
      this.subtaskInput = '';
      this.showSubtaskConfirmation = false;
    }
  }

  /**
   * Deletes a subtask by its ID from the internal subtasks array.
   * @param id - The ID of the subtask to delete.
   */
  deleteSubtask(id: string | number): void {
    this.subtasks = this.subtasks.filter((subtask) => subtask.id !== id);
  }

  /**
   * Updates the text of a subtask by its ID.
   * @param id - The ID of the subtask to edit.
   * @param newText - The new text for the subtask.
   */
  editSubtask(id: string | number, newText: string): void {
    const subtask = this.subtasks.find((s) => s.id === id);
    if (subtask) {
      subtask.text = newText.trim();
    }
  }

  /**
   * Initiates editing mode for a subtask, setting up the editing state and focusing the input.
   * @param id - The ID of the subtask to edit.
   * @param currentText - The current text of the subtask.
   */
  editSubtaskPrompt(id: string | number, currentText: string): void {
    this.editingSubtaskId = id;
    this.editingSubtaskText = currentText;
    setTimeout(() => {
      const inputElement = document.querySelector(
        '.subtask-edit-input'
      ) as HTMLInputElement;
      if (inputElement) {
        inputElement.value = this.editingSubtaskText;
        inputElement.focus();
        inputElement.setSelectionRange(
          inputElement.value.length,
          inputElement.value.length
        );
      }
    }, 100);
  }

  /**
   * Saves the edited subtask text and exits editing mode.
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
   * Cancels subtask editing mode and clears the editing state.
   */
  cancelSubtaskEdit(): void {
    this.editingSubtaskId = null;
    this.editingSubtaskText = '';
  }

  /**
   * Handles keyboard shortcuts (Enter/Escape) for subtask editing.
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
   * Toggles the completion state of a subtask by its ID.
   * @param id - The ID of the subtask to toggle.
   */
  toggleSubtaskCompletion(id: string | number): void {
    const subtask = this.subtasks.find((s) => s.id === id);
    if (subtask) {
      subtask.completed = !subtask.completed;
    }
  }

  /**
   * Clears all subtask data and resets the manager to its default state.
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
  public async saveAllSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      await this.saveGuestSubtasks(taskId, subtasks);
    } else {
      for (const subtask of subtasks) {
        await this.taskService.addSubtask(taskId, {
          title: subtask.text,
          isCompleted: subtask.completed,
        });
      }
    }
  }

  /**
   * Saves the provided subtasks for a guest user by updating the local storage.
   * Updates the subtasks of the specified task and notifies the TaskService about the change.
   *
   * @param taskId - The ID of the task to which the subtasks belong.
   * @param subtasks - The list of subtasks to be saved.
   */
  private async saveGuestSubtasks(
    taskId: string,
    subtasks: any[]
  ): Promise<void> {
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      const subtasksWithIds = subtasks.map((subtask) => ({
        id:
          'local-sub-' +
          Date.now() +
          '-' +
          Math.random().toString(36).substr(2, 9),
        title: subtask.text,
        isCompleted: subtask.completed,
      }));

      tasks[taskIndex].subtask = subtasksWithIds;

      localStorage.setItem('guest-tasks', JSON.stringify(tasks));

      await this.notifyTaskServiceUpdate(tasks);
    }
  }

  /**
   * Notifies the TaskService about updates to the guest tasks.
   * Pushes the updated tasks array to the guestTasksSubject so that all subscribers receive the changes.
   *
   * @param tasks - The updated list of guest tasks.
   */
  private async notifyTaskServiceUpdate(tasks: Task[]): Promise<void> {
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
    return this.originalSubtasks.filter(
      (original) =>
        typeof original.id === 'string' &&
        original.id.length > 0 &&
        !currentSubtasks.some((current) => current.id === original.id)
    );
  }

  /**
   * Deletes the given subtasks from the specified task.
   *
   * @param taskId - The ID of the task.
   * @param subtasks - The subtasks to delete.
   */
  public async deleteSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      await this.deleteGuestSubtasks(taskId, subtasks);
    } else {
      for (const subtask of subtasks) {
        if (typeof subtask.id === 'string') {
          await this.taskService.deleteSubtask(taskId, subtask.id);
        }
      }
    }
  }

  private async deleteGuestSubtasks(
    taskId: string,
    subtasks: any[]
  ): Promise<void> {
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1 && tasks[taskIndex].subtask) {
      const subtaskIdsToDelete = subtasks.map((s) => s.id);
      tasks[taskIndex].subtask = tasks[taskIndex].subtask!.filter(
        (sub) => !subtaskIdsToDelete.includes(sub.id)
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
  public async syncSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    if (this.authService.isGuestUser()) {
      await this.syncGuestSubtasks(taskId, subtasks);
    } else {
      for (const subtask of subtasks) {
        const subtaskData = {
          title: subtask.text,
          isCompleted: subtask.completed,
        };
        if (typeof subtask.id === 'string' && subtask.id.length > 0) {
          await this.taskService.updateSubtask(taskId, subtask.id, subtaskData);
        } else {
          await this.taskService.addSubtask(taskId, subtaskData);
        }
      }
    }
  }

  /**
   * Synchronizes the provided subtasks for a guest user by updating local storage.
   * Updates or adds subtasks for the specified task and notifies the TaskService about the change.
   *
   * @param taskId - The ID of the task to synchronize subtasks for.
   * @param subtasks - The list of subtasks to synchronize.
   */
  private async syncGuestSubtasks(
    taskId: string,
    subtasks: any[]
  ): Promise<void> {
    const savedTasks = localStorage.getItem('guest-tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      const syncedSubtasks = subtasks.map((subtask) => {
        if (typeof subtask.id === 'string' && subtask.id.length > 0) {
          return {
            id: subtask.id,
            title: subtask.text,
            isCompleted: subtask.completed,
          };
        } else {
          return {
            id:
              'local-sub-' +
              Date.now() +
              '-' +
              Math.random().toString(36).substr(2, 9),
            title: subtask.text,
            isCompleted: subtask.completed,
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
    if (this.subtaskSubscription) {
      this.subtaskSubscription.unsubscribe();
    }
    this.subtaskSubscription = this.taskService
      .getSubtasks(taskId)
      .subscribe((subtasks) => {
        const mappedSubtasks = subtasks.map((subtask) => ({
          id: subtask.id || '',
          text: subtask.title,
          completed: subtask.isCompleted,
        }));
        this.setSubtasks(mappedSubtasks);
        this.originalSubtasks = [...mappedSubtasks];
      });
  }

  /**
   * Cleans up the subtask subscription when the SubtaskManager is destroyed.
   * Ensures that no Firestore listeners remain active.
   */
  ngOnDestroy(): void {
    if (this.subtaskSubscription) {
      this.subtaskSubscription.unsubscribe();
    }
    console.log('SubtaskManager destroyed');
  }
}
