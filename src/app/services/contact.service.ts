import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from './auth.service';

/**
 * Interface representing a contact.
 */
export interface Contact {
  /** Unique identifier (automatically assigned by Firestore) */
  id?: string;
  /** Full name of the contact */
  name: string;
  /** Email address of the contact */
  email: string;
  /** Optional phone number of the contact */
  phone?: string;
}

/**
 * Custom validator to check that a form input contains more than just whitespace.
 *
 * @param control - The form control to validate.
 * @returns A validation error object if invalid, otherwise null.
 */
export function notOnlyWhitespace(
  control: AbstractControl
): ValidationErrors | null {
  const value = control.value;
  if (typeof value === 'string' && value.trim().length === 0) {
    return { whitespace: true };
  }
  return null;
}

/**
 * Injectable service for managing contact data in Firestore.
 * Provides reactive streams for selected contact, form visibility, and editing state.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactService {
  /** Currently selected contact (for viewing or interaction) */
  private selectedContactSubject = new BehaviorSubject<Contact | null>(null);
  /** Observable for the selected contact */
  public selectedContact$ = this.selectedContactSubject.asObservable();
  /** Whether the contact form should be displayed */
  private showFormSubject = new BehaviorSubject<boolean>(false);
  /** Observable for contact form visibility */
  public showForm$ = this.showFormSubject.asObservable();
  /** Currently selected contact to be edited */
  private editContactSubject = new BehaviorSubject<Contact | null>(null);
  /** Observable for the contact being edited */
  public editContact$ = this.editContactSubject.asObservable();
  /** Preset avatar colors for visual identification */
  private avatarColors = [
    '#9C27B0',
    '#2196F3',
    '#FF9800',
    '#4CAF50',
    '#F44336',
    '#00BCD4',
    '#c44314ff',
    '#5191daff',
    '#E91E63',
    '#3F51B5',
    '#b3c511ff',
    '#FF5722',
    '#388E3C',
    '#1976D2',
    '#5c0582ff',
    '#c90d0dff',
    '#c303aaff',
    '#0118acff',
    '#0288D1',
    '#C2185B',
    '#049484ff',
    '#FFA000',
    '#084c6bff',
    '#6bb604ff',
  ];

  private readonly GUEST_CONTACTS_KEY = 'guest-contacts';
  private readonly GUEST_CONTACTS_LOADED_KEY = 'guest-contacts-loaded';

  private guestContactsSubject = new BehaviorSubject<Contact[]>([]);
  private guestContactsInitialized = false;

  constructor(private firestore: Firestore, private authService: AuthService) {}

  /**
   * Returns a Firestore reference to the `contacts` collection.
   */
  // getContactsRef() {
  //   return collection(this.firestore, 'contacts');
  // }

  /**
   * Returns a reference to the user-specific contacts collection.
   */
  getContactsRef() {
    const collectionName = this.authService.getCollectionName('contacts');
    return collection(this.firestore, collectionName);
  }

  /**
   * Returns a Firestore reference to a single contact document.
   *
   * @param docId - The ID of the contact document.
   */
  getSingleContactsRef(docId: string) {
    return doc(this.getContactsRef(), docId);
  }

  getContacts(): Observable<Contact[]> {
    if (this.authService.isGuestUser()) {
      
      this.initializeGuestContacts();
      return this.guestContactsSubject.asObservable();
    } else {
      
      return new Observable((observer) => {
        const unsubscribe = onSnapshot(
          this.getContactsRef(),
          (snapshot) => {
            const contacts: Contact[] = [];
            snapshot.forEach((doc) => {
              contacts.push({ id: doc.id, ...doc.data() } as Contact);
            });
            observer.next(contacts);
          },
          (error) => observer.error(error)
        );
        return () => unsubscribe();
      });
    }
  }


  /**
   * Initialisiert Guest-Contacts einmalig
   */
  private initializeGuestContacts(): void {
    if (this.guestContactsInitialized) {
      
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      if (savedContacts) {
        
        const contacts: Contact[] = JSON.parse(savedContacts);
        this.guestContactsSubject.next(contacts);
        return;
      } else {
        
        this.guestContactsInitialized = false;
      }
    }

    this.guestContactsInitialized = true;

    if (!localStorage.getItem(this.GUEST_CONTACTS_LOADED_KEY)) {
      // FIX: Für ersten Guest-Login von Standard-Collection (dummy-contacts) laden
      const standardContactsRef = collection(this.firestore, 'dummy-contacts');

      const unsubscribe = onSnapshot(
        standardContactsRef,
        (snapshot) => {
          const contacts: Contact[] = [];
          snapshot.forEach((doc) => {
            contacts.push({ id: doc.id, ...doc.data() } as Contact);
          });

          localStorage.setItem(
            this.GUEST_CONTACTS_KEY,
            JSON.stringify(contacts)
          );
          localStorage.setItem(this.GUEST_CONTACTS_LOADED_KEY, 'true');
          this.guestContactsSubject.next(contacts);

          unsubscribe();
        },
        (error) => {
          console.error('Error loading guest contacts:', error);
          // Fallback: Leeres Array bei Fehler
          this.guestContactsSubject.next([]);
          localStorage.setItem(this.GUEST_CONTACTS_LOADED_KEY, 'true');
        }
      );
    } else {
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      const contacts: Contact[] = savedContacts
        ? JSON.parse(savedContacts)
        : [];
      this.guestContactsSubject.next(contacts);
    }
  }

  /**
   * Adds a new contact to Firestore.
   *
   * @param newContact - The contact to add.
   * @returns The added contact with its generated ID or null if failed.
   */
  async addContact(newContact: Contact): Promise<Contact | null> {
    if (this.authService.isGuestUser()) {
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      const contacts: Contact[] = savedContacts
        ? JSON.parse(savedContacts)
        : [];

      const contactWithId: Contact = {
        ...newContact,
        id:
          'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      };

      contacts.push(contactWithId);
      localStorage.setItem(this.GUEST_CONTACTS_KEY, JSON.stringify(contacts));
      this.guestContactsSubject.next(contacts);

      return contactWithId;
    } else {
      try {
        const contactsRef = this.getContactsRef();
        const docRef = await addDoc(contactsRef, newContact);
        return { id: docRef.id, ...newContact };
      } catch (error) {
        console.error('Error adding contact:', error);
        return null;
      }
    }
  }

  /**
   * Updates an existing contact in Firestore.
   *
   * @param docId - The Firestore document ID of the contact to update.
   * @param updatedContact - The updated contact data.
   */
  async updateContact(docId: string, updatedContact: Contact): Promise<void> {
    if (this.authService.isGuestUser()) {
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      const contacts: Contact[] = savedContacts
        ? JSON.parse(savedContacts)
        : [];

      const index = contacts.findIndex((contact) => contact.id === docId);
      if (index !== -1) {
        contacts[index] = { ...updatedContact, id: docId };
        localStorage.setItem(this.GUEST_CONTACTS_KEY, JSON.stringify(contacts));

        this.guestContactsSubject.next(contacts);
      }
    } else {
      let docRef = this.getSingleContactsRef(docId);
      await updateDoc(docRef, this.getCleanJson(updatedContact)).catch(
        (err) => {
          console.error(err);
        }
      );
    }
  }

  /**
   * Returns a plain JSON object with only the allowed contact fields.
   * This is used to avoid including undefined or extra properties when updating Firestore.
   *
   * @param updatedContact - The contact object to sanitize.
   * @returns A JSON object containing name, email, and phone.
   */
  getCleanJson(updatedContact: Contact): Partial<Contact> {
    return {
      name: updatedContact.name,
      email: updatedContact.email,
      phone: updatedContact.phone,
    };
  }

  /**
   * Emits a contact to the selected contact observable.
   * Used to show the contact details in the UI.
   *
   * @param contact - The contact to select.
   */
  selectContact(contact: Contact): void {
    this.selectedContactSubject.next(contact);
  }

  /**
   * Clears the currently selected contact.
   */
  clearSelection(): void {
    this.selectedContactSubject.next(null);
  }

  /**
   * Triggers the display of the add contact form.
   */
  showAddForm(): void {
    this.showFormSubject.next(true);
  }

  /**
   * Triggers the display of the edit contact form with a prefilled contact.
   *
   * @param contact - The contact to edit.
   */
  showEditForm(contact: Contact): void {
    this.editContactSubject.next(contact);
    this.showFormSubject.next(true);
  }

  /**
   * Hides the contact form and clears the edit state.
   */
  hideForm(): void {
    this.showFormSubject.next(false);
    this.editContactSubject.next(null);
  }

  /**
   * Deletes a contact from Firestore.
   *
   * @param docId - The Firestore document ID of the contact to delete.
   */
  async deleteContact(docId: string): Promise<void> {
    if (this.authService.isGuestUser()) {
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      const contacts: Contact[] = savedContacts
        ? JSON.parse(savedContacts)
        : [];

      const filteredContacts = contacts.filter(
        (contact) => contact.id !== docId
      );
      localStorage.setItem(
        this.GUEST_CONTACTS_KEY,
        JSON.stringify(filteredContacts)
      );

      // NEU: BehaviorSubject updaten für Reactive Updates
      this.guestContactsSubject.next(filteredContacts);
    } else {
      await deleteDoc(this.getSingleContactsRef(docId)).catch((err) => {
        console.log(err);
      });
    }
  }

  /**
   * Generates a consistent avatar color for a contact based on their name.
   *
   * @param contactName - The contact’s name used to calculate a hash.
   * @returns A hexadecimal color string from the avatarColors array.
   */
  getContactColor(contactName: string): string {
    let hash = 0;
    for (let i = 0; i < contactName.length; i++) {
      hash += contactName.charCodeAt(i);
    }
    return this.avatarColors[hash % this.avatarColors.length];
  }

  /**
   * Extracts the initials from a contact name.
   *
   * @param name - The full name of the contact.
   * @returns A string with one or two uppercase initials, or '?' if the name is invalid.
   */
  getInitials(name?: string): string {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /**
   * Fetches a single contact by its Firestore document ID.
   *
   * @param contactId - The Firestore document ID.
   * @returns A promise resolving to the contact object or null if not found.
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    if (this.authService.isGuestUser()) {
      const savedContacts = localStorage.getItem(this.GUEST_CONTACTS_KEY);
      const contacts: Contact[] = savedContacts
        ? JSON.parse(savedContacts)
        : [];

      const contact = contacts.find((c) => c.id === contactId);
      return contact || null;
    } else {
      const contactRef = this.getSingleContactsRef(contactId);
      return getDoc(contactRef).then((snapshot) => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as Contact;
        }
        return null;
      });
    }
  }

  /**
   * Resets the guest state to initial values.
   * Called when guest user logs out.
   */
  resetGuestState(): void {
    this.guestContactsInitialized = false;
    this.guestContactsSubject.next([]);

    // NEU: Selected Contact und Form-States zurücksetzen
    this.selectedContactSubject.next(null);
    this.showFormSubject.next(false);
    this.editContactSubject.next(null);
  }
}
