import { Injectable, Injector } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  DocumentData,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { TaskService } from './task.service';
import { ContactService } from './contact.service';

/**
 * Interface for user data stored in Firestore.
 */
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

/**
 * Authentication service for handling user registration, login, logout,
 * guest access, profile updates, account deletion, and state tracking.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authInitialized = new BehaviorSubject<boolean>(false);

  /**
   * Observable emitting the current authenticated Firebase user.
   */
  public currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  /**
   * Observable that emits true once Firebase Auth has finished initializing.
   */
  public authInitialized$: Observable<boolean> =
    this.authInitialized.asObservable();

  /**
   * Initializes the AuthService and subscribes to authentication state changes.
   * @param auth - Firebase Auth instance
   * @param firestore - Firebase Firestore instance
   * @param router - Angular Router for navigation
   */
  constructor(
  private auth: Auth,
  private firestore: Firestore,
  private router: Router,
  // private taskService: TaskService,
  // private contactService: ContactService
) {
  onAuthStateChanged(this.auth, (user) => {
    this.currentUserSubject.next(user);
    if (!this.authInitialized.value) {
      this.authInitialized.next(true);
    }
  });
}

  /**
   * Registers a new user with email, password, and display name.
   * Stores user data in Firestore.
   * @param email - User's email address
   * @param password - User's password
   * @param displayName - User's display name
   * @returns A success status and optional error message
   */
  async signUp(
    email: string,
    password: string,
    displayName: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName });
      const userData: UserData = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        createdAt: new Date(),
      };
      await setDoc(doc(this.firestore, 'users', user.uid), userData);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Signs in a user with email and password.
   * @param email - User's email
   * @param password - User's password
   * @returns A success status and optional error message
   */
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Signs in as a guest user. If guest user does not exist, it will be created.
   * @returns A success status and optional error message
   */
  async signInAsGuest(): Promise<{ success: boolean; message?: string }> {
    try {
      const guestEmail = 'guest@join.com';
      const guestPassword = 'Guest123!';
      await signInWithEmailAndPassword(this.auth, guestEmail, guestPassword);
      return { success: true };
    } catch (error: any) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.auth,
          'guest@join.com',
          'Guest123!'
        );
        const user = userCredential.user;
        await updateProfile(user, { displayName: 'Guest User' });
        const userData: UserData = {
          uid: user.uid,
          email: user.email!,
          displayName: 'Guest User',
          createdAt: new Date(),
        };
        await setDoc(doc(this.firestore, 'users', user.uid), userData);
        return { success: true };
      } catch (createError: any) {
        return {
          success: false,
          message: this.getErrorMessage(createError.code),
        };
      }
    }
  }

  /**
   * Signs out the currently authenticated user and redirects to the login page.
   */
  // async signOutUser(): Promise<void> {
  //   // Guest-Daten optional löschen beim Logout
  //   if (this.isGuestUser()) {
  //     // Local Storage für Guest-User löschen
  //     this.clearAllGuestData();
  //     // Oder behalten für nächste Session
  //     await this.resetGuestServices();
  //   }
  //   await signOut(this.auth);
  //   this.router.navigate(['/login']);
  // }

  // NEU
  async signOutUser(): Promise<void> {
  // Guest-Daten optional löschen beim Logout
  if (this.isGuestUser()) {
    this.clearAllGuestData();
    // KEIN resetGuestServices() mehr hier!
  }
  await signOut(this.auth);
  this.router.navigate(['/login']);
}

  /**
   * Clears all guest data from local storage.
   */
  private clearAllGuestData(): void {
    localStorage.removeItem('guest-tasks');
    localStorage.removeItem('guest-tasks-loaded');
    localStorage.removeItem('guest-contacts');
    localStorage.removeItem('guest-contacts-loaded');
  }

  /**
   * Resets guest services to initial state.
   */
  // private async resetGuestServices(): Promise<void> {
  //   try {
  //     const { TaskService } = await import('./task.service');
  //     const { ContactService } = await import('./contact.service');

  //     const taskService = this.injector.get(TaskService);
  //     const contactService = this.injector.get(ContactService);

  //     taskService.resetGuestState();
  //     contactService.resetGuestState();
  //   } catch (error) {
  //     console.warn('Error resetting guest services:', error);
  //   }
  // }

  

  /**
   * Retrieves the current user's data from Firestore.
   * @returns The user's Firestore data or null if not found
   */
  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;
    const userDoc = await getDoc(doc(this.firestore, 'users', currentUser.uid));
    return userDoc.exists() ? (userDoc.data() as UserData) : null;
  }

  /**
   * Checks whether a user is currently authenticated.
   * @returns True if a user is signed in, otherwise false
   */
  isLoggedIn(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Gets the current authenticated Firebase user.
   * @returns The current user or null if not logged in
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Maps Firebase Auth error codes to human-readable error messages.
   * @param errorCode - Firebase Auth error code
   * @returns A string describing the error
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'User not found.';
      case 'auth/wrong-password':
        return 'Wrong password.';
      case 'auth/email-already-in-use':
        return 'Email address is already in use.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'User account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many login attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Deletes the currently authenticated user account.
   * @returns A success status and optional error message
   */
  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    const user = this.auth.currentUser;
    if (!user) {
      return { success: false, message: 'No user is currently signed in.' };
    }
    try {
      await deleteUser(user);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Checks if the current user is a guest user.
   * @returns True if the current user is a guest, false otherwise
   */
  isGuestUser(): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser?.email === 'guest@join.com';
  }

  /**
   * Gets the user-specific collection name.
   * @param baseCollection - The base collection name (e.g., 'tasks', 'contacts')
   * @returns The collection name - 'dummy-{collection}' for guests, '{collection}' for users
   */
  getCollectionName(baseCollection: string): string {
    if (this.isGuestUser()) {
      return `dummy-${baseCollection}`;
    }
    return baseCollection; // Normale Collections für registrierte User
  }

  /**
   * Checks if operations should be saved to Firestore.
   * @returns False for guest users (local only), true for registered users
   */
  shouldSaveToFirestore(): boolean {
    return !this.isGuestUser();
  }
}
