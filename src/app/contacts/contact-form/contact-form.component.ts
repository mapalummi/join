/**
 * ContactFormComponent provides a form for creating and editing contacts.
 * It supports validation, input trimming, and interaction with the ContactService
 * to add, update, or delete contact entries. The form is displayed as an overlay
 * and can emit events when submitted or closed.
 *
 * @example
 * <app-contact-form (addedContact)="handleAddedContact($event)" (closeOverlay)="handleClose($event)"></app-contact-form>
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService, Contact, notOnlyWhitespace } from '../../services/contact.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-contact-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})

export class ContactFormComponent implements OnInit, OnDestroy {

  /**
   * Emits a newly created contact after successful form submission.
   */
  @Output() addedContact = new EventEmitter<Contact>();

  /**
   * Emits when the form overlay is closed (e.g., after cancel or submit).
   * Emits the string 'closed' as an identifier.
   */
  @Output() closeOverlay = new EventEmitter<string>();

  /**
   * The reactive form group for the contact form.
   */
  contactForm!: FormGroup;

  /**
   * The contact to edit, if editing mode is active.
   */
  contactToEdit?: Contact;

  /**
   * Subscription to receive the contact data to be edited via the ContactService.
   */
  private editContactSubscription?: Subscription;

  /**
   * Constructor injecting the form builder and contact service.
   * @param form - Angular's FormBuilder for creating the form.
   * @param contactService - Service that manages contact CRUD operations.
   */
  constructor(private form: FormBuilder, public contactService: ContactService) { }

  /**
   * Initializes the form and subscribes to editContact$ to load contact data
   * when editing an existing entry.
   */
  ngOnInit(): void {
    this.contactForm = this.form.group({
      name: ['', [Validators.required, notOnlyWhitespace]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^[\+\d\s\-\(\)]+$/)]]
    });
    this.editContactSubscription = this.contactService.editContact$.subscribe(this.getDataToEdit);
  }

  /**
   * Receives a contact to be edited and pre-fills the form fields.
   * @param contact - The contact object or null to clear the form.
   */
  getDataToEdit = (contact: Contact | null) => {
    this.contactToEdit = contact || undefined;
    if (this.contactToEdit) {
      this.contactForm.patchValue({
        name: this.contactToEdit.name,
        email: this.contactToEdit.email,
        phone: this.contactToEdit.phone
      });
    }
  }

  /**
   * Cleans up the subscription on component destruction to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.editContactSubscription) {
      this.editContactSubscription.unsubscribe();
    }
  }

  /**
   * Closes the contact form, resets its state, and emits a closing event.
   */
  onClose(): void {
    this.contactService.hideForm();
    this.contactForm.reset();
    this.closeOverlay.emit('closed');
  }

  /**
   * Handles form submission. Validates input, creates or updates the contact
   * using the ContactService, emits the new contact (if applicable),
   * and closes the form.
   */
  async onSubmit(): Promise<void> {
    if (!this.contactForm.valid) return;
    const contact = this.buildContactFromForm();
    if (this.isEditMode()) {
      this.updateContact(contact);
    } else {
      await this.addNewContact(contact);
    }
    this.finalizeSubmission();
  }

  /**
   * Builds a trimmed Contact object from form values.
   * 
   * @returns A Contact object based on form input.
   */
  private buildContactFromForm(): Contact {
    const { name, email, phone } = this.contactForm.value;
    return {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
  }

  /**
   * Determines whether the form is in edit mode.
   * 
   * @returns True if editing an existing contact, false if creating a new one.
   */
  private isEditMode(): boolean {
    return !!this.contactToEdit?.id;
  }

  /**
   * Updates an existing contact using the ContactService.
   * 
   * @param contact - The contact data to be saved.
   */
  private updateContact(contact: Contact): void {
    if (this.contactToEdit && this.contactToEdit.id) {
      this.contactService.updateContact(this.contactToEdit.id, contact);
    }
  }

  /**
   * Adds a new contact using the ContactService and emits it if successful.
   * 
   * @param contact - The new contact data to be added.
   */
  private async addNewContact(contact: Contact): Promise<void> {
    const newContact = await this.contactService.addContact(contact);
    if (newContact) {
      this.addedContact.emit(newContact);
    }
  }

  /**
   * Clears form inputs and closes the form after submission.
   */
  private finalizeSubmission(): void {
    this.clearInputs();
    this.onClose();
  }

  /**
   * Resets the form without closing the overlay.
   */
  clearInputs() {
    this.contactForm.reset();
  }

  /**
   * Deletes the contact being edited (if any) and closes the form.
   */
  deleteContact() {
    if (this.contactToEdit?.id) {
      this.contactService.deleteContact(this.contactToEdit.id);
      this.onClose();
    }
  }
}

