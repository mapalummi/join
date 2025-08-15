import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

/**
 * A service to keep track of recent navigation history within the Angular application.
 *
 * Stores the last 3 visited URLs (including the current one) and allows navigation
 * back to the previous URL.
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationHistoryService {
  /** Internal array holding the last 3 visited URLs */
  private history: string[] = [];

  private routerSubscription: Subscription;

  /**
   * Subscribes to Angular Router events and tracks navigation history.
   *
   * Keeps the last 3 visited URLs (including the current one), trimming
   * the oldest entry when the limit is reached.
   *
   * @param router - Angular Router used to listen to navigation events.
   */
  constructor(private router: Router) {
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (this.history.length === 3) {
          this.history.shift();
        }
        this.history.push(event.urlAfterRedirects);
      });
  }

  /**
   * Returns a copy of the navigation history.
   *
   * @returns An array of the last visited URLs (maximum of 3).
   */
  public getHistory(): string[] {
    return [...this.history];
  }

  /**
   * Gets the URL visited before the current one.
   *
   * @returns The previous URL, or null if not available.
   */
  public getPreviousUrl(): string | null {
    if (this.history.length > 1) {
      return this.history[this.history.length - 2];
    }
    return null;
  }

  /**
   * Navigates back to the previous URL if available.
   *
   * If no previous URL is stored, navigates to the root path (`'/'`).
   */
  public navigateBack(): void {
    const previousUrl = this.getPreviousUrl();
    if (previousUrl) {
      this.router.navigateByUrl(previousUrl);
    } else {
      this.router.navigateByUrl('/');
    }
  }

  /**
   * Angular lifecycle hook that is called when the NavigationHistoryService is destroyed.
   * Cleans up the router event subscription to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    console.log('NavigationHistoryService destroyed');
  }
}
