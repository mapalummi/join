import {
  Component,
  ViewEncapsulation,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TaskComponent } from './task/task.component';
import {
  trigger,
  style,
  transition,
  animate,
  AnimationEvent,
} from '@angular/animations';
import { TaskDetailsComponent } from './task-details/task-details.component';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDragMove,
} from '@angular/cdk/drag-drop';
import { Task } from '../services/task.service';
import { TaskService } from '../services/task.service';
import { CommonModule } from '@angular/common';
import { Subtask } from '../services/task.service';
import { Subscription } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { Contact } from '../services/contact.service';
import { FormsModule } from '@angular/forms';
import { AddTaskComponent } from '../add-task/add-task.component';
import { Router } from '@angular/router';
import { TaskListManager } from './task-list-manager';
import { DragDropManager } from './drag-drop-manager';
import { OverlayManager } from './overlay-manager';

@Component({
  selector: 'app-board',
  imports: [
    TaskComponent,
    TaskDetailsComponent,
    CdkDropList,
    CdkDrag,
    CommonModule,
    FormsModule,
    AddTaskComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideInOut', [
      transition('void => right', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition('right => void', [
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
      transition('void => bottom', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition('bottom => void', [
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateY(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})

/**
 * BoardComponent is the central component of the task management board.
 * It manages task lists, their statuses, drag-and-drop functionality,
 * overlays for task details and creation, as well as subtasks and contacts.
 *
 * Features:
 * - Categorized task lists: "to-do", "in-progress", "await-feedback", "done"
 * - Drag & drop task sorting and status changes (via Angular CDK)
 * - Task filtering via search term
 * - Animated overlay for task detail and add/edit view
 * - Subtask management per task
 * - Contact integration for assigning collaborators
 * - Responsive design (mobile / desktop behavior)
 */
export class BoardComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  unsubTask!: Subscription;
  unsubSubtask!: Subscription;
  unsubContact!: Subscription;
  subtaskList: Subtask[] = [];
  contactList: Contact[] = [];
  setTaskStatus: string = 'to-do';
  showBackToTop = false;
  openedMenuTaskId: string | null = null;

  /**
   * Getter for overlay states from OverlayManager
   */
  get animationDirection(): 'right' | 'bottom' {
    return this.overlayManager.getAnimationDirection();
  }

  get backgroundVisible(): boolean {
    return this.overlayManager.getBackgroundVisible();
  }

  get overlayVisible(): boolean {
    return this.overlayManager.getOverlayVisible();
  }

  get showTaskDetails(): boolean {
    return this.overlayManager.getShowTaskDetails();
  }

  get showAddOrEditTask(): boolean {
    return this.overlayManager.getShowAddOrEditTask();
  }

  get selectedTask(): Task | undefined {
    return this.overlayManager.getSelectedTask();
  }

  /**
   * Getter for task lists from TaskListManager
   */
  get taskList(): Task[] {
    return this.taskListManager.getTaskList();
  }

  get subtasksByTaskId(): { [taskId: string]: Subtask[] } {
    return this.taskListManager.getSubtasksByTaskId();
  }

  get todo(): Task[] {
    return this.taskListManager.getTodoTasks();
  }

  get inprogress(): Task[] {
    return this.taskListManager.getInProgressTasks();
  }

  get awaitfeedback(): Task[] {
    return this.taskListManager.getAwaitFeedbackTasks();
  }

  get done(): Task[] {
    return this.taskListManager.getDoneTasks();
  }

  /**
   * Constructs the BoardComponent with injected services for task management, navigation,
   * and contact handling.
   *
   * @param taskService - Service for managing tasks and subtasks.
   * @param router - Angular Router for navigating to different views (e.g., add-task).
   * @param contactService - Service for managing contact data.
   */
  constructor(
    private taskListManager: TaskListManager,
    private dragDropManager: DragDropManager,
    private overlayManager: OverlayManager,
    private contactService: ContactService,
    private taskService: TaskService
  ) {}

  /**
   * Reference to the scrollable board section element.
   * Used to detect scrolling and show the "back to top" button.
   */
  @ViewChild('scrollSection') scrollSection!: ElementRef<HTMLElement>;

  /**
   * Lifecycle hook that runs after the component’s view has been fully initialized.
   * Adds a scroll event listener to the scrollable section.
   */
  ngAfterViewInit() {
    this.scrollSection.nativeElement.addEventListener('scroll', () =>
      this.onSectionScroll()
    );
  }

  /**
   * Handles scroll events and toggles visibility of the "back to top" button
   * if the scroll position exceeds a threshold.
   */
  onSectionScroll() {
    const scrollTop = this.scrollSection.nativeElement.scrollTop;
    this.showBackToTop = scrollTop > 300;
  }

  /**
   * Smoothly scrolls the scrollable section back to the top.
   */
  scrollToTop() {
    this.scrollSection.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Lifecycle hook that runs on component initialization.
   * Starts loading tasks from the task service.
   * Lifecycle hook: Sets initial animation direction and attaches resize listener.
   */
  ngOnInit(): void {
    this.taskListManager.loadTasks();
    this.overlayManager.setAnimationDirection(window.innerWidth);
    window.addEventListener('resize', () => {
      this.overlayManager.setAnimationDirection(window.innerWidth);
    });
    // Kontakte direkt beim Initialisieren laden:
    this.contactService.getContacts().subscribe((contacts) => {
      this.contactList = contacts;
    });
  }

  /**
   * Placeholder for handling user input in the search field.
   */
  onSearchInput() {}

  /**
   * Filters tasks by given status and current search term (case-insensitive).
   *
   * @param status - Task status to filter by ('to-do', 'in-progress', 'await-feedback', 'done').
   * @returns Filtered list of tasks.
   */
  getFilteredTasks(status: string): Task[] {
    return this.taskListManager.getFilteredTasks(status, this.searchTerm);
  }

  /**
   * Clears the current search input.
   */
  clearSearch() {
    this.searchTerm = '';
  }

  /**
   * Sets the animation direction based on screen width.
   * Used for responsive slide-in overlays.
   *
   * @param width - Current screen width.
   */
  setAnimationDirection(width: number) {
    this.overlayManager.setAnimationDirection(width);
  }

  /**
   * Handles removal of background and overlay if the event indicates closure.
   *
   * @param event - A string (expected: 'closed') that triggers background removal.
   */
  removeBackground(event: string) {
    this.overlayManager.removeBackground(event);
  }

  /**
   * Callback for when the overlay slide-in animation is finished.
   * Slight delay before making the background visible for smooth UX.
   *
   * @param event - AnimationEvent from Angular.
   */
  onOverlayAnimationDone(event: AnimationEvent) {
    this.overlayManager.onOverlayAnimationDone(event);
  }
  /**
   * Returns the delay for starting a drag action based on screen width.
   * Prevents accidental drags on small screens.
   *
   * @returns Drag delay in milliseconds.
   */
  getDragDelay(): number {
    return this.dragDropManager.getDragDelay();
  }

  /**
   * Handles drag-and-drop actions for tasks using the Angular CDK.
   * Updates the task's status and reorders task lists accordingly.
   *
   * @param event - The CdkDragDrop event containing task data and drop context.
   */
  drop(event: CdkDragDrop<Task[]>) {
    this.dragDropManager.handleDrop(event, () => {
      this.taskListManager.updateTaskLists();
    });
  }

  /**
   * Stores the currently selected status for a new or edited task.
   *
   * @param status - The task status to set (e.g., 'to-do', 'done').
   */
  saveTaskStatus(status: string) {
    this.setTaskStatus = status;
  }

  /**
   * Opens the overlay for adding or editing a task.
   * On small screens, navigates to a separate route; otherwise opens the overlay inline.
   *
   * @param event - Either 'open' or 'edit', indicating the action type.
   * @param status - The status to prefill in the add/edit task form.
   */
  openAddOrEditOverlay(event: string, status: string) {
    this.overlayManager.openAddOrEditOverlay(event, status);
  }

  /**
   * Opens the overlay for viewing the details of a selected task.
   *
   * @param selectedTask - The task object to display in detail.
   */
  openTaskDetail(selectedTask: Task) {
    this.overlayManager.openTaskDetail(selectedTask);
  }

  /**
   * Closes the overlay for task details or task form.
   * Also resets relevant state variables and clears editing data.
   *
   * @param event - A string indicating why the overlay is being closed (e.g., 'close', 'added').
   */
  closeDetailsOverlay(event: string) {
    this.overlayManager.closeDetailsOverlay(event);
  }

  /**
   * Returns the subtasks for a given task ID.
   *
   * @param taskId - The ID of the task to retrieve subtasks for.
   * @returns Array of subtasks, or an empty array if none exist.
   */
  getSubtasksForTask(taskId: string | undefined): Subtask[] {
    return this.taskListManager.getSubtasksForTask(taskId);
  }

  /**
   * Returns the subtasks assigned to the currently selected task.
   *
   * @returns Array of subtasks, or an empty array if none are found.
   */
  getSubtasksForSelectedTask() {
    return this.taskListManager.getSubtasksForSelectedTask(this.selectedTask);
  }

  /**
   * Updates the internal list of available contacts.
   *
   * @param contactList - Array of contact objects to store.
   */
  // getContactList(contactList: Contact[]) {
  //   this.contactList = contactList;
  // }

  /**
   * Replaces the subtask list with a new array of updated subtasks.
   *
   * @param updatedSubtasks - Array of updated subtask objects.
   */
  onSubtaskUpdate(updatedSubtasks: Subtask[]) {
    this.subtaskList = [...updatedSubtasks];
  }

  /**
   * TrackBy function for use with ngFor to optimize rendering of tasks.
   *
   * @param index - The index of the item in the array.
   * @param task - The task object.
   * @returns The unique task ID.
   */
  trackByTaskId(index: number, task: Task): string | undefined {
    return this.taskListManager.trackByTaskId(index, task);
  }

  /**
   * Updates the status of a task and persists the change via the task service.
   *
   * @param event - An object containing taskId and the new status.
   */
  changeTaskStatus(event: { taskId: string; status: string }) {
    const { taskId, status } = event;
    this.dragDropManager.changeTaskStatus(taskId, status, this.taskList, () => {
      this.taskListManager.loadTasks();
    });
  }

  /**
   * Handles automatic scrolling while dragging near the top or bottom edge
   * of the scrollable task section.
   *
   * @param event - The CdkDragMove event containing the pointer position.
   */
  onDragMoved(event: CdkDragMove) {
    this.dragDropManager.handleDragMove(event, this.scrollSection);
  }

  async handleTaskEdited(taskId: string) {
  // Task-Liste neu laden, damit überall die aktuellen Daten sind
  await this.taskListManager.loadTasks();
  // Task nach Editieren frisch aus Firestore laden
  const updatedTask = await this.taskService.getTaskById(taskId);
  if (updatedTask) {
    this.overlayManager.openTaskDetail(updatedTask);
  }
}

  /**
   * Angular lifecycle hook that is called when the BoardComponent is destroyed.
   * Cleans up resources by destroying the TaskListManager and logs the destruction.
   */
  ngOnDestroy(): void {
    this.taskListManager.destroy();
    // console.log('BoardComponent destroyed');
  }
}
