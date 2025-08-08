/**
 * TaskDetailsComponent displays the detailed view of a selected task.
 * It includes task metadata, assigned contacts, and a list of subtasks.
 *
 * Features:
 * - Shows task information including title, description, due date, etc.
 * - Displays and manages assigned contacts
 * - Allows toggling and updating subtasks
 * - Emits events to close, edit, or respond to changes in subtasks
 * - Supports task deletion and date formatting
 *
 * Dependencies:
 * - TaskService for task and subtask management
 * - ContactService for fetching contact details
 * - Angular Router for navigation
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Task, TaskService } from '../../services/task.service';
import { Subtask } from '../../services/task.service';
import { Timestamp } from '@angular/fire/firestore';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../services/contact.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss',
})
export class TaskDetailsComponent {
  /**
   * Emits an event when the task detail view should be closed.
   */
  @Output() closeTaskDetails = new EventEmitter<string>();

  /**
   * Emits an event when the user wants to edit the task.
   */
  @Output() editTask = new EventEmitter<string>();

  /**
   * Emits the updated subtask list when a subtask is toggled.
   */
  @Output() subtaskChanged = new EventEmitter<Subtask[]>();

  /**
   * The task whose details are being displayed.
   */
  @Input() task!: Task;

  /**
   * The list of contacts assigned to this task.
   */
  // @Input() contactList: Contact[] = [];
  contactList: Contact[] = [];

  /**
   * Controls whether the detail view content is shown.
   */
  showContent = true;

  /**
   * The list of subtasks associated with the task.
   */
  subtasks: Subtask[] = [];

  /**
   * Constructor injects task and contact services, and the Angular Router.
   *
   * @param taskService Service for handling tasks and subtasks.
   * @param contactService Service for fetching contacts.
   * @param router Angular Router for navigation (currently unused).
   */
  constructor(
    public taskService: TaskService,
    public contactService: ContactService,
    private router: Router
  ) {}

  /**
   * Lifecycle hook to load assigned contacts and subtasks on component initialization.
   */
  ngOnInit(): void {
    this.loadAssignedContacts();
    this.loadSubtasks();
  }

  /**
   * Closes the task detail view and emits the close event.
   */
  onClose() {
    this.showContent = false;
    this.closeTaskDetails.emit('close');
  }

  /**
   * Converts a Firebase Timestamp or Date to a formatted string.
   *
   * @param date The date or timestamp to convert.
   * @returns A string representation of the date.
   */
  convertDate(date: Timestamp | Date): string {
    return this.taskService.convertDate(date);
  }

  /**
   * Prepares the task for editing and emits the edit event.
   *
   * @param event Optional event to stop propagation and prevent default behavior.
   */
  openEditTask(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.taskService.setEditingTask(this.task);
    this.editTask.emit('edit');
  }

  /**
   * Deletes the task (if it has a valid ID), and closes the detail view.
   *
   * @param event Optional event to stop propagation and prevent default behavior.
   */
  deleteTask(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.task.id) {
      this.taskService.deleteTask(this.task.id);
      this.onClose();
    }
  }

  /**
   * Toggles a subtask's completion status and updates it in the backend.
   * Emits the updated list of subtasks.
   *
   * @param subtask The subtask to toggle.
   */
  onSubtaskToggle(subtask: Subtask) {
    if (!this.task.id || !subtask.id) return;
    this.taskService
      .updateSubtask(this.task.id, subtask.id, subtask)
      .then(() => {
        this.subtaskChanged.emit(this.subtasks);
      })
      .catch((error) => {
        console.error('Error updating subtask:', error);
      });
  }

  /**
   * Loads subtasks associated with the current task from the database.
   */
  loadSubtasks() {
    if (this.task?.id) {
      this.taskService
        .getSubtasks(this.task.id)
        .subscribe((subtasks: Subtask[]) => {
          this.subtasks = subtasks;
        });
    }
  }

  /**
   * Fetches detailed contact information for all assigned contact IDs
   * and updates the contactList accordingly.
   */
  async loadAssignedContacts() {
    if (this.task?.assignedTo?.length) {
      this.contactList = [];
      for (let contactId of this.task.assignedTo) {
        const contact = await this.contactService.getContactById(contactId);
        if (contact) {
          this.contactList.push(contact);
        }
      }
    }
  }
}
