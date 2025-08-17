import { Injectable } from '@angular/core';
import { Task, TaskService, Subtask } from '../services/task.service';
import { Subscription } from 'rxjs';

/**
 * TaskListManager handles all task list operations for the BoardComponent.
 * This includes loading, filtering, sorting, and managing task lists by status.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskListManager {
  private subtaskSubscriptions: Subscription[] = [];
  private taskList: Task[] = [];
  private subtasksByTaskId: { [taskId: string]: Subtask[] } = {};
  private unsubTask!: Subscription;
  private todo: Task[] = [];
  private inprogress: Task[] = [];
  private awaitfeedback: Task[] = [];
  private done: Task[] = [];

  constructor(private taskService: TaskService) {}

  /**
   * Gets all tasks
   */
  getTaskList(): Task[] {
    return this.taskList;
  }

  /**
   * Gets task lists by status
   */
  getTodoTasks(): Task[] {
    return this.todo;
  }

  getInProgressTasks(): Task[] {
    return this.inprogress;
  }

  getAwaitFeedbackTasks(): Task[] {
    return this.awaitfeedback;
  }

  getDoneTasks(): Task[] {
    return this.done;
  }

  /**
   * Gets subtasks by task ID
   */
  getSubtasksByTaskId(): { [taskId: string]: Subtask[] } {
    return this.subtasksByTaskId;
  }

  /**
   * Filters tasks by given status and search term (case-insensitive).
   *
   * @param status - Task status to filter by ('to-do', 'in-progress', 'await-feedback', 'done').
   * @param searchTerm - Search term to filter by.
   * @returns Filtered list of tasks.
   */
  getFilteredTasks(status: string, searchTerm: string): Task[] {
    const tasksForStatus = this.getTasksByStatus(status);
    return this.filterTasksBySearchTerm(tasksForStatus, searchTerm);
  }

  /**
   * Returns tasks from the internal status arrays based on status key.
   *
   * @param status - Status key.
   * @returns Array of tasks matching the given status.
   */
  private getTasksByStatus(status: string): Task[] {
    const statusArrayMap: Record<string, Task[]> = {
      'to-do': this.todo,
      'in-progress': this.inprogress,
      'await-feedback': this.awaitfeedback,
      done: this.done,
    };
    return statusArrayMap[status] || [];
  }

  /**
   * Filters a list of tasks by the provided search term (case-insensitive).
   *
   * @param tasks - The array of tasks to filter.
   * @param searchTerm - The term to filter by.
   * @returns Filtered tasks array.
   */
  private filterTasksBySearchTerm(tasks: Task[], searchTerm: string): Task[] {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(trimmed) ||
        task.description?.toLowerCase().includes(trimmed)
    );
  }

  /**
   * Sorts a list of tasks by their due date.
   *
   * @param tasks - Array of tasks to be sorted.
   * @param ascending - Whether to sort in ascending order (default: true).
   * @returns Sorted task array.
   */
  sortTasksByDueDate(tasks: Task[], ascending: boolean = true): Task[] {
    return [...tasks].sort((a, b) =>
      ascending
        ? this.getDateValue(a.date) - this.getDateValue(b.date)
        : this.getDateValue(b.date) - this.getDateValue(a.date)
    );
  }

  /**
   * Converts different date formats (Date, Firestore Timestamp, string) into a timestamp.
   *
   * @param date - Date input to convert.
   * @returns Numeric timestamp, or Number.MAX_SAFE_INTEGER if invalid.
   */
  private getDateValue(date: Date | any): number {
    if (date?.toDate instanceof Function) {
      return date.toDate().getTime();
    } else if (date instanceof Date) {
      return date.getTime();
    } else if (typeof date === 'string') {
      return new Date(date).getTime();
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * TrackBy function for use with ngFor to optimize rendering of tasks.
   *
   * @param index - The index of the item in the array.
   * @param task - The task object.
   * @returns The unique task ID.
   */
  trackByTaskId(index: number, task: Task): string | undefined {
    return task.id;
  }

  /**
   * Loads tasks from the task service and distributes them into status-based lists.
   * Also sorts tasks by due date and loads their subtasks.
   *
   * @returns A function to unsubscribe from the task observable.
   */
  loadTasks(): () => void {
    this.unsubTask = this.taskService.getTasks().subscribe((tasks) => {
      this.taskList = tasks;
      this.distributeTasksByStatus(tasks);
      this.sortAllStatusArrays();
      this.loadSubtasks();
    });
    return () => this.unsubTask.unsubscribe();
  }

  /**
   * Clears all status arrays and distributes tasks into the appropriate lists.
   *
   * @param tasks - The full list of tasks to distribute.
   */
  // private distributeTasksByStatus(tasks: Task[]): void {
  //   this.emptyArrays();
  //   for (const task of tasks) {
  //     switch (task.status) {
  //       case 'to-do':
  //         this.todo.push(task);
  //         break;
  //       case 'in-progress':
  //         this.inprogress.push(task);
  //         break;
  //       case 'await-feedback':
  //         this.awaitfeedback.push(task);
  //         break;
  //       case 'done':
  //         this.done.push(task);
  //         break;
  //       default:
  //         console.warn(`Unknown status in task ${task.title}:`, task.status);
  //     }
  //   }
  // }

  // NOTE:
  // NEUE METHODE:
  private distributeTasksByStatus(tasks: Task[]): void {
    this.todo = tasks.filter((t) => t.status === 'to-do');
    this.inprogress = tasks.filter((t) => t.status === 'in-progress');
    this.awaitfeedback = tasks.filter((t) => t.status === 'await-feedback');
    this.done = tasks.filter((t) => t.status === 'done');
  }

  /**
   * Sorts all status-based task arrays by due date.
   */
  private sortAllStatusArrays(): void {
    this.todo = this.sortTasksByDueDate(this.todo);
    this.inprogress = this.sortTasksByDueDate(this.inprogress);
    this.awaitfeedback = this.sortTasksByDueDate(this.awaitfeedback);
    this.done = this.sortTasksByDueDate(this.done);
  }

  /**
   * Empties all task lists (to-do, in-progress, await-feedback, done).
   */
  private emptyArrays(): void {
    this.todo = [];
    this.inprogress = [];
    this.awaitfeedback = [];
    this.done = [];
  }

  /**
   * Loads subtasks for each task and stores them in a lookup table by task ID.
   */
  private loadSubtasks(): void {
    this.subtaskSubscriptions.forEach((sub) => sub.unsubscribe());
    this.subtaskSubscriptions = [];

    for (const task of this.taskList) {
      if (task.id) {
        const sub = this.taskService
          .getSubtasks(task.id)
          .subscribe((subtasks) => {
            this.subtasksByTaskId[task.id!] = subtasks;
          });
        this.subtaskSubscriptions.push(sub);
      }
    }
  }

  /**
   * Returns the subtasks for a given task ID.
   *
   * @param taskId - The ID of the task to retrieve subtasks for.
   * @returns Array of subtasks, or an empty array if none exist.
   */
  getSubtasksForTask(taskId: string | undefined): Subtask[] {
    if (!taskId) {
      return [];
    }
    return this.subtasksByTaskId[taskId] || [];
  }

  /**
   * Returns the subtasks assigned to the currently selected task.
   *
   * @param selectedTask - The currently selected task.
   * @returns Array of subtasks, or an empty array if none are found.
   */
  getSubtasksForSelectedTask(selectedTask: Task | undefined): Subtask[] {
    if (selectedTask?.id) {
      return this.subtasksByTaskId[selectedTask.id] || [];
    }
    return [];
  }

  /**
   * Updates task lists after status changes
   */
  updateTaskLists(): void {
    this.todo = this.sortTasksByDueDate(this.todo);
    this.inprogress = this.sortTasksByDueDate(this.inprogress);
    this.awaitfeedback = this.sortTasksByDueDate(this.awaitfeedback);
    this.done = this.sortTasksByDueDate(this.done);
  }

  /**
   * Clears all data and unsubscribes
   */
  destroy(): void {
    if (this.unsubTask) {
      this.unsubTask.unsubscribe();
    }
    this.subtaskSubscriptions.forEach((sub) => sub.unsubscribe());
    this.subtaskSubscriptions = [];
    this.emptyArrays();
    this.taskList = [];
    this.subtasksByTaskId = {};
  }

  /**
   * Angular lifecycle hook that is called when the TaskListManager service is destroyed.
   * Can be used for cleanup or debugging purposes.
   */
  ngOnDestroy(): void {
    console.log('TaskComponent destroyed');
  }
}
