import { Component, computed, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { DisclaimerService } from './core/services/disclaimer.service';
import { PermissionService } from './core/services/permission.service';
import { OnboardingService } from './core/services/onboarding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgFor, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly disclaimerService = inject(DisclaimerService);
  readonly permissionService = inject(PermissionService);
  private readonly onboardingService = inject(OnboardingService);

  readonly disclaimer = this.disclaimerService.disclaimer;
  readonly steps = this.onboardingService.steps;
  readonly activeStep = this.onboardingService.activeStep;
  readonly hasCompleted = this.onboardingService.hasCompleted;
  readonly canAdvance = computed(() =>
    this.activeStep() < this.steps.length - 1 && this.onboardingService.canAdvance()
  );
  readonly isFinalStep = computed(() => this.activeStep() === this.steps.length - 1);

  advance(): void {
    this.onboardingService.advance();
  }

  retreat(): void {
    this.onboardingService.retreat();
  }

  toggleAcknowledgement(checked: boolean): void {
    this.onboardingService.setAcknowledgement(checked);
  }

  openPermissions(): void {
    this.permissionService.requestAll();
  }

  restart(): void {
    this.onboardingService.reset();
  }
}
