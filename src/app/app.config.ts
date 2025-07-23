import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CDK_DRAG_CONFIG } from '@angular/cdk/drag-drop';
import { provideAuth, getAuth } from '@angular/fire/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: 'AIzaSyCkJrwMFxT8a81j973vBGTWRR-iON7YLd4',
        authDomain: 'join-7e312.firebaseapp.com',
        projectId: 'join-7e312',
        storageBucket: 'join-7e312.firebasestorage.app',
        messagingSenderId: '435660815279',
        appId: '1:435660815279:web:a2aa5ccfbf2f145a3b8d5a',
      })
    ),
    provideFirestore(() => getFirestore()),
    provideAnimations(),
    provideAuth(() => getAuth()),
    {
      provide: CDK_DRAG_CONFIG,
      useValue: {
        dragStartThreshold: 5,
        pointerDirectionChangeThreshold: 5,
        zIndex: 1000,
        scrollSpeed: 30,
        scrollProximity: 100,
      },
    },
  ],
};
