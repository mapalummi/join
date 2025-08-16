import { Injectable } from '@angular/core';
import { Contact } from '../services/contact.service';
import { Task } from '../services/task.service';
import { ContactManager } from './contact-manager';
import { CategoryManager } from './category-manager';
import { PriorityManager } from './priority-manager';
import { SubtaskManager } from './subtask-manager';

export interface FormData {
  title: string;
  description: string;
  dueDate: string;
}

@Injectable({
  providedIn: 'root'
})

export class TaskDataService {

  /**
   * Populates form and managers with data from an existing task.
   * Returns the original task status.
   */
  async populateFromTask(
    task: any,
    formData: FormData,
    priorityManager: PriorityManager,
    contactManager: ContactManager,
    subtaskManager: SubtaskManager,
    contacts: Contact[]
  ): Promise<string> {
    this.setBasicFormData(task, formData);
    this.setDueDate(task.date, formData);
    priorityManager.setPriorityAndCategory(task);
    this.setAssignedContacts(task.assignedTo, contactManager, contacts);
    if (task.id) {
      subtaskManager.loadAndSetSubtasks(task.id);
    }
    return task.status || 'to-do';
  }

  /**
   * Builds a task object from current form and manager states.
   */
  buildTask(
    formData: FormData,
    status: string,
    priorityManager: PriorityManager,
    contactManager: ContactManager,
    categoryManager: CategoryManager,
    id?: string
  ): Task {
    const uniqueContactIds = this.getUniqueAssignedContactIds(contactManager);
    // Setze Datum immer auf Mitternacht (lokale Zeit)
  let date = new Date(formData.dueDate);
  date.setHours(0, 0, 0, 0);

    const task: any = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      date: new Date(formData.dueDate),
      priority: priorityManager.selectedPriority as 'low' | 'medium' | 'urgent',
      status,
      assignedTo: uniqueContactIds,
      category: categoryManager.getSelectedCategory() as 'technical' | 'user story'
    };
    if (id) {
      task.id = id;
    }
    return task as Task;
  }

  private setBasicFormData(task: any, formData: FormData): void {
    formData.title = task.title || '';
    formData.description = task.description || '';
  }

  // private setDueDate(date: any, formData: FormData): void {
  //   if (!date) return;
  //   let dateValue: Date;
  //   if (date.toDate) {
  //     dateValue = date.toDate();
  //   } else if (date instanceof Date) {
  //     dateValue = date;
  //   } else {
  //     dateValue = new Date(date);
  //   }
  //   formData.dueDate = dateValue.toISOString().split('T')[0];
  // }

  // NEU
  private setDueDate(date: any, formData: FormData): void {
  if (!date) {
    formData.dueDate = '';
    return;
  }
  let jsDate: Date;
  if (typeof date.toDate === 'function') {
    jsDate = date.toDate();
  } else if (date instanceof Date) {
    jsDate = date;
  } else {
    jsDate = new Date(date);
  }
  // Lokales Datum für <input type="date">
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  formData.dueDate = `${year}-${month}-${day}`;
}




  private setAssignedContacts(assignedToIds: string[], contactManager: ContactManager, contacts: Contact[]): void {
    if (!assignedToIds || assignedToIds.length === 0) return;
    const selectedContacts = contacts
      .filter(contact => contact.id !== undefined)
      .filter(contact => assignedToIds.includes(contact.id as string));
    contactManager.setSelectedContacts(selectedContacts);
  }
  
  private getUniqueAssignedContactIds(contactManager: ContactManager): string[] {
    const contacts = contactManager.getSelectedContacts();
    return [...new Set(contacts.map(c => c.id).filter(id => id !== undefined))] as string[];
  }
}
