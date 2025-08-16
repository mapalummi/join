/**
 * HeaderComponent represents the top navigation bar of the application.
 * It includes a responsive mobile menu with slide-in/out animation,
 * handles authentication actions, and adapts its layout based on window size.
 *
 * Features:
 * - Responsive behavior: adapts menu layout for mobile and desktop views
 * - Slide animation for menu transitions
 * - Closes the menu when clicking outside
 * - User logout functionality
 * - Displays the current user's name
 *
 * Dependencies:
 * - Angular animations for menu transitions
 * - AuthService for managing user authentication
 */
import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

import { TaskService } from '../services/task.service';
import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  animations: [
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
export class HeaderComponent {
  /**
   * Tracks whether the mobile menu is currently open.
   */
  menuOpen = false;

  /**
   * Indicates if the current viewport is considered mobile (width < 1000px).
   */
  isMobile = window.innerWidth < 1000;

  /**
   * Reference to the menu DOM element, used for detecting outside clicks.
   */
  @ViewChild('menu') menuRef!: ElementRef;

  /**
   * Initializes the header component and injects the authentication service.
   * @param authService Service responsible for user authentication.
   */
  constructor(
    private authService: AuthService,
    private taskService: TaskService,
    private contactService: ContactService
  ) {}

  /**
   * Updates the `isMobile` flag and closes the menu on window resize
   * if the new width corresponds to a desktop view.
   *
   * @param event The resize event from the window.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    this.isMobile = width < 1000;
    if (!this.isMobile && this.menuOpen) {
      this.menuOpen = false;
    }
  }

  /**
   * Detects clicks outside the menu to automatically close it
   * when it is open and the user clicks elsewhere in the document.
   *
   * @param event The mouse click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.menuOpen &&
      this.menuRef &&
      !this.menuRef.nativeElement.contains(event.target)
    ) {
      this.menuOpen = false;
    }
  }

  /**
   * Toggles the visibility of the mobile menu.
   * Stops propagation to prevent triggering the outside click handler.
   *
   * @param event The click event on the toggle button.
   */
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Logs the user out by calling the authentication service,
   * clears session storage, and closes the menu.
   */
  // async logout(): Promise<void> {
  //   await this.authService.signOutUser();
  //   sessionStorage.removeItem('greetingShown');
  //   this.menuOpen = false;
  // }

  // NEU
  async logout(): Promise<void> {
  this.taskService.resetGuestState();
  this.contactService.resetGuestState();
  await this.authService.signOutUser();
  sessionStorage.removeItem('greetingShown');
  this.menuOpen = false;
}

  /**
   * Returns the initials of the current user (e.g. "JD" for "John Doe").
   * If no user is found, returns a default label.
   *
   * @returns The display name, email, or a fallback string ('User').
   */
  getCurrentUserInitials(): string {
    const user = this.authService.getCurrentUser();
    const email = user?.email?.toLowerCase() || '';
    const name = user?.displayName?.toLowerCase() || '';
    if (email === 'guest@join.com' || name === 'guest user') {
      return 'G';
    }
    if (user?.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  }

  /**
   * Checks whether the user is currently logged in.
   * @returns True if the user is authenticated, otherwise false
   */
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
