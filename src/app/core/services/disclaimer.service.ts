import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DisclaimerService {
  readonly disclaimer =
    'This application simulates paranormal-style experiences using visual and audio effects. It does not detect, measure, or confirm paranormal activity. All experiences are fictional.';
}
