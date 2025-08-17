/**
 * TaskComponent represents an individual task item within a task board.
 * It handles interactions such as opening task details, managing subtasks,
 * showing contact assignments, and changing the task status.
 *
 * Features:
 * - Displays task and assigned contacts
 * - Emits selected task for detail view
 * - Handles subtasks and calculates completion percentage
 * - Toggles a contextual dots menu for task actions
 * - Emits changes to task status
 * - Loads associated contact details
 *
 * Dependencies:
 * - TaskService for task-related operations
 * - ContactService for retrieving assigned contact information
 */
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../services/contact.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../services/task.service';
import { Subtask } from '../../services/task.service';
import { SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-task',
  imports: [CommonModule],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
})
export class TaskComponent {
  /**
   * The full list of contacts assigned to the task.
   */
  contactList: Contact[] = [];

  /**
   * The task to be displayed in this component.
   */
  @Input() task!: Task;

  // NEU
  @Input() contacts: Contact[] = [];

  /**
   * The list of subtasks associated with the task.
   */
  @Input() subtaskList: Subtask[] = [];

  /**
   * Emits the selected task when the user opens the task detail view.
   */
  @Output() taskSelected = new EventEmitter<Task>();

  /**
   * Emits the list of resolved contacts associated with the task.
   */
  // @Output() contacts = new EventEmitter<Contact[]>();

  /**
   * Holds the task currently selected to open its detail view.
   */
  selectedTask?: Task;

  /**
   * The ID of the task for which the contextual "dots" menu is currently open.
   */
  @Input() openedMenuTaskId: string | null = null;

  /**
   * Emits the ID of the task when the "dots" menu is opened.
   */
  @Output() openDotsMenu = new EventEmitter<string>();

  /**
   * Emits an event when the "dots" menu should be closed.
   */
  @Output() closeDotsMenu = new EventEmitter<void>();

  /**
   * Emits a status change for the task, along with its ID.
   */
  @Output() changeTaskStatus = new EventEmitter<{
    taskId: string;
    status: string;
  }>();

  /**
   * Injects services required for task and contact operations.
   *
   * @param taskService Service for task data handling.
   * @param contactService Service for fetching contact information.
   */
  constructor(
    public taskService: TaskService,
    public contactService: ContactService
  ) {}

  /**
   * Detects clicks outside the "dots" menu and closes it if open.
   *
   * @param event Mouse click event on the document.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.dots-menu-btn') &&
      !target.closest('.dots-menu-overlay')
    ) {
      if (this.isDotsMenuOpen) {
        this.closeDotsMenu.emit();
      }
    }
  }

  /**
   * Lifecycle hook that loads the contact list for the task on component init.
   */
  ngOnInit(): void {
    // this.getContactList();
  }

  /**
   * Lifecycle hook that is called when any data-bound @Input properties change.
   * This method checks whether the `task` input has changed (excluding the first change),
   * and if so, resets and reloads the contact list based on the updated task data.
   *
   * @param changes An object of changed properties with current and previous values.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].firstChange) {
      this.contactList = [];
      // this.getContactList();
    }
  }

  /**
   * Emits a task status change and closes the dots menu.
   *
   * @param status The new status to assign to the task.
   * @param event Optional mouse event to stop propagation.
   */
  changeStatus(status: string, event: MouseEvent | undefined) {
    if (event) {
      event.stopPropagation();
    }
    if (this.task.id) {
      this.changeTaskStatus.emit({ taskId: this.task.id, status });
      this.closeDotsMenu.emit();
    }
  }

  /**
   * Returns the number of completed subtasks.
   *
   * @param subtaskList The list of subtasks to evaluate.
   * @returns The number of completed subtasks.
   */
  getCompletedSubtasksCount(subtaskList: any[]): number {
    return Array.isArray(subtaskList)
      ? subtaskList.filter((el) => el.isCompleted).length
      : 0;
  }

  /**
   * Calculates the percentage of completed subtasks.
   *
   * @param subtaskList The list of subtasks to evaluate.
   * @returns The completion percentage as a number between 0 and 100.
   */
  percentageCompleted(subtaskList: Subtask[]): number {
    if (!subtaskList || subtaskList.length === 0) return 0;
    let completed = this.getCompletedSubtasksCount(subtaskList);
    return Math.round((completed / subtaskList.length) * 100);
  }

  /**
   * Emits the selected task to open its detail view.
   *
   * @param task The task to open.
   */
  openTaskDetails(task: Task) {
    this.selectedTask = task;
    this.taskSelected.emit(this.selectedTask);
  }

  /**
   * Checks if the dots menu is currently open for this task.
   *
   * @returns A boolean indicating if the dots menu is open.
   */
  get isDotsMenuOpen() {
    return this.openedMenuTaskId === this.task.id;
  }

  /**
   * Toggles the dots menu open or closed for this task.
   *
   * @param event Mouse event to stop propagation.
   */
  openDotsMenuHandler(event: MouseEvent) {
    event.stopPropagation();
    if (this.isDotsMenuOpen) {
      this.closeDotsMenu.emit();
    } else {
      this.openDotsMenu.emit(this.task.id);
    }
  }

  /**
   * Loads the full contact details for each assigned contact in the task
   * and emits the resolved contact list.
   */
  // async getContactList() {
  //   this.contactList = [];
  //   if (this.task?.assignedTo?.length) {
  //     const uniqueContactIds = [...new Set(this.task.assignedTo)];
  //     for (let contactId of uniqueContactIds) {
  //       const contact = await this.contactService.getContactById(contactId);
  //       if (contact) this.contactList.push(contact);
  //     }
  //     this.contacts.emit(this.contactList);
  //   }
  // }

  // NEU
  getAssignedContacts(): Contact[] {
    if (!this.contacts || !this.task) return [];
    const assignedTo = this.task.assignedTo ?? [];
    return this.contacts.filter((c) => c.id && assignedTo.includes(c.id));
  }

  // NOTE:
  /**
   * Returns a unique list of contacts (removes duplicates based on ID)
   */
  // getAllUniqueContacts(): Contact[] {
  //   if (!this.contactList || this.contactList.length === 0) {
  //     return [];
  //   }
  //   return this.contactList.filter((contact, index, self) =>
  //     index === self.findIndex(c => c.id === contact.id)
  //   );
  // }

  // NOTE:
  /**
   * Returns the first 4 contacts for display.
   */
  // getUniqueContacts(): Contact[] {
  //   return this.getAllUniqueContacts().slice(0, 4);
  // }

  /**
   * Joins the names of remaining contacts into a comma-separated string.
   *
   * @param remainingContacts Array of remaining Contact objects.
   * @returns A comma-separated string of contact names.
   */
  getRemainingContactNames(): string {
    return this.getAssignedContacts()
      .slice(4)
      .map((c) => c.name)
      .join(', ');
  }
}
