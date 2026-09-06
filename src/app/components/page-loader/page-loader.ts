import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-loader.html',
  styleUrl: './page-loader.scss'
})
export class PageLoaderComponent {
  @Input() isVisible = false;
  themeService = inject(ThemeService);
}
