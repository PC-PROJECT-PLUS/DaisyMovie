import {
  Component, signal, computed, inject, HostListener, PLATFORM_ID, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

// Arc curve parameters per distance from active index (desktop)
const ARC_STEPS = [
  { scale: 1.00, translateX: 0, blur: 0, opacity: 1.00 },  // 0 — active
  { scale: 0.80, translateX: 36, blur: 3, opacity: 0.60 },  // ±1
  { scale: 0.63, translateX: 66, blur: 6, opacity: 0.35 },  // ±2
  { scale: 0.50, translateX: 90, blur: 9, opacity: 0.18 },  // ±3
  { scale: 0.40, translateX: 108, blur: 12, opacity: 0.08 },  // ±4+
];

const WHEEL_COOLDOWN_MS = 480; // how long to wait before next wheel step

@Component({
  selector: 'app-profile-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-select.html',
  styleUrl: './profile-select.scss',
})
export class ProfileSelectComponent implements OnDestroy {
  private router = inject(Router);
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  profiles = computed(() => this.authService.getProfiles());
  activeIndex = signal(0);
  isEntering = signal(false);
  isMobile = signal(false);
  pinValue = signal('');

  @ViewChild('pinInputDesktop') pinInputDesktop?: ElementRef<HTMLInputElement>;
  @ViewChild('pinInputMobile') pinInputMobile?: ElementRef<HTMLInputElement>;

  // Wheel throttle — one step per WHEEL_COOLDOWN_MS
  private lastWheelTime = 0;
  private wheelAccum = 0;           // accumulate small trackpad deltas
  private readonly TRACKPAD_THRESHOLD = 30;

  // Touch/swipe support
  private touchStartX = 0;
  private touchStartY = 0;
  private isDragging = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobile();
      window.addEventListener('resize', this.onResize);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  private onResize = () => this.checkMobile();
  private checkMobile() { this.isMobile.set(window.innerWidth <= 700); }

  // ─── Arc style (desktop only) ────────────────────────────────
  getStep(distance: number) {
    const idx = Math.min(Math.abs(distance), ARC_STEPS.length - 1);
    return ARC_STEPS[idx];
  }

  getStyle(index: number): Record<string, string> {
    const dist = index - this.activeIndex();
    const s = this.getStep(dist);
    return {
      transform: `translateX(${s.translateX}px) scale(${s.scale})`,
      filter: `blur(${s.blur}px)`,
      opacity: `${s.opacity}`,
      transition: 'transform 0.42s cubic-bezier(0.25,1,0.5,1), filter 0.42s ease, opacity 0.42s ease',
      zIndex: `${10 - Math.abs(dist)}`,
      cursor: dist === 0 ? 'default' : 'pointer',
      pointerEvents: Math.abs(dist) > 3 ? 'none' : 'auto',
    };
  }

  isActive(index: number): boolean {
    return index === this.activeIndex();
  }

  selectIndex(index: number) {
    if (index === this.activeIndex()) return;
    this.activeIndex.set(index);
    this.pinValue.set('');
  }

  onPinChange(val: string) {
    const cleaned = val.replace(/\D/g, '').substring(0, 4);
    this.pinValue.set(cleaned);
    if (cleaned.length === 4) {
      // Small delay for UX so user sees the 4th dot filled
      setTimeout(() => this.confirmProfile(), 150);
    }
  }

  // ─── Wheel: throttled, one step at a time ───────────────────
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    const now = Date.now();
    // For high-precision trackpads, accumulate delta until threshold
    this.wheelAccum += Math.abs(event.deltaY);

    if (
      this.wheelAccum < this.TRACKPAD_THRESHOLD &&
      now - this.lastWheelTime < WHEEL_COOLDOWN_MS
    ) {
      return;
    }

    if (now - this.lastWheelTime < WHEEL_COOLDOWN_MS) return;

    this.wheelAccum = 0;
    this.lastWheelTime = now;
    const dir = event.deltaY > 0 ? 1 : -1;
    this.nudge(dir);
  }

  @HostListener('keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') { event.preventDefault(); this.nudge(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); this.nudge(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); this.nudge(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); this.nudge(-1); }
    if (event.key === 'Enter') { this.confirmProfile(); }
  }

  // ─── Touch: support both vertical (desktop arc) and horizontal (mobile) ─
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isDragging = true;
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.isDragging) return;
    const dx = this.touchStartX - event.changedTouches[0].clientX;
    const dy = this.touchStartY - event.changedTouches[0].clientY;
    const threshold = 35;

    if (this.isMobile()) {
      // Mobile: horizontal swipe
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        this.nudge(dx > 0 ? 1 : -1);
      }
    } else {
      // Desktop: vertical swipe
      if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
        this.nudge(dy > 0 ? 1 : -1);
      }
    }
    this.isDragging = false;
  }

  nudge(dir: 1 | -1) {
    const next = this.activeIndex() + dir;
    const len = this.profiles().length;
    if (next >= 0 && next < len) this.activeIndex.set(next);
  }

  confirmProfile() {
    if (this.isEntering()) return;

    const profile = this.activeProfile;

    // Check PIN requirement
    if (profile.requiresPin) {
      if (this.pinValue().length < 4) {
        if (this.isMobile()) {
          this.pinInputMobile?.nativeElement?.focus();
        } else {
          this.pinInputDesktop?.nativeElement?.focus();
        }
        return;
      }
    }

    this.isEntering.set(true);
    setTimeout(() => {
      this.authService.selectProfile(profile);
      this.router.navigate(['/']);
    }, 600);
  }

  get activeProfile(): UserProfile {
    return this.profiles()[this.activeIndex()];
  }
}
