import { CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { ContactService, Contact } from '../../services/contact.service';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-contact-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-details.component.html',
  styleUrl: './contact-details.component.scss',
  animations: [
    trigger('slideInFromRight', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(0%)', opacity: 1 })
        ),
      ]),
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '250ms ease-in-out',
          style({ transform: 'translateX(0%)', opacity: 1 })
        ),
      ]),
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class ContactDetailsComponent implements OnInit, OnDestroy {
  contactVisible = false;
  contact?: Contact;
  animationState = 0;
  isDeleting = false;
  isEditing = false;
  menuOpen = false;
  isMobile = window.innerWidth < 768;
  private subscription?: Subscription;
  private firstLoad = true;

  @Output() backToList = new EventEmitter<void>();
  @Output() noContactVisible = new EventEmitter<void>();

  constructor(
    private contactService: ContactService,
    private elementRef: ElementRef
  ) {}

  /**
   * Triggered when clicking outside the mobile menu.
   * Closes the menu if it is open and the click occurred outside.
   *
   * @param {Event} event - The click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const mobileMenu =
      this.elementRef.nativeElement.querySelector('.mobile-menu');
    const mobileOptions = this.elementRef.nativeElement.querySelector(
      '.mobile-options-btn'
    );
    if (
      this.menuOpen &&
      !mobileMenu?.contains(target) &&
      !mobileOptions?.contains(target)
    ) {
      this.menuOpen = false;
    }
  }

  /**
   * Triggered on window resize.
   * Adjusts the mobile layout and menu accordingly.
   *
   * @param {Event} event - The resize event.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    this.isMobile = width < 781;
    if (!this.isMobile && this.menuOpen) {
      this.menuOpen = false;
    }
  }

  /**
   * Opens or closes the mobile menu when on a mobile device.
   */
  toggleMobileMenu() {
    if (this.isMobile) {
      this.menuOpen = !this.menuOpen;
    }
  }

  /**
   * Returns whether animations are disabled (e.g., when deleting or editing).
   *
   * @returns {boolean} True if animations are disabled.
   */
  get isAnimationDisabled(): boolean {
    return this.isDeleting || this.isEditing;
  }

  /**
   * Initializes the component, subscribes to selected and all contacts,
   * and handles visibility and animation transitions.
   */
  ngOnInit(): void {
    this.subscribeToSelectedContact();
  }

  /**
   * Subscribes to changes in the selected contact and all contacts.
   * Ensures synced data, updates animation state, and manages visibility.
   */
  private subscribeToSelectedContact(): void {
    this.subscription = combineLatest([
      this.contactService.selectedContact$,
      this.contactService.getContacts(),
    ])
      .pipe(
        map(([selected, all]) => this.resolveSelectedContact(selected, all))
      )
      .subscribe({
        next: (contact) => this.handleContactChange(contact),
      });
  }

  /**
 * Matches the selected contact with the full contact list to ensure it exists.
 * Falls back to the selected contact if no match is found.
 *
 * @param selected - The selected contact object.
 * @param all - All available contacts.
 * @returns A resolved contact object or null.
 */
private resolveSelectedContact(
  selected: Contact | null,
  all: Contact[]
): Contact | null {
  if (!selected) return null;
  
  // NEU: Prüfen ob der Kontakt noch in der aktuellen Liste existiert
  const found = all.find((c) => c.id === selected.id);
  
  // Wenn nicht gefunden (z.B. nach Guest-Logout), null zurückgeben
  if (!found) {
    console.log('Selected contact not found in current list, clearing selection');
    return null;
  }
  
  return found;
}

  /**
   * Handles contact changes, visibility state, and animations.
   *
   * @param contact - The resolved contact to display, or null if none.
   */
  private handleContactChange(contact: Contact | null): void {
    const wasEmpty = !this.contact;
    const isContactChange = contact && contact !== this.contact;
    this.contact = contact || undefined;
    if (!contact) {
      this.resetContactState();
      return;
    }
    if (isContactChange) {
      this.prepareContactTransition(wasEmpty);
    }
  }

  /**
   * Resets state when no contact is selected and emits visibility change.
   */
  private resetContactState(): void {
    this.isDeleting = false;
    this.isEditing = false;
    this.contactVisible = false;
    setTimeout(() => {
      this.noContactVisible.emit();
    }, 100);
  }

  /**
   * Prepares animation and visibility transition when a new contact is selected.
   *
   * @param wasEmpty - Indicates if the previous contact was undefined.
   */
  private prepareContactTransition(wasEmpty: boolean): void {
    this.isEditing = false;
    this.contactVisible = false;
    setTimeout(() => {
      this.contactVisible = true;
      this.animationState++;
      this.firstLoad = false;
    }, 10);
  }

  /**
   * Called when the component is destroyed.
   * Unsubscribes from the subscription to avoid memory leaks.
   */
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    console.log('ContactdetailsComponent destroyed');
  }

  /**
   * Opens the edit form for the current contact.
   */
  onEditContact(): void {
    if (this.contact) {
      this.isEditing = true;
      this.contactService.showEditForm(this.contact);
      this.menuOpen = false;
    }
  }

  /**
   * Deletes the current contact and clears the selection.
   */
  onDeleteContact(): void {
    if (this.contact?.id) {
      this.isDeleting = true;
      this.menuOpen = false;
      this.contactService.deleteContact(this.contact.id);
      this.contactService.clearSelection();
    }
  }

  /**
   * Returns the initials of a name.
   *
   * @param {string} [name] - The name from which to generate initials.
   * @returns {string} The initials.
   */
  getInitials(name?: string): string {
    return this.contactService.getInitials(name);
  }

  /**
   * Returns the color for a contact.
   *
   * @param {string} [name] - The contact's name.
   * @returns {string} The corresponding color as a hex code.
   */
  getContactColor(name?: string): string {
    if (!name) return '#9E9E9E';
    return this.contactService.getContactColor(name);
  }

  /**
   * Closes the contact details view.
   */
  closeContactDetails(): void {
    this.contactVisible = false;
  }

  /**
   * Emits the event to return to the contact list.
   */
  onBackToList() {
    this.backToList.emit();
  }
}
