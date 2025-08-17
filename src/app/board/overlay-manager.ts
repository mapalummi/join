import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationEvent } from '@angular/animations';
import { Task, TaskService } from '../services/task.service';

/**
 * OverlayManager handles all overlay-related operations for the BoardComponent.
 * This includes opening/closing overlays, managing animation states, and handling responsive behavior.
 */
@Injectable({
  providedIn: 'root'
})

export class OverlayManager {
  private animationDirection: 'right' | 'bottom' = 'right';
  private backgroundVisible = false;
  private overlayVisible = false;
  private showTaskDetails = false;
  private showAddOrEditTask: boolean = false;
  private selectedTask?: Task;

  constructor(
    private router: Router,
    private taskService: TaskService
  ) {}

  /**
   * Gets the current animation direction
   */
  getAnimationDirection(): 'right' | 'bottom' {
    return this.animationDirection;
  }

  /**
   * Gets the background visibility state
   */
  getBackgroundVisible(): boolean {
    return this.backgroundVisible;
  }

  /**
   * Gets the overlay visibility state
   */
  getOverlayVisible(): boolean {
    return this.overlayVisible;
  }

  /**
   * Gets the task details visibility state
   */
  getShowTaskDetails(): boolean {
    return this.showTaskDetails;
  }

  /**
   * Gets the add/edit task visibility state
   */
  getShowAddOrEditTask(): boolean {
    return this.showAddOrEditTask;
  }

  /**
   * Gets the currently selected task
   */
  getSelectedTask(): Task | undefined {
    return this.selectedTask;
  }

  /**
   * Sets the animation direction based on screen width.
   * Used for responsive slide-in overlays.
   *
   * @param width - Current screen width.
   */
  setAnimationDirection(width: number): void {
    this.animationDirection = width < 1000 ? 'bottom' : 'right';
  }

  /**
   * Handles removal of background and overlay if the event indicates closure.
   *
   * @param event - A string (expected: 'closed') that triggers background removal.
   */
  removeBackground(event: string): void {
    if (event === 'closed') {
      this.backgroundVisible = false;
      this.overlayVisible = false;
    }
  }

  /**
   * Callback for when the overlay slide-in animation is finished.
   * Slight delay before making the background visible for smooth UX.
   *
   * @param event - AnimationEvent from Angular.
   */
  onOverlayAnimationDone(event: AnimationEvent): void {
    if (event.toState === 'right' || event.toState === 'bottom') {
      setTimeout(() => {
        this.backgroundVisible = true;
      }, 50);
    }
  }

  /**
   * Opens the overlay for adding or editing a task.
   * On small screens, navigates to a separate route; otherwise opens the overlay inline.
   *
   * @param event - Either 'open' or 'edit', indicating the action type.
   * @param status - The status to prefill in the add/edit task form.
   */
  // openAddOrEditOverlay(event: string, status: string): void {
  //   const isSmallScreen = window.innerWidth < 1000;
  //   if (event === 'open' || event === 'edit') {
  //     if (isSmallScreen) {
  //       this.resetOverlayState();
  //       this.router.navigate(['/add-task'], { queryParams: { status } });
  //     } else {
  //       this.showTaskDetails = false;
  //       this.showAddOrEditTask = true;
  //       this.overlayVisible = true;
  //     }
  //   }
  // }

  openAddOrEditOverlay(event: string, status: string, taskToEdit?: Task): void {
  if (event === 'edit' && taskToEdit) {
    this.taskService.setEditingTask(taskToEdit); // <-- HIER setzen!
  }
  const isSmallScreen = window.innerWidth < 1000;
  if (event === 'open' || event === 'edit') {
    if (isSmallScreen) {
      this.resetOverlayState();
      this.router.navigate(['/add-task'], { queryParams: { status } });
    } else {
      this.showTaskDetails = false;
      this.showAddOrEditTask = true;
      this.overlayVisible = true;
    }
  }
}

  /**
   * Reset the overlay state.
   */
  resetOverlayState(): void {
    this.overlayVisible = false;
    this.showTaskDetails = false;
    this.showAddOrEditTask = false;
    this.selectedTask = undefined;
  }

  /**
   * Opens the overlay for viewing the details of a selected task.
   *
   * @param selectedTask - The task object to display in detail.
   */
  openTaskDetail(selectedTask: Task): void {
    this.selectedTask = selectedTask;
    this.showTaskDetails = true;
    this.showAddOrEditTask = false;
    this.overlayVisible = true;
  }

  /**
   * Closes the overlay for task details or task form.
   * Also resets relevant state variables and clears editing data.
   *
   * @param event - A string indicating why the overlay is being closed (e.g., 'close', 'added').
   */
  closeDetailsOverlay(event: string): void {
    if (event === 'close' || 'added') {
      this.overlayVisible = false;
      this.backgroundVisible = false;
      this.showTaskDetails = false;
      this.showAddOrEditTask = false;
      this.selectedTask = undefined;
      this.taskService.clearEditingTask();
    }
  }

  /**
   * Resets all overlay states to default values
   */
  resetOverlayStates(): void {
    this.backgroundVisible = false;
    this.overlayVisible = false;
    this.showTaskDetails = false;
    this.showAddOrEditTask = false;
    this.selectedTask = undefined;
  }
}
