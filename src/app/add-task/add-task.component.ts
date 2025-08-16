import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  Output,
  Input,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, Contact } from '../services/contact.service';
import { TaskService, Task } from '../services/task.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SubtaskManager } from './subtask-manager';
import { ContactManager } from './contact-manager';
import { CategoryManager } from './category-manager';
import { PriorityManager } from './priority-manager';
import {
  FormValidatorService,
  FormData,
  ValidationErrors,
} from './form-validator.service';
import { TaskDataService } from './task-data.service';
import { Subscription } from 'rxjs';

/**
 * AddTaskComponent provides a comprehensive form for creating and editing tasks.
 * It supports task creation with priority, category, assigned contacts, due dates and subtasks.
 * The component can operate in both standalone mode and overlay mode, and handles both creating new tasks and editing existing ones.
 *
 * @example
 * <app-add-task
 *   [defaultStatus]="'to-do'"
 *   [isOverlayMode]="true"
 *   (taskAdded)="handleTaskAdded($event)"
 *   (closeOverlay)="handleClose()">
 * </app-add-task>
 */
@Component({
  selector: 'app-add-task',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-task.component.html',
  styleUrl: './add-task.component.scss',
})
export class AddTaskComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  @Output() taskAdded = new EventEmitter<string>();
  @Output() closeOverlay = new EventEmitter<void>();
  @Input() defaultStatus = '';
  @Input() isOverlayMode = false;

  contacts: Contact[] = [];
  subtaskInputFocused = false;
  isCreatingTask: boolean = false;
  showSuccessMessage: boolean = false;
  originalTaskStatus: 'to-do' | 'in-progress' | 'await-feedback' | 'done' =
    'to-do';
  isEditingMode: boolean = false;
  editingTaskId: string | undefined;
  validationErrors: ValidationErrors = {
    showTitleError: false,
    showDateError: false,
  };

  formData: FormData = {
    title: '',
    description: '',
    dueDate: '',
  };

  /**
   * Constructor injecting required services for task management.
   * @param contactService - Service for managing contact operations.
   * @param taskService - Service for managing task operations.
   * @param router - Angular Router for navigation.
   * @param route - ActivatedRoute for accessing route parameters.
   * @param subtaskManager - Service for managing subtask operations.
   * @param contactManager - Service for managing contact operations.
   * @param categoryManager - Service for managing category operations.
   */
  constructor(
    private contactService: ContactService,
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute,
    private formValidator: FormValidatorService,
    private taskDataService: TaskDataService,
    public subtaskManager: SubtaskManager,
    public contactManager: ContactManager,
    public categoryManager: CategoryManager,
    public priorityManager: PriorityManager
  ) {}

  /**
   * Initializes the component by loading the status and contacts.
   */
  ngOnInit() {
    this.loadStatus();
    this.loadContacts();
  }

  /**
   * Lifecycle hook that runs when the component is destroyed.
   * Clears all form data and manager states to prevent state leaking.
   */
  ngOnDestroy() {
    this.clearForm();
    // Alle Subscriptions beenden!
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    // console.log('TaskComponent destroyed');
  }

  /**
   * Loads the default status from route query parameters.
   */
  loadStatus() {
    this.route.queryParams.subscribe((params) => {
      if (params['status']) {
        this.defaultStatus = params['status'];
      }
    });
  }

  /**
   * Loads all contacts from the ContactService and then loads any task being edited.
   */
  async loadContacts() {
    const sub = this.contactService
      .getContacts()
      .subscribe(async (contacts) => {
        this.contacts = contacts;
        await this.loadEditingTask();
      });
    this.subscriptions.push(sub);
  }

  /**
   * Clears all internal managers (contact, category, subtask)
   * to prevent leaking state between tasks.
   */
  public clearAllManagers(): void {
    this.contactManager.clearAll();
    this.categoryManager.clearAll();
    this.subtaskManager.clearAll();
  }

  /**
   * Loads a task currently being edited from the TaskService and populates the form.
   */
  // async loadEditingTask(): Promise<void> {
  //   const editingTask = this.taskService.getEditingTask();
  //   if (editingTask) {
  //     this.isEditingMode = true;
  //     this.editingTaskId = editingTask.id;
  //     this.originalTaskStatus = (await this.taskDataService.populateFromTask(
  //       editingTask,
  //       this.formData,
  //       this.priorityManager,
  //       this.contactManager,
  //       this.subtaskManager,
  //       this.contacts
  //     )) as 'to-do' | 'in-progress' | 'await-feedback' | 'done';
  //     this.taskService.clearEditingTask();
  //   } else {
  //     this.clearAllManagers();
  //   }
  // }

  // NEU:
  async loadEditingTask(): Promise<void> {
  const editingTask = this.taskService.getEditingTask();
  if (editingTask && editingTask.id) {
    await this.loadTaskById(editingTask.id);
  } else {
    this.clearAllManagers();
  }
}

// NEU
private async loadTaskById(taskId: string): Promise<void> {
  try {
    const freshTask = await this.taskService.getTaskById(taskId);
    if (!freshTask) return;

    this.isEditingMode = true;
    this.editingTaskId = taskId;
    await this.taskDataService.populateFromTask(
      freshTask,
      this.formData,
      this.priorityManager,
      this.contactManager,
      this.subtaskManager,
      this.contacts
    );
    this.taskService.clearEditingTask();
  } catch (error) {
    console.error('Error loading task for editing:', error);
    this.clearAllManagers();
  }
}

// MICHELLES CODE:
/**
 * Loads task data fresh from the database by ID
 */
// private async loadTaskById(taskId: string): Promise<void> {
//   try {
//     // Get fresh task data from database
//     const freshTask = await this.taskService.getTaskById(taskId);
//     if (!freshTask) return;

//     this.isEditingMode = true;
//     this.editingTaskId = taskId;
//     this.editingTask = freshTask;

//     // Load all related data fresh from database
//     await Promise.all([
//       this.loadFreshTaskData(freshTask),
//       this.loadFreshSubtasks(taskId),
//       this.loadFreshImages(freshTask.imageKey || [])
//     ]);
//   } catch (error) {
//     console.error('Error loading task for editing:', error);
//     this.clearAllManagers();
//   }
// }


// 
// 
// 
// 

  /**
   * Handles clicks outside of dropdowns to close them.
   * @param event - The click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.subtask-input')) {
      this.contactManager.setShowContactDropdown(false);
      this.categoryManager.setShowCategoryDropdown(false);
    }
  }

  /**
   * Toggles the contact dropdown visibility.
   */
  toggleContactDropdown() {
    this.contactManager.toggleDropdown();
    this.categoryManager.setShowCategoryDropdown(false);
  }

  /**
   * Toggles the category dropdown visibility.
   */
  toggleCategoryDropdown() {
    this.categoryManager.toggleCategoryDropdown();
    this.contactManager.setShowContactDropdown(false);
  }

  /**
   * Selects a category and closes the dropdown.
   * @param category - The category to select.
   */
  selectCategory(category: any) {
    this.categoryManager.selectCategory(category);
    this.categoryManager.onCategorySelect();
  }

  /**
   * Resets the task creation form to its default state.
   */
  clearForm(): void {
    this.formData = { title: '', description: '', dueDate: '' };
    this.priorityManager.selectedPriority = 'medium';
    this.isCreatingTask = false;
    this.isEditingMode = false;
    this.editingTaskId = undefined;
    this.originalTaskStatus = 'to-do';
    this.subtaskManager.originalSubtasks = [];
    this.showSuccessMessage = false;
    this.resetValidationErrors();
    this.contactManager.clearAll();
    this.categoryManager.clearAll();
    this.subtaskManager.clearAll();
  }

  /**
   * Sets the internal state indicating whether a task is currently being created or updated.
   * This flag can be used to disable form inputs or show loading indicators during asynchronous operations.
   *
   * @param state - True if a task is being created/updated, false otherwise.
   */
  private setCreatingState(state: boolean): void {
    this.isCreatingTask = state;
  }

  /**
   * Handles task creation or editing after form validation.
   */
  async createTask(event: Event): Promise<void> {
    event.preventDefault();
    this.resetValidationErrors();

    if (this.formValidator.hasFormErrors(this.formData, this.categoryManager)) {
      this.validationErrors = this.formValidator.validateForm(
        this.formData,
        this.categoryManager
      );
      return;
    }
    this.setCreatingState(true);
    try {
      await this.saveTaskWithSuccessFeedback();
    } catch (error) {
      console.error('Error while creating/updating task:', error);
    } finally {
      this.setCreatingState(false);
    }
  }

  /**
   * Resets validation error flags.
   */
  private resetValidationErrors(): void {
    this.validationErrors = { showTitleError: false, showDateError: false };
    this.categoryManager.showCategoryError = false;
  }

  /**
   * Emits event, shows success message and navigates after saving the task.
   */
  private async saveTaskWithSuccessFeedback(): Promise<void> {
    await this.saveTask();
    this.taskAdded.emit('added');
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.clearForm();
      this.router.navigate(['/board']);
    }, 2000);
  }

  /**
   * Creates or updates the task depending on the mode.
   */
  private async saveTask(): Promise<void> {
    if (this.isEditingMode && this.editingTaskId) {
      await this.updateTask();
    } else {
      await this.addNewTask();
    }
  }

  /**
   * Adds a new task with optional subtasks.
   */
  async addNewTask(): Promise<void> {
    if (!this.defaultStatus) this.defaultStatus = 'to-do';

    const newTask: Task = this.taskDataService.buildTask(
      this.formData,
      this.defaultStatus,
      this.priorityManager,
      this.contactManager,
      this.categoryManager
    );
    const savedTask = await this.taskService.addTask(newTask);
    if (savedTask?.id) {
      await this.subtaskManager.saveAllSubtasks(
        savedTask.id,
        this.subtaskManager.getSubtasks()
      );
    }
  }

  /**
   * Updates an existing task and its subtasks.
   */
  async updateTask(): Promise<void> {
    if (!this.editingTaskId) return;
    const updatedTask: Task = this.taskDataService.buildTask(
      this.formData,
      this.originalTaskStatus,
      this.priorityManager,
      this.contactManager,
      this.categoryManager,
      this.editingTaskId
    );
    await this.taskService.updateTask(this.editingTaskId, updatedTask);
    const currentSubtasks = this.subtaskManager.getSubtasks();
    const deleted = this.subtaskManager.getDeletedSubtasks(currentSubtasks);
    await this.subtaskManager.deleteSubtasks(this.editingTaskId, deleted);
    await this.subtaskManager.syncSubtasks(this.editingTaskId, currentSubtasks);
    this.taskService.clearEditingTask();
  }

  /**
   * Handles title input changes and clears error state.
   */
  onTitleInput() {
    if (this.formData.title.trim()) {
      this.validationErrors.showTitleError = false;
    }
  }

  /**
   * Handles date selection and clears error state.
   */
  onDateSelect() {
    if (this.formData.dueDate) {
      this.validationErrors.showDateError = false;
    }
  }

  /**
   * Returns today's date in ISO format for date input validation.
   */
  getTodayDate(): string {
    return this.formValidator.getTodayDate();
  }

  /**
   * Closes the overlay mode by emitting the close event.
   * Also clears form data to prevent state leaking.
   */
  closeOverlayMode() {
    this.clearForm();
    this.closeOverlay.emit();
  }
}
